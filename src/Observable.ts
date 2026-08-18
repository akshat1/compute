import { SubscriptionManager } from "./SubscriptionManager.ts";
import {
  bumpClock,
  inComputedEvaluation,
  track,
  type DependencyNode,
} from "./tracking.ts";
import { onWrite } from "./scheduler.ts";
import type {
  Observable,
  Observer,
  ReadonlyObservable,
  Subscription,
} from "./types.ts";

/**
 * Get a new writable Observable initialized with the given value.
 *
 * @example
 * const observableOne = observable(1);
 * observableOne();  // 1
 * observableOne(2); // subscribers are notified
 */
export function observable<T>(initialValue: T): Observable<T> {
  let value = initialValue;
  let version = 0;
  const subscriptionManager = new SubscriptionManager<T>();

  const node: DependencyNode = {
    get version() {
      return version;
    },
    updateIfNecessary() {
      // Plain observables are always up to date.
    },
  };

  function actualObservable(newValue?: T): T {
    // arguments.length distinguishes an explicit set (even to undefined)
    // from a read.
    if (arguments.length) {
      if (inComputedEvaluation()) {
        throw new TypeError(
          "Observables cannot be written to during a computed evaluation; computed functions must be pure. Use an effect to write in reaction to changes."
        );
      }
      const oldValue = value;
      value = newValue as T;
      if (oldValue !== value) {
        version = bumpClock();
        subscriptionManager.notify(value, oldValue);
        onWrite();
      }
    } else {
      track(node);
    }

    return value;
  }

  actualObservable.subscribe = (observer: Observer<T>): Subscription =>
    subscriptionManager.subscribe(observer);

  return actualObservable as Observable<T>;
}

/**
 * Tells you whether the given value is an observable (writable or computed).
 */
export function isObservable(value: unknown): value is ReadonlyObservable<unknown> {
  return (
    typeof value === "function" &&
    typeof (value as ReadonlyObservable<unknown>).subscribe === "function"
  );
}
