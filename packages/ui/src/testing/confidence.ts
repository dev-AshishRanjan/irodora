/**
 * The one confidence format, guarded (F-222, ADR-0124).
 *
 * A reading's confidence prints through `confidenceText` / `confidencePercent` and nowhere else. This
 * finds the other ways a confidence has been printed in this codebase — a bare `toFixed`, a rounded
 * or floored percentage computed in place — so a test can refuse a second format in the source it
 * owns. `@irodora/ui` scans its own `src`, `apps/mobile` scans its own; one rule, shared here.
 *
 * A source scan, so it is a backstop, not a proof: a format assembled some other way is not seen.
 * The rendered checks (the Lens screen test, F-244's and F-236's sweeps) are the proof.
 */

/** The shapes a confidence has been printed in other than the one format. */
const SECOND_FORMATS: readonly RegExp[] = [
  // `capture.confidence.toFixed(2)`, `c.confidence.toFixed(1)`
  /\bconfidence\s*\)?\s*\.toFixed\s*\(/gu,
  // `Math.round(confidence * 100)`, `Math.floor(x.confidence * 100)`
  /Math\.(?:round|floor|ceil|trunc)\s*\(\s*[\w.]*confidence\s*\*\s*100/gu,
  // `confidence * 100` used as a figure anywhere else
  /\b[\w.]*confidence\s*\*\s*100\b/gu,
];

/** Every second confidence format in a source file, as the text it matched. */
export function secondConfidenceFormats(source: string): readonly string[] {
  const found = new Set<string>();
  for (const pattern of SECOND_FORMATS)
    for (const match of source.matchAll(pattern)) found.add(match[0]);
  return [...found];
}
