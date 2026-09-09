/**
 * The combination schema — FR-73, NFR-20.
 *
 * Two rules carry this file, and they are the two that would otherwise be enforced by nothing
 * but somebody remembering:
 *
 * 1. **A combination is ours** — it can never be `historical` or `traditional`, whatever its
 *    `sourceType` says. Pairing two colours is an editorial act.
 * 2. **Two to four** — because one is a colour and five is a palette, and a schema that accepted
 *    five would make that distinction a naming convention rather than a rule.
 */

import { describe, expect, it } from 'vitest';
import {
  COMBINATION_MAX,
  COMBINATION_MIN,
  CorpusError,
  leadOf,
  parseCombination,
  type CorpusCombination,
} from '../src/index.js';

const valid = {
  slug: 'fixture-indigo-and-straw',
  name: { en: 'Indigo and Straw', ja: '藍と藁' },
  classification: 'editorial',
  intent: 'contrast',
  colors: [
    { slug: 'fixture-sumi', role: 'lead', rank: 1 },
    { slug: 'fixture-kinari', role: 'companion', rank: 2 },
  ],
  provenance: {
    source: 'Irodora editorial curation, R7 seed combinations',
    sourceId: 'IRO-ED-001',
    sourceType: 'editorial',
    publisher: null,
    publishedYear: null,
    rightsHolder: 'Irodora',
    sourceLicence: 'Proprietary — Irodora original work',
    sourceUrl: null,
    derivation:
      'Editorial: a dark lead against a warm undyed light, chosen for the lightness gap rather ' +
      'than for a hue relationship.',
    authoredBy: 'ed-001',
    authoredAt: '2026-09-08',
    verifiedBy: 'ed-002',
    reviewIndependence: 'independent',
    verifiedAt: '2026-09-08',
    editorialNotes: 'Assembled from our own corpus. No published combination dataset was read.',
  },
  unknowns: {
    'provenance.publisher': 'our own work, so there is no external publisher',
    'provenance.publishedYear': 'our own work, so there is no publication date',
    'provenance.sourceUrl': 'not published externally',
  },
  status: 'published',
  versionId: '2026.09.1',
};

function mutate(change: (draft: Record<string, unknown>) => void): unknown {
  const draft = JSON.parse(JSON.stringify(valid)) as Record<string, unknown>;
  change(draft);
  return draft;
}

function expectRejection(value: unknown, path: string, message: RegExp): void {
  try {
    parseCombination(value, 'fixture-indigo-and-straw.json');
    expect.unreachable(`expected a rejection naming ${path}`);
  } catch (error) {
    expect(error).toBeInstanceOf(CorpusError);
    expect((error as CorpusError).message).toMatch(message);
  }
}

describe('a valid combination', () => {
  it('parses, so the rejections below are not a parser that refuses everything', () => {
    const parsed = parseCombination(valid, 'fixture.json');
    expect(parsed.slug).toBe('fixture-indigo-and-straw');
    expect(parsed.colors).toHaveLength(2);
    expect(parsed.intent).toBe('contrast');
  });

  it('names its lead, which the schema guarantees exists', () => {
    expect(leadOf(parseCombination(valid, 'fixture.json')).slug).toBe('fixture-sumi');
  });
});

describe('a combination is ours, and cannot be presented as history', () => {
  /*
   * THE RULE THIS FILE EXISTS FOR.
   *
   * Unconditional here, unlike the entry rule: `checkClassification` constrains an ENTRY to our
   * own curation only when its `sourceType` is editorial, because an entry can legitimately be
   * historical — somebody measured a dyed silk. There is no `sourceType` under which a PAIRING
   * is a measurement of the world.
   */
  for (const classification of ['historical', 'traditional', 'modern-japanese'])
    it(`refuses classification "${classification}"`, () => {
      expectRejection(
        mutate((d) => {
          d['classification'] = classification;
        }),
        'classification',
        /own editorial work/u,
      );
    });

  for (const classification of ['editorial', 'japanese-inspired'])
    it(`accepts "${classification}", so the rule is a filter and not a wall`, () => {
      const parsed = parseCombination(
        mutate((d) => {
          d['classification'] = classification;
        }),
        'fixture.json',
      );
      expect(parsed.classification).toBe(classification);
    });

  it('refuses a classification that is not one of the five at all', () => {
    expectRejection(
      mutate((d) => {
        d['classification'] = 'vintage';
      }),
      'classification',
      /expected one of/u,
    );
  });
});

describe('two to four, and both bounds are load-bearing', () => {
  it('refuses one colour, which is a colour', () => {
    expectRejection(
      mutate((d) => {
        d['colors'] = [{ slug: 'fixture-sumi', role: 'lead', rank: 1 }];
      }),
      'colors',
      /is a colour, not a combination/u,
    );
  });

  it('refuses five, which is a palette', () => {
    expectRejection(
      mutate((d) => {
        d['colors'] = [
          { slug: 'fixture-a', role: 'lead', rank: 1 },
          { slug: 'fixture-b', role: 'companion', rank: 2 },
          { slug: 'fixture-c', role: 'companion', rank: 3 },
          { slug: 'fixture-d', role: 'companion', rank: 4 },
          { slug: 'fixture-e', role: 'companion', rank: 5 },
        ];
      }),
      'colors',
      /is a palette/u,
    );
  });

  it('accepts the ceiling, so the bound is a range and not an off-by-one', () => {
    const parsed = parseCombination(
      mutate((d) => {
        d['colors'] = [
          { slug: 'fixture-a', role: 'lead', rank: 1 },
          { slug: 'fixture-b', role: 'companion', rank: 2 },
          { slug: 'fixture-c', role: 'companion', rank: 3 },
          { slug: 'fixture-d', role: 'companion', rank: 4 },
        ];
      }),
      'fixture.json',
    );
    expect(parsed.colors).toHaveLength(COMBINATION_MAX);
    expect(COMBINATION_MIN).toBeLessThan(COMBINATION_MAX);
  });
});

describe('exactly one lead', () => {
  it('refuses none — a set of colours with nothing to answer to', () => {
    expectRejection(
      mutate((d) => {
        d['colors'] = [
          { slug: 'fixture-a', role: 'companion', rank: 1 },
          { slug: 'fixture-b', role: 'companion', rank: 2 },
        ];
      }),
      'colors',
      /exactly one member with role "lead"/u,
    );
  });

  it('refuses two — which is two combinations written as one', () => {
    expectRejection(
      mutate((d) => {
        d['colors'] = [
          { slug: 'fixture-a', role: 'lead', rank: 1 },
          { slug: 'fixture-b', role: 'lead', rank: 2 },
        ];
      }),
      'colors',
      /exactly one member with role "lead"/u,
    );
  });
});

describe('the members are a list somebody can read', () => {
  it('refuses a colour paired with itself', () => {
    expectRejection(
      mutate((d) => {
        d['colors'] = [
          { slug: 'fixture-sumi', role: 'lead', rank: 1 },
          { slug: 'fixture-sumi', role: 'companion', rank: 2 },
        ];
      }),
      'colors',
      /appears twice/u,
    );
  });

  it('refuses a rank gap, which is a removal left for the next reader to guess', () => {
    expectRejection(
      mutate((d) => {
        d['colors'] = [
          { slug: 'fixture-a', role: 'lead', rank: 1 },
          { slug: 'fixture-b', role: 'companion', rank: 3 },
        ];
      }),
      'colors',
      /ranks are/u,
    );
  });

  it('refuses a weight, because a combination does not have them', () => {
    // The palette's field, and its absence here is the difference between the record types
    // rather than an omission. An unknown key is refused rather than ignored.
    expectRejection(
      mutate((d) => {
        (d['colors'] as Record<string, unknown>[])[0]!['weight'] = 1;
      }),
      'colors[0]',
      /weight/u,
    );
  });

  it('refuses an unknown top-level key', () => {
    expectRejection(
      mutate((d) => {
        d['category'] = 'contemporary';
      }),
      '',
      /category/u,
    );
  });
});

describe('provenance is complete or the record does not exist', () => {
  it('refuses a missing derivation', () => {
    expectRejection(
      mutate((d) => {
        delete (d['provenance'] as Record<string, unknown>)['derivation'];
      }),
      'provenance.derivation',
      /derivation/u,
    );
  });

  it('refuses a published record with no reviewer', () => {
    expectRejection(
      mutate((d) => {
        delete (d['provenance'] as Record<string, unknown>)['verifiedBy'];
      }),
      'provenance.verifiedBy',
      /verifiedBy/u,
    );
  });

  it('carries the review independence rather than defaulting it (ADR-0060)', () => {
    const parsed: CorpusCombination = parseCombination(valid, 'fixture.json');
    expect(parsed.provenance.reviewIndependence).toBe('independent');
  });
});
