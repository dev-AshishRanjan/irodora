/**
 * The app's test runner (ADR-0055).
 *
 * Jest rather than Vitest here and in `packages/ui` only — everywhere else in the repository
 * is Vitest. The reason is that the screens must be RENDERED to be checked, and
 * `@testing-library/react-native` declares `jest` as a peer dependency. The version set is a
 * unit and must move together; see `packages/ui/jest.config.mjs`.
 *
 * `apps/mobile` was on Vitest until F-017. Running two runners inside ONE package would mean
 * two configs fighting over the same `test/` directory, so the package moved wholesale.
 */

/** @type {import('jest').Config} */
export default {
  preset: 'jest-expo',
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.tsx', '**/test/**/*.test.ts'],
  // There WAS a `moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' }` here, commented "NodeNext
  // source writes `./engine.js` for `./engine.ts`; jest resolves that literally". It is gone,
  // and its removal is the point rather than tidying.
  //
  // This app resolves through **Metro**, and `tsconfig.json` says so: `moduleResolution:
  // "bundler"`, whose own comment reads *"extensionless relative imports … no `.js` suffix
  // required on a `.tsx` sibling"*. The source was written in the other convention anyway —
  // the NodeNext style `packages/*` correctly uses — and three checks accommodated it instead
  // of catching it. `typecheck` permits both forms under `bundler`. Lint has no extension
  // rule. And this mapper made jest permit it too.
  //
  // Metro does not. It resolves literally, it was the only consumer that would ever object,
  // and it had never run — so the first bundle, fifteen minutes into a Gradle build, was
  // where it surfaced. Somebody had noticed the mismatch, written a workaround and documented
  // it, which removed the last signal that would have shown it earlier.
  //
  // Without the mapper, jest resolves what Metro resolves, and a reintroduced `.js` fails in
  // seconds rather than in a device build. `scripts/verify-app-imports.mjs` is the guard.
  passWithNoTests: false,
};
