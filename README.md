# Compute [![Run Tests](https://github.com/akshat1/compute/actions/workflows/tests_and_docs.yml/badge.svg)](https://github.com/akshat1/compute/actions/workflows/tests_and_docs.yml)
An extremely simple reactive programming library using Observables. Written in TypeScript; ships with type definitions.

## Wait, what is an Observable?

An observable variable is a function, which holds a value. You can get the value by calling the function without any arguments, and you update the value by calling the function _with_ the desired new value.

The useful thing about an observable is that you can choose to be notified every time the value of this observable changes.

```ts
import { observable, onChange } from "compute";

// Create a new observable.
const o1 = observable(42);

// Access the value
console.log(o1()); // Logs 42

// Subscribe to it
const mySubscription = onChange(newValue => console.log(newValue), o1);

// Update the value
o1(84);  // Console shows 84

// You won't get notified until the value changes (strict equality).
o1(84);  // Nothing happens.

// Stop getting notifications
mySubscription.unsubscribe();
```

## `onChange()`: React to observable value changes.

As demonstrated above, `onChange` lets you subscribe to observables. In fact, you can also subscribe to multiple variables.

```ts
import { observable, onChange } from "compute";
const a = observable(1);
const b = observable(2);
const c = observable(3);
const sum = (x: number, y: number, z: number) => console.log(`The sum is ${x + y + z}`);
onChange(sum, a, b, c); // Nothing happens so far
a(2); // Console shows "The sum is 7"
b(3); // Console shows "The sum is 8"
```

## `from()`: Define an observable based on the value of other observables.

```ts
import { observable, onChange, from } from "compute";
const a = observable(1);
const b = observable(2);
const c = observable(3);
const getSum = (...values: number[]) => values.reduce((total, x) => total + x, 0);
const sum = from(
  getSum,
  a,
  b,
  c,
);
console.log(sum()); // Prints 6
a(2);
console.log(sum()); // Prints 7

// And because sum is an observable, you can subscribe to it.
onChange(x => console.log(x), sum);
a(3); // Console shows 8
b(3); // Console shows 9
c(0); // Console shows 6

// When you no longer need the computed observable, detach it from its
// sources so they don't keep notifying (and retaining) it.
sum.unsubscribe();
```

# Installation

```sh
npm install compute
```

Or if you are using yarn,

```sh
yarn add compute
```

And then in your code, simply import

```ts
import { observable, onChange, from } from "compute";
```

TypeScript definitions are bundled — no `@types` package needed. The library is published as an ES module.

# Docs

You can see the API at https://akshat1.github.io/compute/
