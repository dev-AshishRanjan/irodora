/**
 * The entry schema.
 *
 * Every rejection test starts from `valid` and breaks exactly one thing, so a failure means
 * *that* rule fired rather than the entry being broken in some unrelated way. `valid` itself
 * is asserted to parse first, and asserted again at the end of the file — a fixture that
 * silently stopped being valid would turn every rejection test into a tautology
 * [[a-decoy-that-is-not-broken-proves-nothing]].
 */

import { describe, expect, it } from 'vitest';
import { CorpusError, parseEntry, type CorpusEntry } from '../src/index.js';

/** A complete, publishable entry. Deliberately a `japanese-inspired` one: it is ours. */
const valid = {
  slug: 'fixture-quiet-slate',
  classification: 'japanese-inspired',
  name: {
    kanji: '静石',
    kana: 'しずいし',
    romaji: 'shizu-ishi',
    en: 'Quiet Slate',
  },
  color: {
    xyz: { x: 0.1284, y: 0.1421, z: 0.1657 },
    measuredUnder: 'D65',
    adaptation: null,
    sourceHex: null,
  },
  taxonomy: {
    family: 'blue-grey',
    temperature: 'cool',
    lightnessBand: 'mid',
    chromaBand: 'low',
    era: null,
    material: null,
    season: ['autumn', 'winter'],
  },
  editorial: {
    description_en: 'A low-chroma blue-grey curated for outerwear against warm neutrals.',
    description_ja: '暖かみのある中間色に合わせて選んだ、彩度の低い青みの灰色。',
    historicalNote_en: null,
    contemporaryNote_en: null,
    fashionUse: ['outerwear', 'knitwear'],
  },
  provenance: {
    source: 'Irodora editorial curation, R1 seed set',
    sourceId: 'IRO-ED-001',
    sourceType: 'editorial',
    publisher: null,
    publishedYear: null,
    rightsHolder: 'Irodora',
    sourceLicence: 'Proprietary — Irodora original work',
    sourceUrl: null,
    derivation:
      'Editorial: interpolated in OKLCh between two attested blue-greys in the same family, ' +
      'then converted to XYZ by the engine.',
    authoredBy: 'ed-001',
    authoredAt: '2026-08-11',
    verifiedBy: 'ed-002',
    reviewIndependence: 'independent',
    verifiedAt: '2026-08-13',
    editorialNotes:
      'English name is a judgement about what communicates, not a translation of 静石.',
  },
  relations: { related: [], complementary: [], historicalVariants: [] },
  unknowns: {
    'color.adaptation': 'measured under D65, so no adaptation was applied',
    'color.sourceHex': 'no source hex — the value was derived, not transcribed',
    'taxonomy.era': 'a contemporary curation, so it belongs to no historical era',
    'taxonomy.material': 'not tied to a specific dye or fibre',
    'editorial.historicalNote_en': 'no history is claimed for our own curation',
    'editorial.contemporaryNote_en': 'not yet written',
    'provenance.publisher': 'our own work, so there is no external publisher',
    'provenance.publishedYear': 'our own work, so there is no publication date',
    'provenance.sourceUrl': 'not published externally',
  },
  status: 'published',
  versionId: '2026.08.1',
};

/** Deep clone through JSON so a mutation cannot leak into the next test. */
function mutate(change: (draft: Record<string, unknown>) => void): unknown {
  const draft = JSON.parse(JSON.stringify(valid)) as Record<string, unknown>;
  change(draft);
  return draft;
}

/** Assert a rejection AND the field it names — an exit code alone proves very little. */
function expectRejection(value: unknown, path: string, message: RegExp): void {
  try {
    parseEntry(value, 'fixture-quiet-slate.json');
    expect.unreachable(`expected a rejection naming ${path}`);
  } catch (error) {
    expect(error).toBeInstanceOf(CorpusError);
    expect((error as CorpusError).path).toBe(path);
    expect((error as CorpusError).message).toMatch(message);
    expect((error as CorpusError).source).toBe('fixture-quiet-slate.json');
  }
}

describe('the baseline fixture', () => {
  it('parses, so every rejection below is about the one thing it changed', () => {
    const entry: CorpusEntry = parseEntry(valid, 'fixture-quiet-slate.json');
    expect(entry.slug).toBe('fixture-quiet-slate');
    expect(entry.color.xyz).toEqual([0.1284, 0.1421, 0.1657]);
    expect(entry.classification).toBe('japanese-inspired');
  });

  it('turns the JSON object form of xyz into the tuple the engine consumes', () => {
    const entry = parseEntry(valid, 'x.json');
    expect(Array.isArray(entry.color.xyz)).toBe(true);
    expect(entry.color.xyz).toHaveLength(3);
  });
});

describe('required fields (NFR-20)', () => {
  const required: readonly (readonly [string, (d: Record<string, unknown>) => void])[] = [
    [
      'provenance.derivation',
      (d) => delete (d['provenance'] as Record<string, unknown>)['derivation'],
    ],
    ['provenance.source', (d) => delete (d['provenance'] as Record<string, unknown>)['source']],
    ['provenance.sourceId', (d) => delete (d['provenance'] as Record<string, unknown>)['sourceId']],
    [
      'provenance.sourceLicence',
      (d) => delete (d['provenance'] as Record<string, unknown>)['sourceLicence'],
    ],
    [
      'provenance.authoredBy',
      (d) => delete (d['provenance'] as Record<string, unknown>)['authoredBy'],
    ],
    [
      'provenance.editorialNotes',
      (d) => delete (d['provenance'] as Record<string, unknown>)['editorialNotes'],
    ],
    ['name.kanji', (d) => delete (d['name'] as Record<string, unknown>)['kanji']],
    ['name.kana', (d) => delete (d['name'] as Record<string, unknown>)['kana']],
    ['name.en', (d) => delete (d['name'] as Record<string, unknown>)['en']],
    [
      'editorial.description_en',
      (d) => delete (d['editorial'] as Record<string, unknown>)['description_en'],
    ],
    [
      'editorial.description_ja',
      (d) => delete (d['editorial'] as Record<string, unknown>)['description_ja'],
    ],
    ['taxonomy.family', (d) => delete (d['taxonomy'] as Record<string, unknown>)['family']],
  ];

  for (const [path, remove] of required)
    it(`fails on a missing ${path}`, () => {
      expectRejection(mutate(remove), path, /expected a non-empty string|expected lowercase/u);
    });

  it('fails on a missing colour, which is the whole point of the record', () => {
    expectRejection(
      mutate((d) => delete (d['color'] as Record<string, unknown>)['xyz']),
      'color.xyz',
      /expected an object/u,
    );
  });
});

describe('derived values cannot be authored (spec §3, ADR-0043)', () => {
  for (const key of ['lab', 'lch', 'oklch', 'rgb', 'hex', 'gamut'])
    it(`refuses an authored color.${key}, and says where it actually comes from`, () => {
      expectRejection(
        mutate((d) => {
          (d['color'] as Record<string, unknown>)[key] = key === 'hex' ? '#526A6B' : {};
        }),
        `color.${key}`,
        /is a DERIVED value and cannot be authored/u,
      );
    });

  it('points an editor who copied the spec example at sourceHex', () => {
    // The spec's own §1 example shows lab/oklch/hex inside `color`. Someone will copy it, and
    // "unknown field" would send them looking for a typo that is not there.
    expectRejection(
      mutate((d) => {
        (d['color'] as Record<string, unknown>)['hex'] = '#526A6B';
      }),
      'color.hex',
      /Supply the printed value as `color\.sourceHex` instead/u,
    );
  });

  it('accepts sourceHex, which records what the source printed', () => {
    const entry = parseEntry(
      mutate((d) => {
        (d['color'] as Record<string, unknown>)['sourceHex'] = '#526A6B';
        delete (d['unknowns'] as Record<string, unknown>)['color.sourceHex'];
      }),
      'x.json',
    );
    expect(entry.color.sourceHex).toBe('#526A6B');
  });
});

describe('unknown fields', () => {
  it('rejects a typo rather than dropping the value it was carrying', () => {
    expectRejection(
      mutate((d) => {
        (d['taxonomy'] as Record<string, unknown>)['temprature'] = 'cool';
      }),
      'taxonomy.temprature',
      /unknown field/u,
    );
  });

  it('rejects an unknown top-level key', () => {
    expectRejection(
      mutate((d) => {
        d['notes'] = 'freeform';
      }),
      'notes',
      /unknown field/u,
    );
  });
});

describe('no silent blanks (FR-21)', () => {
  it('rejects a null with no stated reason', () => {
    expectRejection(
      mutate((d) => {
        delete (d['unknowns'] as Record<string, unknown>)['taxonomy.material'];
      }),
      'taxonomy.material',
      /is null with no reason/u,
    );
  });

  it('rejects a reason whose field is not actually null', () => {
    // The stale half of the rule. Without it the reasons rot into decoration: a field gets a
    // real value, its explanation stays behind, and the record now explains an absence that
    // is not there.
    expectRejection(
      mutate((d) => {
        (d['unknowns'] as Record<string, unknown>)['taxonomy.family'] = 'we never looked';
      }),
      'unknowns.taxonomy.family',
      /but that field is not null/u,
    );
  });

  it('rejects a misspelled path in unknowns, rather than silently explaining nothing', () => {
    expectRejection(
      mutate((d) => {
        const u = d['unknowns'] as Record<string, unknown>;
        u['taxonomy.materials'] = u['taxonomy.material'];
      }),
      'unknowns.taxonomy.materials',
      /misspelled/u,
    );
  });

  it('rejects an empty reason, which is a blank wearing an explanation', () => {
    expectRejection(
      mutate((d) => {
        (d['unknowns'] as Record<string, unknown>)['taxonomy.material'] = '   ';
      }),
      'unknowns.taxonomy.material',
      /expected a non-empty string/u,
    );
  });
});

describe('the reviewer field tracks the status', () => {
  it('requires a reviewer at published', () => {
    expectRejection(
      mutate((d) => {
        (d['provenance'] as Record<string, unknown>)['verifiedBy'] = null;
      }),
      'provenance.verifiedBy',
      /cannot reach "published" without a recorded reviewer/u,
    );
  });

  it('requires a verification date at published', () => {
    expectRejection(
      mutate((d) => {
        (d['provenance'] as Record<string, unknown>)['verifiedAt'] = null;
      }),
      'provenance.verifiedAt',
      /cannot reach "published"/u,
    );
  });

  it('refuses a reviewer recorded on a draft', () => {
    expectRejection(
      mutate((d) => {
        d['status'] = 'draft';
      }),
      'provenance.verifiedBy',
      /before review completes/u,
    );
  });

  it('accepts a draft with no reviewer, and needs no `unknowns` entry for it', () => {
    const entry = parseEntry(
      mutate((d) => {
        d['status'] = 'draft';
        const p = d['provenance'] as Record<string, unknown>;
        p['verifiedBy'] = null;
        p['verifiedAt'] = null;
        // F-084: the declaration is part of the review, so it appears and disappears with it.
        p['reviewIndependence'] = null;
      }),
      'x.json',
    );
    expect(entry.provenance.verifiedBy).toBeNull();
    expect(entry.provenance.reviewIndependence).toBeNull();
    expect(entry.unknowns['provenance.verifiedBy']).toBeUndefined();
    expect(entry.unknowns['provenance.reviewIndependence']).toBeUndefined();
  });

  it('rejects a declared review independence before review completes (F-084)', () => {
    // The mirror of the rule above. Recording HOW an entry was reviewed, on an entry that has
    // not been reviewed, is the same class of claim as recording WHO reviewed it.
    expectRejection(
      mutate((d) => {
        d['status'] = 'draft';
        const p = d['provenance'] as Record<string, unknown>;
        p['verifiedBy'] = null;
        p['verifiedAt'] = null;
        p['reviewIndependence'] = 'self';
      }),
      'provenance.reviewIndependence',
      /before review completes/u,
    );
  });

  it('rejects a review independence outside the two values, rather than coercing it', () => {
    expectRejection(
      mutate((d) => {
        (d['provenance'] as Record<string, unknown>)['reviewIndependence'] = 'peer';
      }),
      'provenance.reviewIndependence',
      /expected "independent" or "self"/u,
    );
  });

  it('rejects an entry that reaches published without declaring how it was reviewed', () => {
    // This is the case the whole feature turns on: absence must not read as "independent".
    expectRejection(
      mutate((d) => {
        (d['provenance'] as Record<string, unknown>)['reviewIndependence'] = null;
      }),
      'provenance.reviewIndependence',
      /cannot reach "published" without a recorded reviewer/u,
    );
  });

  it('rejects a verification date that is not YYYY-MM-DD', () => {
    expectRejection(
      mutate((d) => {
        (d['provenance'] as Record<string, unknown>)['verifiedAt'] = '13/08/2026';
      }),
      'provenance.verifiedAt',
      /expected YYYY-MM-DD/u,
    );
  });
});

describe('derivation is not a formality', () => {
  it('rejects a derivation too short to state an epistemic claim', () => {
    expectRejection(
      mutate((d) => {
        (d['provenance'] as Record<string, unknown>)['derivation'] = 'measured';
      }),
      'provenance.derivation',
      /different epistemic claims about the same field/u,
    );
  });

  it('accepts a real one', () => {
    const entry = parseEntry(
      mutate((d) => {
        (d['provenance'] as Record<string, unknown>)['derivation'] =
          'Measured from dyed silk under D65, colorimeter, mean of five readings.';
      }),
      'x.json',
    );
    expect(entry.provenance.derivation).toMatch(/mean of five readings/u);
  });
});

describe('the adaptation rule', () => {
  it('requires an adaptation when the measurement was not under D65', () => {
    expectRejection(
      mutate((d) => {
        (d['color'] as Record<string, unknown>)['measuredUnder'] = 'D50';
      }),
      'color.adaptation',
      /no adaptation is recorded/u,
    );
  });

  it('accepts a D50 measurement that names its transform', () => {
    const entry = parseEntry(
      mutate((d) => {
        const c = d['color'] as Record<string, unknown>;
        c['measuredUnder'] = 'D50';
        c['adaptation'] = 'bradford';
        delete (d['unknowns'] as Record<string, unknown>)['color.adaptation'];
      }),
      'x.json',
    );
    expect(entry.color.adaptation).toBe('bradford');
  });

  it('refuses an adaptation recorded against a D65 measurement', () => {
    expectRejection(
      mutate((d) => {
        (d['color'] as Record<string, unknown>)['adaptation'] = 'cat16';
        delete (d['unknowns'] as Record<string, unknown>)['color.adaptation'];
      }),
      'color.adaptation',
      /claims a step that did not happen/u,
    );
  });
});

describe('values that are not values', () => {
  it('rejects a negative tristimulus, which is an error and not a wide-gamut colour', () => {
    expectRejection(
      mutate((d) => {
        (d['color'] as Record<string, unknown>)['xyz'] = { x: -0.1, y: 0.14, z: 0.16 };
      }),
      'color.xyz.x',
      /XYZ cannot be negative/u,
    );
  });

  it('rejects a non-finite tristimulus', () => {
    expectRejection(
      mutate((d) => {
        (d['color'] as Record<string, unknown>)['xyz'] = { x: 'zero', y: 0.14, z: 0.16 };
      }),
      'color.xyz.x',
      /expected a finite number/u,
    );
  });

  it('rejects a slug that is not a stable URL segment', () => {
    for (const bad of ['Quiet Slate', 'quiet_slate', 'quiet--slate', '-quiet', ''])
      expectRejection(
        mutate((d) => {
          d['slug'] = bad;
        }),
        'slug',
        /expected lowercase kebab-case|expected a non-empty string/u,
      );
  });

  it('rejects a version label that is not YYYY.MM.N (FR-25)', () => {
    for (const bad of ['2026.8.1', '2026.13.1', '2026.08', 'v1'])
      expectRejection(
        mutate((d) => {
          d['versionId'] = bad;
        }),
        'versionId',
        /expected YYYY\.MM\.N/u,
      );
  });

  it('rejects a classification outside the five', () => {
    expectRejection(
      mutate((d) => {
        d['classification'] = 'inspired';
      }),
      'classification',
      /required and displayed \(FR-23\)/u,
    );
  });

  it('rejects an entry that relates to itself', () => {
    expectRejection(
      mutate((d) => {
        (d['relations'] as Record<string, unknown>)['related'] = ['fixture-quiet-slate'];
      }),
      'relations',
      /relates to itself/u,
    );
  });
});

describe('the classification rules reach the parser', () => {
  it('rejects our own editorial curation labelled historical', () => {
    expectRejection(
      mutate((d) => {
        d['classification'] = 'historical';
      }),
      'classification',
      /OUR OWN CURATION and cannot be classified "historical"/u,
    );
  });
});

describe('the baseline, again', () => {
  it('still parses after every mutation above ran against its own copy', () => {
    // The mutations clone through JSON, but asserting it rather than trusting it is the
    // difference between a fixture and an assumption.
    expect(() => parseEntry(valid, 'x.json')).not.toThrow();
  });
});
