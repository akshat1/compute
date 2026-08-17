import { SubscriptionManager } from "./SubscriptionManager.ts";
import type { Observable, Observer, Subscription } from "./types.ts";

/**
 * Get a new Observable initialized with the given value.
 *
 * @example
 * const observableOne = observable(1);
 * observableOne();  // 1
 * observableOne(2); // subscribers are notified
 */
export function observable<T>(initialValue: T): Observable<T> {
  let value = initialValue;
  const subscriptionManager = new SubscriptionManager<T>();

  function actualObservable(newValue?: T): T {
    // arguments.length distinguishes an explicit set (even to undefined)
    // from a read.
    if (arguments.length) {
      const oldValue = value;
      value = newValue as T;
      if (oldValue !== value) {
        subscriptionManager.notify(value, oldValue);
      }
    }

    return value;
  }

  actualObservable.subscribe = (observer: Observer<T>): Subscription =>
    subscriptionManager.subscribe(observer);

  return actualObservable as Observable<T>;
}

/**
 * Tells you whether the given value is an observable.
 */
export function isObservable(value: unknown): value is Observable<unknown> {
  return (
    typeof value === "function" &&
    typeof (value as Observable<unknown>).subscribe === "function"
  );
}
