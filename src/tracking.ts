/**
 * Internal dependency-tracking machinery shared by signals, computed
 * signals, and effects. Not part of the public API.
 *
 * The model is push-pull with a global version clock:
 * - Every signal write bumps the global clock and stamps the signal
 *   with the new clock value as its version.
 * - Derived nodes (computeds, effects) remember, for each dependency, the
 *   version they last saw. A node is stale iff, after recursively validating
 *   its dependencies, any dependency's version differs from the remembered
 *   one. A computed that re-evaluates to an equal value keeps its old
 *   version, which is what stops ("cuts off") propagation mid-graph.
 * - Validation is pull-based and recursive, so evaluation order is
 *   topological by construction and reads never observe an inconsistent
 *   ("glitched") state of the graph.
 */

/**
 * A node in the dependency graph that can be depended upon.
 */
export interface DependencyNode {
  /** Bumped (to the then-current clock) whenever the node's value changes. */
  readonly version: number;
  /** Bring the node up to date (recompute if stale). No-op for plain signals. */
  updateIfNecessary(): void;
}

/** A dependency together with the version observed when it was last read. */
export type DependencyRecord = [node: DependencyNode, seenVersion: number];

let clock = 0;

/** The current value of the global version clock. */
export const currentClock = (): number => clock;

/** Advance the global clock; called on every signal write that changes the value. */
export const bumpClock = (): number => ++clock;

let computedDepth = 0;

/** Marks entry/exit of a computed evaluation. */
export const enterComputed = (): void => {
  computedDepth++;
};
export const exitComputed = (): void => {
  computedDepth--;
};

/**
 * Whether a computed evaluation is currently in progress. Signal writes
 * are forbidden during computed evaluation (computed functions must be
 * pure), matching the TC39 Signals proposal's semantics.
 */
export const inComputedEvaluation = (): boolean => computedDepth > 0;

/**
 * Stack of active tracking frames. The top frame collects the dependencies
 * of the computation currently evaluating. A `null` frame (pushed by
 * `untrack`) swallows registrations.
 */
const frames: (Map<DependencyNode, number> | null)[] = [];

/**
 * Register a read of `node` with the active tracking frame, if any. The
 * version is captured at first read — if the computation itself later
 * changes the dependency (an effect writing a signal it read), the
 * record correctly shows the computation as stale.
 */
export function track(node: DependencyNode): void {
  const frame = frames[frames.length - 1];
  if (frame && !frame.has(node)) {
    frame.set(node, node.version);
  }
}

/**
 * Run `fn` while collecting every dependency it reads, and return the
 * dependencies with the versions observed at read time. Reads inside nested
 * computations are attributed to the nested computation, not to `fn`.
 */
export function withTracking<T>(fn: () => T): { result: T; deps: DependencyRecord[] } {
  const frame = new Map<DependencyNode, number>();
  frames.push(frame);
  try {
    const result = fn();
    return { result, deps: [...frame.entries()] };
  } finally {
    frames.pop();
  }
}

/**
 * Read signals inside `fn` without registering them as dependencies of
 * the enclosing computed or effect.
 *
 * @example
 * const count = signal(0);
 * const label = signal("count");
 * const display = computed(() => `${untrack(() => label())}: ${count()}`);
 * // display re-evaluates when count changes, but not when label changes.
 */
export function untrack<T>(fn: () => T): T {
  frames.push(null);
  try {
    return fn();
  } finally {
    frames.pop();
  }
}

/**
 * Validate a dependency list: brings every dependency up to date and reports
 * whether any of them changed since the recorded versions.
 */
export function dependenciesChanged(deps: DependencyRecord[]): boolean {
  for (const [node, seenVersion] of deps) {
    node.updateIfNecessary();
    if (node.version !== seenVersion) {
      return true;
    }
  }
  return false;
}
