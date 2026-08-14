import { defineConfig } from 'vitest/config';

/**
 * Gate 5 (`color-golden`) — the engine against published reference datasets, and the
 * cross-platform identity fixture.
 *
 * These files also run under gate 4 (`pnpm test`), which picks up every `*.test.ts`. That is
 * deliberate: the golden set is not a slow extra suite to be run occasionally, it is the part
 * of the test suite that checks the code against something other than itself. This config
 * exists so gate 5 can fail on its own, naming the golden set, rather than being one red line
 * inside a run of everything.
 */
export default defineConfig({
  test: {
    include: ['test/golden/**/*.test.ts', 'test/identity/**/*.test.ts'],
  },
});
