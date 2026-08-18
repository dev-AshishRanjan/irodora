/**
 * Wiring the machinery into the request lifecycle.
 *
 * Increments 1–6 built the parts — the error mapper, the idempotency store, the limiter — and
 * every one of them is unit-tested. **None of them was attached to the server.** Nothing in the
 * plan said "wire them in", so `buildServer` installed the validator compiler and the health
 * routes and stopped there: a thrown `Error` would have gone out as Fastify's default 500 with
 * its own message, and the closed error set would have been a set of functions nobody called.
 *
 * Writing the e2e suite is what surfaced that, which is the argument for having one. A unit test
 * proves a function behaves; only a request through the whole stack proves the function runs.
 *
 * ## Order, and why it is not incidental
 *
 * ```
 * onRequest      rate limiting        cheapest refusal, before a body is read
 * preHandler     idempotency          AFTER validation, so a malformed request cannot burn a key
 * onSend         idempotency record   the response, stored under the key that produced it
 * setErrorHandler                     everything above throws into here
 * ```
 *
 * Rate limiting first because the point of a limiter is to refuse before doing work. Idempotency
 * after validation because a client that sent a bad body and got a 422 must be able to fix it
 * and retry **with the same key** — claiming the key first would turn its own correction into a
 * 409.
 *
 * ## The error handler is the only place a response body is constructed for a failure
 *
 * `errors.ts` makes the guarantee structural: only an `ApiError` contributes its message. That
 * holds here only because **nothing else sends an error body** — Fastify's own failures are
 * converted into `ApiError`s with our text, never passed through with theirs.
 */

import { requestIdSchema, type RequestId } from '@irodora/contracts';
import type { CachePort } from '@irodora/ports';
import type { FastifyInstance, FastifyRequest } from 'fastify';

import { ApiError, mapError } from './errors.js';
import {
  assertIdempotencyKey,
  claimIdempotencyKey,
  idempotencyCacheKey,
  IDEMPOTENCY_HEADER,
  recordIdempotentResponse,
  type IdempotentRequest,
} from './idempotency.js';
import { registeredRoutes } from './route.js';
import {
  checkRateLimit,
  rateLimitError,
  rateLimitHeaders,
  RATE_LIMIT_PER_IP,
  type RateLimitRule,
} from './rate-limit.js';

/**
 * The scope every idempotency key is stored under, until there is an identity to scope by.
 *
 * `idempotency.ts` states the limit this makes real: two different clients presenting the same
 * key collide. Correct for F-015, where nothing is authenticated, and wrong the moment F-033
 * lands — at which point this constant becomes the authenticated subject and nothing else moves.
 */
export const IDEMPOTENCY_SCOPE = 'global';

/**
 * Routes a limiter must never refuse.
 *
 * A liveness probe that gets a 429 is a container the orchestrator restarts — the limiter would
 * take down exactly the healthy process it was protecting. Under Coolify and Dokploy that
 * restart is quick and unceremonious, which is the same reason `/healthz` checks nothing
 * external.
 */
export const RATE_LIMIT_EXEMPT_URLS: readonly string[] = ['/healthz', '/readyz'];

/**
 * A request id that is safe to log and to hand back to a client.
 *
 * An inbound `x-request-id` is honoured when it is well formed, because a trace that stops at
 * our edge is a trace that cannot follow a request through the proxy in front of us. It is
 * **validated first**: an arbitrary client-supplied string ends up in every log line, and a
 * value with a newline in it is log injection.
 */
const SAFE_REQUEST_ID = /^[A-Za-z0-9_.:-]{8,64}$/u;

export function generateRequestId(inbound: string | undefined, fresh: () => string): string {
  if (inbound !== undefined && SAFE_REQUEST_ID.test(inbound)) return inbound;
  return fresh();
}

/**
 * What the client is told to quote when nothing else could be identified.
 *
 * `genReqId` guarantees the shape, so this is unreachable in practice. It exists because
 * `requestIdOf` runs **inside** the error handler, where throwing would replace a mapped error
 * with an unmapped one — turning a clean 409 into a bare 500.
 */
const FALLBACK_REQUEST_ID = 'unidentified-request';

export function requestIdOf(request: Pick<FastifyRequest, 'id'>): RequestId {
  const parsed = requestIdSchema.safeParse(request.id);
  return parsed.success ? parsed.data : requestIdSchema.parse(FALLBACK_REQUEST_ID);
}

/** A Fastify error, as far as anything here needs to know. */
interface FrameworkError {
  readonly statusCode?: number;
  readonly code?: string;
  readonly validation?: readonly {
    readonly instancePath?: string;
    readonly keyword?: string;
  }[];
  readonly validationContext?: string;
}

function asFrameworkError(error: unknown): FrameworkError {
  // Every field is optional, so an arbitrary object is already a valid `FrameworkError` as far
  // as the type is concerned — reading a field that is not there yields `undefined`, which every
  // branch below handles. No assertion, and nothing here trusts a shape it has not checked.
  return typeof error === 'object' && error !== null ? error : {};
}

/**
 * Field paths and failed rules from AJV, mirroring what `validationDetails` reports for Zod.
 *
 * **The values are not read**, and AJV does not carry them anyway — `instancePath` and `keyword`
 * only. That agreement is lucky rather than designed, so it is stated here: a 422 that echoes
 * the request body is a copy of user data in the client's network tab and in every proxy on the
 * way.
 */
export function frameworkValidationDetails(error: unknown): Readonly<Record<string, unknown>> {
  const framework = asFrameworkError(error);
  const prefix = framework.validationContext ?? 'request';
  const fields: Record<string, string> = {};

  for (const issue of framework.validation ?? []) {
    const path = (issue.instancePath ?? '').replace(/^\//u, '').replaceAll('/', '.');
    const key = path.length === 0 ? prefix : `${prefix}.${path}`;
    // First rule per path wins, as in `validationDetails` — a client fixing one problem
    // resubmits anyway, and five rules for one field is noise rather than help.
    fields[key] ??= issue.keyword ?? 'invalid';
  }

  return { fields };
}

/**
 * Turn a framework failure into one of ours, or pass it through untouched.
 *
 * The conversion is what keeps `errors.ts`'s promise honest: Fastify's message is **never**
 * forwarded. Every branch here constructs its own text.
 */
export function normaliseError(error: unknown): unknown {
  if (error instanceof ApiError) return error;

  const framework = asFrameworkError(error);

  if (framework.validation !== undefined)
    return new ApiError(
      'validation_failed',
      'The request did not match the expected shape.',
      frameworkValidationDetails(error),
    );

  // Malformed JSON, a wrong content type, an empty body where one was required. Fastify's own
  // messages for these are harmless, but forwarding them would make "only an ApiError's message
  // reaches a client" a habit rather than a mechanism.
  if (framework.code?.startsWith('FST_ERR_CTP') === true)
    return new ApiError(
      'bad_request',
      'The request body could not be read. It must be JSON, and it must not be empty.',
    );

  return error;
}

/**
 * Install the error handler, the not-found handler, and the request id.
 *
 * Exported separately from the hooks so a test can assemble exactly the surface it is asserting
 * about — and because `route.test.ts` needs the error handler to see the statuses this API
 * actually returns rather than Fastify's defaults.
 */
export function useErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const mapped = mapError(normaliseError(error), requestIdOf(request));

    // The ORIGINAL error to the log, the sanitised body to the client, correlated by the id the
    // client also receives. That pairing is what makes "no internal detail" survivable for
    // support rather than merely safe.
    request.log.error(
      { err: mapped.logged, requestId: mapped.body.error.requestId },
      'request failed',
    );

    return reply.code(mapped.status).send(mapped.body);
  });

  app.setNotFoundHandler((request, reply) => {
    const mapped = mapError(
      new ApiError('not_found', `No route matches ${request.method} ${request.url}.`),
      requestIdOf(request),
    );
    return reply.code(mapped.status).send(mapped.body);
  });
}

export interface RateLimitOptions {
  readonly cache: CachePort;
  readonly rule?: RateLimitRule;
  readonly now?: () => number;
}

/**
 * Count every request against the per-IP rule, and say so in the headers.
 *
 * Headers on **every** response, not only the refusal: a client that can see its remaining
 * budget is one that does not have to discover the limit by hitting it.
 *
 * ## It fails OPEN, and that is a decision rather than an oversight
 *
 * If the cache is unreachable, `increment` throws. Failing closed would turn a cache blip into a
 * total outage — every request 500ing because a mitigation could not be applied. This limiter's
 * job, in its own words, is *"blunting credential stuffing and runaway clients, not metering a
 * paid quota"*, and for that job availability wins.
 *
 * **The consequence, stated plainly: while the cache is down there is no rate limiting.** It is
 * logged at `warn` on every occurrence, and `/readyz` already reports the cache as unavailable,
 * so the orchestrator stops sending traffic to the process anyway. If a future rule ever meters
 * something that costs money, that rule must not use this hook.
 */
export function useRateLimiting(app: FastifyInstance, options: RateLimitOptions): void {
  const rule = options.rule ?? RATE_LIMIT_PER_IP;

  app.addHook('onRequest', async (request, reply) => {
    if (RATE_LIMIT_EXEMPT_URLS.includes(request.routeOptions.url ?? '')) return;

    let decision;
    try {
      decision = await checkRateLimit(options.cache, rule, request.ip, (options.now ?? Date.now)());
    } catch (error) {
      request.log.warn({ err: error }, 'rate limiting unavailable — request allowed unchecked');
      return;
    }

    reply.headers(rateLimitHeaders(decision));
    if (decision.allowed) return;

    // `Retry-After` is an HTTP-level instruction proxies and clients already understand. Set on
    // the reply rather than only in the body, so nobody has to write their own backoff.
    reply.header('retry-after', String(decision.retryAfterSeconds));
    throw rateLimitError(decision);
  });
}

export interface IdempotencyOptions {
  readonly cache: CachePort;
  readonly scope?: string;
}

/**
 * The claim, the replay, and the record.
 *
 * Which routes this applies to comes from the **registry**, not from a list maintained here:
 * `route()` already decided, and it made the author state a reason for every exemption. A second
 * list would be one somebody forgets to update.
 */
export function useIdempotency(app: FastifyInstance, options: IdempotencyOptions): void {
  const scope = options.scope ?? IDEMPOTENCY_SCOPE;

  /** What the `onSend` hook needs, carried per request without decorating the type. */
  const inFlight = new WeakMap<FastifyRequest, { key: string; request: IdempotentRequest }>();

  const requiresKey = (request: FastifyRequest): boolean =>
    registeredRoutes(app).some(
      (registered) =>
        registered.requiresIdempotencyKey &&
        registered.method === request.method &&
        registered.url === request.routeOptions.url,
    );

  app.addHook('preHandler', async (request, reply) => {
    if (!requiresKey(request)) return;

    const key = assertIdempotencyKey(headerValue(request, IDEMPOTENCY_HEADER));
    const fingerprinted: IdempotentRequest = {
      method: request.method,
      url: request.routeOptions.url ?? request.url,
      body: request.body,
    };

    const outcome = await claimIdempotencyKey(options.cache, scope, key, fingerprinted);

    if (outcome.kind === 'replay') {
      // The handler does not run. That is the entire promise of the header: a retry that reaches
      // us after the first attempt succeeded must not apply the change a second time.
      await reply.code(outcome.record.status).send(outcome.record.body);
      return;
    }

    inFlight.set(request, { key, request: fingerprinted });
  });

  app.addHook('onSend', async (request, reply, payload) => {
    const claim = inFlight.get(request);
    if (claim === undefined) return payload;

    // A 5xx RELEASES the key instead of storing it. Storing would replay the failure for the
    // next 24 hours — a transient outage frozen into a permanent answer, which is the opposite
    // of what a client retrying with the same key is asking for.
    if (reply.statusCode >= 500) {
      await options.cache.delete(idempotencyCacheKey(scope, claim.key));
      return payload;
    }

    await recordIdempotentResponse(
      options.cache,
      scope,
      claim.key,
      claim.request,
      reply.statusCode,
      typeof payload === 'string' ? safeParse(payload) : null,
    );

    return payload;
  });
}

function safeParse(payload: string): unknown {
  try {
    return JSON.parse(payload);
  } catch {
    // A non-JSON payload is not something this API produces. Storing `null` rather than the raw
    // text keeps a replay from serving something no schema describes.
    return null;
  }
}

function headerValue(request: FastifyRequest, name: string): string | undefined {
  const raw = request.headers[name];
  return Array.isArray(raw) ? raw[0] : raw;
}
