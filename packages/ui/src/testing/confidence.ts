/**
 * The one confidence format, guarded (F-222, ADR-0124).
 *
 * A reading's confidence prints through `confidenceText` / `confidencePercent` and nowhere else. This
 * finds the other ways a confidence gets printed — a `toFixed`, `toPrecision` or `toLocaleString` on
 * it, a percentage computed in place (either operand order), a bare figure interpolated or rendered
 * — so a test can refuse a second format in the source it owns. `@irodora/ui` scans its own `src`,
 * `apps/mobile` scans its own; one rule, shared here.
 *
 * A source scan, so it is a backstop, not a proof. What it cannot see, stated: a confidence renamed to
 * another identifier before it is formatted, a bare `{confidence}` with no member access (JSX and an
 * object's shorthand look alike), and a generic percent formatter. The rendered checks (the Lens
 * screen test, F-244's and F-236's sweeps) are the proof.
 */

/** The shapes a confidence has been, or could easily be, printed in other than the one format. */
const SECOND_FORMATS: readonly RegExp[] = [
  // `capture.confidence.toFixed(2)`, `c?.confidence?.toPrecision(2)`, `x.confidence.toLocaleString(`
  /\bconfidence\s*\)?\s*\??\.\s*(?:toFixed|toPrecision|toLocaleString)\s*\(/gu,
  // `confidence * 100`, `Math.round(x.confidence * 100)`
  /\b[\w.?]*confidence\s*\*\s*100\b/gu,
  // `100 * confidence`, `Math.round(100 * capture.confidence)`
  /\b100\s*\*\s*[\w.?]*\bconfidence\b/gu,
  // `String(capture.confidence)`
  /\bString\s*\(\s*[\w.?]*\bconfidence\s*\)/gu,
  // a bare figure rendered or interpolated: `{capture.confidence}`, `${reading?.confidence}`
  /\$?\{\s*[\w?]+(?:\??\.\w+)*\??\.confidence\s*\}/gu,
];

/** One second format found: the text it matched, and where. */
export interface SecondConfidenceFormat {
  readonly text: string;
  readonly index: number;
}

/** Every second confidence format in a source file, each occurrence, in order. */
export function secondConfidenceFormats(source: string): readonly SecondConfidenceFormat[] {
  const found = new Map<number, string>();
  for (const pattern of SECOND_FORMATS)
    for (const match of source.matchAll(pattern))
      if (!found.has(match.index)) found.set(match.index, match[0]);
  return [...found.entries()].sort(([a], [b]) => a - b).map(([index, text]) => ({ text, index }));
}
