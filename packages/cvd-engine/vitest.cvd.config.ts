import { defineConfig } from 'vitest/config';

/**
 * Gate 10 (`cvd`) — the separation guarantee, separately from the golden data.
 *
 * Split from gate 5 deliberately. Gate 5 asks "do the models reproduce their published
 * values"; gate 10 asks "does a pairing this product would recommend stay distinguishable".
 * The second is the accessibility promise, and it must be able to go red on its own.
 */
export default defineConfig({
  test: { include: ['test/cvd/**/*.test.ts'] },
});
