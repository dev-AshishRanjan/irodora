import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import * as contracts from './index.js';
import { toJsonSchema } from './json-schema.js';
import { paginatedSchema, pageParamsSchema } from './pagination.js';
import { slugSchema } from './primitives.js';

/**
 * The public surface, discovered rather than listed.
 *
 * The scan is what keeps conversion coverage current: a schema exported tomorrow is
 * converted tomorrow, by nobody in particular.
 */
const exportedSchemas: readonly (readonly [string, z.ZodType])[] = (() => {
  const found: [string, z.ZodType][] = [];

  for (const [name, value] of Object.entries(contracts)) {
    if (value instanceof z.ZodType) found.push([name, value]);
  }

  return found;
})();

/**
 * …and this is what keeps the scan honest.
 *
 * A scan alone fails in one specific way, and it was demonstrated rather than imagined:
 * delete one `export *` line from `index.ts` and coverage silently drops from 18 schemas to
 * 10 while every test stays green. A floor (`length >= 10`) does not catch it either. The
 * scan can only check what the barrel exports — so the barrel is what has to be pinned.
 *
 * Same mechanism as `PROMISED_IN_V1` in `errors.test.ts`, and the same instruction: **this
 * duplication is the check.** Adding a schema means adding a line here, deliberately.
 */
const EXPECTED_SCHEMA_EXPORTS = [
  // F-010 added the capture side of provenance. `provenanceSchema` is now a discriminated
  // union, and its two members are exported in their own right because the engine-type pin
  // has to assert them PER MEMBER — `keyof` on a union is the common keys only, so a
  // whole-union check silently stops seeing a field added to one side.
  'captureConditionsSchema',
  'capturedProvenanceSchema',
  'captureQualitySchema',
  'colorSpaceSchema',
  'colorValueSchema',
  'corpusVersionSchema',
  'cursorSchema',
  'deviceProfileSchema',
  'errorCodeSchema',
  'errorResponseSchema',
  'hexSchema',
  'illuminantSchema',
  'localeSchema',
  'localizedTextSchema',
  'measurementSourceSchema',
  'pageParamsSchema',
  'pageSchema',
  'provenanceSchema',
  'reproducibilityEnvelopeSchema',
  'requestIdSchema',
  'semanticVersionSchema',
  'slugSchema',
  'unitIntervalSchema',
  'untrackedProvenanceSchema',
] as const;

function schemaNamed(name: string): z.ZodType {
  const entry = exportedSchemas.find(([exportName]) => exportName === name);
  if (!entry) throw new Error(`No exported schema named ${name}. The scan above is broken.`);

  return entry[1];
}

describe('the public schema surface', () => {
  it('is exactly what the barrel is expected to export', () => {
    expect([...exportedSchemas.map(([name]) => name)].sort()).toStrictEqual(
      [...EXPECTED_SCHEMA_EXPORTS].sort(),
    );
  });
});

describe('the OpenAPI leg', () => {
  it.each(exportedSchemas.map(([name]) => name))('%s converts in both directions', (name) => {
    // A throw here means the schema uses something the published contract cannot
    // describe — a transform, a non-declarative refinement. It is a contract defect
    // found at the moment the schema is written rather than at F-015 when the document
    // is first generated.
    for (const io of ['input', 'output'] as const) {
      const document = toJsonSchema(schemaNamed(name), io);

      expect(document.$schema).toBe('https://json-schema.org/draft/2020-12/schema');
    }
  });

  it('publishes what a client must SEND, not what a handler receives', () => {
    // The regression this exists for: `limit` has a `.default()`, so the output schema
    // marks it required while the validator happily accepts `{}`. Published as `output`,
    // the document tells every generated client that `limit` is mandatory — wrong in the
    // direction a client cannot work around.
    expect(pageParamsSchema.safeParse({}).success).toBe(true);

    const asRequest = toJsonSchema(pageParamsSchema, 'input');
    const asResponse = toJsonSchema(pageParamsSchema, 'output');

    expect(asRequest.required ?? []).not.toContain('limit');
    expect(asResponse.required ?? []).toContain('limit');
  });

  it('converts the generic page wrapper, which the export scan cannot reach', () => {
    // `paginatedSchema` is a function, so it has no instance for the scan above to find.
    const document = toJsonSchema(paginatedSchema(slugSchema), 'output');

    expect(document).toMatchObject({
      type: 'object',
      properties: { data: { type: 'array' } },
    });
  });

  it('keeps a tuple a tuple', () => {
    // draft 2020-12 expresses a fixed-length tuple as `prefixItems`. An OpenAPI 3.0 target
    // would silently flatten it to a plain array, and a generated client would accept four
    // components for a three-component colour.
    const document = toJsonSchema(contracts.colorValueSchema, 'input');
    const components = (document.properties as Record<string, { prefixItems?: unknown[] }>)[
      'components'
    ];

    expect(components?.prefixItems).toHaveLength(3);
  });
});

describe('naming', () => {
  it.each(exportedSchemas.map(([name]) => name))('%s is named as a schema', (name) => {
    // Consumers destructure this barrel. `provenance` and `provenanceSchema` sitting side
    // by side — one a validator, one a type — is how the wrong one gets imported.
    expect(name.endsWith('Schema')).toBe(true);
  });
});
