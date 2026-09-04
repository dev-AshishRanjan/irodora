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

import preset from 'jest-expo/jest-preset.js';

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
  //
  //    `@noble` is on the list for the same reason and a different package (F-018,
  //    ADR-0066): `@noble/hashes` is ESM-only, so untransformed it dies on `import` before a
  //    single corpus assertion runs. Metro handles it natively — this line is the jest half.
  transformIgnorePatterns: [
    '/node_modules/(?!(\\.pnpm|react-native|@react-native|@react-native-community|expo|@expo|@expo-google-fonts|react-navigation|@react-navigation|@sentry/react-native|native-base|standard-navigation|heroui-native|uniwind|react-native-svg|react-native-reanimated|react-native-worklets|react-native-gesture-handler|@gorhom|@noble))',
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
