// ---------------------------------------------------------------------------
// Irodora — root ESLint flat configuration.
//
// Activates with F-001 (toolchain scaffold), when the plugins below are
// installed. Each package runs `eslint .` against its own tsconfig.json so
// type-aware rules get a real TypeScript program without building one giant
// program over the whole monorepo.
//
// The architectural rules in this file are not style preferences — they are
// the compile-time enforcement of the boundaries described in
// docs/adr/0001-monorepo-modular-monolith-with-extraction-triggers.md. They
// are what make "extract this context into a service later" a deployment
// change rather than a refactor.
// ---------------------------------------------------------------------------

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import-x';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/.turbo/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/*.golden.json',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,

  {
    languageOptions: {
      parserOptions: {
        // tsconfig.json is the LINT project (src + tests, noEmit).
        // tsconfig.build.json is what emits. Keeping them separate is what
        // lets the linter and the editor see the same file set as typecheck.
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: { 'import-x': importPlugin },
    rules: {
      // --- Correctness that the compiler cannot see -------------------------
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports' },
      ],

      // require-await is deliberately absent: in practice it produces noise
      // on async functions that exist to satisfy an interface, and mechanical
      // "fixes" for it have caused real regressions elsewhere.

      // --- Package boundaries ----------------------------------------------
      // Reaching into another workspace package's internals defeats the
      // boundary. Import its public entry point or nothing.
      'import-x/no-relative-packages': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@irodora/*/src/*', '@irodora/*/dist/*'],
              message:
                'Import the package entry point, not its internals. Internal paths are not a contract and will break silently.',
            },
            {
              group: ['../../../*'],
              message:
                'Three levels up means you have crossed a boundary. Import through a package entry point instead.',
            },
          ],
        },
      ],
    },
  },

  // --- The colour engine: the strictest zone in the repository -------------
  // These packages must stay pure, dependency-free and portable to WASM.
  // Anything platform-specific here would break the identity guarantee that
  // web, mobile, API and worker all compute the same colour.
  {
    files: ['packages/color-*/**/*.ts', 'packages/cvd-engine/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'fs', 'path', 'crypto', 'os'],
              message:
                'The colour engine must run identically in Node, the browser and React Native. No platform APIs. See .harness/rules/color/color-science.md',
            },
          ],
        },
      ],
      'no-restricted-globals': [
        'error',
        { name: 'window', message: 'The colour engine is platform-neutral.' },
        { name: 'document', message: 'The colour engine is platform-neutral.' },
        { name: 'process', message: 'The colour engine is platform-neutral.' },
      ],
      // Floating-point behaviour must be explicit and auditable in colour maths.
      'no-loss-of-precision': 'error',
    },
  },

  // --- Tests -------------------------------------------------------------
  {
    files: ['**/*.test.ts', '**/*.spec.ts', 'tests/**/*.ts'],
    rules: {
      // Tests may assert on shapes the production types forbid, but they may
      // not silently opt out of the contract. See
      // docs/adr/0023-testing-golden-property-conformance-e2e.md
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
    },
  },
);
