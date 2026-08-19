import { defineConfig } from 'vitest/config';

/**
 * Gate 4 (`test`) for this package.
 *
 * `testTimeout` is here, and is the whole reason this file exists (F-071). Packages ran bare
 * `vitest run` with no config, so 30 CPU-bound property tests inherited vitest's default
 * 5000 ms — fine alone, wrong as task 25 of 25 under `turbo run test` competing for cores.
 * Two were caught doing exactly that: `testing` — `stays inside [0, 1)` at 7061 ms against
 * 2384 ms isolated, and `color-naming` — `holds at every corner of the box` at 5052 ms.
 *
 * A timeout catches a hang. It is not a performance budget — that is gate 12 (`perf`), which
 * asserts absolute committed thresholds. Setting this near the observed runtime would just
 * recreate the flake on a slower machine.
 *
 * **Why the value is repeated in every package rather than shared from one module.** A root
 * `vitest.shared.ts` was tried and reverted: each package's `tsconfig.json` sets
 * `rootDir: "."` and deliberately includes `*.config.ts`, so importing a file from outside
 * the package fails typecheck with TS6059. Moving it into `@irodora/testing` would work —
 * every package here already depends on it — but it would make every package's *config file*
 * fail to load whenever that package's build is broken, turning a build error into a
 * confusing config error. A duplicated integer is the cheaper failure.
 */
export default defineConfig({
  test: {
    include: ['test/golden/**/*.test.ts', 'test/identity/**/*.test.ts'],
    testTimeout: 120_000,
    hookTimeout: 120_000,
  },
});
