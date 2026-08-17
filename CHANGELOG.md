# Changelog

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
