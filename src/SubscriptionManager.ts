import type { Observer, Subscription } from "./types.ts";

/**
 * Provides a way to manage subscriptions and notify observers. Used
 * internally by Observable, not meant to be used directly.
 */
export class SubscriptionManager<T> {
  /** Used to call observers in order of subscription. */
  private readonly observers: Observer<T>[] = [];
  /** Used to prevent duplicate subscriptions. */
  private readonly subscriptionsMap = new Map<Observer<T>, Subscription>();

  /**
   * Adds the provided observer to the list of subscriptions, and returns a
   * Subscription object which can be used to unsubscribe from notifications.
   * Subscribing the same observer more than once returns the original
   * subscription.
   */
  subscribe(observer: Observer<T>): Subscription {
    const existing = this.subscriptionsMap.get(observer);
    if (existing) {
      return existing;
    }

    const unsubscribe = (): void => {
      const index = this.observers.indexOf(observer);
      if (index >= 0) {
        this.observers.splice(index, 1);
      }
      this.subscriptionsMap.delete(observer);
    };

    const subscription: Subscription = { unsubscribe };
    this.observers.push(observer);
    this.subscriptionsMap.set(observer, subscription);
    return subscription;
  }

  /** The number of active subscriptions. */
  get size(): number {
    return this.subscriptionsMap.size;
  }

  /**
   * Calls all observers in order of subscription. Observers that unsubscribe
   * while a notification is in flight are not called for that notification
   * (unless re-subscribed during the same notification); observers that
   * subscribe mid-notification are not called until the next one.
   */
  notify(newValue: T, oldValue: T): void {
    for (const observer of [...this.observers]) {
      if (this.subscriptionsMap.has(observer)) {
        observer(newValue, oldValue);
      }
    }
  }
}
