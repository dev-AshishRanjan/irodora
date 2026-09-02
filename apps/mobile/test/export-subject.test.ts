/**
 * A stored palette as an export subject (FR-51, FR-10, F-129).
 *
 * ## What earns this file
 *
 * This is the module that decides **what is in the file**. Every writer is a pure function of an
 * `ExportSubject`, and every one of them is tested — so a wrong subject produces six perfectly
 * correct files, all of them describing the wrong thing.
 *
 * The half that matters most is the envelope: FR-10 says an export carries the versions that
 * produced it, and a version assembled here would be a claim made by the layer least able to
 * know it.
 */

import { paletteSubject } from '../src/export/subject';
import { allEntries, CORPUS_LABEL } from '../src/corpus';
import { ruleSet } from '../src/rules';
import { ENGINE_VERSION } from '@irodora/color-spaces';
import type { SavedColorRow, StoredPalette } from '@irodora/store';

function rowOf(slug: string): SavedColorRow {
  const found = allEntries().find((e) => e.entry.slug === slug);
  if (found === undefined) throw new Error(`no entry ${slug}`);
  return {
    id: `c-${slug}`,
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    name: found.entry.name.en,
    xyz_x: found.entry.color.xyz[0],
    xyz_y: found.entry.color.xyz[1],
    xyz_z: found.entry.color.xyz[2],
    lab_l: found.derived.lab[0],
    lab_a: found.derived.lab[1],
    lab_b: found.derived.lab[2],
    oklch_l: found.derived.oklch[0],
    oklch_c: found.derived.oklch[1],
    oklch_h: found.derived.oklch[2],
    hex: found.derived.hex,
    source: 'reference',
    confidence: 1,
    corpus_slug: slug,
    capture_illuminant: null,
    capture_quality: null,
    capture_samples: null,
    capture_variance: null,
  };
}

const SLUGS = allEntries()
  .slice(0, 3)
  .map((e) => e.entry.slug);

const PALETTE: StoredPalette = {
  id: 'p-1',
  nameEn: 'Evening walk',
  nameJa: '夕方の散歩',
  classification: 'editorial',
  category: 'contemporary',
  versionId: CORPUS_LABEL,
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
  members: SLUGS.map((slug, i) => ({
    colorId: `c-${slug}`,
    slug,
    role: i === 0 ? 'anchor' : 'accent',
    rank: i,
    weight: 1,
    color: rowOf(slug),
  })),
};

describe('the envelope is read, never composed', () => {
  it('carries the versions the app actually holds', () => {
    // Compared against the SAME constants the app reads, not against literals: a literal here
    // would go stale the day a version moved, and the failure would look like a bug in this
    // module rather than a test that was never updated.
    const subject = paletteSubject(PALETTE);

    expect(subject.envelope.engine).toBe(ENGINE_VERSION);
    expect(subject.envelope.corpus).toBe(CORPUS_LABEL);
    expect(subject.envelope.rules).toBe(ruleSet().versionId);
  });

  it('carries no version this app cannot name', () => {
    const subject = paletteSubject(PALETTE);

    for (const [field, value] of Object.entries(subject.envelope))
      expect(`${field}: ${String(typeof value === 'string' && value.length > 0)}`).toBe(
        `${field}: true`,
      );
  });
});

describe('the colours come from the stored row', () => {
  it('reads every coordinate rather than recomputing it', () => {
    // E-001. The row was written under a pinned engine version; deriving `lab` again here would
    // put TODAY's engine's answer in a file that names yesterday's in its envelope.
    const subject = paletteSubject(PALETTE);
    const first = subject.colours[0];
    const row = PALETTE.members[0]?.color;

    expect(first?.lab).toEqual([row?.lab_l, row?.lab_a, row?.lab_b]);
    expect(first?.oklch).toEqual([row?.oklch_l, row?.oklch_c, row?.oklch_h]);
    expect(first?.hex).toBe(row?.hex);
    expect(first?.source).toBe(row?.source);
  });

  it('derives CIELCh as the polar form of the stored CIELAB', () => {
    const subject = paletteSubject(PALETTE);
    const row = PALETTE.members[0]?.color;
    const [l, c, h] = subject.colours[0]?.lch ?? [0, 0, 0];

    expect(l).toBe(row?.lab_l);
    expect(c).toBeCloseTo(Math.hypot(row?.lab_a ?? 0, row?.lab_b ?? 0), 10);
    // The angle is normalised to [0, 360). `atan2` returns (-180, 180], and a negative hue is
    // the shape of the bug this pins.
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(360);
  });

  it('normalises a negative hue angle rather than passing it through', () => {
    // A colour with a negative b* and positive a* lands in the fourth quadrant, where `atan2`
    // is negative. Every corpus entry might happen to avoid it; this one cannot.
    const member = PALETTE.members[0];
    if (member === undefined) throw new Error('unreachable');
    const negative: StoredPalette = {
      ...PALETTE,
      members: [{ ...member, color: { ...member.color, lab_a: 10, lab_b: -10 } }],
    };

    expect(paletteSubject(negative).colours[0]?.lch[2]).toBeCloseTo(315, 6);
  });

  it('keeps the palette in rank order', () => {
    const subject = paletteSubject(PALETTE);

    expect(subject.colours.map((c) => c.id)).toEqual(SLUGS);
  });

  it('titles the subject with the English name, which a filename can be derived from', () => {
    const subject = paletteSubject(PALETTE);

    expect(subject.title).toBe(PALETTE.nameEn);
  });
});
