/**
 * The parsing primitives every corpus record shares.
 *
 * These live in their own module because entries and palettes must be held to the *same*
 * rules, and the moment those rules exist twice they start to differ. NFR-20's promise —
 * the build fails on a single incomplete record — is only as good as there being one
 * definition of "complete".
 *
 * Every helper takes the source filename and a dotted path, because the message is the
 * deliverable: "expected a non-empty string" with no file and no field is not something an
 * editor can act on.
 */

import { CorpusError } from './errors.js';

/** Lowercase kebab. A slug is a URL segment and a relation target; it has to be stable. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

/** FR-25: `YYYY.MM.N`. */
export const VERSION_ID_PATTERN = /^\d{4}\.(?:0[1-9]|1[0-2])\.[1-9]\d*$/u;

/** ISO date, no time. A corpus record is dated to the day; an editor is not a timestamp. */
export const ISO_DATE_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/u;

/**
 * The derived values, listed so a rejection can name them.
 *
 * This is the most likely authoring mistake there is, because `color-corpus-spec.md` §1 shows
 * `lab`, `oklch` and `hex` inside `color` and an editor will copy the example.
 */
export const DERIVED_KEYS = ['lab', 'lch', 'oklch', 'rgb', 'hex', 'gamut'] as const;

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function requireRecord(v: unknown, path: string, src: string): Record<string, unknown> {
  if (!isRecord(v)) throw new CorpusError(src, path === '' ? '(root)' : path, 'expected an object');
  return v;
}

export function requireString(v: unknown, path: string, src: string): string {
  if (typeof v !== 'string' || v.trim().length === 0)
    throw new CorpusError(src, path, 'expected a non-empty string');
  return v;
}

export function requireMatch(
  v: unknown,
  re: RegExp,
  path: string,
  src: string,
  what: string,
): string {
  const s = requireString(v, path, src);
  if (!re.test(s)) throw new CorpusError(src, path, `${what}; got ${JSON.stringify(s)}`);
  return s;
}

export function requireMember<T extends string>(
  v: unknown,
  allowed: readonly T[],
  path: string,
  src: string,
): T {
  if (typeof v !== 'string' || !(allowed as readonly string[]).includes(v))
    throw new CorpusError(
      src,
      path,
      `expected one of ${allowed.join(', ')}; got ${JSON.stringify(v)}`,
    );
  return v as T;
}

export function requireStringArray(v: unknown, path: string, src: string): readonly string[] {
  if (!Array.isArray(v)) throw new CorpusError(src, path, 'expected an array of strings');
  return v.map((item, i) => requireString(item, `${path}[${String(i)}]`, src));
}

/** Reject any key the schema does not know. Silence about an extra field is how a typo lives. */
export function rejectUnknownKeys(
  o: Record<string, unknown>,
  known: readonly string[],
  path: string,
  src: string,
): void {
  for (const key of Object.keys(o)) {
    if (known.includes(key)) continue;
    const where = path === '' ? key : `${path}.${key}`;
    if ((DERIVED_KEYS as readonly string[]).includes(key))
      throw new CorpusError(
        src,
        where,
        `"${key}" is a DERIVED value and cannot be authored. lab, lch, oklch, rgb, hex and ` +
          'gamut are computed from xyz by the engine at publish time and stored in the version ' +
          'bundle (spec section 3, ADR-0043). The spec section 1 example shows them inside ' +
          '`color`; that example is the shape a READER sees, not what an editor writes. Supply ' +
          'the printed value as `color.sourceHex` instead.',
      );
    throw new CorpusError(
      src,
      where,
      `unknown field. Known: ${known.join(', ')}. A field the schema does not recognise is ` +
        'usually a typo, and ignoring it means the value it was meant to carry is missing.',
    );
  }
}

/**
 * A field that may be `null` — but only with a stated reason (FR-21).
 *
 * Records the path it consumed, so `checkUnknowns` can afterwards prove every reason was
 * actually used. A reason for a field that is not `null` is as much a defect as a `null` with
 * no reason: both mean the record and its explanation have drifted apart.
 */
export function nullable<T>(
  v: unknown,
  path: string,
  src: string,
  unknowns: Readonly<Record<string, string>>,
  seenNulls: Set<string>,
  parse: (value: unknown) => T,
): T | null {
  if (v !== null) return parse(v);
  seenNulls.add(path);
  const reason = unknowns[path];
  if (typeof reason !== 'string' || reason.trim().length === 0)
    throw new CorpusError(
      src,
      path,
      'is null with no reason. FR-21 allows a blank only when it is explicit: add ' +
        `"${path}" to \`unknowns\` saying why this is not known. "No silent blanks" is the ` +
        'requirement, and an unexplained null is exactly a silent blank.',
    );
  return null;
}

export function parseUnknowns(v: unknown, src: string): Readonly<Record<string, string>> {
  const o = requireRecord(v, 'unknowns', src);
  const out: Record<string, string> = {};
  for (const [path, reason] of Object.entries(o))
    out[path] = requireString(reason, `unknowns.${path}`, src);
  return out;
}

/**
 * Every reason must belong to a field that is actually `null`.
 *
 * Without this the `unknowns` block is write-only: a field gets a real value, its reason stays
 * behind, and the record now explains an absence that is not there. It is the same defect as a
 * stale comment, except a gate reads this one.
 */
export function checkUnknowns(
  unknowns: Readonly<Record<string, string>>,
  seenNulls: ReadonlySet<string>,
  src: string,
): void {
  for (const path of Object.keys(unknowns))
    if (!seenNulls.has(path))
      throw new CorpusError(
        src,
        `unknowns.${path}`,
        `explains why "${path}" is null, but that field is not null. Either the reason is stale ` +
          'and should be removed, or the path is misspelled and the real null is unexplained — ' +
          'both leave the record disagreeing with its own explanation.',
      );
}
