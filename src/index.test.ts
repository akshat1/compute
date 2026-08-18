import test from "node:test";
import assert from "node:assert";
import {
  signal,
  computed,
  effect,
  untrack,
  isSignal,
  type Signal,
} from "./index.ts";

// Type-level: a read-only computed must not be assignable to a writable
// Signal (TypeScript's arity rule would otherwise allow it).
// @ts-expect-error - ReadonlySignal is not a writable Signal
const _writableHole: Signal<number> = computed(() => 1);
void _writableHole;

/** Wait for all pending microtasks (incl. the effect flush) to complete. */
const settled = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

test("computed", async (t) => {
  await t.test("is lazy: does not evaluate until first read", () => {
    const a = signal(1);
    let evaluations = 0;
    const double = computed(() => {
      evaluations++;
      return a() * 2;
    });
    assert.strictEqual(evaluations, 0);
    assert.strictEqual(double(), 2);
    assert.strictEqual(evaluations, 1);
  });

  await t.test("memoizes: repeated reads do not re-evaluate", () => {
    const a = signal(1);
    let evaluations = 0;
    const double = computed(() => {
      evaluations++;
      return a() * 2;
    });
    double();
    double();
    double();
    assert.strictEqual(evaluations, 1);
  });

  await t.test("does not evaluate on writes, only on the next read", () => {
    const a = signal(1);
    let evaluations = 0;
    const double = computed(() => {
      evaluations++;
      return a() * 2;
    });
    double();
    a(2);
    a(3);
    a(4);
    assert.strictEqual(evaluations, 1);
    assert.strictEqual(double(), 8);
    assert.strictEqual(evaluations, 2);
  });

  await t.test("tracks multiple dependencies automatically", () => {
    const a = signal(1);
    const b = signal(2);
    const c = signal(3);
    const sum = computed(() => a() + b() + c());
    assert.strictEqual(sum(), 6);
    b(10);
    assert.strictEqual(sum(), 14);
  });

  await t.test("re-tracks dependencies dynamically on each evaluation", () => {
    const useFirst = signal(true);
    const first = signal("first");
    const second = signal("second");
    let evaluations = 0;
    const chosen = computed(() => {
      evaluations++;
      return useFirst() ? first() : second();
    });
    assert.strictEqual(chosen(), "first");
    // second is currently untracked; changing it must not invalidate.
    second("SECOND");
    assert.strictEqual(chosen(), "first");
    assert.strictEqual(evaluations, 1);
    useFirst(false);
    assert.strictEqual(chosen(), "SECOND");
    assert.strictEqual(evaluations, 2);
    // first is now untracked.
    first("FIRST");
    assert.strictEqual(chosen(), "SECOND");
    assert.strictEqual(evaluations, 2);
  });

  await t.test("is read-only: writing throws a TypeError", () => {
    const a = signal(1);
    const double = computed(() => a() * 2);
    assert.throws(() => (double as unknown as (v: number) => number)(42), TypeError);
  });

  await t.test("equal re-evaluation cuts off downstream propagation", () => {
    const a = signal(1);
    const sign = computed(() => Math.sign(a()));
    let downstreamEvaluations = 0;
    const scaled = computed(() => {
      downstreamEvaluations++;
      return sign() * 10;
    });
    assert.strictEqual(scaled(), 10);
    a(5); // sign re-evaluates to the same value (1)
    assert.strictEqual(scaled(), 10);
    assert.strictEqual(downstreamEvaluations, 1);
  });

  await t.test("diamond dependencies evaluate once per change, glitch-free", () => {
    const a = signal(1);
    const left = computed(() => a() * 2);
    const right = computed(() => a() + 1);
    let evaluations = 0;
    const seen: number[][] = [];
    const bottom = computed(() => {
      evaluations++;
      seen.push([left(), right()]);
      return left() + right();
    });
    assert.strictEqual(bottom(), 4);
    a(2);
    assert.strictEqual(bottom(), 7);
    assert.strictEqual(evaluations, 2);
    // Never observes a mix of fresh and stale inputs.
    assert.deepStrictEqual(seen, [
      [2, 2],
      [4, 3],
    ]);
  });

  await t.test("computeds chain", () => {
    const a = signal(1);
    const double = computed(() => a() * 2);
    const quadruple = computed(() => double() * 2);
    assert.strictEqual(quadruple(), 4);
    a(3);
    assert.strictEqual(quadruple(), 12);
  });

  await t.test("is a signal", () => {
    const a = signal(1);
    assert.strictEqual(isSignal(computed(() => a())), true);
  });

  await t.test("throws on a self-referential cycle", () => {
    const cyclic: () => number = () => loop();
    const loop = computed(() => cyclic() + 1);
    assert.throws(() => loop(), /Cycle detected/);
  });

  await t.test("subscribe notifies synchronously with new and old values", () => {
    const a = signal(1);
    const double = computed(() => a() * 2);
    const notifications: [number, number][] = [];
    double.subscribe((newValue, oldValue) => notifications.push([newValue, oldValue]));
    a(2);
    a(5);
    assert.deepStrictEqual(notifications, [
      [4, 2],
      [10, 4],
    ]);
  });

  await t.test("subscribe does not notify when the computed value is unchanged", () => {
    const a = signal(1);
    const sign = computed(() => Math.sign(a()));
    let notifications = 0;
    sign.subscribe(() => notifications++);
    a(5); // sign stays 1
    assert.strictEqual(notifications, 0);
    a(-5);
    assert.strictEqual(notifications, 1);
  });

  await t.test("unsubscribing the last subscriber makes the computed lazy again", () => {
    const a = signal(1);
    let evaluations = 0;
    const double = computed(() => {
      evaluations++;
      return a() * 2;
    });
    const subscription = double.subscribe(() => {});
    const evaluationsWhileSubscribed = evaluations;
    a(2); // subscribed: evaluates eagerly to decide whether to notify
    assert.strictEqual(evaluations, evaluationsWhileSubscribed + 1);
    subscription.unsubscribe();
    a(3);
    a(4);
    assert.strictEqual(evaluations, evaluationsWhileSubscribed + 1);
  });

  await t.test("repeated subscribe with the same observer returns the same subscription", () => {
    const a = signal(1);
    const double = computed(() => a() * 2);
    const observer = () => {};
    assert.strictEqual(double.subscribe(observer), double.subscribe(observer));
  });

  await t.test("an observer may unsubscribe the last subscription and write the source", () => {
    const source = signal(0);
    const mirror = computed(() => source());
    const seen: number[] = [];
    const subscription = mirror.subscribe((newValue) => {
      seen.push(newValue);
      subscription.unsubscribe();
      source(newValue + 1);
    });
    source(1); // must not crash; the bridge is disposed mid-notification
    assert.deepStrictEqual(seen, [1]);
    assert.strictEqual(source(), 2);
    assert.strictEqual(mirror(), 2);
  });

  await t.test("writing to a signal inside a computed evaluation throws", () => {
    const source = signal(1);
    const sideChannel = signal(0);
    const impure = computed(() => {
      sideChannel(source() * 100);
      return source();
    });
    assert.throws(() => impure(), {
      name: "TypeError",
      message: /must be pure/,
    });
    assert.strictEqual(sideChannel(), 0); // the forbidden write did not land
    sideChannel(5); // depth counter restored: writes are legal again
    assert.strictEqual(sideChannel(), 5);
  });

  await t.test("the purity guard applies at any computed nesting depth and unwinds", () => {
    const sideChannel = signal(0);
    const inner = computed(() => {
      sideChannel(1);
      return 0;
    });
    const outer = computed(() => inner() + 1);
    assert.throws(() => outer(), {
      name: "TypeError",
      message: /must be pure/,
    });
    sideChannel(7); // both depth levels unwound
    assert.strictEqual(sideChannel(), 7);
  });

  await t.test("a computed remains usable after its fn throws", () => {
    const source = signal(1);
    let shouldThrow = true;
    const flaky = computed(() => {
      if (shouldThrow) {
        throw new Error("evaluation failed");
      }
      return source() * 2;
    });
    assert.throws(() => flaky(), /evaluation failed/);
    shouldThrow = false;
    assert.strictEqual(flaky(), 2);
    source(3);
    assert.strictEqual(flaky(), 6);
  });

  await t.test("a mutual cycle formed after the first evaluation throws", () => {
    const flag = signal(false);
    const base = signal(1);
    let readOther: () => number = () => 0;
    const inner = computed((): number => (flag() ? readOther() : base()));
    const outer = computed(() => inner() + 1);
    readOther = () => outer();
    assert.strictEqual(outer(), 2); // acyclic while flag is false
    flag(true); // now inner -> outer -> inner
    assert.throws(() => outer(), /Cycle detected/);
  });

  await t.test("a stale wrapper unsubscribe after teardown and resubscribe is inert", () => {
    const source = signal(1);
    const mirror = computed(() => source());
    const observer = () => {};
    const staleWrapper = mirror.subscribe(observer);
    staleWrapper.unsubscribe(); // full teardown
    const seen: number[] = [];
    const liveObserver = (newValue: number) => seen.push(newValue);
    const liveWrapper = mirror.subscribe(liveObserver);
    const freshWrapper = mirror.subscribe(observer);
    staleWrapper.unsubscribe(); // must not disturb the live subscriptions
    source(2);
    assert.deepStrictEqual(seen, [2]);
    assert.notStrictEqual(freshWrapper, staleWrapper);
    liveWrapper.unsubscribe();
    freshWrapper.unsubscribe();
  });
});

test("effect", async (t) => {
  await t.test("runs immediately on creation", () => {
    const a = signal(1);
    let observedValue: number | undefined;
    effect(() => {
      observedValue = a();
    });
    assert.strictEqual(observedValue, 1);
  });

  await t.test("batches same-tick writes into one re-run seeing final values", async () => {
    const a = signal(1);
    const b = signal(2);
    const runs: number[] = [];
    effect(() => runs.push(a() + b()));
    a(10);
    b(20);
    a(11);
    assert.deepStrictEqual(runs, [3]); // nothing yet: batched
    await settled();
    assert.deepStrictEqual(runs, [3, 31]);
  });

  await t.test("notification crosses multiple degrees of dependency", async () => {
    const state = signal(1);
    const first = computed(() => state() * 2);
    const second = computed(() => first() + 1);
    const runs: number[] = [];
    effect(() => runs.push(second()));
    state(10);
    await settled();
    assert.deepStrictEqual(runs, [3, 21]);
  });

  await t.test("does not re-run when a computed dependency cuts off", async () => {
    const a = signal(1);
    const sign = computed(() => Math.sign(a()));
    let runs = 0;
    effect(() => {
      sign();
      runs++;
    });
    a(5); // sign unchanged
    await settled();
    assert.strictEqual(runs, 1);
    a(-5);
    await settled();
    assert.strictEqual(runs, 2);
  });

  await t.test("does not re-run for writes to unrelated signals", async () => {
    const related = signal(1);
    const unrelated = signal(2);
    let runs = 0;
    effect(() => {
      related();
      runs++;
    });
    unrelated(3);
    await settled();
    assert.strictEqual(runs, 1);
  });

  await t.test("re-tracks dependencies dynamically", async () => {
    const useFirst = signal(true);
    const first = signal(1);
    const second = signal(2);
    let runs = 0;
    effect(() => {
      runs++;
      if (useFirst()) {
        first();
      } else {
        second();
      }
    });
    second(20); // untracked
    await settled();
    assert.strictEqual(runs, 1);
    useFirst(false);
    await settled();
    assert.strictEqual(runs, 2);
    first(10); // now untracked
    await settled();
    assert.strictEqual(runs, 2);
    second(30);
    await settled();
    assert.strictEqual(runs, 3);
  });

  await t.test("sync effects re-run at each write", () => {
    const a = signal(1);
    const runs: number[] = [];
    effect(() => runs.push(a()), { sync: true });
    a(2);
    a(3);
    assert.deepStrictEqual(runs, [1, 2, 3]);
  });

  await t.test("unsubscribe disposes the effect", async () => {
    const a = signal(1);
    let runs = 0;
    const subscription = effect(() => {
      a();
      runs++;
    });
    subscription.unsubscribe();
    a(2);
    await settled();
    assert.strictEqual(runs, 1);
  });

  await t.test("an effect writing its own dependency re-runs until stable", () => {
    const a = signal(1);
    const subscription = effect(
      () => {
        const value = a();
        if (value > 1 && value < 10) {
          a(value + 1);
        }
      },
      { sync: true }
    );
    a(2);
    assert.strictEqual(a(), 10);
    subscription.unsubscribe();
  });

  await t.test("an effect that never stabilizes throws and is disposed", () => {
    const a = signal(1);
    let runs = 0;
    effect(
      () => {
        runs++;
        const value = a();
        if (value > 1) {
          a(value + 1);
        }
      },
      { sync: true }
    );
    assert.throws(() => a(2), /Cycle detected/);
    const runsAtThrow = runs;
    a(1); // disposed: must neither re-run nor rethrow
    a(5);
    assert.strictEqual(runs, runsAtThrow);
  });

  await t.test("an effect that disposes itself mid-run does not run again", () => {
    const a = signal(0);
    let runs = 0;
    const subscription = effect(
      () => {
        runs++;
        const value = a();
        if (value === 1) {
          subscription.unsubscribe();
          a(2); // write own dependency after disposal: must not re-run
        }
      },
      { sync: true }
    );
    a(1);
    assert.strictEqual(runs, 2);
    assert.strictEqual(a(), 2);
  });

  await t.test("a deep cascade of sync effects throws instead of overflowing the stack", () => {
    const chain = Array.from({ length: 102 }, () => signal(0));
    const subscriptions = chain.slice(0, -1).map((source, i) =>
      effect(
        () => {
          chain[i + 1]!(source() + 1);
        },
        { sync: true }
      )
    );
    assert.throws(() => chain[0]!(1), /Maximum update depth/);
    subscriptions.forEach((subscription) => subscription.unsubscribe());
  });

  await t.test("a sync effect may write unrelated signals without a false cycle", () => {
    const source = signal(1);
    const target = signal(0);
    const subscription = effect(
      () => {
        target(source() * 10);
      },
      { sync: true }
    );
    assert.strictEqual(target(), 10);
    source(2);
    assert.strictEqual(target(), 20);
    source(3);
    assert.strictEqual(target(), 30);
    subscription.unsubscribe();
  });
});

test("untrack", async (t) => {
  await t.test("reads inside untrack are not tracked", async () => {
    const tracked = signal(1);
    const ignored = signal(2);
    let runs = 0;
    let lastSum = 0;
    effect(() => {
      runs++;
      lastSum = tracked() + untrack(() => ignored());
    });
    assert.strictEqual(lastSum, 3);
    ignored(10);
    await settled();
    assert.strictEqual(runs, 1);
    tracked(2);
    await settled();
    assert.strictEqual(runs, 2);
    assert.strictEqual(lastSum, 12);
  });

  await t.test("works inside computeds", () => {
    const tracked = signal(1);
    const ignored = signal(100);
    let evaluations = 0;
    const combined = computed(() => {
      evaluations++;
      return tracked() + untrack(() => ignored());
    });
    assert.strictEqual(combined(), 101);
    ignored(200);
    assert.strictEqual(combined(), 101); // stale by design: ignored is untracked
    assert.strictEqual(evaluations, 1);
    tracked(2);
    assert.strictEqual(combined(), 202); // re-evaluation picks up the new ignored value
    assert.strictEqual(evaluations, 2);
  });
});
