/**
 * `@irodora/ports` — every infrastructure dependency behind an interface, and the
 * conformance suite each adapter must pass.
 *
 * The point is not abstraction for its own sake. It is that the same artefact runs on a
 * workstation, on a VPS and in a cloud account (NFR-18), and the only honest way to claim
 * two adapters are interchangeable is to run one suite against both.
 *
 * Suites are data, not `describe` blocks — see `conformance/runner.ts` for why that is what
 * makes "this case is verified to fail against a broken adapter" expressible as an assertion
 * rather than as a promise.
 */

export * from './cache.js';
export * from './blob.js';
export * from './conformance/runner.js';
export * from './conformance/cache.js';
export * from './conformance/blob.js';
export * from './memory/cache.js';
export * from './memory/blob.js';
