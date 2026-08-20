/**
 * `@irodora/ui` — React Native components over the platform's own primitives (ADR-0054).
 *
 * There are no components yet. The harness that will check them lands first, deliberately:
 * a conformance suite written after the components it judges tends to agree with them, and
 * this repository has already shipped tests that agreed with the change instead of checking
 * it. The suite is at `@irodora/ui/testing`; the components arrive in increments 4 and 5.
 *
 * **A component here must be reachable from a real screen or registered in the conformance
 * registry.** A package with no consumers passes every gate and ships nothing, and six
 * increments have already been lost to that shape
 * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
 */

export const UI_VERSION = '0.0.0' as const;
