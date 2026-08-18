import { SubscriptionManager } from "./SubscriptionManager.ts";
import { effect } from "./effect.ts";
import {
  currentClock,
  dependenciesChanged,
  enterComputed,
  exitComputed,
  track,
  withTracking,
  type DependencyNode,
  type DependencyRecord,
} from "./tracking.ts";
import type { Observer, ReadonlySignal, Subscription } from "./types.ts";

/**
 * Define a read-only signal computed from the values of other signals.
 * Dependencies are tracked automatically: whatever signals `fn` reads during
 * evaluation become its dependencies, re-tracked on every evaluation (so
 * conditional reads narrow or widen them dynamically).
 *
 * Evaluation is lazy and memoized: `fn` does not run until the computed is
 * first read, and re-runs only when a read (or an effect/subscription)
 * finds a dependency actually changed. A re-evaluation that produces an
 * equal value (strict equality) stops propagation — dependents do not
 * re-evaluate.
 *
 * `fn` must be pure and synchronous: writing to a signal during a computed
 * evaluation throws a TypeError. Computed signals cannot be written to;
 * calling one with an argument throws a TypeError.
 *
 * @example
 * const a = signal(1);
 * const b = signal(2);
 * const sum = computed(() => a() + b());
 * sum();  // 3 — evaluated on this first read
 * a(2);   // nothing evaluated yet
 * sum();  // 4 — evaluated now
 */
export function computed<T>(fn: () => T): ReadonlySignal<T> {
  let value: T;
  let version = 0;
  let lastValidated = -1;
  let initialized = false;
  let computing = false;
  let validating = false;
  let deps: DependencyRecord[] = [];

  function recompute(): void {
    computing = true;
    enterComputed();
    let result: { result: T; deps: DependencyRecord[] };
    try {
      result = withTracking(fn);
    } finally {
      exitComputed();
      computing = false;
    }
    deps = result.deps;
    if (!initialized || result.result !== value) {
      value = result.result;
      version = currentClock();
    }
    initialized = true;
    lastValidated = currentClock();
  }

  const node: DependencyNode = {
    get version() {
      return version;
    },
    updateIfNecessary() {
      // Validation re-entering while this computed is validating its own
      // dependency chain means the chain leads back here: a cycle formed
      // after the first evaluation (e.g. behind a conditional read).
      if (validating) {
        throw new Error("Cycle detected: a computed signal depends on itself.");
      }
      if (initialized && lastValidated === currentClock()) {
        return;
      }
      validating = true;
      try {
        if (!initialized || dependenciesChanged(deps)) {
          recompute();
        } else {
          lastValidated = currentClock();
        }
      } finally {
        validating = false;
      }
    },
  };

  function computedSignal(...args: unknown[]): T {
    if (args.length) {
      throw new TypeError(
        "Computed signals are read-only; write to their source signals instead."
      );
    }
    if (computing) {
      throw new Error("Cycle detected: a computed signal read itself.");
    }
    node.updateIfNecessary();
    track(node);
    return value;
  }

  // subscribe() bridges the lazy graph to eager notification: the first
  // subscriber installs a sync effect that keeps the computed live and
  // feeds a SubscriptionManager; the last unsubscribe tears it down so an
  // unobserved computed goes back to being fully lazy (and collectable).
  let subscriptionManager: SubscriptionManager<T> | null = null;
  let bridge: Subscription | null = null;
  const wrappers = new Map<Observer<T>, Subscription>();

  computedSignal.subscribe = (observer: Observer<T>): Subscription => {
    const existing = wrappers.get(observer);
    if (existing) {
      return existing;
    }
    if (!subscriptionManager) {
      subscriptionManager = new SubscriptionManager<T>();
      let previous: T;
      let first = true;
      bridge = effect(
        () => {
          const current = computedSignal();
          if (!first && current !== previous) {
            subscriptionManager!.notify(current, previous);
          }
          previous = current;
          first = false;
        },
        { sync: true }
      );
    }
    const subscription = subscriptionManager.subscribe(observer);
    const wrapper: Subscription = {
      unsubscribe: () => {
        // A wrapper from before a full teardown is stale; acting on it would
        // corrupt the subscription made after re-subscribing.
        if (wrappers.get(observer) !== wrapper) {
          return;
        }
        subscription.unsubscribe();
        wrappers.delete(observer);
        if (subscriptionManager && subscriptionManager.size === 0) {
          bridge?.unsubscribe();
          bridge = null;
          subscriptionManager = null;
        }
      },
    };
    wrappers.set(observer, wrapper);
    return wrapper;
  };

  return computedSignal as ReadonlySignal<T>;
}
