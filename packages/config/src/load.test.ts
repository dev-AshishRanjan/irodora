import { describe, expect, it } from 'vitest';

import { EnvironmentError, loadEnvironment, redactEnvironment } from './load.js';
import { isProductionProfile } from './profile.js';

/** A complete, valid environment for a production profile. Tests mutate copies of it. */
function productionEnv(overrides: Record<string, string | undefined> = {}) {
  return {
    IRODORA_PROFILE: 'vps',
    IRODORA_SERVICE_NAME: 'api',
    IRODORA_HTTP_PORT: '3000',
    IRODORA_PUBLIC_WEB_URL: 'https://irodora.com',
    IRODORA_PUBLIC_API_URL: 'https://api.irodora.com',
    IRODORA_DATABASE_URL: 'postgres://u:p@db:5432/irodora',
    IRODORA_REDIS_URL: 'redis://cache:6379',
    IRODORA_BLOB_ENDPOINT: 'https://s3.example.com',
    IRODORA_BLOB_REGION: 'eu-west-1',
    IRODORA_BLOB_BUCKET: 'irodora',
    IRODORA_BLOB_ACCESS_KEY_ID: 'AKIAEXAMPLEKEYID',
    IRODORA_BLOB_SECRET_ACCESS_KEY: 'example-blob-secret-for-tests-only',
    IRODORA_OIDC_ISSUER: 'https://auth.irodora.com',
    IRODORA_OIDC_CLIENT_ID: 'irodora-api',
    IRODORA_OIDC_CLIENT_SECRET: 'example-oidc-secret-for-tests-only',
    IRODORA_OIDC_AUDIENCE: 'irodora-api',
    // Fixtures use the documented placeholder vocabulary from .gitleaks.toml on purpose.
    // The first draft of this file used random 32-character strings, and gate 15 flagged
    // two of them as generic API keys — correctly, since it cannot know they are invented.
    // A secret-shaped fixture is still a fixture, but it costs a scanner finding every time
    // someone reads the history, so it is not worth writing one.
    IRODORA_SESSION_SECRET: 'example-session-secret-for-tests-only',
    IRODORA_SESSION_COOKIE_DOMAIN: 'irodora.com',
    IRODORA_WEBAUTHN_RP_ID: 'irodora.com',
    IRODORA_WEBAUTHN_RP_NAME: 'Irodora',
    IRODORA_KMS_PROVIDER: 'local',
    IRODORA_KMS_LOCAL_MASTER_KEY: 'example-kms-master-key-for-tests-only',
    IRODORA_MAIL_TRANSPORT: 'log',
    IRODORA_MAIL_FROM: 'no-reply@irodora.com',
    ...overrides,
  };
}

describe('the environment contract', () => {
  it('accepts a complete production environment', () => {
    expect(() => loadEnvironment('api', productionEnv())).not.toThrow();
  });

  it('reports EVERY problem at once, not the first', () => {
    // An operator who fixes one variable, redeploys, waits, and finds the next one has been
    // given a task with an unknown number of steps.
    let error: unknown;
    try {
      loadEnvironment('api', {
        IRODORA_PROFILE: 'vps',
        IRODORA_PUBLIC_WEB_URL: 'not-a-url',
        IRODORA_PUBLIC_API_URL: 'also-not-a-url',
        IRODORA_SESSION_SECRET: 'short',
      });
    } catch (caught) {
      error = caught;
    }

    expect(error).toBeInstanceOf(EnvironmentError);
    expect((error as EnvironmentError).problems.length).toBeGreaterThan(2);
  });

  it('names the variable that is wrong', () => {
    try {
      loadEnvironment('api', productionEnv({ IRODORA_HTTP_PORT: '70000' }));
      expect.unreachable('an out-of-range port must not load');
    } catch (caught) {
      expect((caught as EnvironmentError).problems.join('\n')).toContain('IRODORA_HTTP_PORT');
    }
  });
});

describe('secrets never appear in an error', () => {
  it('does not echo the offending value', () => {
    // A validation error that prints the invalid value is how a secret reaches a build log,
    // and build logs outlive the deployment that produced them.
    const secret = 'sk-live-thismustneverbeprinted-0123456789';

    try {
      loadEnvironment('api', productionEnv({ IRODORA_SESSION_SECRET: secret.slice(0, 8) }));
      expect.unreachable('a short session secret must not load');
    } catch (caught) {
      const rendered = `${(caught as Error).message}\n${(caught as EnvironmentError).problems.join('\n')}`;
      expect(rendered).toContain('IRODORA_SESSION_SECRET');
      expect(rendered).not.toContain(secret.slice(0, 8));
    }
  });

  it('redacts every secret in the loggable view, and keeps the rest', () => {
    const env = loadEnvironment('api', productionEnv());
    const view = redactEnvironment(env);

    expect(view['IRODORA_SESSION_SECRET']).toBe('[redacted]');
    expect(view['IRODORA_DATABASE_URL']).toBe('[redacted]');
    expect(view['IRODORA_OIDC_CLIENT_SECRET']).toBe('[redacted]');
    // The point of logging config at boot is that it is USEFUL; redacting everything would
    // be safe and worthless.
    expect(view['IRODORA_PROFILE']).toBe('vps');
    expect(view['IRODORA_HTTP_PORT']).toBe(3000);
  });
});

describe('placeholders are rejected in a real deployment', () => {
  it('refuses a .env.example placeholder under the vps profile', () => {
    // The realistic failure: an operator copies .env.example, fills in the database URL,
    // deploys, and ships `IRODORA_SESSION_SECRET=replace-me`. It is not missing, so no
    // required-field check catches it. This is the decoy that matters.
    try {
      loadEnvironment('api', productionEnv({ IRODORA_BLOB_SECRET_ACCESS_KEY: 'replace-me' }));
      expect.unreachable('a placeholder must not load under a production profile');
    } catch (caught) {
      const rendered = (caught as EnvironmentError).problems.join('\n');
      expect(rendered).toContain('IRODORA_BLOB_SECRET_ACCESS_KEY');
      expect(rendered).toContain('this variable is a secret');
    }
  });

  it('allows the same placeholder locally, because that is what it is for', () => {
    expect(() =>
      loadEnvironment(
        'api',
        productionEnv({
          IRODORA_PROFILE: 'local',
          IRODORA_BLOB_SECRET_ACCESS_KEY: 'replace-me',
        }),
      ),
    ).not.toThrow();
  });
});

describe('per-service requirements', () => {
  it('does not demand an HTTP port from the worker', () => {
    const withoutPort = productionEnv();
    delete (withoutPort as Record<string, string | undefined>)['IRODORA_HTTP_PORT'];

    expect(() => loadEnvironment('worker', withoutPort)).not.toThrow();
    expect(() => loadEnvironment('api', withoutPort)).toThrow(EnvironmentError);
  });

  it('treats an empty string as unset', () => {
    // A compose file with `IRODORA_DATABASE_URL=` sets the variable to empty. Reading that
    // as "present" is how a service boots and fails on first query instead of at start.
    expect(() => loadEnvironment('api', productionEnv({ IRODORA_DATABASE_URL: '' }))).toThrow(
      EnvironmentError,
    );
  });
});

describe('booleans', () => {
  it.each([
    ['1', true],
    ['0', false],
    ['true', true],
    ['false', false],
    ['yes', true],
    ['off', false],
  ])('reads %s as %s', (raw, expected) => {
    // FORCE_PATH_STYLE rather than OTEL_ENABLED: enabling telemetry pulls in a conditional
    // requirement, and a test that trips a second rule is not testing the first one.
    const env = loadEnvironment('api', productionEnv({ IRODORA_BLOB_FORCE_PATH_STYLE: raw }));
    expect(env.IRODORA_BLOB_FORCE_PATH_STYLE).toBe(expected);
  });

  it('rejects a misspelled boolean rather than picking a side', () => {
    // `value === 'true'` would read `1` as false — so MIGRATE_ON_BOOT=1 would disable
    // migrations while looking like it enabled them.
    expect(() =>
      loadEnvironment('api', productionEnv({ IRODORA_BLOB_FORCE_PATH_STYLE: 'ture' })),
    ).toThrow(EnvironmentError);
  });
});

describe('conditional requirements apply only in production', () => {
  it('requires an OTLP endpoint when telemetry is on', () => {
    expect(() => loadEnvironment('api', productionEnv({ IRODORA_OTEL_ENABLED: '1' }))).toThrow(
      EnvironmentError,
    );

    expect(() =>
      loadEnvironment(
        'api',
        productionEnv({
          IRODORA_OTEL_ENABLED: '1',
          IRODORA_OTEL_EXPORTER_OTLP_ENDPOINT: 'https://otel.irodora.com',
        }),
      ),
    ).not.toThrow();
  });
});

describe('profiles', () => {
  it('treats vps and cloud as production, local as not', () => {
    expect(isProductionProfile('local')).toBe(false);
    expect(isProductionProfile('vps')).toBe(true);
    expect(isProductionProfile('cloud')).toBe(true);
  });
});
