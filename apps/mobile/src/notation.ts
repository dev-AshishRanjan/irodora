/**
 * How a colour's names and figures are written, in one place (F-246).
 *
 * Home (`01`) and the Atlas (`05`) print the same two things — a romaji name capitalised, and an
 * OKLCh line — and differ only in the mark after the space's name: `01` writes *OKLCh 0.849 • …*,
 * `05` writes *OKLCh: 0.849 • …*. One function with that difference as an argument, so the two
 * screens cannot drift on the precision or the separator.
 *
 * Pure: every input is an argument.
 */

/** A romaji name as the mockups print it: its first letter capitalised — *Kumori-garasu*. */
import type { PublishedEntry } from './corpus';

export function capitalised(romaji: string): string {
  return romaji.charAt(0).toUpperCase() + romaji.slice(1);
}

/**
 * An entry's name as `08` and `09` print it: its kanji, then its capitalised romaji. One line here,
 * so the two pages cannot name one colour two ways (moved from `compare-readout.ts` by F-250).
 */
export function nameLine(entry: PublishedEntry): string {
  return `${entry.entry.name.kanji} ${capitalised(entry.entry.name.romaji)}`;
}

/**
 * An OKLCh line: the space's name, then L, C and h from the entry's derivation, at the precision the
 * corpus is authored at and the Lens prints (3, 3 and 1 decimals), separated by `•`. `after` is what
 * follows the space's name: a space on `01`, a colon and a space on `05`. `08`'s meta line draws two
 * figures, L and h, and no chroma (`{ chroma: false }`, ADR-0155 D1).
 */
export function oklchLine(
  oklch: readonly [number, number, number],
  unit: string,
  after = ' ',
  { chroma = true }: { readonly chroma?: boolean } = {},
): string {
  const [l, c, h] = oklch;
  const figures = chroma ? [l.toFixed(3), c.toFixed(3)] : [l.toFixed(3)];
  return `${unit}${after}${[...figures, `${h.toFixed(1)}°`].join(' • ')}`;
}
