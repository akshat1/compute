/**
 * Internal effect scheduler. Not part of the public API.
 *
 * Effects register here; every signal write that changes a value calls
 * `onWrite()`. Synchronous effects are validated and re-run immediately at
 * the write; asynchronous (default) effects are validated and re-run in a
 * single microtask, so several writes in the same tick coalesce into one
 * re-run that observes the final, consistent state of the graph.
 *
 * Cost model: a write validates every registered sync effect (each
 * validation is a version check over that effect's own dependencies, with
 * no evaluation of anything the effect wouldn't have to evaluate anyway),
 * and schedules at most one pending microtask flush for the async effects.
 */

/** Maximum depth of nested writes from cascading sync effects. */
const MAX_SYNC_DEPTH = 100;

export interface EffectNode {
  readonly sync: boolean;
  /** Validate dependencies and re-run the effect body if any changed. */
  runIfStale(): void;
}

const syncEffects = new Set<EffectNode>();
const asyncEffects = new Set<EffectNode>();
let flushScheduled = false;
let syncDepth = 0;

export function addEffect(node: EffectNode): void {
  (node.sync ? syncEffects : asyncEffects).add(node);
}

export function removeEffect(node: EffectNode): void {
  (node.sync ? syncEffects : asyncEffects).delete(node);
}

/** Called after every signal write that actually changed the value. */
export function onWrite(): void {
  if (asyncEffects.size && !flushScheduled) {
    flushScheduled = true;
    queueMicrotask(flush);
  }

  if (syncEffects.size) {
    if (syncDepth >= MAX_SYNC_DEPTH) {
      throw new Error(
        "Maximum update depth exceeded: writes by sync effects cascaded through too many other sync effects."
      );
    }
    syncDepth++;
    try {
      for (const node of [...syncEffects]) {
        if (syncEffects.has(node)) {
          node.runIfStale();
        }
      }
    } finally {
      syncDepth--;
    }
  }
}

function flush(): void {
  flushScheduled = false;
  for (const node of [...asyncEffects]) {
    if (asyncEffects.has(node)) {
      node.runIfStale();
    }
  }
}
