/**
 * The seasonal summary (F-223, [ADR-0102](../../../docs/adr/0102-a-seasonal-label-is-a-lossy-summary-read-off-the-ranges.md))
 * — a two-word label read off a profile's ranges by a rule that is content.
 *
 * ## What this is allowed to be
 *
 * ADR-0010 built the profile as ranges with confidence so that it would never be a quiz that
 * produces a season first. This module is the mapping ADR-0010's *Neutral* clause left room for,
 * and ADR-0102 fences it:
 *
 * - **It reads the profile and nothing else.** A rule may condition only on `SCORE_FACTORS` — the
 *   dimensions a profile holds — so a rule cannot even express an axis about a person's skin,
 *   undertone or body (NFR-22). The parser refuses one by name.
 * - **It classifies and looks up.** Each axis the rule reads is placed in one of three classes by
 *   one declared statistic and two declared boundaries; the tuple of classes is looked up in a table
 *   the parser has proved total and unique. Nothing else happens, so the whole behaviour is in the
 *   content and a publish changes it (FR-67).
 * - **It withholds rather than guesses.** An axis the rule reads with confidence 0 — never
 *   answered, or abstained on by the photo path — gives no label. That is code, not content: no
 *   publish can make the summary guess (golden rule 11).
 * - **It says which class of each range it summarised** (`basis`), so a surface can show — and a
 *   test prove — that the label never contradicts the rows beside it.
 * - **It is computed, not stored.** Nothing here writes a label anywhere, and nothing maps a label
 *   back to ranges.
 */

import { SCORE_FACTORS, type PersonalProfile, type ScoreFactor } from './profile.js';
import { requireObject, RuleError } from './rules.js';
import { MIN_RATIONALE } from './weights.js';

/** The four seasons of the twelve-season convention mockup 23 draws. A closed set. */
export const SEASON_IDS = ['spring', 'summer', 'autumn', 'winter'] as const;
export type SeasonId = (typeof SEASON_IDS)[number];

/** The convention's six dominant characteristics. A closed set: a word not here is not published. */
export const MODIFIER_IDS = ['light', 'deep', 'bright', 'muted', 'warm', 'cool'] as const;
export type ModifierId = (typeof MODIFIER_IDS)[number];

/** Every read axis is split into these three, in order: below the first boundary, between, above. */
export const AXIS_CLASSES = ['low', 'middle', 'high'] as const;
export type AxisClass = (typeof AXIS_CLASSES)[number];

/** Which number stands for an axis when it is classified. */
export type Statistic = 'bias' | 'midpoint' | 'min' | 'max' | 'preference';

const STATISTICS: Readonly<Record<ScoreFactor, readonly Statistic[]>> = {
  temperature: ['bias'],
  lightness: ['midpoint', 'min', 'max'],
  chroma: ['midpoint', 'min', 'max'],
  // Contrast is already three values; they are its classes, so it has no boundaries.
  contrast: ['preference'],
};

/** The closed interval each numeric statistic lives in. A boundary must lie strictly inside it. */
const DOMAIN: Readonly<Record<Exclude<ScoreFactor, 'contrast'>, readonly [number, number]>> = {
  temperature: [-1, 1],
  lightness: [0, 1],
  chroma: [0, 1],
};

/** A boundary, and which class a value exactly on it belongs to. */
export interface Boundary {
  readonly at: number;
  readonly side: 'below' | 'above';
}

export interface SeasonalAxis {
  readonly axis: ScoreFactor;
  readonly statistic: Statistic;
  /** low|middle, then middle|high. `null` for contrast, whose three values are its classes. */
  readonly boundaries: readonly [Boundary, Boundary] | null;
  readonly rationale: string;
}

export interface SeasonalRow {
  /** One class for every axis the rule reads, and nothing else. */
  readonly when: Readonly<Partial<Record<ScoreFactor, AxisClass>>>;
  /** `null` where the convention has no answer — the row says *no summary* rather than invent one. */
  readonly outcome: { readonly season: SeasonId; readonly modifier: ModifierId } | null;
  readonly rationale: string;
}

export interface SeasonalRules {
  readonly versionId: string;
  readonly publishedAt: string;
  readonly axes: readonly SeasonalAxis[];
  readonly rows: readonly SeasonalRow[];
}

export type SeasonalSummary =
  | {
      readonly kind: 'label';
      readonly season: SeasonId;
      readonly modifier: ModifierId;
      /** The class, and the confidence, of every range the label summarises. */
      readonly basis: Readonly<
        Partial<Record<ScoreFactor, { readonly class: AxisClass; readonly confidence: number }>>
      >;
      readonly ruleVersion: string;
    }
  | {
      readonly kind: 'none';
      /** `not-established`: a read axis has confidence 0. `not-summarised`: the table's answer is none. */
      readonly reason: 'not-established' | 'not-summarised';
      readonly axes: readonly ScoreFactor[];
      readonly ruleVersion: string;
    };

const isIn = <T extends string>(set: readonly T[], value: unknown): value is T =>
  typeof value === 'string' && (set as readonly string[]).includes(value);

/**
 * Refuse a field the parser does not know, at every level.
 *
 * NFR-22 asks that *a schema check prevents such a field from being added*. A rule that carried
 * `"skin": "fair"` beside its classes would be ignored by the evaluator — and published, reviewed
 * and shipped all the same. A field nobody reads is a field nobody reviewed, so it is refused by
 * name rather than carried.
 */
function onlyKeys(o: Record<string, unknown>, allowed: readonly string[], at: string): void {
  for (const key of Object.keys(o))
    if (!allowed.includes(key))
      throw new RuleError(
        `${at}.${key} is not a field of a seasonal rule here (allowed: ${allowed.join(', ')}). ` +
          'A field the parser does not read is one nobody reviewed, and a schema check refuses ' +
          'it rather than carrying it (NFR-22).',
      );
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** A real calendar date in `YYYY-MM-DD` — `2026-13-45` has the shape and is not one. */
function isCalendarDate(value: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (m === null) return false;
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const last = month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1];
  return last !== undefined && day >= 1 && day <= last;
}

function requireRationale(value: unknown, at: string): string {
  if (typeof value !== 'string' || value.trim().length < MIN_RATIONALE)
    throw new RuleError(
      `${at}.rationale is required and must say something (at least ${String(MIN_RATIONALE)} ` +
        'characters). ADR-0011 section 4: a rule without a stated reason cannot be evaluated, ' +
        'defended or safely changed by the next person.',
    );
  return value;
}

function parseBoundary(
  value: unknown,
  at: string,
  axis: Exclude<ScoreFactor, 'contrast'>,
): Boundary {
  const o = requireObject(value, at);
  onlyKeys(o, ['at', 'side'], at);
  const where = o['at'];
  if (typeof where !== 'number' || !Number.isFinite(where))
    throw new RuleError(`${at}.at must be a finite number; got ${JSON.stringify(where)}`);
  const [lo, hi] = DOMAIN[axis];
  if (!(where > lo && where < hi))
    throw new RuleError(
      `${at}.at is ${String(where)}, outside ${axis}'s domain (${String(lo)}, ${String(hi)}). A ` +
        'boundary at or beyond an end of the domain leaves a class nothing can reach.',
    );
  const side = o['side'];
  if (side !== 'below' && side !== 'above')
    throw new RuleError(
      `${at}.side must be "below" or "above" — which class a value exactly on the boundary ` +
        `belongs to; got ${JSON.stringify(side)}`,
    );
  return { at: where, side };
}

function parseAxis(value: unknown, at: string): SeasonalAxis {
  const o = requireObject(value, at);
  onlyKeys(o, ['axis', 'statistic', 'boundaries', 'rationale'], at);
  const axis = o['axis'];
  if (!isIn(SCORE_FACTORS, axis))
    throw new RuleError(
      `${at}.axis must be one of ${SCORE_FACTORS.join(', ')} — the dimensions a profile holds; ` +
        `got ${JSON.stringify(axis)}. A seasonal summary reads a profile's ranges and nothing ` +
        'about a person: no skin, undertone, ethnicity or body (NFR-22).',
    );
  const statistic = o['statistic'];
  if (!isIn(STATISTICS[axis], statistic))
    throw new RuleError(
      `${at}.statistic must be one of ${STATISTICS[axis].join(', ')} for ${axis}; got ` +
        JSON.stringify(statistic),
    );
  const rationale = requireRationale(o['rationale'], at);
  const raw = o['boundaries'];
  if (axis === 'contrast') {
    if (raw !== undefined && raw !== null)
      throw new RuleError(
        `${at}.boundaries must be absent for contrast: its three values (low, medium, high) are ` +
          'its three classes.',
      );
    return { axis, statistic, boundaries: null, rationale };
  }
  if (!Array.isArray(raw) || raw.length !== 2)
    throw new RuleError(
      `${at}.boundaries must be exactly two — low|middle and middle|high; got ` +
        (Array.isArray(raw) ? String(raw.length) : JSON.stringify(raw)),
    );
  const first = parseBoundary(raw[0], `${at}.boundaries[0]`, axis);
  const second = parseBoundary(raw[1], `${at}.boundaries[1]`, axis);
  if (!(first.at < second.at))
    throw new RuleError(
      `${at}.boundaries must be in increasing order and apart (${String(first.at)} then ` +
        `${String(second.at)}): otherwise the middle class is empty or the classes overlap.`,
    );
  return { axis, statistic, boundaries: [first, second], rationale };
}

function parseRow(value: unknown, at: string, read: readonly ScoreFactor[]): SeasonalRow {
  const o = requireObject(value, at);
  onlyKeys(o, ['when', 'season', 'modifier', 'none', 'rationale'], at);
  const whenRaw = requireObject(o['when'], `${at}.when`);
  for (const key of Object.keys(whenRaw))
    if (!(read as readonly string[]).includes(key))
      throw new RuleError(
        `${at}.when.${key}: this rule does not read ${key} (it reads ${read.join(', ')}). A row ` +
          'that conditions on an axis the rule never classifies can never match.',
      );
  const when: Partial<Record<ScoreFactor, AxisClass>> = {};
  for (const axis of read) {
    const cls = whenRaw[axis];
    if (!isIn(AXIS_CLASSES, cls))
      throw new RuleError(
        `${at}.when.${axis} must be one of ${AXIS_CLASSES.join(', ')}; got ${JSON.stringify(cls)}`,
      );
    when[axis] = cls;
  }
  const rationale = requireRationale(o['rationale'], at);
  if (o['none'] === true) {
    if (o['season'] !== undefined || o['modifier'] !== undefined)
      throw new RuleError(`${at}: a row with "none" carries no season and no modifier.`);
    return { when, outcome: null, rationale };
  }
  const season = o['season'];
  if (!isIn(SEASON_IDS, season))
    throw new RuleError(
      `${at}.season must be one of ${SEASON_IDS.join(', ')}; got ${JSON.stringify(season)}`,
    );
  const modifier = o['modifier'];
  if (!isIn(MODIFIER_IDS, modifier))
    throw new RuleError(
      `${at}.modifier must be one of ${MODIFIER_IDS.join(', ')}; got ${JSON.stringify(modifier)}`,
    );
  return { when, outcome: { season, modifier }, rationale };
}

const tupleKey = (read: readonly ScoreFactor[], when: SeasonalRow['when']): string =>
  read.map((axis) => `${axis}=${String(when[axis])}`).join(', ');

/**
 * Parse a published seasonal rule, or throw naming the field.
 *
 * **Totality and uniqueness are checked here**, so a table with a hole or a tuple answered twice
 * never reaches a device: every combination of the read axes' classes appears exactly once.
 */
export function parseSeasonalRules(value: unknown, where: string): SeasonalRules {
  const o = requireObject(value, where);
  // `provenance` and `unknowns` are read by gate 11 through the corpus's `parseProvenance`; the
  // engine carries neither, but a file that has them is still a seasonal rule.
  onlyKeys(o, ['versionId', 'publishedAt', 'provenance', 'unknowns', 'axes', 'table'], where);
  const versionId = o['versionId'];
  if (typeof versionId !== 'string' || versionId === '')
    throw new RuleError(`${where}: versionId is required`);
  const publishedAt = o['publishedAt'];
  if (typeof publishedAt !== 'string' || !isCalendarDate(publishedAt))
    throw new RuleError(
      `${where}: publishedAt must be a calendar date, YYYY-MM-DD; got ${JSON.stringify(publishedAt)}`,
    );

  const rawAxes = o['axes'];
  if (!Array.isArray(rawAxes) || rawAxes.length === 0)
    throw new RuleError(`${where}: axes must be a non-empty array`);
  const axes = rawAxes.map((raw, i) => parseAxis(raw, `${where}: axes[${String(i)}]`));
  const read = axes.map((a) => a.axis);
  const twice = read.find((axis, i) => read.indexOf(axis) !== i);
  if (twice !== undefined)
    throw new RuleError(`${where}: axes name ${twice} twice — one axis, one statistic.`);

  const rawTable = o['table'];
  if (!Array.isArray(rawTable)) throw new RuleError(`${where}: table must be an array`);
  const rows = rawTable.map((raw, i) => parseRow(raw, `${where}: table[${String(i)}]`, read));

  const seen = new Map<string, number>();
  rows.forEach((row, i) => {
    const key = tupleKey(read, row.when);
    const earlier = seen.get(key);
    if (earlier !== undefined)
      throw new RuleError(
        `${where}: table[${String(i)}] answers (${key}), which table[${String(earlier)}] already ` +
          'answers. Two rows for one tuple is a profile with two labels, and which one wins would ' +
          'depend on file order.',
      );
    seen.set(key, i);
  });

  let tuples: Partial<Record<ScoreFactor, AxisClass>>[] = [{}];
  for (const axis of read)
    tuples = tuples.flatMap((t) => AXIS_CLASSES.map((cls) => ({ ...t, [axis]: cls })));
  const missing = tuples.map((t) => tupleKey(read, t)).filter((key) => !seen.has(key));
  if (missing.length > 0)
    throw new RuleError(
      `${where}: the table has no row for ${String(missing.length)} of ${String(tuples.length)} ` +
        `tuples — first (${missing.slice(0, 3).join('), (')}). Every combination needs an answer, ` +
        'even if the answer is "none".',
    );

  return { versionId, publishedAt, axes, rows };
}

/**
 * The number that stands for an axis — after checking the profile holds a value a profile can.
 *
 * A value outside its domain is refused rather than classified: a bias of 5 would otherwise read as
 * "warm" and a lightness range whose min exceeds its max as whatever its midpoint happened to be.
 */
function statisticOf(axis: SeasonalAxis, profile: PersonalProfile): number {
  switch (axis.axis) {
    case 'temperature': {
      const bias = profile.temperatureBias;
      if (!Number.isFinite(bias) || bias < -1 || bias > 1)
        throw new RuleError(
          `temperature is ${String(bias)}, not a bias a profile can hold (-1 … 1)`,
        );
      return bias;
    }
    case 'lightness':
    case 'chroma': {
      const { min, max } = profile[axis.axis];
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max > 1 || min > max)
        throw new RuleError(
          `${axis.axis} is ${String(min)} … ${String(max)}, not a range a profile can hold ` +
            '(0 ≤ min ≤ max ≤ 1)',
        );
      if (axis.statistic === 'min') return min;
      if (axis.statistic === 'max') return max;
      return (min + max) / 2;
    }
    case 'contrast':
      throw new RuleError('contrast is classified by its preference, not by a number');
  }
}

/** Which class of `axis` a profile falls in. Exported so a surface can label a row by the same rule. */
export function classifyAxis(axis: SeasonalAxis, profile: PersonalProfile): AxisClass {
  if (axis.axis === 'contrast') {
    // Read as unknown: the type says three values, and a fourth must be refused, not read as high.
    const contrast: unknown = profile.contrast;
    if (contrast === 'low') return 'low';
    if (contrast === 'medium') return 'middle';
    if (contrast === 'high') return 'high';
    throw new RuleError(
      `contrast is ${JSON.stringify(contrast)}, not a preference a profile can hold (low, medium, high)`,
    );
  }
  if (axis.boundaries === null)
    throw new RuleError(`${axis.axis} has no boundaries; only contrast may omit them`);
  const value = statisticOf(axis, profile);
  const [first, second] = axis.boundaries;
  const below = (b: Boundary): boolean => value < b.at || (value === b.at && b.side === 'below');
  if (below(first)) return 'low';
  if (below(second)) return 'middle';
  return 'high';
}

/**
 * The seasonal summary of a profile, by a published rule — or why there is none.
 *
 * Total over every valid profile: it throws only on a profile that is not one (a non-finite
 * number), never on a combination the rule failed to cover, because the parser has already
 * proved there is none.
 */
export function summariseSeason(profile: PersonalProfile, rules: SeasonalRules): SeasonalSummary {
  const read = rules.axes.map((a) => a.axis);
  const unestablished = read.filter((axis) => !(profile.confidence[axis] > 0));
  if (unestablished.length > 0)
    return {
      kind: 'none',
      reason: 'not-established',
      axes: unestablished,
      ruleVersion: rules.versionId,
    };

  const when: Partial<Record<ScoreFactor, AxisClass>> = {};
  for (const axis of rules.axes) when[axis.axis] = classifyAxis(axis, profile);
  const row = rules.rows.find((r) => read.every((axis) => r.when[axis] === when[axis]));
  if (row === undefined)
    throw new RuleError(
      `rule ${rules.versionId} has no row for (${tupleKey(read, when)}) — a rule that did not ` +
        'come through parseSeasonalRules',
    );
  if (row.outcome === null)
    return { kind: 'none', reason: 'not-summarised', axes: read, ruleVersion: rules.versionId };

  const basis: Partial<Record<ScoreFactor, { class: AxisClass; confidence: number }>> = {};
  for (const axis of read) {
    const cls = when[axis];
    if (cls !== undefined) basis[axis] = { class: cls, confidence: profile.confidence[axis] };
  }
  return {
    kind: 'label',
    season: row.outcome.season,
    modifier: row.outcome.modifier,
    basis,
    ruleVersion: rules.versionId,
  };
}

/** How many rows the rule carries — the ledger's cellCount, which a publish must agree with. */
export const seasonalCellCount = (rules: SeasonalRules): number => rules.rows.length;
