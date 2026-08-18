import {
  dependenciesChanged,
  currentClock,
  withTracking,
  type DependencyRecord,
} from "./tracking.ts";
import { addEffect, removeEffect, type EffectNode } from "./scheduler.ts";
import type { EffectOptions, Subscription } from "./types.ts";

/** Maximum re-runs per validation before assuming the effect never stabilizes. */
const MAX_RUNS = 100;

/**
 * Run `fn` once immediately, tracking every signal it reads, and re-run
 * it whenever any of those change. Dependencies are re-tracked on every run,
 * so conditional reads narrow or widen them dynamically.
 *
 * By default re-runs are batched: all writes in the same tick coalesce into
 * a single re-run on the next microtask, observing the final state. Pass
 * `{ sync: true }` to re-run synchronously at each write instead.
 *
 * An effect that writes to its own dependencies re-runs until it stabilizes.
 * If it doesn't stabilize within a bounded number of runs, the effect is
 * disposed and an error is thrown (for a default effect this surfaces as an
 * uncaught exception from the microtask flush, since there is no caller to
 * receive it).
 *
 * Effects stay registered until disposed — they are never garbage-collected
 * on their own. Avoid creating effects inside other effects or inside
 * computed functions: each run of the outer computation would register a
 * fresh inner effect.
 *
 * @returns a {@link Subscription}; `unsubscribe()` disposes the effect.
 *
 * @example
 * const a = signal(1);
 * const b = signal(2);
 * const dispose = effect(() => console.log(a() + b()));  // logs 3
 * a(2); b(3);  // logs 5, once, on the next microtask
 * dispose.unsubscribe();
 */
export function effect(fn: () => void, options?: EffectOptions): Subscription {
  let deps: DependencyRecord[] = [];
  let lastValidated = -1;
  let validating = false;
  let disposed = false;

  function dispose(): void {
    disposed = true;
    removeEffect(node);
  }

  function run(): void {
    deps = withTracking(fn).deps;
  }

  // Re-runs the effect until its dependencies are stable. `run` does not
  // mark the effect validated itself: if `fn` wrote to one of its own
  // dependencies, the read-time versions in `deps` show it as still stale
  // and the loop runs it again, up to MAX_RUNS. The `disposed` check matters
  // mid-loop: `fn` (or an observer it triggers) may dispose this effect,
  // and a disposed effect must not run again.
  function runUntilStable(): void {
    validating = true;
    try {
      let runs = 0;
      while (!disposed && lastValidated !== currentClock()) {
        if (dependenciesChanged(deps)) {
          if (++runs > MAX_RUNS) {
            dispose();
            throw new Error(
              "Cycle detected: an effect kept re-running without stabilizing (does it write to a signal it reads?). The effect has been disposed."
            );
          }
          run();
        } else {
          lastValidated = currentClock();
        }
      }
    } finally {
      validating = false;
    }
  }

  const node: EffectNode = {
    sync: !!options?.sync,
    runIfStale() {
      // Re-entering an effect that is mid-validation is a no-op. This covers
      // both the effect's own writes (fn writing a dependency) and writes
      // performed by computeds evaluating *inside* this effect's validation
      // walk — re-entering would revisit dependency frames that are still
      // open upstack and false-trip cycle detection. The while loop in
      // runUntilStable re-checks the clock, so anything written meanwhile is
      // picked up before the validation completes.
      if (validating || disposed) {
        return;
      }
      runUntilStable();
    },
  };

  run();
  runUntilStable(); // an unstabilizing effect throws here, before registration
  addEffect(node);

  return {
    unsubscribe: dispose,
  };
}
