/**
 * Editorial harmonies — criterion 3, "kept distinct from geometric ones".
 *
 * `content/palettes/` is empty (F-012, blocked on OQ-4/OQ-5), so these run on generated bundles
 * and print the real palette count. Third feature running with that shape; the pattern is
 * applied deliberately rather than rediscovered.
 */

import type { Triple } from '@irodora/color-spaces';
import { describe, expect, it } from 'vitest';
import {
  editorialHarmoniesFrom,
  generateHarmony,
  HarmonyError,
  type EditorialSource,
} from '../src/index.js';

const source: EditorialSource = {
  label: '2026.08.1',
  entries: [
    { entry: { slug: 'fixture-kinari' }, derived: { oklch: [0.92, 0.02, 85] as Triple } },
    { entry: { slug: 'fixture-hai-iro' }, derived: { oklch: [0.62, 0.01, 250] as Triple } },
    { entry: { slug: 'fixture-sumi' }, derived: { oklch: [0.22, 0.01, 260] as Triple } },
  ],
  palettes: [
    {
      palette: {
        slug: 'fixture-quiet-neutrals',
        colors: [
          { slug: 'fixture-sumi', rank: 3 },
          { slug: 'fixture-kinari', rank: 1 },
          { slug: 'fixture-hai-iro', rank: 2 },
        ],
      },
    },
  ],
};

describe('the corpus this suite runs on', () => {
  it('is generated, and says so', () => {
    console.log(
      `  editorial suite: ${String(source.palettes.length)} GENERATED palette(s). ` +
        'Real corpus palettes available: 0 (F-012 is blocked on OQ-4/OQ-5).',
    );
    expect(source.palettes.length).toBeGreaterThan(0);
  });
});

describe('the two families are kept distinct', () => {
  const [harmony] = editorialHarmoniesFrom(source);

  it('an editorial harmony is family `editorial` and carries attribution', () => {
    expect(harmony?.family).toBe('editorial');
    expect(harmony?.provenance).toEqual({
      paletteSlug: 'fixture-quiet-neutrals',
      corpusVersion: '2026.08.1',
    });
  });

  it('has NO geometric kind — a curator did not necessarily pick a triad', () => {
    // This corrected the plan, which had said an editorial harmony still stands in some
    // relationship. Labelling a curated palette as a triad afterwards would invent a claim the
    // curator never made.
    expect(harmony?.kind).toBeNull();
  });

  it('a geometric harmony is the exact mirror: a kind, and no attribution', () => {
    const geometric = generateHarmony([0.6, 0.12, 250], 'triadic');
    expect(geometric.family).toBe('geometric');
    expect(geometric.kind).toBe('triadic');
    expect(geometric.provenance).toBeNull();
  });

  it('so family alone tells a consumer which claim it is looking at', () => {
    // The property criterion 3 is really about: a renderer must be able to say "curated by us"
    // versus "computed" without inspecting anything else.
    const geometric = generateHarmony([0.6, 0.12, 250], 'analogous');
    expect(harmony?.family).not.toBe(geometric.family);
    expect(harmony?.provenance === null).not.toBe(geometric.provenance === null);
  });
});

describe('the curator’s order is preserved', () => {
  it('orders by rank, not by input order', () => {
    // The palette above lists sumi(3), kinari(1), hai-iro(2) deliberately out of order.
    // Re-sorting by rank keeps the judgement; using input order would discard it.
    const [harmony] = editorialHarmoniesFrom(source);
    expect(harmony?.colors.map((c) => c.oklch[0].toFixed(2))).toEqual(['0.92', '0.62', '0.22']);
  });
});

describe('it refuses a bundle it cannot render honestly', () => {
  it('throws when a palette names a colour the bundle does not contain', () => {
    // Dropping it silently would return a harmony missing a member with nothing to say so.
    const broken: EditorialSource = {
      ...source,
      palettes: [
        {
          palette: {
            slug: 'fixture-quiet-neutrals',
            colors: [{ slug: 'fixture-missing', rank: 1 }],
          },
        },
      ],
    };
    expect(() => editorialHarmoniesFrom(broken)).toThrow(HarmonyError);
    expect(() => editorialHarmoniesFrom(broken)).toThrow(/not in bundle/u);
  });

  it('throws on a bundle with no label, which would leave attribution unresolvable', () => {
    expect(() => editorialHarmoniesFrom({ ...source, label: '' })).toThrow(HarmonyError);
  });

  it('throws on a palette with no colours', () => {
    const empty: EditorialSource = {
      ...source,
      palettes: [{ palette: { slug: 'fixture-empty', colors: [] } }],
    };
    expect(() => editorialHarmoniesFrom(empty)).toThrow(/has no colours/u);
  });
});
