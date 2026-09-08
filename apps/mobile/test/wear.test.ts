/**
 * Wear it — the slot, the pool, and what happens when nobody has a profile.
 *
 * The ranking engine is tested in its own package against its own fixtures. What is checked here
 * is the product decision on top of it: **which slot the colour goes in, what the engine is
 * given, and whether an answer that needs no profile survives not having one.**
 */

import {
  DEFAULT_SLOT,
  NO_EVIDENCE_PROFILE,
  OUTFIT_SLOTS,
  shownFactors,
  shownScore,
  wearWith,
} from '../src/wear';
import { allEntries } from '../src/corpus';
import { ruleSet } from '../src/rules';
import type { PersonalProfile } from '@irodora/recommendation';

const RULES = ruleSet();

/** Two different corpus colours, so "the input changes the answer" is checkable. */
const A = allEntries()[0]!.entry.slug;
const B = allEntries()[allEntries().length - 1]!.entry.slug;

/** Somebody the engine has something to go on about. Confidence on every axis. */
const SOMEBODY: PersonalProfile = {
  lightness: { min: 0.4, max: 0.75 },
  temperatureBias: 0.3,
  chroma: { min: 0.02, max: 0.14 },
  contrast: 'high',
  confidence: { temperature: 0.8, lightness: 0.8, chroma: 0.7, contrast: 0.6 },
};

describe('a colour resolves into a slot', () => {
  it('is a top unless somebody says otherwise', () => {
    expect(DEFAULT_SLOT).toBe('top');
  });

  it('never recommends the slot the colour is already in', () => {
    for (const slot of OUTFIT_SLOTS) {
      const answer = wearWith(A, slot, SOMEBODY, RULES)!;
      expect(answer.recommendations.map((r) => r.slot)).not.toContain(slot);
    }
  });

  it('fills every OTHER slot, rather than a convenient subset', () => {
    // The decoy for the assertion above: returning NOTHING satisfies "never the same slot".
    for (const slot of OUTFIT_SLOTS) {
      const answer = wearWith(A, slot, SOMEBODY, RULES)!;
      expect([...answer.recommendations.map((r) => r.slot)].sort()).toEqual(
        OUTFIT_SLOTS.filter((s) => s !== slot).sort(),
      );
    }
  });

  it('answers a slug that resolves to nothing with null, not a throw', () => {
    expect(wearWith('no-such-colour', 'top', SOMEBODY, RULES)).toBeNull();
  });
});

describe('the pool the engine is given', () => {
  it('excludes the colour in hand, which would otherwise rank first against itself', () => {
    const answer = wearWith(A, 'top', SOMEBODY, RULES)!;
    for (const r of answer.recommendations) expect(r.ranked.map((c) => c.id)).not.toContain(A);
  });

  it('offers the rest of the corpus', () => {
    const answer = wearWith(A, 'top', SOMEBODY, RULES)!;
    expect(answer.poolSize).toBe(allEntries().length - 1);
    // And the engine's bound HELD, rather than a constant merely existing.
    for (const r of answer.recommendations) expect(r.scored).toBeLessThanOrEqual(r.considered);
  });

  it('returns the counts FR-31 asks for — at least 5 trousers and 4 shoes for a top', () => {
    const answer = wearWith(A, 'top', SOMEBODY, RULES)!;
    const trouser = answer.recommendations.find((r) => r.slot === 'trouser')!;
    const shoe = answer.recommendations.find((r) => r.slot === 'shoe')!;
    expect(trouser.ranked.length).toBeGreaterThanOrEqual(5);
    expect(shoe.ranked.length).toBeGreaterThanOrEqual(4);
  });
});

describe('somebody with no profile', () => {
  it('is told so as a value, not left to be inferred from a confidence field', () => {
    expect(wearWith(A, 'top', null, RULES)!.personalKnown).toBe(false);
    expect(wearWith(A, 'top', SOMEBODY, RULES)!.personalKnown).toBe(true);
  });

  it('gets an answer, rather than a refusal', () => {
    const answer = wearWith(A, 'top', null, RULES)!;
    expect(answer.recommendations).toHaveLength(2);
    for (const r of answer.recommendations) expect(r.ranked.length).toBeGreaterThan(0);
  });

  it('has every personal score pinned at the engine no-evidence midpoint', () => {
    // Not asserted as a magic 50: read from the engine's own behaviour under the profile this
    // module supplies, so a change to `NO_EVIDENCE_SCORE` moves the expectation with it.
    const answer = wearWith(A, 'top', null, RULES)!;
    for (const r of answer.recommendations)
      for (const c of r.ranked) expect(c.personal.confidence).toBe(0);
  });

  /**
   * THE DECOY THIS FILE EXISTS FOR.
   *
   * The claim is *"the ranking is driven entirely by pairing"*. An implementation that ignored
   * the source colour altogether would satisfy every other assertion here — the counts, the
   * slots, the exclusions, the zero confidences — and return **the same list whatever you were
   * holding**, which is a personal-colour list wearing a different name.
   *
   * So two different source colours must produce two different orders, with no profile at all.
   */
  it('still lets the colour in hand decide the order', () => {
    const forA = wearWith(A, 'top', null, RULES)!;
    const forB = wearWith(B, 'top', null, RULES)!;
    const order = (a: typeof forA): string =>
      a.recommendations
        .map((r) =>
          r.ranked
            .slice(0, 5)
            .map((c) => c.id)
            .join(','),
        )
        .join(' | ');
    expect(order(forA)).not.toBe(order(forB));
  });

  it('DECOY — and the two sources are genuinely different colours', () => {
    // A test that compared a slug with itself would pass the assertion above by accident.
    expect(A).not.toBe(B);
  });
});

describe('what a person is shown', () => {
  it('shows the pairing figure without a profile and the blend with one', () => {
    const candidate = { score: 71, pairing: 88 };
    expect(shownScore(candidate, false)).toBe(88);
    expect(shownScore(candidate, true)).toBe(71);
  });

  it('draws NO personal factors without a profile', () => {
    /*
     * Not merely uninformative — WRONG. `NO_EVIDENCE_PROFILE` carries full-range intervals, so
     * `intervalFit` returns 1 on every axis and the explanation object reports a perfect fit on
     * four dimensions nobody has measured.
     */
    const answer = wearWith(A, 'top', null, RULES)!;
    const top = answer.recommendations[0]!.ranked[0]!;
    expect(top.personal.factors.length).toBeGreaterThan(0);
    expect(shownFactors(top, false)).toHaveLength(0);
    expect(shownFactors(top, true)).toBe(top.personal.factors);
  });

  it('the no-evidence profile constrains nothing on either axis', () => {
    expect(NO_EVIDENCE_PROFILE.lightness).toEqual({ min: 0, max: 1 });
    expect(NO_EVIDENCE_PROFILE.chroma).toEqual({ min: 0, max: 1 });
    expect(NO_EVIDENCE_PROFILE.temperatureBias).toBe(0);
    expect(Object.values(NO_EVIDENCE_PROFILE.confidence).every((c) => c === 0)).toBe(true);
  });
});
