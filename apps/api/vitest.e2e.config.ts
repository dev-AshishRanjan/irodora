import { defineConfig } from 'vitest/config';

/**
 * Gate 7, API half.
 *
 * **No `--passWithNoTests`.** A gate that passes over an empty suite is a gate failing open, and
 * this one is activating against a feature that has no domain routes yet — precisely the
 * situation where a vacuous pass would be easiest to mistake for coverage.
 */
export default defineConfig({
  test: {
    include: ['e2e/**/*.e2e.test.ts'],
    // The rate-limit case walks the real 300-request budget.
    testTimeout: 30_000,
  },
});
