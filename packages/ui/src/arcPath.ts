/**
 * The geometry of an arc on a circle, shared by the coverage dial, the progress ring and the fill
 * that moves along either (F-235, F-236, F-266). Pure arithmetic: angles in degrees clockwise from
 * 12 o'clock, lengths in dp.
 */

/** A point on a circle, `degrees` clockwise from the top. */
function at(cx: number, cy: number, r: number, degrees: number): string {
  const a = (degrees * Math.PI) / 180;
  const round = (v: number): string => String(Math.round(v * 1000) / 1000);
  return `${round(cx + r * Math.sin(a))} ${round(cy - r * Math.cos(a))}`;
}

/** An arc's path, clockwise from `from` through `sweep` degrees. */
export function dialArc(cx: number, cy: number, r: number, from: number, sweep: number): string {
  const large = sweep > 180 ? 1 : 0;
  return `M${at(cx, cy, r, from)}A${String(r)} ${String(r)} 0 ${String(large)} 1 ${at(cx, cy, r, from + sweep)}`;
}

/**
 * An arc's path as ONE subpath, clockwise from `from` through `sweep` degrees, valid up to a full
 * 360° (F-266, ADR-0133 §4).
 *
 * An SVG arc command cannot draw a whole circle, because its start and end coincide. So a sweep
 * past 180° is two arcs end to end, and the first never passes 180°. A dash that shows a fraction
 * of the span runs from `from` along this one path, which is what `ArcFill` moves.
 */
export function sweepPath(cx: number, cy: number, r: number, from: number, sweep: number): string {
  if (!(sweep > 0 && sweep <= 360))
    throw new RangeError(`sweepPath: a sweep of ${String(sweep)}° is not in (0, 360]`);
  const first = Math.min(sweep, 180);
  const head = `M${at(cx, cy, r, from)}A${String(r)} ${String(r)} 0 0 1 ${at(cx, cy, r, from + first)}`;
  return sweep <= 180
    ? head
    : `${head}A${String(r)} ${String(r)} 0 0 1 ${at(cx, cy, r, from + sweep)}`;
}

/** The length of an arc of `sweep` degrees on a circle of radius `r`: what a value of 1 fills. */
export function sweepLength(r: number, sweep: number): number {
  return (2 * Math.PI * r * sweep) / 360;
}
