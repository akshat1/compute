import test from "node:test";
import assert from "node:assert";
import { gather, isObservable, observable, onChange, from } from "./index.ts";

test("Compute", async (t) => {
  await t.test("gather", async (t1) => {
    await t1.test("should return an array of values", () => {
      const obs1 = observable(1);
      const obs2 = observable(2);
      const obs3 = observable(3);
      assert.deepStrictEqual(gather(obs1, obs2, obs3), [1, 2, 3]);
    });
  });

  await t.test("onChange", async (t1) => {
    await t1.test("should call the function with the current values of all observables", () => {
      const obs1 = observable(1);
      const obs2 = observable(2);
      const obs3 = observable(3);
      const calls: number[][] = [];
      onChange((a, b, c) => calls.push([a, b, c]), obs1, obs2, obs3);
      obs1(2);
      obs2(3);
      obs3(4);
      assert.deepStrictEqual(calls, [
        [2, 2, 3],
        [2, 3, 3],
        [2, 3, 4],
      ]);
    });

    await t1.test("should not call the function until an observable changes", () => {
      const obs1 = observable(1);
      let called = false;
      onChange(() => {
        called = true;
      }, obs1);
      assert.strictEqual(called, false);
    });

    await t1.test("should stop notifications after unsubscribe", () => {
      const obs1 = observable(1);
      const obs2 = observable(2);
      let callCount = 0;
      const subscription = onChange(() => {
        callCount++;
      }, obs1, obs2);
      obs1(2);
      subscription.unsubscribe();
      obs1(3);
      obs2(3);
      assert.strictEqual(callCount, 1);
    });
  });

  await t.test("from", async (t1) => {
    await t1.test("should create a computed observable", () => {
      const obs1 = observable(1);
      const obs2 = observable(2);
      const obs3 = observable(3);
      const computed = from((a, b, c) => a + b + c, obs1, obs2, obs3);
      assert.equal(isObservable(computed), true);
      assert.strictEqual(computed(), 6);
    });

    await t1.test("should update the computed value when the observables change", () => {
      const obs1 = observable(1);
      const obs2 = observable(2);
      const obs3 = observable(3);
      const computed = from((a, b, c) => a + b + c, obs1, obs2, obs3);
      obs1(2);
      obs2(3);
      obs3(4);
      assert.strictEqual(computed(), 9);
    });

    await t1.test("should notify subscribers of the computed observable", () => {
      const obs1 = observable(1);
      const obs2 = observable(2);
      const computed = from((a, b) => a + b, obs1, obs2);
      const notified: number[] = [];
      computed.subscribe((newValue) => notified.push(newValue));
      obs1(2);
      obs2(3);
      assert.deepStrictEqual(notified, [4, 5]);
    });

    await t1.test("should stop updating after unsubscribe", () => {
      const obs1 = observable(1);
      const obs2 = observable(2);
      const computed = from((a, b) => a + b, obs1, obs2);
      computed.unsubscribe();
      obs1(10);
      obs2(20);
      assert.strictEqual(computed(), 3);
    });
  });
});
