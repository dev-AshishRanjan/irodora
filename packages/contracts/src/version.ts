/**
 * Versions the contract surface carries.
 *
 * `API_VERSION` is a stability promise, not a build number. Inside it, changes are additive
 * only; a break mints the next one and both run for at least 12 months
 * (docs/architecture/api-contract.md §9).
 */

/** The URL-path version. Every route this package describes lives under it. */
export const API_VERSION = 'v1' as const;

/*
 * F-001 scaffolded a `CONTRACTS_VERSION` constant here. It is deliberately not implemented.
 *
 * It would have duplicated `package.json.version` with nothing keeping the two in step, and
 * a version constant that drifts from its manifest is worse than no constant — consumers
 * read it and believe it. Pinning it with a test meant giving this package `@types/node` to
 * read the manifest, which is a poor trade for a package apps/mobile imports.
 *
 * The version that means something on the wire is `API_VERSION`. The package version is the
 * manifest's job.
 */
