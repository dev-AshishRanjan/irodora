/**
 * `@irodora/contracts` — the validation source of truth.
 *
 * Every shape that crosses a **trust boundary** is defined here once, as a Zod schema, and
 * used two ways: runtime validation at that boundary, and TypeScript types for the code on
 * either side of it.
 *
 * There used to be a third use — JSON Schema for a generated OpenAPI document — and a
 * process boundary to cross. Both went with the server tier
 * ([ADR-0051](../../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)).
 * `pagination.ts` and `json-schema.ts` are readable at the `pre-rehaul-server` tag.
 *
 * **This package did not become unnecessary when the network did.** A local-first app still
 * has boundaries where unvalidated data arrives, and they are the ones most likely to be
 * trusted by accident because they feel internal:
 *
 *     SQLite row        → parsed, never cast. A column is `unknown` until a schema says
 *                         otherwise; a database written by an older build of the app is
 *                         hostile input in exactly the way a request body is.
 *     imported backup   → the strongest case. A user can hand the app a file that another
 *                         program produced, or that they edited by hand.
 *     corpus bundle     → shipped inside the app, and still digest-checked and parsed,
 *                         because "we built it" is a claim about the build, not the file.
 *     camera frame      → the numbers coming back from a native module are not ours.
 *
 * The direction is one-way and has no exceptions:
 *
 *     schema (here) → validation → inferred types → the rest of the app
 *
 * Nothing downstream is hand-written, and nothing here is derived from something
 * downstream. The lint zone over `src/` enforces that: a hand-written type, union, or enum
 * in this package is a rule violation, proven by guards #5 through #9.
 */

export * from './version.js';
export * from './primitives.js';
export * from './color.js';
export * from './errors.js';
