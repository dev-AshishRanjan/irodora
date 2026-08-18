/**
 * Turning anything that went wrong into a response that says enough and no more.
 *
 * ## "No internal detail ever serialised to a client" has to be a mechanism
 *
 * `errorResponseSchema` cannot enforce it — its own comment says so: `message` is a string, and
 * a schema cannot tell a helpful sentence from a stack trace. So the enforcement is here, and it
 * is structural rather than careful:
 *
 * **Only an `ApiError` contributes its message to a response. Everything else becomes
 * `internal_error` with a fixed sentence.** There is no path where a thrown `Error`'s message,
 * a database driver's text, a file path or a stack reaches a client — not because handlers are
 * disciplined, but because the mapper never reads those fields.
 *
 * The correlation id is what makes that survivable: the full error goes to the log with the same
 * `requestId` the client receives, so support can find it without the client ever seeing it.
 *
 * ## Validation failures report paths, never values
 *
 * A Zod issue carries the offending input. That input is user data — it can be a password typed
 * into the wrong field, or someone else's identifier — so `details` carries the **field path and
 * the rule that failed**, and never `issue.input`. A 422 that echoes the request body is a log
 * of user data in the client's network tab and in every proxy between.
 */

import {
  ERROR_CODE_STATUS,
  type ErrorCode,
  type ErrorHttpStatus,
  type ErrorResponse,
  type RequestId,
} from '@irodora/contracts';
import { ZodError } from 'zod';

/**
 * The only error whose message reaches a client.
 *
 * Constructing one is a deliberate statement that the text is safe to show. Anything thrown that
 * is not an `ApiError` is treated as a defect in our code and reported as such.
 */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details: Readonly<Record<string, unknown>> | undefined;

  constructor(code: ErrorCode, message: string, details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }

  get status(): ErrorHttpStatus {
    return ERROR_CODE_STATUS[this.code];
  }
}

/** The one sentence a client ever sees for an unexpected failure. */
export const INTERNAL_ERROR_MESSAGE =
  'Something went wrong on our side. Quote the request id if you contact support.';

export interface MappedError {
  readonly status: ErrorHttpStatus;
  readonly body: ErrorResponse;
  /**
   * The error to log, which is the *original* — not the sanitised body.
   *
   * Returned rather than logged here so this module stays pure and testable: a mapper that also
   * performed I/O could not be asserted on without capturing a logger.
   */
  readonly logged: unknown;
}

/**
 * Field paths and failed rules from a Zod error. **Never the input.**
 *
 * `path` is joined with `.` so `body.color.xyz.0` reads as one location. An issue with an empty
 * path — a whole-object refinement — reports `(root)` rather than an empty string, because a
 * blank key in a details object tells a reader nothing.
 */
export function validationDetails(error: ZodError): Readonly<Record<string, unknown>> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const path = issue.path.length === 0 ? '(root)' : issue.path.join('.');
    // First issue per path wins: a client fixing the first problem will resubmit anyway, and
    // listing five rules for one field is noise rather than help.
    fields[path] ??= issue.code;
  }
  return { fields };
}

/**
 * Map anything to a response.
 *
 * The `unknown` parameter type is the point — this must be total, because it runs in Fastify's
 * error handler where the value genuinely can be anything, including a thrown string.
 */
export function mapError(error: unknown, requestId: RequestId): MappedError {
  if (error instanceof ApiError)
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details === undefined ? {} : { details: error.details }),
          requestId,
        },
      },
      logged: error,
    };

  if (error instanceof ZodError)
    return {
      status: ERROR_CODE_STATUS.validation_failed,
      body: {
        error: {
          code: 'validation_failed',
          message: 'The request did not match the expected shape.',
          details: validationDetails(error),
          requestId,
        },
      },
      logged: error,
    };

  // Everything else. Note what is NOT read: `error.message`, `error.stack`, any `cause`. The
  // client gets a fixed sentence and the id; the log gets the whole thing.
  return {
    status: ERROR_CODE_STATUS.internal_error,
    body: {
      error: { code: 'internal_error', message: INTERNAL_ERROR_MESSAGE, requestId },
    },
    logged: error,
  };
}
