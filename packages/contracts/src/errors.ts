/**
 * The error contract.
 *
 * Clients switch on `code`, so a typo'd string in one handler is a broken client. The enum
 * is therefore **closed** — an unknown code fails to parse rather than passing through as a
 * string — and **versioned**: inside `v1` it is additive only. Adding a code is free;
 * removing or renaming one is a `/v2` break, and `errors.test.ts` is what makes that
 * something you have to do on purpose.
 *
 * The set below is deliberately small. Under an additive-only rule, under-including is the
 * cheap direction and over-including is the expensive one, so every code here is traceable
 * closed and versioned. Seven members are now unreachable — `unauthorized`,
 * `entitlement_required`, `idempotency_key_required`, `idempotency_key_conflict`,
 * `invalid_cursor`, `rate_limited`, `service_unavailable` — all HTTP concepts retired with the
 * server tier (ADR-0051). They are deliberately NOT removed yet: the codes a local-first app
 * needs (`storage_unavailable`, `import_invalid`, `corpus_digest_mismatch`,
 * `migration_failed`) should be written by the code that raises them, not invented ahead of
 * it. Revised with the storage layer, under an ADR. See `memory/observations.md`.
 */

import { z } from 'zod';

import { requestIdSchema } from './primitives.js';

/**
 * The closed set for `v1`. Order is not meaningful; membership is.
 *
 * Each entry cites the contract line that requires it, because a code nobody can trace to a
 * documented behaviour is a code nobody can implement consistently.
 */
export const ERROR_CODES_V1 = [
  /** 400 — malformed request (§5). */
  'bad_request',
  /** 422 — well-formed but semantically invalid (§5). */
  'validation_failed',
  /** 401 — missing or invalid credentials (§5). */
  'unauthorized',
  /** 403 — authenticated but not entitled, including tier gating (§5). */
  'entitlement_required',
  /** 404 — not found, OR not visible to this tenant. Never 403; that is an enumeration oracle (§5). */
  'not_found',
  /** 409 — sync conflict (§5). */
  'conflict',
  /** 400 — no `Idempotency-Key` on a mutating route (§6). */
  'idempotency_key_required',
  /** 409 — same key, different body (§6). */
  'idempotency_key_conflict',
  /** 400 — a cursor encodes a sort order; changing the sort invalidates it (§7). */
  'invalid_cursor',
  /** 429 — rate limited. `Retry-After` and `X-RateLimit-Reset` always present (§5, §8). */
  'rate_limited',
  /** 422 — the requested colour cannot be represented in the target gamut (§5, worked example). */
  'colour_out_of_gamut',
  /** 500 — our fault. Correlation id returned; details never leaked (§5). */
  'internal_error',
  /** 503 — dependency unavailable; the client should fall back to the local engine (§5, NFR-6). */
  'service_unavailable',
] as const;

export const errorCodeSchema = z.enum(ERROR_CODES_V1);

/** The statuses this contract uses. A code mapped outside this set is a contract error, not a handler detail. */
export const ERROR_HTTP_STATUSES = [400, 401, 403, 404, 409, 422, 429, 500, 503] as const;

export type ErrorCode = z.infer<typeof errorCodeSchema>;
export type ErrorHttpStatus = (typeof ERROR_HTTP_STATUSES)[number];

/**
 * One status per code, decided here rather than per handler.
 *
 * `Record<ErrorCode, …>` is the load-bearing part: adding a code to `ERROR_CODES_V1` without
 * deciding its status is a compile error, so the two cannot drift.
 */
export const ERROR_CODE_STATUS: Readonly<Record<ErrorCode, ErrorHttpStatus>> = {
  bad_request: 400,
  validation_failed: 422,
  unauthorized: 401,
  entitlement_required: 403,
  not_found: 404,
  conflict: 409,
  idempotency_key_required: 400,
  idempotency_key_conflict: 409,
  invalid_cursor: 400,
  rate_limited: 429,
  colour_out_of_gamut: 422,
  internal_error: 500,
  service_unavailable: 503,
};

export const errorResponseSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    /**
     * Human-readable, and safe to show. Never a stack trace, never SQL, never a file path —
     * "never leak internals" is a property of what handlers put here, and the schema cannot
     * enforce it. The closed `code` above is what clients are expected to act on.
     */
    message: z.string().min(1),
    details: z.record(z.string(), z.unknown()).optional(),
    /** The user's handle into our traces. Always present, including on a 500. */
    requestId: requestIdSchema,
  }),
});

export type ErrorResponse = z.infer<typeof errorResponseSchema>;
