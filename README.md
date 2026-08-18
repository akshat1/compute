# Compute [![Run Tests](https://github.com/akshat1/compute/actions/workflows/tests_and_docs.yml/badge.svg)](https://github.com/akshat1/compute/actions/workflows/tests_and_docs.yml)
An extremely simple reactive programming library using Observables. Written in TypeScript, zero dependencies, ships with type definitions.

Version 3 brings the semantics in line with the modern signals model — automatic dependency tracking, lazy memoized computeds, glitch-free updates, and batched effects — while keeping the callable observable API this library has always had.

## Wait, what is an Observable?

An observable variable is a function, which holds a value. You can get the value by calling the function without any arguments, and you update the value by calling the function _with_ the desired new value.

```ts
import { observable } from "compute";

const count = observable(42);

count();    // 42
count(43);  // sets the value; anything depending on count is notified
```

Changes are detected with strict equality: setting the same value again does nothing.

## `from()`: derive values

`from` defines an observable computed from other observables. You don't declare dependencies — whatever observables the function reads are tracked automatically.

```ts
import { observable, from } from "compute";

const a = observable(1);
const b = observable(2);
const sum = from(() => a() + b());

sum();  // 3
a(10);
sum();  // 12
```

Computed observables are:

- **Read-only.** Writing to one throws a `TypeError` (and is a compile error in TypeScript). Write to the sources instead.
- **Lazy and memoized.** The function doesn't run until the computed is read, and re-runs only when a dependency actually changed. If a re-evaluation produces an equal value, dependents don't re-evaluate at all.
- **Glitch-free.** In a diamond-shaped graph (two computeds derived from the same source, combined by a third), the combining computed never observes a mix of fresh and stale inputs.
- **Dynamically tracked.** `from(() => flag() ? a() : b())` only depends on `b` while `flag` is false — changes to `a` don't even mark it stale.

## `effect()`: react to changes

`effect` runs a function immediately, tracks the observables it reads, and re-runs it when any of them change — however many degrees of `from` sit in between.

```ts
import { observable, from, effect } from "compute";

const price = observable(10);
const quantity = observable(2);
const total = from(() => price() * quantity());

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
effect(() => console.log(price()), { sync: true });  // logs the current price immediately
price(20);  // logs 20 immediately, during the write
```

Two things to know about effects:

- **Dispose them.** Unlike computeds, effects stay registered until you call `unsubscribe()` — they are never garbage-collected on their own. Avoid creating effects inside other effects: each run of the outer effect would register a fresh inner one.
- **Computed functions must be pure and synchronous.** `from` functions may only read; writing to an observable during a computed evaluation throws a `TypeError`. (The guard covers the synchronous evaluation — `async` functions are not supported as computeds.) Reacting to changes — including writing other observables — is what `effect` is for. An effect that writes to its own dependencies re-runs until stable, and is disposed with an error if it never stabilizes.

## `untrack()`: read without depending

Inside a computed or effect, wrap a read in `untrack` to use a value without subscribing to it:

```ts
const label = observable("count");
const count = observable(0);

effect(() => {
  console.log(`${untrack(() => label())}: ${count()}`);
});
// re-runs when count changes; changes to label are ignored
```

## `subscribe()`: low-level notifications

Every observable — including computeds — has a `subscribe` method for synchronous, per-change notification with old and new values:

```ts
const count = observable(1);
const sub = count.subscribe((newValue, oldValue) => {
  console.log(`${oldValue} -> ${newValue}`);
});
count(2);  // logs "1 -> 2"
sub.unsubscribe();
```

Prefer `effect` for application logic; `subscribe` is the low-level primitive.

# Installation

```sh
npm install compute
```

```ts
import { observable, from, effect, untrack } from "compute";
```

TypeScript definitions are bundled — no `@types` package needed. The library is published as an ES module.

## Migrating from 2.x

| 2.x | 3.x |
|---|---|
| `from(fn, a, b)` | `from(() => fn(a(), b()))` |
| `someComputed.unsubscribe()` | not needed — unobserved computeds are garbage-collected |
| `onChange(fn, a, b)` | `effect(() => fn(a(), b()), { sync: true })` — note effects also run once at creation |
| writing to a `from` observable | throws; write to its sources |

# Docs

You can see the API at https://akshat1.github.io/compute/
