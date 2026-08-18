/**
 * Cursor pagination, and the hard limit that makes "never return an unbounded collection" a
 * number rather than a preference.
 *
 * ## The seam this file exists to close
 *
 * ADR-0012 claims one artefact serves runtime validation, TypeScript types **and** OpenAPI.
 * That is true, and there is a gap inside it worth naming precisely:
 *
 * `toJsonSchema(pageParamsSchema, 'input')` emits `"limit": { "default": 50, … }`. AJV validates
 * against that schema — and **does not apply the default**, because `useDefaults` is off and
 * turning it on would let a validator mutate a request body. So a request with no `limit` passes
 * validation and reaches a handler with `limit` **undefined**, which is not what the published
 * contract says a handler receives.
 *
 * The same gap swallows Zod's **brands**: AJV sees `cursor` as a string, so nothing produces the
 * `Cursor` type that exists specifically to stop a caller constructing one
 * [[brand-a-wire-scalar-only-where-the-engine-has-no-counterpart]].
 *
 * So a handler that needs defaults or brands parses the already-validated input through Zod.
 * AJV is the gate — it decides whether the request is admissible at all. Zod is the lens —
 * it produces the values the handler was promised. Running both is not redundancy; they answer
 * different questions, and skipping the second is how `limit` silently becomes `undefined`.
 *
 * ## What is NOT here
 *
 * `pagination.ts` in contracts says a cursor is *"opaque and signed"*. It is opaque — branded,
 * so a caller cannot construct one — and it is **not signed**, because nothing issues a cursor
 * until F-016 builds the catalog. Signing a value nothing creates would be a mechanism before
 * its data for the fourth time in this branch, and it would need a key whose only other user is
 * F-033. Recorded as F-016's obligation rather than half-built here.
 */

import {
  PAGE_LIMIT_DEFAULT,
  PAGE_LIMIT_MAX,
  pageParamsSchema,
  type PageParams,
} from '@irodora/contracts';
import { ZodError } from 'zod';
import { ApiError, validationDetails } from './errors.js';

export { PAGE_LIMIT_DEFAULT, PAGE_LIMIT_MAX };

/**
 * Turn a validated query into the page parameters a handler was promised.
 *
 * Throws `invalid_cursor` rather than `validation_failed` when the cursor is the problem: the
 * contract has a dedicated code for it (*"a cursor encodes a sort order; changing the sort
 * invalidates it"*), and a client that gets `validation_failed` for a stale cursor will retry the
 * same cursor rather than restarting the scan.
 */
export function parsePageParams(query: unknown): PageParams {
  try {
    return pageParamsSchema.parse(query);
  } catch (error) {
    if (!(error instanceof ZodError)) throw error;

    const details = validationDetails(error);
    const fields = details['fields'];
    const cursorFailed = typeof fields === 'object' && fields !== null && 'cursor' in fields;

    if (cursorFailed)
      throw new ApiError(
        'invalid_cursor',
        'That cursor is not one this endpoint issued, or it no longer matches the sort order. ' +
          'Start the scan again without a cursor.',
      );

    throw new ApiError(
      'validation_failed',
      `limit must be an integer between 1 and ${String(PAGE_LIMIT_MAX)}.`,
      details,
    );
  }
}
