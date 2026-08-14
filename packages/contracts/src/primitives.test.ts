import { describe, expect, it } from 'vitest';

import {
  corpusVersionSchema,
  hexSchema,
  localeSchema,
  localizedTextSchema,
  slugSchema,
  unitIntervalSchema,
} from './primitives.js';

describe('slug', () => {
  it('accepts a corpus slug', () => {
    expect(slugSchema.safeParse('seiji-nezumi').success).toBe(true);
  });

  it.each(['Seiji-Nezumi', 'seiji_nezumi', 'seiji--nezumi', '-seiji', 'seiji-', ''])(
    'rejects %o',
    (candidate) => {
      expect(slugSchema.safeParse(candidate).success).toBe(false);
    },
  );
});

describe('hex', () => {
  it.each(['#718477', '#E8DFCF'])('accepts %s in either case', (candidate) => {
    expect(hexSchema.safeParse(candidate).success).toBe(true);
  });

  it.each(['718477', '#71847', '#7184777', '#GGGGGG', '#718'])('rejects %o', (candidate) => {
    // Three-digit shorthand is rejected deliberately: `#718` and `#771188` are the same
    // colour to a browser and different strings to a cache key.
    expect(hexSchema.safeParse(candidate).success).toBe(false);
  });

  it('does not normalise case', () => {
    // Normalisation is a colour-engine concern. A transform here would make the schema
    // unrepresentable as JSON Schema and break the OpenAPI leg.
    expect(hexSchema.parse('#E8DFCF')).toBe('#E8DFCF');
  });
});

describe('confidence', () => {
  it.each([0, 0.5, 1])('accepts %d', (value) => {
    expect(unitIntervalSchema.safeParse(value).success).toBe(true);
  });

  it.each([-0.01, 1.01, Number.NaN])('rejects %d', (value) => {
    expect(unitIntervalSchema.safeParse(value).success).toBe(false);
  });
});

describe('corpus version', () => {
  it('accepts a published version', () => {
    expect(corpusVersionSchema.safeParse('2026.08.1').success).toBe(true);
  });

  it.each(['latest', '2026.8.1', '2026.08', 'v2026.08.1'])('rejects %o', (candidate) => {
    // `latest` is the one that matters: a cache key containing it would serve one corpus
    // under another corpus's identity (E-006).
    expect(corpusVersionSchema.safeParse(candidate).success).toBe(false);
  });
});

describe('locale and localised text', () => {
  it('is closed to the two locales the product supports', () => {
    expect(localeSchema.safeParse('en').success).toBe(true);
    expect(localeSchema.safeParse('ja').success).toBe(true);
    expect(localeSchema.safeParse('en-GB').success).toBe(false);
  });

  it('requires both locales', () => {
    expect(localizedTextSchema.safeParse({ en: 'Muted Sage', ja: '青磁鼠' }).success).toBe(true);
    expect(localizedTextSchema.safeParse({ en: 'Muted Sage' }).success).toBe(false);
  });

  it('rejects an empty translation, which is how a missing one usually arrives', () => {
    expect(localizedTextSchema.safeParse({ en: 'Muted Sage', ja: '' }).success).toBe(false);
  });
});
