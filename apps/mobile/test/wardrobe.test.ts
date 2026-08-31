/**
 * The add-garment draft rules (FR-40, F-043).
 *
 * ## The assertion that earns this file
 *
 * *"Never more than two required fields."* A test that saves a fully-populated draft proves
 * nothing about that — it passes just as well against a form demanding all fourteen. So the
 * assertion here is the **inverse**, one field at a time: with colour and type set, adding or
 * omitting each of the twelve others changes nothing about whether it saves.
 *
 * That is what catches a "required" creeping in later. A single "the minimal draft saves" test
 * would keep passing while somebody added a mandatory `brand`, because the minimal draft would
 * still be minimal — it is the field-by-field sweep that goes red.
 */

import { allEntries } from '../src/corpus';
import type { LensReading } from '../src/lens/reading';
import type { SavedColorRow } from '@irodora/store';
import {
  colorOf,
  draftProblem,
  EMPTY_DRAFT,
  hasEnrichment,
  toStoreWrite,
  type GarmentDraft,
} from '../src/wardrobe';

const SLUG = allEntries()[0]?.entry.slug ?? '';

const READING: LensReading = {
  rgb: [0.29, 0.42, 0.55],
  space: 'srgb',
  usableSamples: 4096,
  variance: 0.004,
  illumination: 'daylight',
  quality: 'good',
  confidence: 0.82,
  instruction: '',
};

let n = 0;
const newId = (): string => `id-${String(n++)}`;

const minimal: GarmentDraft = {
  ...EMPTY_DRAFT,
  type: 'jumper',
  colour: { kind: 'corpus', slug: SLUG },
};

describe('what blocks a save', () => {
  it('is a missing type, and says so', () => {
    expect(draftProblem({ ...minimal, type: '' })).toBe('noType');
    // Whitespace is not a type. A control enabled by a space bar is a control that saves a
    // garment nobody can find by name.
    expect(draftProblem({ ...minimal, type: '   ' })).toBe('noType');
  });

  it('is a missing colour, and says so', () => {
    expect(draftProblem({ ...minimal, colour: null })).toBe('noColour');
  });

  it('is a slug the bundle no longer publishes — reported as ITSELF', () => {
    // Not folded into noColour. Somebody holding a stale slug DID choose a colour, and telling
    // them to choose one would be the worst available message: it describes a state they are
    // not in and asks for something they already did.
    expect(draftProblem({ ...minimal, colour: { kind: 'corpus', slug: 'not-an-entry' } })).toBe(
      'unknownSlug',
    );
  });

  it('is NOTHING ELSE — and this is the criterion', () => {
    expect(draftProblem(minimal)).toBeNull();

    /*
     * FIELD BY FIELD. Each of these is a column on `garment`, and setting any of them must not
     * change the answer — nor must leaving it unset. A save gated on `brand` would pass every
     * other test in this file.
     */
    const progressive: Record<string, unknown> = {
      name: 'the navy one',
      pattern: 'plain',
      material: 'wool',
      formality: 'casual',
      brand: 'Uniqlo',
      size: 'M',
      purchaseDate: '2026-01-04',
      costMinor: 2990,
      currency: 'GBP',
      wearCount: 3,
      seasons: ['winter'],
      colors: [],
    };

    for (const [field, value] of Object.entries(progressive)) {
      expect(draftProblem({ ...minimal, enrichment: { [field]: value } })).toBeNull();
    }
    // And all twelve at once, which is the state a patient person reaches.
    expect(draftProblem({ ...minimal, enrichment: progressive })).toBeNull();
  });

  it('is not an image, in either direction', () => {
    // A photograph is offered, never demanded — and a garment that has one is not thereby
    // more complete. Both directions asserted, because a save gated on an image would pass a
    // test that only ever supplied one.
    expect(draftProblem({ ...minimal, image: null })).toBeNull();
  });
});

describe('the write', () => {
  it('carries a corpus colour AS PUBLISHED, with its slug', () => {
    const write = toStoreWrite(minimal, newId);
    const published = allEntries()[0];

    expect(write.type).toBe('jumper');
    expect(write.color.corpus_slug).toBe(SLUG);
    // Not recomputed. A value re-derived at save time is today's engine's answer for a version
    // that was pinned precisely so that could not happen (FR-10, E-001).
    expect(write.color.xyz_x).toBe(published?.entry.color.xyz[0]);
    expect(write.color.hex).toBe(published?.derived.hex);
    expect(write.color.source).toBe('reference');
    expect(write.color.confidence).toBe(1);
  });

  it('records a capture as ESTIMATED, at the reading’s own confidence', () => {
    const write = toStoreWrite(
      { ...minimal, colour: { kind: 'reading', reading: READING } },
      newId,
    );

    // ADR-0005: provenance is part of the value. A camera estimate stored as a reference would
    // be indistinguishable downstream from a published colour, including to anything that
    // later decided what it was safe to claim.
    expect(write.color.source).toBe('estimated');
    expect(write.color.confidence).toBe(0.82);
    expect(write.color.confidence).not.toBe(1);
    // A capture is not an entry, and never acquires a slug.
    expect(write.color.corpus_slug).toBeNull();
  });

  it('names a capture by its hex, never by the nearest entry', () => {
    // The nearest corpus name would be an assertion of identity, which FR-13 forbids and the
    // claims lint bans phrases for. A hex is a fact about the value.
    const write = toStoreWrite(
      { ...minimal, colour: { kind: 'reading', reading: READING } },
      newId,
    );
    expect(write.color.name).toMatch(/^#[0-9A-Fa-f]{6}$/u);
    expect(write.color.name).toBe(write.color.hex);
  });

  it('trims the type rather than storing what a keyboard left behind', () => {
    expect(toStoreWrite({ ...minimal, type: '  coat  ' }, newId).type).toBe('coat');
  });

  it('REFUSES a draft the screen should not have offered', () => {
    // The throw is the guarantee: a screen whose disabled state is wrong cannot produce a
    // half-row. A garment that exists is a garment that was complete.
    expect(() => toStoreWrite({ ...minimal, type: '' }, newId)).toThrow(/noType/);
    expect(() => toStoreWrite({ ...minimal, colour: null }, newId)).toThrow(/noColour/);
  });
});

describe('hasEnrichment', () => {
  it('tells a bare draft from one carrying anything at all', () => {
    expect(hasEnrichment(minimal)).toBe(false);
    expect(hasEnrichment({ ...minimal, enrichment: { brand: 'Uniqlo' } })).toBe(true);
  });
});

describe('a stored colour, back as a Color (F-108)', () => {
  /*
   * THIS BLOCK COULD NOT HAVE BEEN WRITTEN BEFORE F-108, and that is the point of it.
   *
   * ADR-0005 makes provenance part of the value, and the union is strict: a CapturedSource
   * OWES its conditions. F-042 stored `source: 'estimated'` and none of them, so there was no
   * honest provenance to hand `fromXyz` — the row was unreadable as a `Color`, and inventing
   * an illuminant to make the read succeed would have been fabricating a measurement.
   *
   * F-042's own tests were green throughout because they wrote rows and asserted COLUMNS.
   * Nothing read a colour back out as a `Color`, and a column holding the string 'estimated'
   * looks correct until the type is asked for a provenance.
   */
  const asRow = (write: ReturnType<typeof toStoreWrite>): SavedColorRow => ({
    ...write.color,
    created_at: 1,
    updated_at: 1,
    deleted_at: null,
    capture_illuminant: write.color.conditions?.illuminant ?? null,
    capture_quality: write.color.conditions?.quality ?? null,
    capture_samples: write.color.conditions?.sampleCount ?? null,
    capture_variance: write.color.conditions?.variance ?? null,
  });

  it('carries a capture\u2019s conditions all the way through', () => {
    const write = toStoreWrite(
      { ...minimal, colour: { kind: 'reading', reading: READING } },
      newId,
    );
    const colour = colorOf(asRow(write));

    expect(colour.provenance.source).toBe('estimated');
    expect(colour.provenance.confidence).toBe(0.82);
    // The four facts the source owes, from the reading, through the row, into the type.
    expect('conditions' in colour.provenance).toBe(true);
    if (!('conditions' in colour.provenance)) throw new Error('unreachable');
    expect(colour.provenance.conditions.illuminant).toBe('daylight');
    expect(colour.provenance.conditions.quality).toBe('good');
    expect(colour.provenance.conditions.sampleCount).toBe(4096);
    expect(colour.provenance.conditions.variance).toBe(0.004);
  });

  it('needs none of them for a published colour', () => {
    // THE DECOY. A colorOf that demanded conditions unconditionally would break the path every
    // corpus-picked garment takes — which is most of them — while passing the test above.
    const colour = colorOf(asRow(toStoreWrite(minimal, newId)));
    expect(colour.provenance.source).toBe('reference');
    expect('conditions' in colour.provenance).toBe(false);
  });

  it('REFUSES a capture whose conditions were never stored', () => {
    // The pre-migration row. Refused by name rather than downgraded to a reference colour,
    // which would relabel a camera estimate as a published value.
    const write = toStoreWrite(
      { ...minimal, colour: { kind: 'reading', reading: READING } },
      newId,
    );
    const stripped: SavedColorRow = { ...asRow(write), capture_illuminant: null };
    expect(() => colorOf(stripped)).toThrow(/capture/i);
  });
});
