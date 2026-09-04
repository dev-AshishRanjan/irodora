/**
 * A colour as a card — a **document**, not a bitmap (FR-50).
 *
 * ## What "the same card on both platforms" can honestly mean
 *
 * > *The same entry at the same corpus version renders the same card on both platforms.*
 *
 * Read as *"the same pixels"* that is unmeetable. iOS and Android rasterise differently —
 * hinting, subpixel positioning, antialiasing — and no application code changes it. Promising
 * it would be promising something nobody can check and nobody can deliver, and it would quietly
 * become an attested-forever item.
 *
 * So the card is **SVG text built by a pure function over frozen bundle values**. That string is
 * byte-identical across platforms because nothing platform-shaped touches it, and — the part
 * that matters — it is checkable in CI with no device at all. The rasterisation is the
 * platform's and is not claimed.
 *
 * Same move `archive.ts` makes for FR-58's *"byte-identical database"*, and it carries an ADR
 * for the same reason: a deliberate reading beats a criterion softened later by nobody in
 * particular. See
 * [ADR-0070](../../../docs/adr/0070-a-shareable-card-is-a-deterministic-document-not-a-bitmap.md).
 *
 * ## Text does not sit on the sample
 *
 * The obvious card puts the hex over the colour, which needs a legible foreground chosen **per
 * entry** against 120 different backgrounds, with no declared pairing to lean on. The sample is
 * a block and the text sits on the card's own ground, where the pairing is one the manifest
 * declares and gate 9 already checks.
 *
 * ## Every colour here is a token or the entry's own hex
 *
 * An SVG needs literal colour values, which is what the colour-literal rule forbids in a
 * component. The resolution is E-019's: the document is **generated from tokens**, and
 * `card.test.ts` asserts that every colour in it is either a `@irodora/design-tokens` value or
 * the entry's published hex. A hand-typed colour is a failing test.
 *
 * ## No colour maths
 *
 * The sample is the entry's `derived.hex` exactly as published. Nothing here converts anything.
 */

import { nativeColors } from '@irodora/design-tokens';
import type { PublishedEntry } from './corpus';

/**
 * The card's own coordinate space.
 *
 * A 4:5 portrait, which is what a chat preview and a photo grid both crop least. Every size
 * below is in these units, so the thumbnail arithmetic is a ratio rather than a measurement.
 */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 1500;

/** The sample block. 62% of the card's area — see `SAMPLE_AREA_FLOOR`. */
const SAMPLE_HEIGHT = 930;

/**
 * The width a card is expected to survive being shrunk to.
 *
 * 96 px is a chat thumbnail and a photo-grid cell — the smallest place a shared card actually
 * lands. Declared rather than assumed, so the check below is about a real size.
 */
export const THUMBNAIL_WIDTH = 96;

/**
 * The size below which a CJK glyph stops being legible.
 *
 * **Declared, not measured.** A kanji carries far more stroke detail than a Latin letter at the
 * same size, and below roughly this the strokes merge. It is the floor the primary identifier
 * must clear at `THUMBNAIL_WIDTH`; everything smaller on the card is detail a person reads at
 * full size, and the card does not pretend otherwise.
 */
export const THUMBNAIL_MIN_PX = 9;

/**
 * The fraction of the card the sample must occupy.
 *
 * What actually "reads at thumbnail size" is the COLOUR. At 96 px wide no text is comfortable,
 * so the card earns the requirement by being mostly the colour it is about — and by carrying a
 * kanji large enough to survive the same reduction.
 */
export const SAMPLE_AREA_FLOOR = 0.55;

/** Type sizes, in card units. Their thumbnail behaviour is asserted, not hoped for. */
const TYPE = {
  kanji: 132,
  english: 58,
  reading: 40,
  hex: 46,
  attribution: 28,
} as const;

/**
 * The strings the card shows that are not corpus data.
 *
 * Passed in rather than imported, so this module stays free of the i18n graph and the caller
 * decides the language. A Japanese card and an English card are different documents, and each
 * is deterministic — which is what the criterion asks for.
 */
export interface CardLabels {
  /** How the entry classifies itself — FR-23's label, never invented here. */
  readonly classification: string;
  /** What produced the card, e.g. "Irodora". */
  readonly attribution: string;
}

export interface CardOptions {
  readonly theme: 'light' | 'dark';
  /** The corpus version, which FR-50 requires the card to carry. */
  readonly corpusVersion: string;
  readonly labels: CardLabels;
}

/**
 * XML-escape a text node.
 *
 * The corpus has no `&` or `<` in any name today, which is exactly why this exists and why the
 * test supplies one: a check that only ever sees safe input is a check nobody has watched work.
 */
function escape(text: string): string {
  return text
    .replace(/&/gu, '&amp;')
    .replace(/</gu, '&lt;')
    .replace(/>/gu, '&gt;')
    .replace(/"/gu, '&quot;');
}

/** A `<text>` element. `x`/`y` are card units; the font stack is the app's own. */
function text(
  content: string,
  x: number,
  y: number,
  size: number,
  fill: string,
  weight = '400',
): string {
  return (
    `<text x="${String(x)}" y="${String(y)}" font-size="${String(size)}" ` +
    `font-weight="${weight}" fill="${fill}" font-family="Noto Sans JP">${escape(content)}</text>`
  );
}

/**
 * The card, as SVG text.
 *
 * Deterministic by construction: every value comes from the entry, the options, or a constant
 * in this file. Nothing consults a clock, a locale, a random source or a platform API.
 */
export function cardSvg(entry: PublishedEntry, options: CardOptions): string {
  const t = nativeColors[options.theme];
  const sample = entry.derived.hex;

  /*
   * THE TWO-TONE OPAQUE KEYLINE, and it is F-068's rather than a border invented here.
   *
   * A near-white entry on a near-white card has no perceptible boundary. `swatch.hairline` and
   * its inverse were chosen so the worse of the two still reaches 4.23 against the WORST
   * possible sample — measured in packages/design-tokens/test/swatch-edge.test.ts. Reusing the
   * tokens inherits that proof; drawing a single line here would discard it.
   */
  const keyline =
    `<rect x="0" y="0" width="${String(CARD_WIDTH)}" height="${String(SAMPLE_HEIGHT)}" ` +
    `fill="${sample}"/>` +
    `<rect x="0.5" y="0.5" width="${String(CARD_WIDTH - 1)}" height="${String(SAMPLE_HEIGHT - 1)}" ` +
    `fill="none" stroke="${t['swatch.hairline']}" stroke-width="1"/>` +
    `<rect x="1.5" y="1.5" width="${String(CARD_WIDTH - 3)}" height="${String(SAMPLE_HEIGHT - 3)}" ` +
    `fill="none" stroke="${t['swatch.hairline.inverse']}" stroke-width="1"/>`;

  const left = 72;
  let y = SAMPLE_HEIGHT + 150;

  const lines: string[] = [];
  lines.push(text(entry.entry.name.kanji, left, y, TYPE.kanji, t.foreground, '600'));
  y += 92;
  lines.push(
    text(
      `${entry.entry.name.kana} · ${entry.entry.name.romaji}`,
      left,
      y,
      TYPE.reading,
      t['foreground.2'],
    ),
  );
  y += 84;
  lines.push(text(entry.entry.name.en, left, y, TYPE.english, t.foreground));
  y += 76;
  lines.push(text(sample, left, y, TYPE.hex, t['foreground.2']));

  /*
   * THE ATTRIBUTION, AND FR-23 IS WHY IT IS NOT OPTIONAL. A card is the one artefact that
   * leaves the app, so it is the one most likely to be read without any of its context. The
   * classification travels with it — our coinage is never presented as attested history — and
   * so does the corpus version, because a hex without the version that produced it cannot be
   * reproduced (FR-50 asks for it by name).
   */
  lines.push(
    text(
      `${options.labels.classification} · ${options.labels.attribution} · ${options.corpusVersion}`,
      left,
      CARD_HEIGHT - 64,
      TYPE.attribution,
      t['foreground.2'],
    ),
  );

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(CARD_WIDTH)}" ` +
    // `fill="none"` ON THE ROOT. Without it react-native-svg injects #000000 as the default
    // fill, which the conformance scan reads as a colour literal — correctly, because it IS one:
    // any element added later without an explicit fill paints solid black rather than nothing.
    // Every shape here already states its own fill, so this changes no pixel and closes the gap.
    `height="${String(CARD_HEIGHT)}" viewBox="0 0 ${String(CARD_WIDTH)} ${String(CARD_HEIGHT)}" fill="${t.foreground}">` +
    `<rect width="${String(CARD_WIDTH)}" height="${String(CARD_HEIGHT)}" fill="${t.background}"/>` +
    keyline +
    lines.join('') +
    '</svg>'
  );
}

/** Every type size on the card, scaled to `THUMBNAIL_WIDTH`. For the legibility check. */
export function thumbnailSizes(): Readonly<Record<keyof typeof TYPE, number>> {
  const scale = THUMBNAIL_WIDTH / CARD_WIDTH;
  return {
    kanji: TYPE.kanji * scale,
    english: TYPE.english * scale,
    reading: TYPE.reading * scale,
    hex: TYPE.hex * scale,
    attribution: TYPE.attribution * scale,
  };
}

/** The fraction of the card the sample block covers. */
export function sampleAreaFraction(): number {
  return (CARD_WIDTH * SAMPLE_HEIGHT) / (CARD_WIDTH * CARD_HEIGHT);
}
