import { defineConfig } from 'vitest/config';

/** Gate 5 (`color-golden`) for this package: the CVD models against their published data. */
export default defineConfig({
  test: { include: ['test/golden/**/*.test.ts'] },
});
