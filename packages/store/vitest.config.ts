import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `passWithNoTests` is deliberately ABSENT. A store package whose suite passes over zero
    // tests is the shape that lets a durability claim ship unexercised.
    include: ['test/**/*.test.ts'],
  },
});
