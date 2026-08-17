/**
 * A callback invoked when an observable's value changes.
 */
export type Observer<T> = (newValue: T, oldValue: T) => void;

/**
 * Lets you stop receiving notifications from an observable.
 */
export interface Subscription {
  unsubscribe(): void;
}

/**
 * An observable variable. Call it with no arguments to read the current
 * value, or with one argument to set a new value. Subscribers are notified
 * whenever the value changes (strict equality).
 */
export interface Observable<T> {
  (): T;
  (newValue: T): T;
  /**
   * Subscribe to value changes.
   * @returns a {@link Subscription} which lets you unsubscribe.
   */
  subscribe(observer: Observer<T>): Subscription;
}

/**
 * An observable derived from other observables via {@link from}. Carries an
 * `unsubscribe` method which detaches it from its source observables.
 */
export type SubscribedObservable<T> = Observable<T> & Subscription;

/**
 * Maps a tuple of observables to the corresponding tuple of value types.
 * Lets `onChange`/`from`/`gather` infer the value types of a variadic list
 * of observables.
 */
export type ObservableValues<O extends Observable<any>[]> = {
  // The fallback must be `unknown`, not `never`: a union of observables
  // (e.g. Observable<number> | Observable<string>) does not match the
  // non-distributive `infer`, and `never` would silently type-check against
  // anything. `unknown` keeps that case sound by forcing the caller to narrow.
  [K in keyof O]: O[K] extends Observable<infer V> ? V : unknown;
};
