import { defineConfig } from 'vitest/config';

/**
 * Unit and integration tests only.
 *
 * `e2e/` is excluded on purpose: it is gate 7's, it runs against an assembled server, and one of
 * its cases sends 301 requests to prove the shipped rate limit is the enforced one. Folding that
 * into gate 4 would make every `pnpm test` pay for it.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
