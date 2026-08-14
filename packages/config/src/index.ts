/**
 * `@irodora/config` — the environment contract and the deployment profiles.
 *
 * One artefact runs on a workstation, on a VPS under Coolify or Dokploy, and in a cloud
 * account (NFR-18). What differs is configuration, and this package is where that difference
 * is declared, validated and refused when wrong.
 *
 * Nothing here reads `process.env`. The source is passed in, so configuration can be tested
 * without mutating the process — and a loader that can only be exercised by mutating global
 * state is one whose awkward cases never get tests.
 */

export * from './profile.js';
export * from './schema.js';
export * from './load.js';
