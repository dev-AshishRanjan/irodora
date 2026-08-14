import { defineConfig } from 'vitest/config';

/**
 * Gate 5 (`color-golden`) for this package: the difference metrics and the contrast
 * algorithms against their published reference data.
 *
 * These files also run under gate 4. The separate config exists so gate 5 can fail on its
 * own, naming the golden set, rather than being one red line inside a run of everything.
 */
export default defineConfig({
  test: {
    include: ['test/golden/**/*.test.ts'],
  },
});
