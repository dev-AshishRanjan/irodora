/**
 * The conformance runner.
 *
 * Conformance suites here are **plain functions returning results**, not `describe`/`it`
 * blocks. That is the whole design decision, and it exists for one reason:
 *
 * > A conformance case that cannot fail launders every adapter through it.
 *
 * The rules require each suite to contain at least one case *verified to fail* against a
 * deliberately broken adapter. With the suite expressed as vitest blocks, running it against
 * a broken adapter would fail the test file, so the proof cannot be written as an assertion.
 * As data, it can: run the suite, assert the broken adapter fails, assert the real one does
 * not.
 */

export interface ConformanceCase {
  readonly name: string;
  readonly passed: boolean;
  /** Present only on failure, and never containing adapter internals. */
  readonly detail?: string;
}

export interface ConformanceSuite {
  readonly suite: string;
  readonly adapter: string;
  readonly cases: readonly ConformanceCase[];
}

export function allPassed(result: ConformanceSuite): boolean {
  return result.cases.every((c) => c.passed);
}

export function failedCaseNames(result: ConformanceSuite): readonly string[] {
  return result.cases.filter((c) => !c.passed).map((c) => c.name);
}

/**
 * Run one case, turning a thrown assertion into a failed result.
 *
 * A case that throws for an unexpected reason still counts as failed, which is correct — an
 * adapter that explodes has not conformed. The message is kept so a real failure is
 * diagnosable rather than just red.
 */
export async function runCase(name: string, body: () => Promise<void>): Promise<ConformanceCase> {
  try {
    await body();
    return { name, passed: true };
  } catch (error) {
    return { name, passed: false, detail: error instanceof Error ? error.message : String(error) };
  }
}

/** Assertion helper. Deliberately tiny — a conformance suite must not depend on a test framework. */
export function expectEqual(actual: unknown, expected: unknown, what: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) throw new Error(`${what}: expected ${e}, got ${a}`);
}

export function expectTrue(value: boolean, what: string): void {
  if (!value) throw new Error(`${what}: expected true`);
}
