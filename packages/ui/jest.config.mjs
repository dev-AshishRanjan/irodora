/**
 * The render harness (ADR-0055).
 *
 * `jest-expo` rather than Vitest, in a repository where Vitest is otherwise universal. The
 * reasons are in the ADR; the short version is that `@testing-library/react-native` declares
 * `jest` as a peer dependency, and this gate is blocking — a gate we cannot run is a gate
 * failing open [[a-gate-that-errors-is-failing-open]].
 *
 * **The version set is a unit and must move together**: `jest@29.7.0`, `jest-expo@57.0.4`,
 * `@testing-library/react-native@13.3.3`, `react-test-renderer@19.2.3`. `jest-expo@57` is
 * built on Jest 29 internals, and `jest@30` beside it dies with
 * `this._moduleMocker.clearMocksOnScope is not a function` before running a single test
 * [[peerdependencies-did-not-name-the-constraint-that-broke-the-install]].
 */

/** @type {import('jest').Config} */
export default {
  preset: 'jest-expo',
  // `ios` only. The suite asserts over the accessibility TREE, which is the same on both
  // platforms; running every file twice would double the wall clock to re-prove it. Anything
  // genuinely platform-specific belongs in the device attestation, not here.
  testEnvironment: 'node',
  testMatch: ['**/test/**/*.test.tsx', '**/test/**/*.test.ts'],
  // The repo compiles with `module: NodeNext` and `verbatimModuleSyntax`, so TypeScript
  // source must write `./tree.js` when importing `./tree.ts`. Jest resolves that literally
  // and cannot find it. Stripping the extension for RELATIVE specifiers only — a bare
  // specifier like `react-native` must still go through normal resolution.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  // A harness with no subjects is not a passing harness. The scope reporter (increment 10)
  // enforces this for the gate; this is the same rule for the package's own run.
  passWithNoTests: false,
};
