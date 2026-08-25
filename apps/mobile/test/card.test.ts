/**
 * The colour card, as the document it actually is.
 *
 * > *The same entry at the same corpus version renders the same card on both platforms.*
 *
 * Asserted as byte equality of a string, because that is the only form of that sentence which
 * is both true and checkable — see the module comment and ADR-0070. What no test here reaches
 * is the rasterisation, which differs by platform and is not claimed.
 */

import { nativeColors } from '@irodora/design-tokens';
import {
  cardSvg,
  CARD_HEIGHT,
  CARD_WIDTH,
  sampleAreaFraction,
  SAMPLE_AREA_FLOOR,
  thumbnailSizes,
  THUMBNAIL_MIN_PX,
  type CardOptions,
} from '../src/card';
import { allEntries, CORPUS_LABEL, type PublishedEntry } from '../src/corpus';

const ENTRY = allEntries()[0]!;

const OPTIONS: CardOptions = {
  theme: 'light',
  corpusVersion: CORPUS_LABEL,
  labels: { classification: 'Irodora original, Japanese-inspired', attribution: 'Irodora' },
};

const colours = (svg: string): string[] =>
  [...svg.matchAll(/(?:fill|stroke)="(#[0-9A-Fa-f]{3,8})"/gu)].map((m) =>
    (m[1] ?? '').toUpperCase(),
  );

describe('the card is deterministic (FR-50)', () => {
  it('produces a byte-identical document for the same entry and version', () => {
    expect(cardSvg(ENTRY, OPTIONS)).toBe(cardSvg(ENTRY, OPTIONS));
  });

  it('produces the same document for every entry, twice over', () => {
    // Not just the one entry a test happened to pick: the claim is about the function.
    for (const entry of allEntries()) expect(cardSvg(entry, OPTIONS)).toBe(cardSvg(entry, OPTIONS));
  });

  /*
   * THE DECOY. Without it, "two calls agree" is equally true of a function returning a
   * constant, and every assertion above would be measuring nothing.
   */
  it('DECOY — different entries produce different documents', () => {
    const [a, b] = allEntries();
    expect(cardSvg(a!, OPTIONS)).not.toBe(cardSvg(b!, OPTIONS));
  });

  it('DECOY — a different theme or version produces a different document', () => {
    expect(cardSvg(ENTRY, { ...OPTIONS, theme: 'dark' })).not.toBe(cardSvg(ENTRY, OPTIONS));
    expect(cardSvg(ENTRY, { ...OPTIONS, corpusVersion: '2099.01.1' })).not.toBe(
      cardSvg(ENTRY, OPTIONS),
    );
  });
});

describe('the card carries what FR-50 names', () => {
  const svg = cardSvg(ENTRY, OPTIONS);

  it.each([
    ['kanji', ENTRY.entry.name.kanji],
    ['kana', ENTRY.entry.name.kana],
    ['romaji', ENTRY.entry.name.romaji],
    ['English name', ENTRY.entry.name.en],
    ['hex', ENTRY.derived.hex],
    ['corpus version', CORPUS_LABEL],
    ['attribution', 'Irodora'],
  ])('shows the %s', (_what, value) => {
    expect(svg).toContain(value);
  });

  /*
   * FR-23 ON THE ONE ARTEFACT THAT LEAVES THE APP. A card is the thing most likely to be read
   * with none of its context, so the classification travels with it — our coinage is never
   * presented as attested history.
   */
  it('carries the entry’s own classification, so the claim travels with the colour', () => {
    expect(svg).toContain('Irodora original, Japanese-inspired');
  });

  it('is well-formed enough to name its own size', () => {
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg.endsWith('</svg>')).toBe(true);
    expect(svg).toContain(`viewBox="0 0 ${String(CARD_WIDTH)} ${String(CARD_HEIGHT)}"`);
  });
});

describe('every colour in the document is accounted for', () => {
  /*
   * An SVG needs literal colour values, which is what the colour-literal rule forbids in a
   * component. The resolution is E-019's: generated from tokens, and checked here. A hand-typed
   * colour anywhere in this document fails.
   */
  it.each(['light', 'dark'] as const)('%s: is a token value or the entry’s own hex', (theme) => {
    const tokens = new Set(Object.values(nativeColors[theme]).map((v) => v.toUpperCase()));
    for (const entry of allEntries()) {
      const found = colours(cardSvg(entry, { ...OPTIONS, theme }));
      expect(found.length).toBeGreaterThan(0);
      const unaccounted = found.filter(
        (c) => !tokens.has(c) && c !== entry.derived.hex.toUpperCase(),
      );
      expect(`${entry.entry.slug}: ${unaccounted.join(', ')}`).toBe(`${entry.entry.slug}: `);
    }
  });

  /*
   * THE DECOY. The check above passes trivially if `colours()` finds nothing, or if every
   * value happens to be a token. A planted colour must be reported.
   */
  it('DECOY — a hand-typed colour is reported', () => {
    const tokens = new Set(Object.values(nativeColors.light).map((v) => v.toUpperCase()));
    const planted = cardSvg(ENTRY, OPTIONS).replace('fill="#FDFCF9"', 'fill="#BADA55"');
    const unaccounted = colours(planted).filter(
      (c) => !tokens.has(c) && c !== ENTRY.derived.hex.toUpperCase(),
    );
    expect(unaccounted).toContain('#BADA55');
  });

  it('uses BOTH keyline tones, so the sample has an edge against any colour', () => {
    // F-068: one tone is invisible at its worst case. The pair is what makes the boundary
    // perceptible against a near-white AND a near-black sample.
    const svg = cardSvg(ENTRY, OPTIONS);
    expect(svg).toContain(nativeColors.light['swatch.hairline']);
    expect(svg).toContain(nativeColors.light['swatch.hairline.inverse']);
  });
});

describe('the card reads at thumbnail size', () => {
  it('is mostly the colour it is about', () => {
    // What actually survives being shrunk to a chat preview is the COLOUR.
    expect(sampleAreaFraction()).toBeGreaterThanOrEqual(SAMPLE_AREA_FLOOR);
  });

  it('keeps its primary identifier above the legibility floor', () => {
    expect(thumbnailSizes().kanji).toBeGreaterThanOrEqual(THUMBNAIL_MIN_PX);
  });

  /*
   * THE DECOY, and it is what stops the floor being a number chosen to pass. The smaller text
   * on the card is detail a person reads at full size, and the card does not pretend it is
   * legible in a thumbnail — asserting that honestly is what makes the kanji claim mean
   * something.
   */
  it('DECOY — the detail lines are NOT claimed legible at that size', () => {
    const sizes = thumbnailSizes();
    expect(sizes.attribution).toBeLessThan(THUMBNAIL_MIN_PX);
    expect(sizes.hex).toBeLessThan(THUMBNAIL_MIN_PX);
  });

  it('carries identity in text as well as in colour (golden rule 13)', () => {
    // Two colours that look alike in greyscale, or to a person with CVD, are still told apart
    // by the card — because the name is on it.
    const svg = cardSvg(ENTRY, OPTIONS);
    expect(svg).toContain(ENTRY.entry.name.en);
    expect(svg).toContain(ENTRY.entry.name.kanji);
  });
});

describe('text is escaped', () => {
  /*
   * The corpus has no `&` or `<` in any name today, which is exactly why this test supplies
   * one. A check that only ever sees safe input is a check nobody has watched work
   * [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
   */
  const hostile: PublishedEntry = {
    ...ENTRY,
    entry: {
      ...ENTRY.entry,
      name: { ...ENTRY.entry.name, en: 'Black & <white> "quoted"' },
    },
  };

  it('escapes a name that would otherwise break the document', () => {
    const svg = cardSvg(hostile, OPTIONS);
    expect(svg).toContain('Black &amp; &lt;white&gt; &quot;quoted&quot;');
    expect(svg).not.toContain('<white>');
  });

  it('escapes the labels too, not only the corpus fields', () => {
    const svg = cardSvg(ENTRY, {
      ...OPTIONS,
      labels: { classification: 'a & b', attribution: '<c>' },
    });
    expect(svg).toContain('a &amp; b');
    expect(svg).not.toContain('<c>');
  });
});
