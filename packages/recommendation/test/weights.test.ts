/**
 * Weights as content, and the four things F-029 has to be true about them.
 *
 * The one that matters most is **criterion 4**, and it is the one a test can most easily fake:
 * *"changing a weight changes rankings"* is satisfied by an assertion that two numbers differ,
 * which would also pass on an engine that read no weights at all. So it is asserted as a
 * **reordering of the same colours through an unchanged engine** — which is the claim FR-67
 * actually makes.
 *
 * The published file is parsed here too. A validator exercised only on fixtures is a validator
 * nobody has pointed at the thing it exists to check.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { fromSpace } from '@irodora/color-core';
import {
  MIN_RATIONALE,
  OCCASIONS,
  parseWeightContent,
  rationaleCount,
  RuleError,
  ruleSetFor,
  SCORE_FACTORS,
  scoreColor,
  type Occasion,
  type PersonalProfile,
} from '../src/index.js';

/**
 * The FIRST published version, which carries five occasions because five is what existed when
 * it was published. Every spoiling below is this file plus one surgical change.
 */
const PUBLISHED = join(__dirname, '..', '..', '..', 'content', 'rules', 'weights.2026.08.1.json');

/**
 * The directory, DERIVED FROM A FILE rather than built as its own path.
 *
 * Building the path to the directory directly resolves to the directory, and
 * `verify-cache-scope.mjs` reports that as an unaccounted read: `content/rules/**` in
 * `turbo.json` covers what is *inside* the directory, not the directory itself. Taking
 * `dirname` of a path the scan has already accounted for keeps the check strict and needs no
 * new global dependency (E-025).
 *
 * The first version of this note SPELLED THE PATH-BUILDING CALL OUT to explain the problem,
 * and the scan read the comment and failed again — the fourth time this session. F-127 taught
 * that scan to tell a reference from a mention for a bare path LITERAL; the `join(…)` matcher
 * beside it is still a regular expression over the file's text, comments included. Recorded on
 * F-132.
 */
const RULES = dirname(PUBLISHED);
const published = (): unknown => JSON.parse(readFileSync(PUBLISHED, 'utf8'));

/**
 * The NEWEST published version — the one a publish must be complete in (ADR-0084).
 *
 * Read from the ledger's `supersedes` chain rather than named here: a literal would go stale on
 * the next publish, and the failure would look like a bug in the content rather than a test
 * nobody updated. It is also the same rule gate 11 uses, so the two cannot disagree about which
 * version is current.
 */
function newestPublished(): { label: string; content: unknown } {
  const rows = JSON.parse(readFileSync(join(RULES, 'index.json'), 'utf8')) as {
    label: string;
    kind: string;
    supersedes?: string;
  }[];
  const weights = rows.filter((r) => r.kind === 'weights');
  const superseded = new Set(weights.map((r) => r.supersedes).filter((l) => l !== undefined));
  const current = weights.filter((r) => !superseded.has(r.label));
  const only = current[0];
  if (current.length !== 1 || only === undefined)
    throw new Error(`the ledger names ${String(current.length)} current weight versions`);
  return {
    label: only.label,
    content: JSON.parse(readFileSync(join(RULES, `weights.${only.label}.json`), 'utf8')),
  };
}

/** The published file with one surgical change. Every refusal below is this plus a spoiling. */
function spoiled(mutate: (draft: Record<string, unknown>) => void): unknown {
  const draft = published() as Record<string, unknown>;
  mutate(draft);
  return draft;
}

/** The `default` occasion's factor list, as a mutable copy. */
function factorsOf(draft: Record<string, unknown>, occasion: Occasion): Record<string, unknown>[] {
  const list = draft['occasions'] as Record<string, unknown>[];
  const found = list.find((o) => o['occasion'] === occasion);
  if (found === undefined) throw new Error(`no ${occasion}`);
  return found['factors'] as Record<string, unknown>[];
}

describe('the published weight content', () => {
  it('parses — the baseline, without which every refusal below proves nothing', () => {
    const content = parseWeightContent(published(), 'weights.2026.08.1.json');
    expect(content.versionId).toBe('2026.08.1');
    expect(content.occasions.length).toBeGreaterThan(0);
    expect(rationaleCount(content)).toBe(content.occasions.length * SCORE_FACTORS.length);
  });

  /*
   * HISTORY PARSES THOUGH IT IS INCOMPLETE (F-130, ADR-0084).
   *
   * This file carries five occasions and the engine now offers ten. Requiring the whole set at
   * parse time would fail three published, immutable files for predating a requirement — which
   * is the `outfit: null` situation exactly, and has the same answer.
   */
  it('parses a version that carries fewer occasions than the engine offers', () => {
    const content = parseWeightContent(published(), 'x');

    expect(content.occasions.length).toBeLessThan(OCCASIONS.length);
    for (const { occasion } of content.occasions) expect(OCCASIONS).toContain(occasion);
  });

  /*
   * AND THE NEWEST VERSION IS COMPLETE. This is where "every occasion the engine can be asked
   * for is published" now lives — of the CURRENT content rather than of every version. Gate 11
   * checks the same thing; this is the half that fails in a package test, close to the union.
   */
  it('publishes every occasion the engine can be asked for, in the newest version', () => {
    const { label, content: raw } = newestPublished();
    const content = parseWeightContent(raw, `weights.${label}.json`);

    expect(content.occasions.map((o) => o.occasion).sort()).toEqual([...OCCASIONS].sort());
  });

  it('carries a rationale on every single weight, not merely on most of them', () => {
    // ADR-0011 section 4. Twenty weights, twenty reasons.
    const content = parseWeightContent(published(), 'x');
    for (const occasion of content.occasions)
      for (const factor of occasion.factors) {
        expect(factor.rationale.trim().length).toBeGreaterThanOrEqual(MIN_RATIONALE);
        // A rationale that is the factor's name padded out is not a rationale.
        expect(factor.rationale.toLowerCase()).not.toBe(factor.factor);
      }
  });

  it('sums to 1 for every occasion, checked by the engine’s own validator', () => {
    // Not re-implemented here: `parseWeightContent` hands each occasion to `parseRuleSet`, so
    // this passing means the code that SCORES accepted them.
    //
    // Over the NEWEST version, which carries every occasion — the first one carries five, and
    // looping over the union against it would be asking a file for a profile that postdates it.
    const { label, content: raw } = newestPublished();
    const content = parseWeightContent(raw, `weights.${label}.json`);
    for (const occasion of OCCASIONS) {
      const rules = ruleSetFor(content, occasion);
      const total = SCORE_FACTORS.reduce((n, f) => n + rules.weights[f], 0);
      expect(total).toBeCloseTo(1, 10);
    }
  });
});

describe('what a publish is refused for', () => {
  it('a weight with no rationale', () => {
    expect(() =>
      parseWeightContent(
        spoiled((d) => {
          delete factorsOf(d, 'default')[0]!['rationale'];
        }),
        'x',
      ),
    ).toThrow(/rationale is required/u);
  });

  it('a rationale that says nothing', () => {
    // A blank field is the same absence wearing a name, and so is "TODO".
    for (const rationale of ['', '   ', 'TODO'])
      expect(() =>
        parseWeightContent(
          spoiled((d) => {
            factorsOf(d, 'default')[0]!['rationale'] = rationale;
          }),
          'x',
        ),
      ).toThrow(RuleError);
  });

  it('DECOY — the same file WITH the rationale parses', () => {
    /*
     * Without this, "a missing rationale is refused" would be equally true of a parser that
     * refused everything [[a-decoy-that-is-not-broken-proves-nothing]].
     */
    expect(() =>
      parseWeightContent(
        spoiled((d) => {
          factorsOf(d, 'default')[0]!['rationale'] =
            'A replacement rationale, long enough to clear the floor and say something.';
        }),
        'x',
      ),
    ).not.toThrow();
  });

  it('weights that no longer sum to 1', () => {
    let message = '';
    try {
      parseWeightContent(
        spoiled((d) => {
          factorsOf(d, 'office')[0]!['weight'] = 0.9;
        }),
        'x',
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    // The message names the occasion, because a file with five profiles needs to say which.
    expect(message).toContain('office');
    expect(message).toContain('sum to');
  });

  /*
   * THE PARSER'S REFUSAL MOVED (F-130, ADR-0084). It required EVERY occasion in `OCCASIONS`;
   * it now requires `default`, because three published versions predate the other five and
   * ADR-0046 forbids editing them.
   */
  it('no default occasion, naming what a file without one would leave unweighted', () => {
    let message = '';
    try {
      parseWeightContent(
        spoiled((d) => {
          d['occasions'] = (d['occasions'] as unknown[]).filter(
            (o) => (o as Record<string, unknown>)['occasion'] !== 'default',
          );
        }),
        'x',
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('default');
    expect(message).toContain('no weighting at all');
  });

  /*
   * AND A NON-DEFAULT OCCASION IS STILL REFUSED — at USE rather than at parse. This is where
   * "refused rather than silently partial" lives now, and it is the same sentence a reader
   * would have got from the parser before.
   */
  it('an occasion a version does not carry, refused by ruleSetFor and naming the version', () => {
    const content = parseWeightContent(published(), 'x');
    let message = '';
    try {
      ruleSetFor(content, 'street');
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('street');
    expect(message).toContain('2026.08.1');
    expect(message).toContain('nobody published');
  });

  it('an occasion the engine does not know', () => {
    expect(() =>
      parseWeightContent(
        spoiled((d) => {
          (d['occasions'] as Record<string, unknown>[])[1]!['occasion'] = 'brunch';
        }),
        'x',
      ),
    ).toThrow(/brunch/u);
  });

  it('the same occasion twice', () => {
    expect(() =>
      parseWeightContent(
        spoiled((d) => {
          const list = d['occasions'] as unknown[];
          list.push(structuredClone(list[0]));
        }),
        'x',
      ),
    ).toThrow(/appears twice/u);
  });

  it('an occasion the engine does not know', () => {
    expect(() =>
      parseWeightContent(
        spoiled((d) => {
          (d['occasions'] as Record<string, unknown>[])[0]!['occasion'] = 'brunch';
        }),
        'x',
      ),
    ).toThrow(/brunch/u);
  });

  it('a factor listed twice while another goes missing — which could still sum to 1', () => {
    /*
     * The case a sum check alone cannot catch, and the reason the per-factor count runs first.
     * Replacing `contrast` with a second `chroma` of the same weight leaves the total at
     * exactly 1, and `parseRuleSet` would then refuse it for a missing factor — but the message
     * would be about the wrong thing.
     */
    let message = '';
    try {
      parseWeightContent(
        spoiled((d) => {
          const factors = factorsOf(d, 'casual');
          factors[3]!['factor'] = 'chroma';
        }),
        'x',
      );
    } catch (error) {
      message = error instanceof Error ? error.message : String(error);
    }
    expect(message).toContain('exactly once');
    // BOTH halves of the edit are named. The first draft asserted only "contrast" and the
    // parser reported only "chroma" — each of us describing one half of the same mistake. The
    // message reports every mismatch now, because the reader has to fix both.
    expect(message).toContain('"chroma" appears 2');
    expect(message).toContain('"contrast" appears 0');
  });

  it('a publishedAt that is not a date', () => {
    expect(() =>
      parseWeightContent(
        spoiled((d) => {
          d['publishedAt'] = 'August 2026';
        }),
        'x',
      ),
    ).toThrow(/publishedAt/u);
  });
});

describe('selecting an occasion', () => {
  it('returns that occasion’s weights, carrying the published version', () => {
    const content = parseWeightContent(published(), 'x');
    const office = ruleSetFor(content, 'office');
    const casual = ruleSetFor(content, 'casual');
    expect(office.versionId).toBe('2026.08.1');
    expect(office.weights).not.toEqual(casual.weights);
  });

  it('refuses an occasion the content does not carry rather than falling back', () => {
    const content = parseWeightContent(published(), 'x');
    const trimmed = {
      ...content,
      occasions: content.occasions.filter((o) => o.occasion !== 'formal'),
    };
    expect(() => ruleSetFor(trimmed, 'formal')).toThrow(/no occasion "formal"/u);
    // A fallback would make "the formal weighting" and "the weighting nobody published"
    // indistinguishable on screen, under a product whose proposition is explainability.
  });
});

describe('changing a weight changes rankings, with no code change (FR-67, criterion 4)', () => {
  const profile: PersonalProfile = {
    lightness: { min: 0.45, max: 0.75 },
    temperatureBias: 1,
    chroma: { min: 0, max: 0.12 },
    contrast: 'high',
    confidence: { temperature: 0.75, lightness: 0.75, chroma: 0.75, contrast: 0.75 },
  };

  const colour = (l: number, c: number, h: number) =>
    fromSpace('oklch', [l, c, h], { source: 'declared', confidence: 1 });

  /** Four colours chosen to disagree with each other on the axes the occasions re-weight. */
  const CANDIDATES = [
    { name: 'warm muted mid', color: colour(0.6, 0.05, 60) },
    { name: 'warm vivid mid', color: colour(0.6, 0.28, 60) },
    { name: 'cool muted light', color: colour(0.9, 0.04, 240) },
    { name: 'warm muted dark', color: colour(0.2, 0.05, 60) },
  ];

  const rank = (occasion: Occasion): string[] => {
    // THE NEWEST VERSION, because this loops over the whole union and the first published file
    // carries five of the ten (ADR-0084).
    const { label, content: raw } = newestPublished();
    const rules = ruleSetFor(parseWeightContent(raw, `weights.${label}.json`), occasion);
    return [...CANDIDATES]
      .map((candidate) => ({
        ...candidate,
        score: scoreColor(profile, candidate.color, rules).score,
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .map((c) => c.name);
  };

  /*
   * OVER THE NEWEST VERSION. `rank` resolves a RuleSet per occasion, and the first published
   * file carries five of the ten — asking it for `street` is asking for a profile that
   * postdates it (ADR-0084).
   */
  it('produces a DIFFERENT ORDER under a different occasion', () => {
    /*
     * THE ASSERTION FR-67 ACTUALLY MAKES. Not "two scores differ" — that would pass on an
     * engine that read no weights and returned noise. A reordering means the weights decided
     * something, and the engine is byte-identical between the two calls.
     */
    const orders = new Set(OCCASIONS.map((o) => rank(o).join(' > ')));
    expect(orders.size).toBeGreaterThan(1);
  });

  it('and the same occasion always produces the same order', () => {
    // The other half. A ranking that varies between calls would also produce more than one
    // order above, and would mean nothing.
    for (const occasion of OCCASIONS) expect(rank(occasion)).toEqual(rank(occasion));
  });

  it('moves the SCORE in the direction the rationale claims', () => {
    /*
     * The assertion that connects the numbers to the prose. Without it a rationale could say
     * anything at all.
     *
     * `japanese-inspired` carries the heaviest chroma weight in the file and says so in its own
     * words — "the restraint that characterises these palettes is a chroma property" — so a
     * colour outside the chroma tolerance must score WORSE there than under `casual`, which
     * raised tolerance for the opposite reason.
     *
     * SCORE, NOT RANK POSITION, and the first draft got that wrong. Rank is a comparison
     * against whichever other candidates happen to be in the list: the vivid colour sits third
     * under both occasions because the two colours above it move too. The score is the thing
     * the weight actually acts on, and it is what the rationale is a claim about.
     */
    const content = parseWeightContent(published(), 'x');
    const vivid = CANDIDATES[1]!.color;
    const restrained = scoreColor(profile, vivid, ruleSetFor(content, 'japanese-inspired')).score;
    const relaxed = scoreColor(profile, vivid, ruleSetFor(content, 'casual')).score;
    expect(restrained).toBeLessThan(relaxed);

    // And the reverse claim, from the same file: `formal` carries the LOWEST chroma weight, so
    // the same colour is penalised least there. A one-sided assertion would pass on a file
    // where every occasion happened to be harsher than casual.
    const forgiving = scoreColor(profile, vivid, ruleSetFor(content, 'formal')).score;
    expect(forgiving).toBeGreaterThan(restrained);
  });

  it('the engine is unchanged between occasions — only the RuleSet differs', () => {
    // Stated as an assertion rather than left implicit: the two calls differ in one argument.
    const content = parseWeightContent(published(), 'x');
    const a = scoreColor(profile, CANDIDATES[1]!.color, ruleSetFor(content, 'casual'));
    const b = scoreColor(profile, CANDIDATES[1]!.color, ruleSetFor(content, 'japanese-inspired'));
    expect(a.rulesVersion).toBe(b.rulesVersion);
    expect(a.score).not.toBe(b.score);
  });
});
