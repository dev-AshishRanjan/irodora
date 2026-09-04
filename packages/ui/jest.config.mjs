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

import preset from 'jest-expo/jest-preset.js';

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

  /*
   * THE THREE PIECES THAT LET A HeroUI TREE RENDER HERE (F-087, ADR-0062).
   *
   * Each was found by running it, and each has a distinct failure without which the suite
   * does not merely miss something — it refuses to start.
   */

  // 1. jest-expo's own allow-list already names `.pnpm`, which covers the FIRST
  //    /node_modules/ in a pnpm path. pnpm then nests a SECOND — .pnpm/<pkg>@<ver>/
  //    node_modules/<pkg>/ — and the allow-list never sees it, so heroui-native's ESM
  //    reaches the runtime untransformed and dies on `export *`. The packages are named
  //    explicitly because that second segment is what has to match.
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|heroui-native|uniwind|react-native-svg|react-native-reanimated|react-native-worklets|react-native-gesture-handler|@gorhom))',
    '/node_modules/react-native-reanimated/plugin/',
    '/node_modules/@react-native/babel-preset/',
  ],

  // 2. Worklets' `.native` entry expects a native runtime and throws
  //    `loadUnpackersWithCode of undefined` on import. Its own resolver strips the `.native`
  //    extension so the non-native build loads instead. Reanimated is NOT mocked — its mock
  //    omits `useReducedMotion`, which HeroUI's animation provider calls on first render.
  resolver: 'react-native-worklets/jest/resolver.js',

  /*
   * 3. THE PRESET'S OWN SETUP FILES, KEPT — and this line replaced them until F-158.
   *
   * `setupFiles` in a config OVERRIDES the preset's array rather than extending it, and
   * `jest-expo` supplies two: React Native's official `@react-native/jest-preset/jest/setup.js`
   * and Expo's. RN's is the one that mocks the native modules that do not exist outside a
   * device — `SettingsManager`, `DevMenu`, and the rest of `TurboModuleRegistry.getEnforcing`.
   *
   * **They had never loaded here.** Nothing noticed, because nothing in the suite had reached a
   * lazy native getter — until a bottom sheet did. A sheet animates, so reanimated installs a
   * mapper; `extractInputs` walks any PLAIN OBJECT among its inputs with `Object.values`, that
   * walk reaches React Native's module namespace, and the namespace's lazy getters call
   * `getEnforcing` one after another. It throws on a timer after the render, so it presents as
   * an unattributable async failure rather than as a render error, and stubbing each module as
   * it appears is a game with no end.
   *
   * Spread rather than listed: whatever the preset adds next arrives without an edit here, which
   * is the property that was missing.
   */
  setupFiles: [...(preset.setupFiles ?? []), '<rootDir>/jest.setup.js'],
};
