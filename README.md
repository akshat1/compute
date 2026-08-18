# Compute [![Run Tests](https://github.com/akshat1/compute/actions/workflows/tests_and_docs.yml/badge.svg)](https://github.com/akshat1/compute/actions/workflows/tests_and_docs.yml)

An extremely simple reactive programming library built on signals. Written in TypeScript, zero dependencies, ships with type definitions.

> **3.0.0 is currently in beta** (`npm install compute@beta`). Issues and feedback welcome.

```ts
import { signal, computed, effect } from "compute";

const price = signal(10);
const quantity = signal(2);
const total = computed(() => price() * quantity());

effect(() => console.log(`Total: ${total()}`));
// logs "Total: 20"

price(15);
quantity(3);
// logs "Total: 45" — once, on the next microtask
```

## Wait, what is a signal?

A signal is a value that knows who depends on it. Reading a signal inside a computed value or an effect registers a dependency, so when the signal changes, everything derived from it is brought up to date automatically — you never wire up (or forget to remove) a listener by hand.

In compute, a signal is represented as a callable function: call it with no arguments to read, call it with a value to write.

```ts
const count = signal(42);

count();    // 42 — and if called inside computed()/effect(), registers a dependency
count(43);  // write; everything depending on count is now stale
```

There are two kinds:

- **Writable signals**, made with `signal(initialValue)`.
- **Derived (read-only) signals**, made with `computed(fn)` — their value comes from other signals and cannot be written directly.

Changes are detected with strict equality: setting the same value again does nothing.

If you've met this concept as *signals* in modern frameworks or the [TC39 Signals proposal](https://github.com/tc39/proposal-signals) — same concept; this library follows the proposal's semantics. (Earlier versions of this library called them *observables*, a name this concept went by for years — not to be confused with RxJS Observables, which are streams.)

# Installation

```sh
npm install compute@beta
```

```ts
import { signal, computed, effect, untrack } from "compute";
```

TypeScript definitions are bundled — no `@types` package needed. The library is published as an ES module.

## `computed()`: derive values

`computed` defines a signal calculated from other signals. You don't declare dependencies — whatever signals the function reads are tracked automatically.

```ts
const a = signal(1);
const b = signal(2);
const sum = computed(() => a() + b());

sum();  // 3
a(10);
sum();  // 12
```

## `effect()`: react to changes

`effect` runs a function immediately, tracks the signals it reads, and re-runs it when any of them change — however many layers of `computed` sit in between.

```ts
const price = signal(10);
const quantity = signal(2);
const total = computed(() => price() * quantity());

const subscription = effect(() => {
  console.log(`Total: ${total()}`);
});
// logs "Total: 20" immediately

price(15);
quantity(3);
// logs "Total: 45" — once, on the next microtask

subscription.unsubscribe();  // stop reacting
```

By default effects are **batched**: all writes in the same tick coalesce into a single re-run that observes the final state. If you need to react synchronously at each write, pass `{ sync: true }`:

```ts
const price = signal(10);
effect(() => console.log(price()), { sync: true });  // logs 10 immediately
price(20);  // logs 20 immediately, during the write
```

## `untrack()`: read without depending

Inside a computed or effect, wrap a read in `untrack` to use a value without subscribing to it:

```ts
const label = signal("count");
const count = signal(0);

effect(() => {
  console.log(`${untrack(() => label())}: ${count()}`);
});
// re-runs when count changes; changes to label are ignored
```

## `subscribe()`: low-level notifications

Every signal — including computeds — has a `subscribe` method for synchronous, per-change notification with old and new values:

```ts
const count = signal(1);
const sub = count.subscribe((newValue, oldValue) => {
  console.log(`${oldValue} -> ${newValue}`);
});
count(2);  // logs "1 -> 2"
sub.unsubscribe();
```

Prefer `effect` for application logic; `subscribe` is the low-level primitive.

## Semantics & rules

These are the library's contracts:

- **Strict equality change detection.** A write (or a computed re-evaluation) that produces a `!==`-equal value is not a change: nothing downstream is notified or re-evaluated.
- **Computeds are lazy and memoized.** A computed's function doesn't run until the computed is read, and re-runs at most once per change — only when a dependency actually changed.
- **Updates are glitch-free.** In a diamond-shaped graph (two computeds derived from the same signal, combined by a third), the combining computed never observes a mix of fresh and stale inputs.
- **Dependencies are dynamic.** `computed(() => flag() ? a() : b())` only depends on `b` while `flag()` is false — changes to `a` don't even mark it stale.
- **Computed functions must be pure and synchronous.** Writing to a signal during a computed evaluation throws a `TypeError`; `async` functions are not supported as computeds. Reacting to changes — including writing other signals — is what `effect` is for.
- **Effects must be disposed.** Unlike computeds (which are garbage-collected when unobserved, no cleanup needed), effects stay registered until you call `unsubscribe()`. Avoid creating effects inside other effects or computeds. An effect that writes to its own dependencies re-runs until stable, and is disposed with an error if it never stabilizes.
- **Computeds are read-only.** Writing to one throws a `TypeError` at runtime and is a compile error in TypeScript.

## Migrating from 2.x

| 2.x | 3.x |
|---|---|
| `observable(v)` | `signal(v)` |
| `isObservable(v)` | `isSignal(v)` |
| `from(fn, a, b)` | `computed(() => fn(a(), b()))` — dependencies are now tracked automatically |
| `someComputed.unsubscribe()` | not needed — unobserved computeds are garbage-collected |
| `onChange(fn, a, b)` | `effect(() => fn(a(), b()), { sync: true })` — note effects also run once at creation |
| `gather(a, b)` | `[a(), b()]` |
| writing to a `from` observable | throws; write to its sources |
| `Observable<T>` / `ReadonlyObservable<T>` (types) | `Signal<T>` / `ReadonlySignal<T>` |

# Docs

You can see the API at https://akshat1.github.io/compute/
