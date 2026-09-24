/**
 * The palette schema — FR-22, spec §4.
 *
 * The anchor rule carries this file. It is a sentence in a specification that would otherwise
 * stay true and unenforced for years, which is exactly the kind of rule that quietly stops
 * being true.
 */

import { describe, expect, it } from 'vitest';
import { CorpusError, KASANE_LAYER_FLOOR, kasaneEdges, parsePalette } from '../src/index.js';

const valid = {
  slug: 'fixture-quiet-neutrals',
  name: { en: 'Quiet Neutrals', ja: '静かな中間色' },
  classification: 'japanese-inspired',
  category: 'contemporary',
  colors: [
    { slug: 'fixture-kinari', role: 'light', rank: 1, weight: 1 },
    { slug: 'fixture-hai-iro', role: 'neutral', rank: 2, weight: 0.9 },
    { slug: 'fixture-sumi', role: 'anchor', rank: 3, weight: 0.8 },
  ],
  provenance: {
    source: 'Irodora editorial curation, R1 seed palettes',
    sourceId: 'IRO-ED-001',
    sourceType: 'editorial',
    publisher: null,
    publishedYear: null,
    rightsHolder: 'Irodora',
    sourceLicence: 'Proprietary — Irodora original work',
    sourceUrl: null,
    derivation:
      'Editorial: three colours chosen for a low-contrast neutral ground, anchored on sumi.',
    authoredBy: 'ed-001',
    authoredAt: '2026-08-11',
    verifiedBy: 'ed-002',
    reviewIndependence: 'independent',
    verifiedAt: '2026-08-13',
    editorialNotes: 'Assembled for outerwear layering rather than from a historical grouping.',
  },
  unknowns: {
    'provenance.publisher': 'our own work, so there is no external publisher',
    'provenance.publishedYear': 'our own work, so there is no publication date',
    'provenance.sourceUrl': 'not published externally',
  },
  status: 'published',
  versionId: '2026.08.1',
};

function mutate(change: (draft: Record<string, unknown>) => void): unknown {
  const draft = JSON.parse(JSON.stringify(valid)) as Record<string, unknown>;
  change(draft);
  return draft;
}

function expectRejection(value: unknown, path: string, message: RegExp): void {
  try {
    parsePalette(value, 'fixture-quiet-neutrals.json');
    expect.unreachable(`expected a rejection naming ${path}`);
  } catch (error) {
    expect(error).toBeInstanceOf(CorpusError);
    expect((error as CorpusError).path).toBe(path);
    expect((error as CorpusError).message).toMatch(message);
  }
}

describe('the baseline palette', () => {
  it('parses, so every rejection below is about the one thing it changed', () => {
    const palette = parsePalette(valid, 'x.json');
    expect(palette.colors).toHaveLength(3);
    expect(palette.colors.map((c) => c.role)).toContain('anchor');
  });
});

describe('a palette without an anchor is a colour list', () => {
  it('rejects it, and says what an anchor is for', () => {
    expectRejection(
      mutate((d) => {
        const colors = d['colors'] as Record<string, unknown>[];
        colors[2]!['role'] = 'accent';
      }),
      'colors',
      /A palette without an anchor is a colour list, not a palette/u,
    );
  });

  it('accepts a palette whose anchor is in any position', () => {
    for (const at of [0, 1, 2]) {
      const value = mutate((d) => {
        const colors = d['colors'] as Record<string, unknown>[];
        for (const [i, c] of colors.entries()) c['role'] = i === at ? 'anchor' : 'neutral';
      });
      expect(() => {
        parsePalette(value, 'x.json');
      }).not.toThrow();
    }
  });

  it('rejects an empty colour list before it gets as far as the anchor rule', () => {
    expectRejection(
      mutate((d) => {
        d['colors'] = [];
      }),
      'colors',
      /a palette with no colours is not a palette/u,
    );
  });
});

describe('ranks', () => {
  it('rejects a gap, which is a deleted member and a reinterpreted order', () => {
    expectRejection(
      mutate((d) => {
        (d['colors'] as Record<string, unknown>[])[2]!['rank'] = 4;
      }),
      'colors',
      /ranks are \[1, 2, 4\]; expected \[1, 2, 3\]/u,
    );
  });

  it('rejects a duplicate rank', () => {
    expectRejection(
      mutate((d) => {
        (d['colors'] as Record<string, unknown>[])[2]!['rank'] = 2;
      }),
      'colors',
      /expected \[1, 2, 3\]/u,
    );
  });

  it('rejects a rank below 1', () => {
    expectRejection(
      mutate((d) => {
        (d['colors'] as Record<string, unknown>[])[0]!['rank'] = 0;
      }),
      'colors[0].rank',
      /expected an integer >= 1/u,
    );
  });

  it('does not care which order the members are written in', () => {
    const value = mutate((d) => {
      d['colors'] = (d['colors'] as unknown[]).slice().reverse();
    });
    expect(() => {
      parsePalette(value, 'x.json');
    }).not.toThrow();
  });
});

describe('weights', () => {
  it('rejects zero — a member that is present and contributes nothing', () => {
    expectRejection(
      mutate((d) => {
        (d['colors'] as Record<string, unknown>[])[1]!['weight'] = 0;
      }),
      'colors[1].weight',
      /expected a number in \(0, 1\]/u,
    );
  });

  it('rejects above 1', () => {
    expectRejection(
      mutate((d) => {
        (d['colors'] as Record<string, unknown>[])[1]!['weight'] = 1.5;
      }),
      'colors[1].weight',
      /expected a number in \(0, 1\]/u,
    );
  });

  it('does NOT require the weights to sum to 1', () => {
    // `content/rules/` is where weights must normalise (F-029, E-009). Spec §4 asks for no
    // such thing here, and importing that rule because it sounds similar would reject correct
    // palettes. The baseline sums to 2.7 and is valid.
    const total = valid.colors.reduce((sum, c) => sum + c.weight, 0);
    expect(total).toBeCloseTo(2.7, 10);
    expect(() => parsePalette(valid, 'x.json')).not.toThrow();
  });
});

describe('members', () => {
  it('rejects the same colour twice', () => {
    expectRejection(
      mutate((d) => {
        (d['colors'] as Record<string, unknown>[])[1]!['slug'] = 'fixture-kinari';
      }),
      'colors',
      /appears twice/u,
    );
  });

  it('rejects a role outside the four', () => {
    expectRejection(
      mutate((d) => {
        (d['colors'] as Record<string, unknown>[])[0]!['role'] = 'highlight';
      }),
      'colors[0].role',
      /expected one of anchor, neutral, light, accent/u,
    );
  });

  it('rejects an authored hex on a member', () => {
    expectRejection(
      mutate((d) => {
        (d['colors'] as Record<string, unknown>[])[0]!['hex'] = '#EFE7D8';
      }),
      'colors[0].hex',
      /is a DERIVED value and cannot be authored/u,
    );
  });
});

describe('a palette carries the same provenance obligations as a colour', () => {
  it('rejects a missing licence', () => {
    expectRejection(
      mutate((d) => {
        delete (d['provenance'] as Record<string, unknown>)['sourceLicence'];
      }),
      'provenance.sourceLicence',
      /expected a non-empty string/u,
    );
  });

  it('requires a reviewer at published', () => {
    expectRejection(
      mutate((d) => {
        (d['provenance'] as Record<string, unknown>)['verifiedBy'] = null;
      }),
      'provenance.verifiedBy',
      /cannot reach "published" without a recorded reviewer/u,
    );
  });

  it('refuses our own curation labelled historical (FR-23)', () => {
    expectRejection(
      mutate((d) => {
        d['classification'] = 'historical';
      }),
      'classification',
      /OUR OWN CURATION and cannot be classified "historical"/u,
    );
  });

  it('rejects a null with no stated reason, same as an entry', () => {
    expectRejection(
      mutate((d) => {
        delete (d['unknowns'] as Record<string, unknown>)['provenance.publisher'];
      }),
      'provenance.publisher',
      /is null with no reason/u,
    );
  });
});

describe('category', () => {
  it('rejects a category outside the four', () => {
    expectRejection(
      mutate((d) => {
        d['category'] = 'modern';
      }),
      'category',
      /expected one of contemporary, traditional, seasonal/u,
    );
  });
});

/*
 * KASANE (F-224). A palette composed in the manner of kasane no irome is OURS and it is LAYERED,
 * and both are refused in the parser rather than caught in review. The classification decoys use
 * a `publication` source on purpose: an editorial source is already refused a historical label by
 * `checkClassification`, so a test written with one would pass without the kasane rule existing.
 */
describe('a kasane', () => {
  const kasane = (change: (draft: Record<string, unknown>) => void = () => undefined) =>
    mutate((d) => {
      d['category'] = 'kasane';
      change(d);
    });

  /** A source that IS allowed a claim about the canon, so only the kasane rule can refuse it. */
  const publishedSource = (d: Record<string, unknown>) => {
    const p = d['provenance'] as Record<string, unknown>;
    p['sourceType'] = 'publication';
    p['publisher'] = 'A Press';
    p['publishedYear'] = 1850;
    const u = d['unknowns'] as Record<string, unknown>;
    delete u['provenance.publisher'];
    delete u['provenance.publishedYear'];
  };

  it('DECOY — ours, with three layers, parses', () => {
    const palette = parsePalette(kasane(), 'k.json');
    expect(palette.category).toBe('kasane');
    expect(palette.colors).toHaveLength(3);
  });

  it('DECOY — the same published source parses as an ordinary palette', () => {
    // Proves the refusals below come from the kasane rule, not from the source.
    expect(() =>
      parsePalette(
        mutate((d) => {
          publishedSource(d);
          d['classification'] = 'traditional';
        }),
        'p.json',
      ),
    ).not.toThrow();
  });

  for (const classification of ['historical', 'traditional', 'modern-japanese'])
    it(`refuses one classified "${classification}", whatever its source says`, () => {
      expectRejection(
        kasane((d) => {
          publishedSource(d);
          d['classification'] = classification;
        }),
        'classification',
        /a kasane is classified .* composed in its manner is ours/u,
      );
    });

  it('refuses a single layer', () => {
    expectRejection(
      kasane((d) => {
        d['colors'] = [{ slug: 'fixture-sumi', role: 'anchor', rank: 1, weight: 1 }];
      }),
      'colors',
      /not a layering/u,
    );
  });

  it('DECOY — two layers are a layering', () => {
    expect(() =>
      parsePalette(
        kasane((d) => {
          d['colors'] = [
            { slug: 'fixture-sumi', role: 'anchor', rank: 1, weight: 1 },
            { slug: 'fixture-kinari', role: 'light', rank: 2, weight: 0.8 },
          ];
        }),
        'k.json',
      ),
    ).not.toThrow();
  });
});

/*
 * THE EDGES (F-224). A layering whose edges cannot be told apart is not one, and the figure is
 * computed on every run rather than typed into a record. Lab values here are hand-picked: two far
 * apart, two within the floor.
 */
describe('the edges of a kasane', () => {
  const k = parsePalette(
    mutate((d) => {
      d['category'] = 'kasane';
    }),
    'k.json',
  );
  const lab: Record<string, [number, number, number]> = {
    'fixture-kinari': [95, 0, 2],
    'fixture-hai-iro': [60, 0, 0],
    'fixture-sumi': [20, 0, 0],
  };

  it('DECOY — distinct layers measure far above the floor, outermost first', () => {
    const edges = kasaneEdges(k, (s) => lab[s]);
    expect(edges.map((e) => [e.outer, e.inner])).toEqual([
      ['fixture-kinari', 'fixture-hai-iro'],
      ['fixture-hai-iro', 'fixture-sumi'],
    ]);
    for (const e of edges) expect(e.deltaE00).toBeGreaterThan(KASANE_LAYER_FLOOR);
  });

  it('reports an edge the eye cannot find as under the floor', () => {
    const close: Record<string, [number, number, number]> = {
      ...lab,
      'fixture-hai-iro': [94, 0, 2],
    };
    const edges = kasaneEdges(k, (s) => close[s]);
    expect(edges[0]?.deltaE00).toBeLessThan(KASANE_LAYER_FLOOR);
  });

  it('throws for a layer with no value rather than skipping its edge', () => {
    expect(() => kasaneEdges(k, (s) => (s === 'fixture-sumi' ? undefined : lab[s]))).toThrow(
      /no measured value/u,
    );
  });
});

describe('the baseline, again', () => {
  it('still parses', () => {
    expect(() => parsePalette(valid, 'x.json')).not.toThrow();
  });
});
