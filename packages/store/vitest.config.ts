import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // `passWithNoTests` is deliberately ABSENT. A store package whose suite passes over zero
    // tests is the shape that lets a durability claim ship unexercised.
    include: ['test/**/*.test.ts'],
    /*
     * WHAT EACH TEST IS GIVEN, MEASURED (F-306, F-238). Nearly every case here opens real database
     * files: alone they take 0.03–1.4 s (2026-10-14; the force-quit cases, which spawn children,
     * carry their own larger budgets). Under the monorepo's full parallel `turbo run test --force`
     * the same cases ran more than twenty times slower — a 0.22 s migration case passed vitest's
     * 5 s default, as F-306's conformance case had at 5.6 s. 30 s is about twenty times the slowest
     * ordinary case: room for that load, and a hung test still fails.
     */
    testTimeout: 30_000,
  },
});
