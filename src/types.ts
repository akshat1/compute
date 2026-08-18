/**
 * A callback invoked when an observable's value changes.
 */
export type Observer<T> = (newValue: T, oldValue: T) => void;

/**
 * Lets you stop receiving notifications (from `subscribe`) or dispose an
 * effect (from `effect`).
 */
export interface Subscription {
  unsubscribe(): void;
}

/**
 * A read-only observable: call it with no arguments to read the current
 * value. Computed observables created with `from` have this shape — they
 * cannot be written to.
 */
export interface ReadonlyObservable<T> {
  (): T;
  /**
   * Subscribe to value changes. Notifications are synchronous: observers are
   * called at the write that changed the value.
   * @returns a {@link Subscription} which lets you unsubscribe.
   */
  subscribe(observer: Observer<T>): Subscription;
}

/**
 * Type-level brand distinguishing writable observables. Without it,
 * TypeScript's parameter-arity rule would make a `(): T` call signature
 * assignable to `(newValue: T): T`, silently letting a read-only computed
 * pose as a writable observable. The brand has no runtime existence.
 */
declare const WRITABLE: unique symbol;

/**
 * A writable observable variable. Call it with no arguments to read the
 * current value, or with one argument to set a new value. Subscribers are
 * notified whenever the value changes (strict equality).
 */
export interface Observable<T> extends ReadonlyObservable<T> {
  (newValue: T): T;
  (): T;
  readonly [WRITABLE]: true;
}

/**
 * Options for `effect`.
 */
export interface EffectOptions {
  /**
   * When true, the effect re-runs synchronously at each write that affects
   * it. By default effects are batched: all writes in the same tick coalesce
   * into a single re-run on the next microtask.
   */
  sync?: boolean;
}
