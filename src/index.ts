import { observable, isObservable } from "./Observable.ts";
import type {
  Observable,
  ObservableValues,
  Observer,
  SubscribedObservable,
  Subscription,
} from "./types.ts";

export { observable, isObservable };
export type {
  Observable,
  ObservableValues,
  Observer,
  SubscribedObservable,
  Subscription,
};

/**
 * Unpack all the observables and return an array of values.
 */
export const gather = <O extends Observable<any>[]>(...observables: O): ObservableValues<O> =>
  observables.map((obs) => obs()) as ObservableValues<O>;

/**
 * Call the supplied function when any of the observables change. The function
 * will be called with the current values of all the observables (it may
 * declare fewer parameters than there are observables).
 *
 * @example
 * const obs1 = observable(1);
 * const obs2 = observable(2);
 * const obs3 = observable(3);
 * onChange((a, b, c) => console.log(a + b + c), obs1, obs2, obs3);
 * obs1(2);  // logs 7
 * obs2(3);  // logs 8
 * obs3(4);  // logs 9
 */
export function onChange<O extends Observable<any>[]>(fn: (...values: ObservableValues<O>) => void, ...observables: O): Subscription {
  const handleChange = () => fn(...gather(...observables));
  const subscriptions = observables.map((obs) => obs.subscribe(handleChange));

  return {
    unsubscribe: () =>
      subscriptions.forEach((subscription) => subscription.unsubscribe()),
  };
}

/**
 * Define an observable computed from the values of other observables. The
 * returned observable recalculates whenever any source observable changes,
 * and carries an `unsubscribe` method which detaches it from its sources.
 *
 * @example
 * const a = observable(1);
 * const b = observable(2);
 * const sum = from((x, y) => x + y, a, b);
 * sum();  // 3
 * a(2);
 * sum();  // 4
 * sum.unsubscribe();  // stop tracking a and b
 */
export function from<O extends Observable<any>[], R>(fn: (...values: ObservableValues<O>) => R, ...observables: O): SubscribedObservable<R> {
  const o = observable(fn(...gather(...observables)));
  const handleChange = (...newValues: ObservableValues<O>) => {
    o(fn(...newValues));
  };
  const { unsubscribe } = onChange<O>(handleChange, ...observables);
  return Object.assign(o, { unsubscribe });
}
