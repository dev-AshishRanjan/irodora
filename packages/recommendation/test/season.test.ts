/**
 * The seasonal summary (F-223, ADR-0102): what the parser refuses, and what the evaluator
 * guarantees over every profile it can be given.
 *
 * **Fixtures, not the published rule.** The rule file is content published in a later increment;
 * these tests pin the engine's behaviour on rule sets built here, whose numbers claim nothing.
 * The published file is parsed by gate 11 and by the app's tests.
 *
 * **Grids rather than random sampling.** The summary is a finite classification, so an exhaustive
 * grid that includes every boundary value exactly — the values where a comparison can go the wrong
 * way — covers more of what can fail than random draws would, and needs no new dependency.
 */

import { describe, expect, it } from 'vitest';
import {
  AXIS_CLASSES,
  classifyAxis,
  MODIFIER_IDS,
  parseSeasonalRules,
  RuleError,
  SEASON_IDS,
  seasonalCellCount,
  summariseSeason,
  type AxisClass,
  type ContrastPreference,
  type PersonalProfile,
  type ScoreFactor,
} from '../src/index.js';

const WHY = 'a fixture rationale that is long enough to count';

type Json = Record<string, unknown>;

/** A fixture rule: temperature, lightness and chroma, 27 rows, "none" wherever temperature is middle. */
function fixture(options: { tempAt?: number; words?: 'a' | 'b' } = {}): Json {
  const t = options.tempAt ?? 1 / 6;
  const axes = [
    {
      axis: 'temperature',
      statistic: 'bias',
      boundaries: [
        { at: -t, side: 'above' },
        { at: t, side: 'below' },
      ],
      rationale: WHY,
    },
    {
      axis: 'lightness',
      statistic: 'midpoint',
      boundaries: [
        { at: 0.4, side: 'below' },
        { at: 0.7, side: 'below' },
      ],
      rationale: WHY,
    },
    {
      axis: 'chroma',
      statistic: 'midpoint',
      boundaries: [
        { at: 0.04, side: 'below' },
        { at: 0.1, side: 'below' },
      ],
      rationale: WHY,
    },
  ];
  const table: Json[] = [];
  for (const temperature of AXIS_CLASSES)
    for (const lightness of AXIS_CLASSES)
      for (const chroma of AXIS_CLASSES) {
        const when = { temperature, lightness, chroma };
        if (temperature === 'middle') {
          table.push({ when, none: true, rationale: WHY });
          continue;
        }
        const warm = temperature === 'high';
        const deep = lightness === 'low';
        const season = warm ? (deep ? 'autumn' : 'spring') : deep ? 'winter' : 'summer';
        const modifier =
          options.words === 'b'
            ? warm
              ? 'warm'
              : 'cool'
            : chroma === 'low'
              ? 'muted'
              : chroma === 'high'
                ? 'bright'
                : deep
                  ? 'deep'
                  : 'light';
        table.push({ when, season, modifier, rationale: WHY });
      }
  return { versionId: 'test.1', publishedAt: '2026-09-15', axes, table };
}

const profile = (
  bias: number,
  lightness: readonly [number, number],
  chroma: readonly [number, number],
  contrast: ContrastPreference = 'medium',
  confidence: Partial<Record<ScoreFactor, number>> = {},
): PersonalProfile => ({
  temperatureBias: bias,
  lightness: { min: lightness[0], max: lightness[1] },
  chroma: { min: chroma[0], max: chroma[1] },
  contrast,
  confidence: { temperature: 0.75, lightness: 0.75, chroma: 0.75, contrast: 0.75, ...confidence },
});

const rules = parseSeasonalRules(fixture(), 'fixture');

describe('the parser', () => {
  it('accepts a complete rule and counts its cells', () => {
    expect(seasonalCellCount(rules)).toBe(27);
    expect(rules.axes.map((a) => a.axis)).toEqual(['temperature', 'lightness', 'chroma']);
  });

  /** Each spoiling is the clean fixture plus one change, and must be refused naming its field. */
  const spoil = (mutate: (value: Json) => void): unknown => {
    const value = fixture();
    mutate(value);
    return value;
  };
  /** An element of a fixture array, or a loud failure — a spoiling aimed at nothing proves nothing. */
  const nth = (list: unknown, i: number): Json => {
    const item: unknown = (list as unknown[])[i];
    if (typeof item !== 'object' || item === null)
      throw new Error(`the fixture has no element ${String(i)}`);
    return item as Json;
  };
  const table = (v: Json): Json[] => v['table'] as Json[];
  const axis = (v: Json, i: number): Json => nth(v['axes'], i);
  const row = (v: Json, i: number): Json => nth(v['table'], i);
  const cases: [string, (v: Json) => void, RegExp][] = [
    ['a cell removed', (v) => table(v).splice(5, 1), /no row for 1 of 27 tuples/u],
    [
      'a cell answered twice',
      (v) => table(v).push({ ...row(v, 0) }),
      /table\[27\] answers .* which table\[0\]/u,
    ],
    [
      'boundaries out of order',
      (v) => (axis(v, 1)['boundaries'] as Json[]).reverse(),
      /axes\[1\]\.boundaries must be in increasing order/u,
    ],
    [
      'a boundary on the end of its domain',
      (v) => (nth(axis(v, 0)['boundaries'], 1)['at'] = 1),
      /axes\[0\]\.boundaries\[1\]\.at is 1, outside temperature/u,
    ],
    [
      'a boundary with no side',
      (v) => delete nth(axis(v, 2)['boundaries'], 0)['side'],
      /axes\[2\]\.boundaries\[0\]\.side/u,
    ],
    [
      'an axis about undertone',
      (v) => (axis(v, 0)['axis'] = 'undertone'),
      /axes\[0\]\.axis .*"undertone".*NFR-22/u,
    ],
    [
      'an axis about skin',
      (v) => (axis(v, 0)['axis'] = 'skin'),
      /axes\[0\]\.axis .*"skin".*NFR-22/u,
    ],
    [
      'a statistic the axis does not have',
      (v) => (axis(v, 0)['statistic'] = 'midpoint'),
      /axes\[0\]\.statistic must be one of bias/u,
    ],
    [
      'boundaries on contrast',
      (v) =>
        (v['axes'] as Json[]).push({
          axis: 'contrast',
          statistic: 'preference',
          boundaries: [],
          rationale: WHY,
        }),
      /axes\[3\]\.boundaries must be absent for contrast/u,
    ],
    [
      'a season nobody published',
      (v) => (row(v, 0)['season'] = 'monsoon'),
      /table\[0\]\.season must be one of spring/u,
    ],
    [
      'a modifier nobody published',
      (v) => (row(v, 0)['modifier'] = 'fair'),
      /table\[0\]\.modifier must be one of light/u,
    ],
    [
      'a rationale that says nothing',
      (v) => (row(v, 3)['rationale'] = 'ok'),
      /table\[3\]\.rationale is required/u,
    ],
    [
      'a row on an axis the rule does not read',
      (v) => (nth([row(v, 2)['when']], 0)['contrast'] = 'low'),
      /table\[2\]\.when\.contrast: this rule does not read contrast/u,
    ],
    [
      'a row missing an axis',
      (v) => delete nth([row(v, 4)['when']], 0)['chroma'],
      /table\[4\]\.when\.chroma must be one of low/u,
    ],
    [
      'a "none" row that also names a season',
      (v) => (row(v, 9)['season'] = 'autumn'),
      /table\[9\]: a row with "none" carries no season/u,
    ],
    [
      'an axis named twice',
      (v) => (axis(v, 2)['axis'] = 'lightness'),
      /axes name lightness twice/u,
    ],
  ];
  it.each(cases)('refuses %s, naming the field', (_name, mutate, message) => {
    expect(() => parseSeasonalRules(spoil(mutate), 'fixture')).toThrow(RuleError);
    expect(() => parseSeasonalRules(spoil(mutate), 'fixture')).toThrow(message);
  });

  it('refuses a table that is not total, whichever cell is missing', () => {
    for (let i = 0; i < 27; i += 1) {
      const v = fixture();
      table(v).splice(i, 1);
      expect(() => parseSeasonalRules(v, 'fixture')).toThrow(/no row for 1 of 27/u);
    }
  });
});

/** Every boundary value exactly, plus a grid between — where a comparison can go the wrong way. */
const BIASES = [
  ...Array.from({ length: 97 }, (_, i) => -1 + i / 48),
  -1 / 6,
  1 / 6,
  -1 / 3,
  1 / 3,
  (2 * 2) / 3 - 1,
  (2 * 1) / 3 - 1,
];
const RANGES: [number, number][] = [];
for (let lo = 0; lo <= 1.0001; lo += 0.1)
  for (let hi = lo; hi <= 1.0001; hi += 0.1) RANGES.push([Math.min(lo, 1), Math.min(hi, 1)]);
RANGES.push([0.4, 0.4], [0.7, 0.7], [0.3, 0.5], [0.6, 0.8]);
const CHROMAS: [number, number][] = [
  [0, 0],
  [0.02, 0.06],
  [0.04, 0.04],
  [0.03, 0.12],
  [0.1, 0.1],
  [0.08, 0.2],
  [0.2, 0.4],
];
const CONTRASTS: ContrastPreference[] = ['low', 'medium', 'high'];

function* everyProfile(): Generator<PersonalProfile> {
  for (const bias of BIASES)
    for (const lightness of RANGES)
      for (const chroma of CHROMAS) yield profile(bias, lightness, chroma);
}

describe('the evaluator, over every profile in the grid', () => {
  it('is total and deterministic, and answers with a closed vocabulary', () => {
    let labels = 0;
    for (const p of everyProfile()) {
      const first = summariseSeason(p, rules);
      const again = summariseSeason({ ...p, confidence: { ...p.confidence } }, rules);
      expect(again).toEqual(first);
      if (first.kind === 'label') {
        labels += 1;
        expect(SEASON_IDS).toContain(first.season);
        expect(MODIFIER_IDS).toContain(first.modifier);
        expect(Object.keys(first.basis).sort()).toEqual(['chroma', 'lightness', 'temperature']);
      } else expect(first.reason).toBe('not-summarised');
    }
    expect(labels).toBeGreaterThan(0);
  });

  it('never reads what it discards: contrast, and any confidence above zero', () => {
    for (const p of everyProfile()) {
      const base = summariseSeason(p, rules);
      for (const contrast of CONTRASTS) {
        const other = summariseSeason({ ...p, contrast }, rules);
        expect(other).toEqual(base);
      }
      const surer = summariseSeason(
        { ...p, confidence: { temperature: 1, lightness: 0.5, chroma: 0.25, contrast: 0 } },
        rules,
      );
      expect(surer.kind).toBe(base.kind);
      if (surer.kind === 'label' && base.kind === 'label')
        expect([surer.season, surer.modifier]).toEqual([base.season, base.modifier]);
    }
  });

  it('withholds the label exactly when an axis it reads was never established', () => {
    const p = profile(0.9, [0.1, 0.3], [0.01, 0.03]);
    expect(summariseSeason(p, rules).kind).toBe('label');
    for (const axis of ['temperature', 'lightness', 'chroma'] as const) {
      const result = summariseSeason({ ...p, confidence: { ...p.confidence, [axis]: 0 } }, rules);
      expect(result).toEqual({
        kind: 'none',
        reason: 'not-established',
        axes: [axis],
        ruleVersion: 'test.1',
      });
    }
    // Contrast is not read, so an unestablished contrast changes nothing.
    expect(summariseSeason({ ...p, confidence: { ...p.confidence, contrast: 0 } }, rules)).toEqual(
      summariseSeason(p, rules),
    );
  });

  it('classifies each axis monotonically: raising one statistic never moves it back down', () => {
    const order = (c: AxisClass): number => AXIS_CLASSES.indexOf(c);
    const [temperature, lightness, chroma] = rules.axes as [
      (typeof rules.axes)[number],
      (typeof rules.axes)[number],
      (typeof rules.axes)[number],
    ];
    const sortedBiases = [...BIASES].sort((a, b) => a - b);
    let last = -1;
    for (const bias of sortedBiases) {
      const now = order(classifyAxis(temperature, profile(bias, [0.5, 0.5], [0.05, 0.05])));
      expect(now).toBeGreaterThanOrEqual(last);
      last = now;
    }
    for (const [ax, place] of [
      [lightness, (v: number) => profile(0.5, [v, v], [0.05, 0.05])],
      [chroma, (v: number) => profile(0.5, [0.5, 0.5], [v, v])],
    ] as const) {
      last = -1;
      for (let v = 0; v <= 1.0001; v += 0.005) {
        const now = order(classifyAxis(ax, place(Math.min(v, 1))));
        expect(now).toBeGreaterThanOrEqual(last);
        last = now;
      }
    }
  });

  it('puts a value exactly on a boundary on the side the rule declares', () => {
    const [temperature] = rules.axes as [(typeof rules.axes)[number]];
    // -1/6 is declared "above": it belongs to the middle class. +1/6 is "below": middle too.
    expect(classifyAxis(temperature, profile(-1 / 6, [0.5, 0.5], [0.05, 0.05]))).toBe('middle');
    expect(classifyAxis(temperature, profile(1 / 6, [0.5, 0.5], [0.05, 0.05]))).toBe('middle');
    expect(classifyAxis(temperature, profile(-1 / 6 - 1e-12, [0.5, 0.5], [0.05, 0.05]))).toBe(
      'low',
    );
    expect(classifyAxis(temperature, profile(1 / 6 + 1e-12, [0.5, 0.5], [0.05, 0.05]))).toBe(
      'high',
    );
  });

  it('refuses a profile that is not one, rather than labelling it', () => {
    expect(() => summariseSeason(profile(Number.NaN, [0.5, 0.5], [0.05, 0.05]), rules)).toThrow(
      /temperature is NaN/u,
    );
  });
});

describe('the rule is content, not code (FR-67)', () => {
  it('one unchanged engine, two rule sets, the same profile, two answers', () => {
    const other = parseSeasonalRules(fixture({ tempAt: 0.5, words: 'b' }), 'other');
    const p = profile(0.3, [0.2, 0.3], [0.01, 0.02]);
    const a = summariseSeason(p, rules);
    const b = summariseSeason(p, other);
    expect(a).toMatchObject({ kind: 'label', season: 'autumn', modifier: 'muted' });
    // At 0.3 the other rule's temperature boundary (0.5) has not been crossed: no summary.
    expect(b).toMatchObject({ kind: 'none', reason: 'not-summarised' });
    const warm = profile(0.9, [0.2, 0.3], [0.01, 0.02]);
    expect(summariseSeason(warm, other)).toMatchObject({ season: 'autumn', modifier: 'warm' });
  });
});
