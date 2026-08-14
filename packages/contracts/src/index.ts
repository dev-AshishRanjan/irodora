/**
 * `@irodora/contracts` — the wire-format source of truth.
 *
 * Every shape that crosses a process boundary is defined here once, as a Zod schema, and
 * used three ways: runtime validation at the API boundary, TypeScript types for handlers
 * and clients, and JSON Schema for the generated OpenAPI document
 * (ADR-0012, ADR-0025, E-004).
 *
 * The direction is one-way and has no exceptions:
 *
 *     schema (here) → validation → inferred types → JSON Schema → OpenAPI → SDK → clients
 *
 * Nothing downstream is hand-written, and nothing here is derived from something
 * downstream. This barrel is also the surface the representability test enumerates, so an
 * export added here is checked automatically rather than when someone remembers.
 */

export * from './version.js';
export * from './primitives.js';
export * from './color.js';
export * from './errors.js';
export * from './pagination.js';
export * from './json-schema.js';
