import { SubscriptionManager } from "./SubscriptionManager.ts";
import {
  bumpClock,
  inComputedEvaluation,
  track,
  type DependencyNode,
} from "./tracking.ts";
import { onWrite } from "./scheduler.ts";
import type {
  Observer,
  ReadonlySignal,
  Signal,
  Subscription,
} from "./types.ts";

/**
 * Get a new writable signal initialized with the given value.
 *
 * @example
 * const count = signal(1);
 * count();  // 1
 * count(2); // subscribers are notified
 */
export function signal<T>(initialValue: T): Signal<T> {
  let value = initialValue;
  let version = 0;
  const subscriptionManager = new SubscriptionManager<T>();

  const node: DependencyNode = {
    get version() {
      return version;
    },
    updateIfNecessary() {
      // Plain signals are always up to date.
    },
  };

  function actualSignal(newValue?: T): T {
    // arguments.length distinguishes an explicit set (even to undefined)
    // from a read.
    if (arguments.length) {
      if (inComputedEvaluation()) {
        throw new TypeError(
          "Signals cannot be written to during a computed evaluation; computed functions must be pure. Use an effect to write in reaction to changes."
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

  actualSignal.subscribe = (observer: Observer<T>): Subscription =>
    subscriptionManager.subscribe(observer);

  return actualSignal as Signal<T>;
}

/**
 * Tells you whether the given value is a signal (writable or computed).
 */
export function isSignal(value: unknown): value is ReadonlySignal<unknown> {
  return (
    typeof value === "function" &&
    typeof (value as ReadonlySignal<unknown>).subscribe === "function"
  );
}
