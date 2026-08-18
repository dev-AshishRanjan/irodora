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
      // Emitted from docs/design/design-system.manifest.json and byte-compared by
      // packages/design-tokens/test/emit.test.ts. Linting generated output means editing
      // the emitter to satisfy a style rule, and the byte comparison is what actually
      // guards these files.
      'packages/design-tokens/src/generated/**',
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
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],

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
      // NOTE: a later config object REPLACES `no-restricted-imports` rather than
      // merging with it, so the workspace-wide patterns are repeated here. Omitting
      // them would silently disable deep-import protection in exactly the packages
      // that need it most. Caught by tests/guards — see scripts/verify-guards.mjs.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'fs', 'path', 'crypto', 'os'],
              message:
                'The colour engine must run identically in Node, the browser and React Native. No platform APIs. See .harness/rules/color/color-science.md',
            },
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

  // --- The contract layer --------------------------------------------------
  // A Zod schema here is the single source of runtime validation, TypeScript types AND the
  // OpenAPI document (ADR-0012). A hand-written type sitting beside a schema breaks that:
  // it compiles, it looks correct, and it diverges silently the first time only one of the
  // two is edited. So the shape declarations this package may contain are schemas, and
  // every type it exports is inferred from one.
  //
  // NOTE: this object sets only `no-restricted-syntax`, so the workspace-wide
  // `no-restricted-imports` above still applies here — a later flat-config object replaces
  // a rule per KEY, not the whole rules block. Guard #4 in scripts/verify-guards.mjs lints
  // this exact directory and would go red if that ever stopped being true.
  {
    files: ['packages/contracts/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSInterfaceDeclaration',
          message:
            'Declare a Zod schema and export `z.infer<typeof schema>`. An interface here duplicates a schema and will diverge from it silently. See .harness/rules/typescript/typescript.md',
        },
        {
          // Descendant, not child. `> TSTypeLiteral` only catches `type X = { … }` and is
          // defeated by any wrapping — `Readonly<{ … }>`, `{ … }[]`, `{ … } & { … }`.
          selector: 'TSTypeAliasDeclaration TSTypeLiteral',
          message:
            'An object-literal type alias here duplicates a schema, however it is wrapped. Declare the schema and export `z.infer<typeof schema>` instead. See .harness/rules/typescript/typescript.md',
        },
        {
          // The form that matters most in this package: the two engine types it duplicates
          // — ColorSpace and MeasurementSource — are string unions, and a union is not a
          // type literal, so the selectors above never see one.
          selector: 'TSTypeAliasDeclaration > TSUnionType',
          message:
            'A union type alias here duplicates an enum. Declare `z.enum([…])` and export `z.infer<typeof schema>` instead — the wire needs the runtime values, not only the type. See .harness/rules/typescript/typescript.md',
        },
        {
          selector: 'TSTypeAliasDeclaration > TSIntersectionType',
          message:
            'An intersection type alias here composes a shape outside the schema layer. Compose the schemas instead, so validation and types stay one artefact.',
        },
        {
          selector: 'TSEnumDeclaration',
          message:
            'A TypeScript enum here duplicates a `z.enum([…])` and validates nothing. Declare the schema and export `z.infer<typeof schema>` instead.',
        },
      ],
    },
  },

  // The published contract surface ships to every runtime we have — Fastify, the browser
  // via apps/web, and React Native via apps/mobile (E-004). It is not in the colour-engine
  // zone, but it carries the same portability obligation for the same reason: a `node:fs`
  // import here is a crash on a phone, discovered by a user.
  //
  // Tests are excluded: they run in Node by definition, and a test that needs a file or a
  // path to set up a fixture should not have to fight the rule that protects the shipped
  // bundle. Nothing in src is exempt.
  {
    files: ['packages/contracts/src/**/*.ts'],
    ignores: ['packages/contracts/src/**/*.test.ts'],
    rules: {
      // NOTE: the workspace-wide patterns are repeated. A later flat-config object REPLACES
      // `no-restricted-imports` rather than merging with it, so omitting them here would
      // silently legalise deep imports in this package. Guard #4 lints this exact directory
      // and is what proves the statement above is still true.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'fs', 'path', 'crypto', 'os'],
              message:
                'The contract layer is imported by the browser and by React Native. No platform APIs in src — a node:* import here is a crash on a phone.',
            },
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

  // `@irodora/corpus` is NOT in the colour-engine zone — `packages/color-*` and
  // `packages/cvd-engine` are, and `corpus` matches neither. It carries the same obligation
  // anyway, and the reason is F-013: colour naming is blocked by F-011, lives in
  // `packages/color-naming`, and will import this package. At that moment a `node:fs` inside
  // corpus is a `node:fs` inside the engine, and NFR-3 is the one guarantee that cannot bend.
  //
  // The override lands BEFORE there is a consumer to break, because the alternative is
  // discovering it from a React Native crash. `scripts/verify-engine-purity.mjs` does not
  // follow `@irodora/*` dependency edges out of an engine package, so nothing else would
  // catch it — that gap is recorded as F-073 rather than papered over here.
  //
  // Tests are excluded: they run in Node by definition, and a fixture that needs to read a
  // file should not have to fight the rule protecting the shipped bundle. Nothing in src is
  // exempt — the gate script in `scripts/` is where the filesystem lives.
  {
    files: ['packages/corpus/src/**/*.ts'],
    ignores: ['packages/corpus/src/**/*.test.ts'],
    rules: {
      // NOTE: the workspace-wide patterns are repeated. A later flat-config object REPLACES
      // `no-restricted-imports` rather than merging with it, so omitting them here would
      // silently legalise deep imports in this package. Guard #11 lints this exact directory
      // and is what proves the statement above is still true.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'fs', 'path', 'crypto', 'os'],
              message:
                'The corpus schema is imported by the colour engine (F-013), which must be byte-identical in Node, the browser and React Native. No platform APIs in src — read files in scripts/, and take the text as an argument.',
            },
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

  // A route registered with a bare `app.get` bypasses `route()` — and therefore bypasses the
  // requirement that it declare a schema for every response status. Nothing breaks visibly: the
  // route works, the tests pass, and the generated OpenAPI document silently omits it, so the
  // SDK gives consumers no type for what they receive (`apps/api/AGENTS.md`).
  //
  // `src/http/` is exempt because that is where `route()` itself calls `app.route`. Everything
  // else goes through the wrapper. Guard #12 plants a violation at a real path outside that
  // directory and asserts this rule fires — a rule nobody has watched fail is configuration
  // that parses, not a boundary.
  {
    files: ['apps/api/src/**/*.ts'],
    ignores: ['apps/api/src/http/**/*.ts'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'CallExpression[callee.type="MemberExpression"][callee.property.name=/^(get|post|put|patch|delete|route|head|options|all)$/][callee.object.name=/^(app|server|fastify|instance)$/]',
          message:
            'Register routes with `route()` from src/http/route.ts, not directly on the ' +
            'instance. A bare app.get skips the requirement to declare a schema for every ' +
            'response status, and the only symptom is a route missing from the OpenAPI document.',
        },
      ],
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
