# Changelog

## 3.0.0

A rewrite of the reactive core, bringing the semantics in line with the modern
signals model (as in the TC39 Signals proposal), while keeping the callable
observable API. Zero dependencies, as always.

- **`from` now takes a single function and tracks dependencies automatically.**
  Whatever observables the function reads become its dependencies, re-tracked on
  every evaluation (conditional reads narrow/widen them dynamically).
  - Migration: `from(fn, a, b)` → `from(() => fn(a(), b()))`.
- **`from` is lazy and memoized.** The function does not run until the computed
  is first read, re-runs at most once per change, and a re-evaluation that
  produces an equal value stops propagation (dependents don't re-evaluate).
  Diamond-shaped dependency graphs are glitch-free: a computed never observes a
  mix of fresh and stale inputs.
- **Breaking: `from` observables are read-only.** Writing to one throws a
  `TypeError` (and is a compile error in TypeScript). Writable derived state
  was an oversight in earlier versions.
- **Breaking: `from` no longer has an `unsubscribe` method.** An unobserved
  computed holds no references from its sources and is simply garbage-collected;
  there is nothing to detach.
- **New: `effect(fn, options?)`.** Runs `fn` immediately, auto-tracks its reads,
  and re-runs when any of them change. By default re-runs are batched on a
  microtask — several writes in the same tick produce one re-run observing the
  final state. Pass `{ sync: true }` to re-run at each write. Returns a
  `Subscription`; `unsubscribe()` disposes the effect. Effects that write their
  own dependencies re-run until stable; an effect that never stabilizes is
  disposed and an error is thrown (for batched effects this surfaces as an
  uncaught exception from the microtask flush). Effects are never
  garbage-collected while registered — dispose them when done.
- Computed functions must be pure and synchronous: writing to an observable
  during a computed evaluation throws a `TypeError` (matching the TC39 Signals
  proposal's rule for computed signals). Write from effects instead. `async`
  functions are not supported as computeds — the purity guard only covers the
  synchronous evaluation.
- **New: `untrack(fn)`.** Reads inside `fn` are not registered as dependencies
  of the enclosing computed or effect.
- **Breaking: `onChange` removed.**
  - Migration: `onChange(fn, a, b)` → `effect(() => fn(a(), b()), { sync: true })`.
    Note one deliberate difference: an effect also runs once at creation,
    whereas `onChange` only fired on changes.
- **Breaking: `gather` removed** (it existed to unpack explicit dependency
  lists, which no longer exist).
- `observable` and `subscribe` behave exactly as in 2.x: writable, strict
  equality change detection, synchronous subscriber notification. `subscribe`
  also works on computeds (notified synchronously when the computed's value
  actually changes).
- Types: `Observable<T>` is now writable-observable specifically;
  `ReadonlyObservable<T>` is what `from` returns; `ObservableValues` was
  removed along with explicit dependency lists.

## 2.0.0

- Migrated the library to TypeScript. The published package now ships compiled ESM
  plus bundled type declarations (`.d.ts`), source maps, and declaration maps. The
  TypeScript sources are included in the package so the maps resolve.
- The runtime API is unchanged: `observable`, `isObservable`, `onChange`, `from`,
  and `gather` behave as before. The major version bump reflects the size of the
  change and the new packaging, not an intentional API break.
- Packaging changes (potentially breaking for deep imports):
  - Code moved from `lib/` to compiled `dist/`; an `exports` map now restricts
    imports to the package root. Deep imports like `compute/lib/Observable.js`
    no longer work — import everything from `"compute"`.
  - Test files are no longer included in the published package.
- Bug fixes:
  - Removed a stray `console.log` that fired on every recomputation of a `from()`
    observable.
  - Observers that unsubscribe (or unsubscribe others) while a notification is
    being delivered no longer cause other observers to be skipped; observers
    removed mid-notification are no longer notified.
  - Fixed several incorrect examples in the README (a nonexistent `when()`
    function, a nonexistent `compute` export, and a broken `reduce` call).
- Tooling:
  - Docs are now generated with TypeDoc (previously JSDoc).
  - The project now uses npm instead of yarn (`package-lock.json` replaces
    `yarn.lock`).
  - CI type-checks and builds on Node 22 and 24, and fixes doc publishing (it was
    gated on a `main` branch that doesn't exist; the branch is `master`).

## 1.0.0

- Rewritten from previous version.
- Removed outdated tooling (like bower etc.).
- Breaking: API changed.
  - Removed `o` and `oa` functions.
  - Removed `ObservableArray` entirely.
  - See current API at https://akshat1.github.io/compute/
- Switched from Travis-CI to github actions.
- Set up auto publishing of JSDoc.
