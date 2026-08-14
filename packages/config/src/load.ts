/**
 * Loading configuration, and refusing to run without it.
 *
 * Two rules shape this file.
 *
 * **Report every problem at once.** An operator who fixes one variable, redeploys, waits,
 * and discovers the next one has been given a task with an unknown number of steps. Zod
 * collects all issues; this keeps them.
 *
 * **Never echo a value.** The error names the variable and says what was wrong with its
 * shape — never what it contained. A validation error that prints the invalid value is how
 * a secret ends up in a build log, and build logs outlive the deployment.
 */

import { isProductionProfile, type DeploymentProfile } from './profile.js';
import {
  environmentSchema,
  PLACEHOLDER_VALUES,
  SECRET_VARIABLES,
  type Environment,
} from './schema.js';

/** What a given service actually needs. Demanding everything everywhere teaches operators to fill boxes with junk. */
export const SERVICE_REQUIREMENTS = {
  api: ['IRODORA_HTTP_PORT', 'IRODORA_DATABASE_URL', 'IRODORA_REDIS_URL', 'IRODORA_PUBLIC_API_URL'],
  worker: ['IRODORA_DATABASE_URL', 'IRODORA_REDIS_URL'],
  web: ['IRODORA_PUBLIC_API_URL', 'IRODORA_PUBLIC_WEB_URL'],
} as const satisfies Record<string, readonly (keyof Environment)[]>;

export type ServiceName = keyof typeof SERVICE_REQUIREMENTS;

export class EnvironmentError extends Error {
  readonly problems: readonly string[];

  constructor(problems: readonly string[]) {
    super(
      `Refusing to start: ${String(problems.length)} environment problem(s).\n` +
        problems.map((p) => `  - ${p}`).join('\n') +
        '\nSee .env.example for every variable and its shape.',
    );
    this.name = 'EnvironmentError';
    this.problems = problems;
  }
}

const secretNames = new Set<string>(SECRET_VARIABLES);
const placeholders = new Set<string>(PLACEHOLDER_VALUES);

/**
 * Parse and validate the environment for a service.
 *
 * Takes the source as an argument rather than reading `process.env` itself. That is what
 * makes it testable without mutating global state — and a config loader that can only be
 * exercised by mutating the process is one nobody writes the awkward tests for.
 */
export function loadEnvironment(
  service: ServiceName,
  source: Record<string, string | undefined>,
): Environment {
  const problems: string[] = [];

  const parsed = environmentSchema.safeParse(source);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const name = issue.path.join('.') || '(root)';
      // `issue.message` describes the SHAPE ("Too small: expected string to have >=32
      // characters"). It never contains the value. That is the property being relied on,
      // so it is written down rather than assumed.
      problems.push(`${name}: ${issue.message}`);
    }
    throw new EnvironmentError(problems);
  }

  const env = parsed.data;
  const profile: DeploymentProfile = env.IRODORA_PROFILE;

  for (const name of SERVICE_REQUIREMENTS[service]) {
    if (source[name] === undefined || source[name] === '')
      problems.push(`${name}: required by the ${service} service, and not set`);
  }

  if (isProductionProfile(profile)) {
    for (const [name, value] of Object.entries(source)) {
      if (!name.startsWith('IRODORA_') || value === undefined) continue;
      if (!placeholders.has(value.trim())) continue;

      // Named, never echoed — even though this particular value is a known placeholder and
      // therefore not secret. The rule is worth more than the exception.
      problems.push(
        `${name}: still set to a placeholder from .env.example, and profile is "${profile}"` +
          (secretNames.has(name) ? ' — this variable is a secret' : ''),
      );
    }

    if (env.IRODORA_KMS_PROVIDER === 'local' && env.IRODORA_KMS_LOCAL_MASTER_KEY === undefined)
      problems.push('IRODORA_KMS_LOCAL_MASTER_KEY: required when IRODORA_KMS_PROVIDER is "local"');

    if (env.IRODORA_MAIL_TRANSPORT === 'smtp' && env.IRODORA_SMTP_URL === undefined)
      problems.push('IRODORA_SMTP_URL: required when IRODORA_MAIL_TRANSPORT is "smtp"');

    if (env.IRODORA_OTEL_ENABLED && env.IRODORA_OTEL_EXPORTER_OTLP_ENDPOINT === undefined)
      problems.push(
        'IRODORA_OTEL_EXPORTER_OTLP_ENDPOINT: required when IRODORA_OTEL_ENABLED is true',
      );
  }

  if (problems.length) throw new EnvironmentError(problems);

  return env;
}

/**
 * A redacted view, safe to log at boot.
 *
 * Logging the resolved configuration is genuinely useful — most "it works locally" incidents
 * are a variable that is not what someone believes. It is only safe if the redaction cannot
 * be forgotten, so this returns the redacted shape rather than expecting a caller to filter.
 */
export function redactEnvironment(env: Environment): Record<string, unknown> {
  const out: Record<string, unknown> = {};

  for (const [name, value] of Object.entries(env)) {
    out[name] = secretNames.has(name) ? '[redacted]' : value;
  }

  return out;
}
