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
import globals from 'globals';

/**
 * Colour may not be written into source, in any notation — hex, functional, named, or a
 * Tailwind utility class.
 *
 * **Shared, because flat config REPLACES a rule's options rather than merging them.** Two
 * config objects both naming `no-restricted-syntax` over the same file silently disarm one
 * of them, and that had already happened here: the screens zone below meant a hex colour in
 * `apps/mobile/src/screens/**` — the files most likely to contain one — was caught by
 * nothing at all. Found by `verify-guards.mjs` while adding the className rules in F-087,
 * after the same mistake was made a second time.
 */
const COLOUR_LITERAL_SELECTORS = [
  {
    selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
    message:
      'A hex colour belongs in docs/design/design-system.manifest.json, not in source. ' +
      'The contrast and cvd gates read the manifest; a value typed here is checked by ' +
      'neither and is indistinguishable from one that passed. Import it from ' +
      '@irodora/design-tokens.',
  },
  {
    // `transparent` is deliberately absent: it is the absence of a colour, it makes no
    // claim a gate could check, and RN's border-triangle trick has no alternative.
    selector:
      'Literal[value=/^(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch|color-mix)\\(/], Literal[value=/^(?:red|green|blue|black|white|gray|grey|yellow|orange|purple|pink|cyan|magenta)$/]',
    message:
      'A colour value belongs in docs/design/design-system.manifest.json, not in ' +
      'source. Import it from @irodora/design-tokens. (`transparent` is allowed — it ' +
      'is the absence of a colour and makes no claim a gate could check.)',
  },
  // --- and colour may not travel through a Tailwind class either (F-087) ---
  //
  // THE RULE THE SPIKE EXISTED TO FIND. Uniwind resolves className in its METRO plugin,
  // and jest never runs Metro — so a colour routed through a class is absent from the
  // rendered tree, and the contrast and cvd gates go on passing over nothing
  // [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]].
  //
  // These live in THIS rule rather than a zone of their own: flat config replaces a
  // rule's options wholesale, so a second zone naming no-restricted-syntax over the same
  // files would disarm the hex ban above. verify-guards.mjs caught exactly that.
  //
  // className remains right for everything a gate does not read — layout, spacing,
  // radius, weight. Only colour has to come through `style`.
  {
    selector:
      "JSXAttribute[name.name='className'] Literal[value=/\[(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\()/]",
    message:
      'An arbitrary colour in a Tailwind class is invisible to the contrast gate — ' +
      'Uniwind resolves className in Metro, which jest does not run, so the rendered ' +
      'tree carries no colour to measure. Pass a resolved token through the style prop.',
  },
  {
    selector:
      "JSXAttribute[name.name='className'] :matches(Literal[value=/\b(?:bg|text|border|ring|fill|stroke|shadow|decoration|outline|divide|placeholder|caret|accent|from|via|to)-(?:background|foreground|surface|overlay|backdrop|muted|default|accent|field|success|warning|danger|segment|separator|focus|link|border)\b/], TemplateElement[value.raw=/\b(?:bg|text|border|ring|fill|stroke|shadow|decoration|outline|divide|placeholder|caret|accent|from|via|to)-(?:background|foreground|surface|overlay|backdrop|muted|default|accent|field|success|warning|danger|segment|separator|focus|link|border)\b/])",
    message:
      'A colour utility class is invisible to the contrast gate — Uniwind resolves ' +
      'className in Metro, which jest does not run, so the rendered tree carries no ' +
      'colour to measure and the gate passes over nothing. Pass the resolved token ' +
      'through the style prop instead; className stays correct for layout and spacing.',
  },
];

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
      // The pinned corpus bundle, ~450 KB of JSON in a string literal, emitted by
      // scripts/generate-corpus-bundle.mjs and byte-compared by `--check` in gate 11
      // (ADR-0066). Nothing here is authored.
      'apps/mobile/src/corpus/generated/**',
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

  // --- Tests -------------------------------------------------------------
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/*.test.tsx', 'tests/**/*.ts'],
    rules: {
      // Tests may assert on shapes the production types forbid, but they may
      // not silently opt out of the contract. See
      // docs/adr/0023-testing-golden-property-conformance-e2e.md
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
    },
  },

  // --- The Lens may not compute colour, and may not keep a frame ------------
  //
  // Two rules, and NEITHER is checkable by any test that runs here, which is why they are
  // lints rather than assertions.
  //
  // 1. COLOUR MATHS MAY NOT DRIFT INTO THE APP. apps/mobile/AGENTS.md: "The engine is
  //    imported, never ported." E-008 records why it cannot be caught by testing: a
  //    mobile-only re-implementation makes the same fabric measure differently on two
  //    surfaces, both surfaces pass their own tests, and nothing runs both. The temptation is
  //    specific — a worklet cannot call arbitrary JavaScript, so when the engine will not run
  //    there the easy fix is to inline the arithmetic.
  //
  // 2. A FRAME MAY NOT REACH DISK. NFR-12 and ADR-0026: ordinary colour detection never
  //    transmits or stores imagery. A debug write during development is how that stops being
  //    true, and it would survive review as a one-line change.
  {
    files: ['apps/mobile/src/lens/**/*.{ts,tsx}', 'apps/mobile/app/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              // Repeated rather than shared: flat config replaces this array wholesale for a
              // file matched by two zones, and the Lens is deliberately EXCLUDED from the
              // app-wide HeroUI zone below so the two cannot disarm each other.
              //
              // Workspace-wide would have been the tempting place for it, and is wrong —
              // `packages/ui` is the one package that MUST import HeroUI. Putting it there
              // broke the wrapper the ban exists to protect.
              group: ['heroui-native', 'heroui-native/*', 'uniwind', 'uniwind/*'],
              message:
                'apps/mobile imports @irodora/ui, never HeroUI or Uniwind directly (ADR-0062).',
            },
            {
              group: ['expo-file-system', 'expo-media-library', 'node:fs', 'fs'],
              message:
                'A camera frame may never be written to a file (NFR-12, ADR-0026). The frame ' +
                'is disposed on the worklet thread and only a small numeric result crosses ' +
                'the bridge. If a surface here genuinely needs the filesystem, it is not the ' +
                'Lens and it does not belong in this directory.',
            },
            {
              group: ['@irodora/*/src/*', '@irodora/*/dist/*'],
              message:
                'Import the package entry point, not its internals. Internal paths are not a contract and will break silently.',
            },
          ],
        },
      ],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'cbrt',
          message:
            'Colour maths belongs in @irodora/color-sampling, never in the app. The engine is ' +
            'imported, never ported (apps/mobile/AGENTS.md) — a mobile-only implementation ' +
            'makes the same fabric measure differently on two surfaces, and E-008 records ' +
            'that no single-platform test can see it.',
        },
        {
          object: 'Math',
          property: 'pow',
          message:
            'A gamma curve in the app is a second colour engine. Import @irodora/color-spaces.',
        },
      ],
    },
  },

  // --- The store ships to a phone, so its entry may not reach Node ---------
  //
  // `apps/mobile` bundles `@irodora/store`. A `node:*` import reachable from `src/index.ts`
  // resolves perfectly in every test here — they run in Node — and crashes on a device. It is
  // the one failure in this package that a fully green CI run would not see.
  //
  // `src/drivers/node.ts` is exempted BY EXPLICIT PATH below, never by glob: the Node driver
  // exists precisely to import `node:sqlite`, and a glob over `drivers/` would exempt whatever
  // else lands there.
  {
    files: ['packages/store/src/**/*.ts'],
    ignores: ['packages/store/src/drivers/node.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*', 'fs', 'path', 'crypto', 'os', 'better-sqlite3'],
              message:
                'apps/mobile bundles this package. A Node API reachable from the store entry ' +
                'is a crash on a phone that no test here can see. Put it behind a driver ' +
                'export the app does not import (@irodora/store/node).',
            },
            {
              group: ['@irodora/*/src/*', '@irodora/*/dist/*'],
              message:
                'Import the package entry point, not its internals. Internal paths are not a contract and will break silently.',
            },
          ],
        },
      ],
    },
  },

  // --- A colour value comes from the manifest, never from a keyboard -------
  //
  // The `contrast` and `cvd` gates read `design-system.manifest.json`. A hex typed into a
  // component is outside both of them, and it looks exactly like a value that passed —
  // which is the whole reason ADR-0043 made `srgb` derived rather than authored.
  //
  // Scoped to what SHIPS. `test/` is excluded on purpose and by explicit path rather than by
  // glob: the harness fixtures exist to render a hand-typed hex so the rendered check can be
  // watched catching one, and a glob would exempt whatever else drifts into `test/` later.
  //
  // WHAT THIS DOES NOT CATCH, stated so a green run is not read as more than it is: a colour
  // assembled at runtime (`'#' + value`), a named CSS colour outside the short list below,
  // and anything arriving through a variable. The rendered conformance check is what covers
  // those — it resolves what was actually painted, and reports an unresolvable value as a
  // failure rather than skipping it.
  {
    // Everything EXCEPT the rendering surfaces, which need the copy rule too and therefore
    // get their own zone below with both sets spread into one rule.
    files: [
      'packages/ui/src/**/*.{ts,tsx}',
      'apps/mobile/src/**/*.{ts,tsx}',
      'apps/mobile/app/**/*.ts',
    ],
    ignores: ['apps/mobile/src/screens/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', ...COLOUR_LITERAL_SELECTORS],
    },
  },

  // --- HeroUI is an implementation detail of @irodora/ui -------------------
  //
  // ADR-0062 adopted HeroUI Native and put it BEHIND the component library. That boundary is
  // the whole insurance policy: a fourteen-month-old dependency with two test files across
  // 607 source files is swappable only for as long as exactly one package imports it.
  //
  // It also protects the two things `packages/ui` buys that the app does not have — the
  // total colour-literal ban, and the conformance registry that fails a component nothing
  // renders. A screen importing HeroUI directly is outside both.
  {
    // NON-OVERLAPPING with the Lens zone above on purpose. Flat config REPLACES a rule's
    // options rather than merging them, so two zones both setting `no-restricted-imports`
    // over the same file silently disarms one of them — which is exactly what happened when
    // this zone was first written, and what verify-guards.mjs caught.
    files: ['apps/mobile/src/**/*.{ts,tsx}', 'apps/mobile/app/**/*.ts'],
    ignores: ['apps/mobile/src/lens/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['heroui-native', 'heroui-native/*', 'uniwind', 'uniwind/*'],
              message:
                'apps/mobile imports @irodora/ui, never HeroUI or Uniwind directly (ADR-0062). ' +
                'The wrapper is what keeps the colour-literal ban, the conformance registry ' +
                'and the ability to swap the component engine without touching a screen. If a ' +
                'screen needs a component that does not exist yet, add the wrapper.',
            },
          ],
        },
      ],
    },
  },

  // --- User-facing copy lives in the catalogue, never in a screen ----------
  //
  // NFR-11: "no hard-coded user-facing string". The catalogue is the mechanism (ADR-0056) and
  // this is what stops a screen bypassing it. Scoped to the surfaces that RENDER — the
  // component library takes its copy as props and has none of its own, and a test fixture
  // must be able to write literal text or it cannot be a fixture.
  //
  // `JSXText` only: a bare string between tags. Strings passed as props are not caught here
  // and cannot be — `testID`, `accessibilityRole` and every style value are strings too, and a
  // rule that flagged them would be turned off within a week. The catalogue's own
  // unused-key and identical-value tests cover the rest.
  {
    files: ['apps/mobile/app/**/*.tsx', 'apps/mobile/src/screens/**/*.tsx'],
    rules: {
      // BOTH sets, in ONE rule. Naming the copy rule alone here is what disarmed the colour
      // ban on every screen until F-087 — flat config replaces a rule's options rather than
      // merging them, so the zone that lost was simply the earlier one.
      'no-restricted-syntax': [
        'error',
        ...COLOUR_LITERAL_SELECTORS,
        {
          selector: 'JSXText[value=/[A-Za-z\\u3040-\\u30ff\\u4e00-\\u9fff]/]',
          message:
            'User-facing text belongs in the message catalogue (src/i18n), not in a screen. ' +
            'NFR-11 requires en and ja from the first release with no hard-coded string, and ' +
            'ADR-0028 forbids falling back to English — a literal here can never be Japanese.',
        },
      ],
    },
  },

  // --- A published value is READ, never recomputed (F-018 criterion 3) ------
  //
  // > Browsing renders values read from the published bundle; the engine is called for derived
  // > answers, never to recompute a value the bundle already carries.
  //
  // A corpus bundle stores `lab`, `lch`, `oklch`, `rgb` and `hex`, computed by the engine at
  // PUBLISH time and frozen there. Recomputing one from `color.xyz` while rendering looks
  // identical, passes every test, and silently returns TODAY's engine's answer for a version
  // published under an older one — which is the failure FR-10 exists to prevent and the one
  // `loadPublishedVersion` refuses to commit on its own read path.
  //
  // The banned imports are exactly the functions that take an XYZ and produce a stored value.
  // `srgbToHex` is NOT among them and must not be: the colour-vision block encodes a SIMULATED
  // sRGB triple, which is a derived answer the bundle does not carry, and banning the encoder
  // would ban the legitimate case along with the illegitimate one.
  {
    files: ['apps/mobile/src/screens/**/*.tsx', 'apps/mobile/src/corpus/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@irodora/color-spaces',
              importNames: [
                'xyzToLab',
                'xyzToLch',
                'xyzToOklab',
                'xyzToOklch',
                'xyzToSrgb',
                'xyzToLinearSrgb',
                'xyzToDisplayP3',
                'gamutMap',
                'gamutMapDetail',
              ],
              message:
                'The bundle already carries this value, computed by the engine at publish time. ' +
                'Recomputing it here returns the CURRENT engine s answer for a version published ' +
                'under an older one, with no error and no failing test (FR-10, E-001). Read ' +
                '`derived.*` instead. A genuinely derived answer — a CVD simulation, a ΔE00 ' +
                'between two entries — is a different thing and is allowed.',
            },
          ],
        },
      ],
    },
  },

  // --- The gate scripts ----------------------------------------------------
  //
  // `scripts/` is in NO package, so `turbo run lint` — which walks packages — structurally
  // cannot reach it. For 23 files, including every gate script, that meant the code deciding
  // whether everything else may ship was itself checked by nothing (F-078).
  //
  // Linted WITHOUT type-awareness: they are plain `.mjs` in no tsconfig project, so the
  // type-aware rules cannot parse them at all. Everything that does not need a type checker
  // still applies — undefined variables, unreachable code, unused values.
  {
    files: ['scripts/**/*.mjs'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      // `globals.node` rather than a hand-written list. The first draft of this block
      // enumerated eight names and was already wrong twice: it carried `TextEncoder` and
      // `TextDecoder`, which appear nowhere under `scripts/`, and it would have reported a
      // spurious `no-undef` for the next script to use `setTimeout` or `AbortController` —
      // whose tempting fix is a disable comment, in the directory this zone exists to protect.
      // A remembered copy of a list that already exists is the same defect as a remembered
      // copy of the manifest.
      globals: globals.node,
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      // These are build tools: reporting to a terminal IS their output. `no-console` is not
      // enabled anywhere in this config today, so this is stated rather than needed — it is
      // here so that turning it on repository-wide later does not silently gag the gates.
      'no-console': 'off',
    },
  },

  // --- Plain-JavaScript config files ---------------------------------------
  //
  // A `.mjs` config is not in any tsconfig project, so the type-aware rules cannot parse it
  // and the whole file errors out. It is still LINTED — for undefined variables, unreachable
  // code and the rest — just not type-aware.
  //
  // Ignoring it outright was the alternative and was rejected: an unlinted zone is how the
  // NEXT one stops being noticed. `scripts/**/*.mjs` was exactly that for 23 files until
  // F-078 — this comment used to cite it as a live example, which it no longer is.
  {
    files: ['**/*.config.mjs', '**/*.config.js'],
    ...tseslint.configs.disableTypeChecked,
  },

  // --- CommonJS that Metro and Jest load with require() --------------------
  //
  // `apps/mobile` has no `"type": "module"`, so a `.js` file there IS CommonJS — and Metro
  // and Jest both load these by `require`, not by import. They are the only files in the
  // repository that legitimately use it.
  //
  // Scoped by exact path rather than by `**/*.js`: the point of naming
  // `metro.config.js` and `jest.setup.js` is that a THIRD CommonJS file appearing somewhere
  // has to be added here deliberately instead of inheriting an exemption nobody chose.
  {
    files: ['apps/*/metro.config.js', 'apps/*/jest.setup.js', 'packages/*/jest.setup.js'],
    ...tseslint.configs.disableTypeChecked,
    languageOptions: {
      ...tseslint.configs.disableTypeChecked.languageOptions,
      sourceType: 'commonjs',
      // `globals.node` for the same reason `scripts/**` uses it, plus `globals.jest` for the
      // setup files, whose entire content is `jest.mock`.
      globals: { ...globals.node, ...globals.jest },
    },
    rules: {
      ...tseslint.configs.disableTypeChecked.rules,
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
);
