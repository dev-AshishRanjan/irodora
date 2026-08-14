/**
 * The environment contract.
 *
 * Every variable read anywhere in the system is declared here and documented in
 * `.env.example`. Gate 0 checks that correspondence in one direction — a variable read here
 * and absent there fails the build — because the VPS profile is configured *entirely*
 * through environment variables, and an undocumented one is a deployment that fails at boot
 * for a reason nobody wrote down.
 *
 * Values arrive as strings. Everything numeric or boolean is coerced here so that no caller
 * ever writes `Number(process.env.X)` and gets `NaN` at 3am.
 */

import { z } from 'zod';

import { deploymentProfileSchema } from './profile.js';

/**
 * `1`/`0`, `true`/`false`, `yes`/`no`. Deliberately strict about what it accepts.
 *
 * The tempting implementation is `value === 'true'`, which silently reads `1` as false — so
 * `IRODORA_DATABASE_MIGRATE_ON_BOOT=1` would disable migrations while looking like it
 * enabled them. Anything unrecognised is an error rather than a default, because a
 * misspelled boolean should stop the boot, not pick a side.
 */
const booleanish = z
  .string()
  .transform((value, ctx) => {
    const normalised = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalised)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalised)) return false;

    ctx.addIssue({
      code: 'custom',
      message: 'Expected a boolean: 1/0, true/false, yes/no, on/off.',
    });
    return z.NEVER;
  })
  .pipe(z.boolean());

const port = z.coerce.number().int().min(1).max(65535);
const positiveInt = z.coerce.number().int().positive();

/** A URL that must include a scheme. `localhost:5432` is a path, not a URL, and pg will say so unhelpfully. */
const url = z.url();

/**
 * The full contract.
 *
 * Optional here means "not required to boot ANY service". Per-service requirements are
 * applied in `load.ts`, because the worker does not need `IRODORA_HTTP_PORT` and the web
 * app does not need `IRODORA_KMS_LOCAL_MASTER_KEY` — demanding all of them everywhere
 * teaches operators to fill boxes with junk.
 */
export const environmentSchema = z.object({
  IRODORA_PROFILE: deploymentProfileSchema.default('local'),
  IRODORA_SERVICE_NAME: z.string().min(1).default('api'),
  IRODORA_LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  IRODORA_HTTP_HOST: z.string().min(1).default('0.0.0.0'),
  IRODORA_HTTP_PORT: port.default(3000),
  IRODORA_PUBLIC_WEB_URL: url,
  IRODORA_PUBLIC_API_URL: url,

  IRODORA_DATABASE_URL: z.string().min(1),
  IRODORA_DATABASE_POOL_MAX: positiveInt.default(10),
  IRODORA_DATABASE_MIGRATE_ON_BOOT: booleanish.default(true),

  IRODORA_REDIS_URL: z.string().min(1),
  IRODORA_QUEUE_PREFIX: z.string().min(1).default('irodora'),

  IRODORA_BLOB_ENDPOINT: url,
  IRODORA_BLOB_REGION: z.string().min(1),
  IRODORA_BLOB_BUCKET: z.string().min(1),
  IRODORA_BLOB_ACCESS_KEY_ID: z.string().min(1),
  IRODORA_BLOB_SECRET_ACCESS_KEY: z.string().min(1),
  IRODORA_BLOB_FORCE_PATH_STYLE: booleanish.default(false),

  IRODORA_OIDC_ISSUER: url,
  IRODORA_OIDC_CLIENT_ID: z.string().min(1),
  IRODORA_OIDC_CLIENT_SECRET: z.string().min(1),
  IRODORA_OIDC_AUDIENCE: z.string().min(1),

  /** 32 bytes base64 is 44 characters. Length is checked; strength is the operator's job. */
  IRODORA_SESSION_SECRET: z.string().min(32),
  IRODORA_SESSION_COOKIE_DOMAIN: z.string().min(1),
  IRODORA_WEBAUTHN_RP_ID: z.string().min(1),
  IRODORA_WEBAUTHN_RP_NAME: z.string().min(1),

  IRODORA_KMS_PROVIDER: z.enum(['local', 'aws', 'vault']).default('local'),
  IRODORA_KMS_LOCAL_MASTER_KEY: z.string().min(32).optional(),
  IRODORA_KMS_KEY_ID: z.string().optional(),

  IRODORA_MAIL_TRANSPORT: z.enum(['smtp', 'log']).default('log'),
  IRODORA_SMTP_URL: z.string().min(1).optional(),
  IRODORA_MAIL_FROM: z.string().min(1),

  /** Empty means "latest published". Pinning is what makes a result replayable (FR-10). */
  IRODORA_CONTENT_VERSION: z.string().optional(),
  IRODORA_RULES_VERSION: z.string().optional(),

  IRODORA_OTEL_ENABLED: booleanish.default(false),
  IRODORA_OTEL_EXPORTER_OTLP_ENDPOINT: url.optional(),
  IRODORA_OTEL_SERVICE_NAMESPACE: z.string().min(1).default('irodora'),

  IRODORA_RATE_LIMIT_GLOBAL_PER_MINUTE: positiveInt.default(600),
  IRODORA_RATE_LIMIT_AUTH_PER_MINUTE: positiveInt.default(10),
  IRODORA_RATE_LIMIT_UPLOAD_PER_MINUTE: positiveInt.default(30),

  IRODORA_IMAGE_MAX_BYTES: positiveInt.default(12_582_912),
  IRODORA_IMAGE_MAX_PIXELS: positiveInt.default(40_000_000),
  IRODORA_IMAGE_DECODE_TIMEOUT_MS: positiveInt.default(5000),

  IRODORA_FEATURE_CALIBRATED_SCAN: booleanish.default(false),
  IRODORA_FEATURE_PRO_EXPORTS: booleanish.default(false),
  IRODORA_FEATURE_PUBLIC_API: booleanish.default(false),
});

export type Environment = z.infer<typeof environmentSchema>;

/**
 * Values that must never appear in a real deployment.
 *
 * `.env.example` ships placeholders so a workstation boots without ceremony. The failure
 * this prevents is the obvious one: an operator copies `.env.example` to `.env`, fills in
 * the database URL, deploys, and ships `IRODORA_SESSION_SECRET=replace-me` — which is not a
 * missing value, so no required-field check catches it.
 */
export const PLACEHOLDER_VALUES = [
  'replace-me',
  'replace-me-with-32-plus-random-bytes-base64',
  'replace-me-with-32-random-bytes-base64',
  'changeme',
  'change-me',
] as const;

/** Variables whose value is a secret. Never echoed in an error, a log or a span. */
export const SECRET_VARIABLES = [
  'IRODORA_BLOB_SECRET_ACCESS_KEY',
  'IRODORA_OIDC_CLIENT_SECRET',
  'IRODORA_SESSION_SECRET',
  'IRODORA_KMS_LOCAL_MASTER_KEY',
  'IRODORA_DATABASE_URL',
  'IRODORA_REDIS_URL',
  'IRODORA_SMTP_URL',
] as const;
