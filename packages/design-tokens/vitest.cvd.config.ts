import { defineConfig } from 'vitest/config';

/**
 * Gate 10 (`cvd`), the design-system half.
 *
 * `@irodora/cvd-engine` asserts that the separation score behaves; this asserts that **our
 * own interface passes it**. The manifest declares `cvdPairs` precisely so the product is
 * held to the standard it applies to outfits, and that claim is only worth anything if it
 * can go red.
 */
export default defineConfig({
  test: { include: ['test/cvd/**/*.test.ts'] },
});
