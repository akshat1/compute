import test from "node:test";
import assert from "node:assert";
import { signal, isSignal } from "./signal.ts";

test("Signal", async (t) => {
  await t.test("should create a signal", async () => {
    const obs = signal(1);
    assert.strictEqual(obs(), 1);
  });

  await t.test("should update the value of a signal", async () => {
    const obs = signal(2);
    obs(3);
    assert.strictEqual(obs(), 3);
  });

  await t.test("should notify subscribers when the value changes", async () => {
    const obs = signal(3);
    let notifiedValue;
    obs.subscribe((newValue) => {
      notifiedValue = newValue;
    });
    obs(4);
    assert.strictEqual(notifiedValue, 4);
  });

  await t.test("should notify subscribers with the old value as well", async () => {
    const obs = signal(3);
    let notifiedOldValue;
    obs.subscribe((_newValue, oldValue) => {
      notifiedOldValue = oldValue;
    });
    obs(4);
    assert.strictEqual(notifiedOldValue, 3);
  });

  await t.test("should notify multiple subscribers when the value changes", async () => {
    const obs = signal(4);
    let notifiedValue1;
    let notifiedValue2;
    obs.subscribe((newValue) => {
      notifiedValue1 = newValue;
    });
    obs.subscribe((newValue) => {
      notifiedValue2 = newValue;
    });
    obs(5);
    assert.strictEqual(notifiedValue1, 5);
    assert.strictEqual(notifiedValue2, 5);
  });

  await t.test("multiple subscribe calls should result in a single subscription", async () => {
    const obs = signal(5);
    const observer = () => {};
    const subscription1 = obs.subscribe(observer);
    const subscription2 = obs.subscribe(observer);
    assert.strictEqual(subscription1, subscription2);
  });

  await t.test("repeated subscribe() calls should not result in multiple notifications", async () => {
    const obs = signal(6);
    let notificationCount = 0;
    const observer = () => {
      notificationCount++;
    };
    obs.subscribe(observer);
    obs.subscribe(observer);
    obs(7);
    assert.strictEqual(notificationCount, 1);
  });

  await t.test("should not notify subscribers when the value does not change", async () => {
    const obs = signal(4);
    let notifiedValue;
    obs.subscribe((newValue) => {
      notifiedValue = newValue;
    });
    obs(4);
    assert.strictEqual(notifiedValue, undefined);
  });

  await t.test("should treat an explicit set to undefined as a change", async () => {
    const obs = signal<number | undefined>(4);
    let notificationCount = 0;
    obs.subscribe(() => {
      notificationCount++;
    });
    obs(undefined);
    assert.strictEqual(obs(), undefined);
    assert.strictEqual(notificationCount, 1);
  });

  await t.test("should unsubscribe a subscriber", async () => {
    const obs = signal(5);
    let notifiedValue;
    const subscription = obs.subscribe((newValue) => {
      notifiedValue = newValue;
    });
    subscription.unsubscribe();
    obs(6);
    assert.strictEqual(notifiedValue, undefined);
  });

  await t.test("should not throw when unsubscribing a subscriber multiple times", async () => {
    const obs = signal(6);
    const subscription = obs.subscribe(() => {});
    subscription.unsubscribe();
    subscription.unsubscribe();
  });

  await t.test("should still notify remaining subscribers when one unsubscribes mid-notification", async () => {
    const obs = signal(1);
    const notified: string[] = [];
    const subscription1 = obs.subscribe(() => {
      notified.push("first");
      subscription1.unsubscribe();
    });
    obs.subscribe(() => {
      notified.push("second");
    });
    obs(2);
    assert.deepStrictEqual(notified, ["first", "second"]);
    obs(3);
    assert.deepStrictEqual(notified, ["first", "second", "second"]);
  });

  await t.test("should not notify a subscriber removed mid-notification by an earlier subscriber", async () => {
    const obs = signal(1);
    const notified: string[] = [];
    let secondSubscription: { unsubscribe(): void };
    obs.subscribe(() => {
      notified.push("first");
      secondSubscription.unsubscribe();
    });
    secondSubscription = obs.subscribe(() => {
      notified.push("second");
    });
    obs(2);
    assert.deepStrictEqual(notified, ["first"]);
  });
});

test("isSignal", async (t) => {
  await t.test("should return true for a signal", () => {
    const obs = signal(1);
    assert.strictEqual(isSignal(obs), true);
  });

  await t.test("should return false for a non-signal", () => {
    assert.strictEqual(isSignal(1), false);
  });

  await t.test("should return false for a plain function", () => {
    assert.strictEqual(isSignal(() => {}), false);
  });
});
