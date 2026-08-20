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
  // NodeNext source writes `./engine.js` for `./engine.ts`; jest resolves that literally.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  passWithNoTests: false,
};
