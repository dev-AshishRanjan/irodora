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
export function capitalised(romaji: string): string {
  return romaji.charAt(0).toUpperCase() + romaji.slice(1);
}

/**
 * An OKLCh line: the space's name, then L, C and h from the entry's derivation, at the precision the
 * corpus is authored at and the Lens prints (3, 3 and 1 decimals), separated by `•`. `after` is what
 * follows the space's name: a space on `01`, a colon and a space on `05`.
 */
export function oklchLine(
  oklch: readonly [number, number, number],
  unit: string,
  after = ' ',
): string {
  const [l, c, h] = oklch;
  return `${unit}${after}${l.toFixed(3)} • ${c.toFixed(3)} • ${h.toFixed(1)}°`;
}
