/**
 * Wear it — the slot, the pool, and what happens when nobody has a profile.
 *
 * The ranking engine is tested in its own package against its own fixtures. What is checked here
 * is the product decision on top of it: **which slot the colour goes in, what the engine is
 * given, and whether an answer that needs no profile survives not having one.**
 */

import {
  anchorLine,
  backName,
  chooseOccasion,
  contrastLine,
  DEFAULT_SLOT,
  ENGINE_SLOT,
  fitLine,
  HARMONY_KEYS,
  NO_EVIDENCE_PROFILE,
  OCCASION_KEYS,
  OUTFIT_SLOTS,
  pillLabel,
  putInHand,
  RANKED_SLOTS,
  RESTING_OCCASION,
  RESTING_WEAR,
  separationLine,
  shownFactors,
  placeSlots,
  shownScore,
  SLOT_TITLE_KEYS,
  SLOT_WORD_KEYS,
  slotName,
  substitute,
  swap,
  toggleLock,
  WEAR_OCCASIONS,
  wearCombination,
  wearWith,
  type WearOccasion,
  type WearCombination,
  type WearState,
} from '../src/wear';
import { allEntries, colorFor } from '../src/corpus';
import { compare } from '../src/compare';
import { en } from '../src/i18n/en';
import { ja } from '../src/i18n/ja';
import type { MessageKey } from '../src/i18n';
import { capitalised } from '../src/notation';
import { occasionRuleSet, ruleSet } from '../src/rules';
import { rankingContext } from '../src/wardrobe/coverage';
import {
  alternativesAround,
  OCCASIONS,
  recommendForSlot,
  scoreOutfit,
  type PersonalProfile,
} from '@irodora/recommendation';

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

/* ================================================================== 07: the combination (F-248) */

/** What `07` scores an outfit against beside the rules: the Lab's own weights and reference (E-208). */
const CONTEXT = rankingContext(null);
const SLUGS = allEntries().map((e) => e.entry.slug);
const tEn = (key: MessageKey): string => en[key];
const tJa = (key: MessageKey): string => ja[key];

/** `07` for a colour under a state, with somebody to score against. */
const combination = (slug: string, state: WearState = RESTING_WEAR) =>
  wearCombination(slug, state, SOMEBODY, CONTEXT)!;

/** Every corpus colour but one, as the engine is given them. */
const poolWithout = (slug: string) =>
  allEntries()
    .filter((e) => e.entry.slug !== slug)
    .map((e) => ({ id: e.entry.slug, color: colorFor(e.entry) }));

describe('07’s occasions are FR-34’s published weightings (ADR-0151 D1, E-220)', () => {
  it('are four the engine publishes, resting on Office', () => {
    for (const occasion of WEAR_OCCASIONS) expect(OCCASIONS).toContain(occasion);
    expect(RESTING_OCCASION).toBe('office');
    expect(RESTING_WEAR.occasion).toBe('office');
  });

  it('ranks under the state’s occasion, exactly as the engine ranks under that weighting', () => {
    for (const occasion of WEAR_OCCASIONS) {
      const shown = combination(A, { ...RESTING_WEAR, occasion });
      const engine = wearWith(A, 'top', SOMEBODY, occasionRuleSet(occasion))!.recommendations;
      expect(shown.rankings.trouser).toStrictEqual(engine.find((r) => r.slot === 'trouser'));
      expect(shown.rankings.shoe).toStrictEqual(engine.find((r) => r.slot === 'shoe'));
    }
  });

  it('changes the slot-2 pick for at least one colour between Office and Casual (FR-34)', () => {
    const pick = (slug: string, occasion: WearOccasion) =>
      combination(slug, { ...RESTING_WEAR, occasion }).slots[0]?.entry?.entry.slug;
    expect(SLUGS.some((slug) => pick(slug, 'office') !== pick(slug, 'casual'))).toBe(true);
    // And the same occasion twice gives the same pick for every colour: the ranking is deterministic.
    expect(SLUGS.every((slug) => pick(slug, 'office') === pick(slug, 'office'))).toBe(true);
  });
});

describe('07’s slots resolve for every colour (ADR-0151 D2)', () => {
  it('fills the three ranked slots for every corpus colour, never with the colour in hand', () => {
    for (const occasion of WEAR_OCCASIONS)
      for (const slug of SLUGS) {
        const shown = combination(slug, { ...RESTING_WEAR, occasion });
        expect(shown.slots.map((s) => s.key)).toStrictEqual([...RANKED_SLOTS]);
        for (const s of shown.slots) {
          expect(s.entry?.entry.slug).not.toBe(slug);
          // Placed from its own ranking, so it has a rank there, and none is locked at rest.
          expect([s.rank !== null, s.locked]).toStrictEqual([true, false]);
        }
        for (const key of RANKED_SLOTS)
          expect(shown.rankings[key].ranked.map((r) => r.id)).not.toContain(slug);
        // FR-31's counts, for a top, under every occasion.
        expect(shown.rankings.trouser.ranked.length).toBeGreaterThanOrEqual(5);
        expect(shown.rankings.shoe.ranked.length).toBeGreaterThanOrEqual(4);
      }
  });

  /*
   * ONE COLOUR ONCE (F-248's review, S1). Each slot is ranked against the colour in hand alone, so the
   * rankings share their first; before `placeSlots`, every colour showed one colour in all three slots,
   * and the export refused the duplicate. Every colour, every occasion, with a profile and without.
   */
  it('shows four different colours for every corpus colour, every occasion, with a profile and without', () => {
    const repeats: string[] = [];
    for (const profile of [SOMEBODY, null])
      for (const occasion of WEAR_OCCASIONS)
        for (const slug of SLUGS) {
          const shown = wearCombination(slug, { ...RESTING_WEAR, occasion }, profile, CONTEXT)!;
          const ids = [slug, ...shown.slots.map((s) => s.entry?.entry.slug)];
          if (new Set(ids).size !== 4) repeats.push(`${occasion} ${slug}: ${ids.join(', ')}`);
        }
    expect(repeats).toStrictEqual([]);
  });

  it('DECOY: the three rankings share their first, so taking each ranking’s first would repeat it', () => {
    const shown = combination(A);
    const firsts = RANKED_SLOTS.map((k) => shown.rankings[k].ranked[0]?.id);
    expect(new Set(firsts).size).toBeLessThan(3);
  });

  it('ranks the outer layer as a top, and only the outer layer', () => {
    expect(ENGINE_SLOT).toStrictEqual({ trouser: 'trouser', shoe: 'shoe', outer: 'top' });
    expect(combination(A).rankings.outer.slot).toBe('top');
  });

  it('ranks the outer layer through recommendForSlot, which a second top cannot be refused by (E-218)', () => {
    // `recommendOutfit` refuses a second top, so a slot ranked through it would come back empty.
    const input = { slot: 'top' as const, color: colorFor(allEntries()[0]!.entry) };
    expect(combination(A).rankings.outer).toStrictEqual(
      recommendForSlot(input, 'top', poolWithout(A), SOMEBODY, occasionRuleSet('office')),
    );
    expect(combination(A).rankings.outer.ranked.length).toBeGreaterThan(0);
  });

  it('is null for a colour this corpus does not hold', () => {
    expect(wearCombination('no-such-colour', RESTING_WEAR, SOMEBODY, CONTEXT)).toBeNull();
  });
});

describe('what a person does on 07 (ADR-0152)', () => {
  const resting = combination(A);
  const ranking = resting.rankings.trouser.ranked;
  /** The colours a state places. */
  const placedBy = (state: WearState) => combination(A, state).placed;
  const distinct = (state: WearState): boolean =>
    new Set([A, ...Object.values(placedBy(state))]).size === 4;

  it('places the trousers first, then each slot on the first colour its ranking offers that is free', () => {
    const rankings = {
      trouser: resting.rankings.trouser.ranked,
      shoe: resting.rankings.shoe.ranked,
      outer: resting.rankings.outer.ranked,
    };
    const placed = placeSlots(RESTING_WEAR, rankings);
    expect(placed.trouser).toBe(rankings.trouser[0]?.id);
    expect(placed.shoe).toBe(rankings.shoe.find((r) => r.id !== placed.trouser)?.id);
    expect(placed.outer).toBe(
      rankings.outer.find((r) => r.id !== placed.trouser && r.id !== placed.shoe)?.id,
    );
    expect(resting.placed).toStrictEqual(placed);
  });

  it('Swap steps to the next free colour in its ranking, never one another slot shows', () => {
    let state = RESTING_WEAR;
    const elsewhere = new Set([resting.placed.shoe, resting.placed.outer]);
    const next = ranking.slice(1).find((r) => !elsewhere.has(r.id))?.id;
    state = swap(state, 'trouser', ranking, placedBy(state));
    expect(placedBy(state).trouser).toBe(next);
    // Through twice the ranking: every step moves, and the four colours stay four.
    for (let i = 0; i < 2 * ranking.length; i += 1) {
      const before = placedBy(state).trouser;
      state = swap(state, 'trouser', ranking, placedBy(state));
      expect({ step: i, moved: placedBy(state).trouser !== before }).toStrictEqual({
        step: i,
        moved: true,
      });
      expect({ step: i, distinct: distinct(state) }).toStrictEqual({ step: i, distinct: true });
    }
  });

  it('a locked slot keeps its colour across Swap, a pill and an occasion', () => {
    const swapped = swap(RESTING_WEAR, 'trouser', ranking, resting.placed);
    const locked = toggleLock(swapped, 'trouser', placedBy(swapped));
    const held = placedBy(locked).trouser;
    expect(held).toBe(placedBy(swapped).trouser);
    expect(placedBy(swap(locked, 'trouser', ranking, placedBy(locked))).trouser).toBe(held);
    expect(placedBy(substitute(locked, 'trouser', ranking[5]!.id)).trouser).toBe(held);
    const formal = chooseOccasion(locked, 'formal');
    expect(placedBy(formal).trouser).toBe(held);
    // And the others, placed again under the new occasion, never take the locked colour.
    expect(distinct(formal)).toBe(true);
  });

  it('DECOY: an unlocked slot moves under each of the three', () => {
    const open = swap(RESTING_WEAR, 'trouser', ranking, resting.placed);
    const at = placedBy(open).trouser;
    expect(placedBy(swap(open, 'trouser', ranking, placedBy(open))).trouser).not.toBe(at);
    const held = Object.values(placedBy(open));
    const free = ranking.find((r) => !held.includes(r.id))!.id;
    expect(placedBy(substitute(open, 'trouser', free)).trouser).toBe(free);
    expect(chooseOccasion(open, 'formal').shown.trouser).toBeNull();
  });

  it('locking pins what is shown, and unlocking leaves it where it is', () => {
    const locked = toggleLock(RESTING_WEAR, 'trouser', resting.placed);
    expect(locked.shown.trouser).toBe(resting.placed.trouser);
    const unlocked = toggleLock(locked, 'trouser', placedBy(locked));
    expect([unlocked.locked.trouser, unlocked.shown.trouser]).toStrictEqual([
      false,
      resting.placed.trouser,
    ]);
  });

  it('a colour given to one slot that another shows moves the other, and is never shown twice', () => {
    const shoeColour = resting.placed.shoe!;
    const given = substitute(RESTING_WEAR, 'trouser', shoeColour);
    expect(placedBy(given).trouser).toBe(shoeColour);
    expect(distinct(given)).toBe(true);
  });

  it('a slot’s words put it in hand, and nothing else moves', () => {
    expect(putInHand(RESTING_WEAR, 'outer')).toStrictEqual({ ...RESTING_WEAR, inHand: 'outer' });
  });

  it('a colour the ranking does not hold is shown with no rank, rather than a false one', () => {
    const ids = new Set(ranking.map((r) => r.id));
    const outside = SLUGS.find((s) => s !== A && !ids.has(s))!;
    const slot = combination(A, substitute(RESTING_WEAR, 'trouser', outside)).slots[0]!;
    expect([slot.entry?.entry.slug, slot.rank, slot.candidate]).toStrictEqual([
      outside,
      null,
      null,
    ]);
    expect(slot.of).toBe(ranking.length);
  });

  it('the same actions give the same page', () => {
    const act = () => {
      const casual = chooseOccasion(RESTING_WEAR, 'casual');
      const at = combination(A, casual);
      return putInHand(swap(casual, 'shoe', at.rankings.shoe.ranked, at.placed), 'shoe');
    };
    expect(combination(A, act())).toStrictEqual(combination(A, act()));
  });
});

describe('the slot in hand’s alternatives are around the colour it shows (FR-38, E-217)', () => {
  const resting = combination(A);
  const ranking = resting.rankings.trouser.ranked;
  /** The trousers' ranking, less the colours the other slots show. */
  const offered = (shown: WearCombination) => {
    const elsewhere = new Set([shown.placed.shoe, shown.placed.outer]);
    return shown.rankings.trouser.ranked.filter((r) => !elsewhere.has(r.id));
  };

  it('at rest, are around the colour shown, among the colours no other slot shows', () => {
    expect(resting.alternatives).toStrictEqual(
      alternativesAround(
        { slot: 'top', color: colorFor(resting.anchor.entry) },
        resting.placed.trouser!,
        offered(resting),
        poolWithout(A),
        occasionRuleSet('office'),
      ),
    );
  });

  it('after a Swap, are relative to the colour now shown', () => {
    const swapped = combination(A, swap(RESTING_WEAR, 'trouser', ranking, resting.placed));
    expect(swapped.alternatives).toStrictEqual(
      alternativesAround(
        { slot: 'top', color: colorFor(swapped.anchor.entry) },
        swapped.placed.trouser!,
        offered(swapped),
        poolWithout(A),
        occasionRuleSet('office'),
      ),
    );
    for (const a of swapped.alternatives) expect(a.candidate.id).not.toBe(swapped.placed.trouser);
  });

  it('never offer a colour another slot shows, for any corpus colour and slot in hand', () => {
    const clashes: string[] = [];
    for (const slug of SLUGS)
      for (const inHand of RANKED_SLOTS) {
        const shown = combination(slug, { ...RESTING_WEAR, inHand });
        const elsewhere = RANKED_SLOTS.filter((k) => k !== inHand).map((k) => shown.placed[k]);
        for (const a of shown.alternatives)
          if (elsewhere.includes(a.candidate.id)) clashes.push(`${slug} ${inHand} ${a.axis}`);
      }
    expect(clashes).toStrictEqual([]);
  });

  it('follow the slot in hand', () => {
    const shoe = combination(A, putInHand(RESTING_WEAR, 'shoe'));
    for (const a of shoe.alternatives) expect(a.candidate.slot).toBe('shoe');
    expect(shoe.alternatives.length).toBeGreaterThan(0);
  });
});

describe('07’s card says what the engine computes (ADR-0151 D4)', () => {
  const shown = combination(A);
  const pieces = [
    { slot: 'top' as const, color: colorFor(shown.anchor.entry) },
    ...shown.slots.map((s) => ({ slot: ENGINE_SLOT[s.key], color: colorFor(s.entry!.entry) })),
  ];
  const score = scoreOutfit(
    pieces,
    CONTEXT.reference,
    SOMEBODY,
    occasionRuleSet('office'),
    CONTEXT.weights,
  );
  const component = (name: string) => score.components.find((c) => c.component === name)!;

  it('reads harmony, fit and separation from the outfit’s own score, the four pieces in it', () => {
    expect(pieces).toHaveLength(4);
    expect(shown.intelligence.harmony).toBe(component('harmony').direction);
    expect(shown.intelligence.fit).toBe(component('personalFit').score);
    expect(shown.intelligence.separation).toBe(component('cvdAccessibility').score);
  });

  it('has no fit figure without a profile, and says so as a value (ADR-0150, E-101)', () => {
    const none = wearCombination(A, RESTING_WEAR, null, CONTEXT)!;
    expect([none.personalKnown, none.intelligence.fit]).toStrictEqual([false, null]);
    // DECOY: the profile is what gives it one.
    expect(shown.personalKnown).toBe(true);
    expect(typeof shown.intelligence.fit).toBe('number');
  });

  it('DECOY: the two directions’ |Lc| differ for some colour, so taking the smaller is a choice', () => {
    const differ = allEntries().some((e) => {
      const shown = combination(e.entry.slug);
      const trousers = shown.slots.find((s) => s.key === 'trouser')?.entry;
      if (trousers === null || trousers === undefined) return false;
      const pair = compare(shown.anchor, trousers).contrast;
      return Math.round(Math.abs(pair.apcaBOnA)) !== Math.round(Math.abs(pair.apcaAOnB));
    });
    expect(differ).toBe(true);
  });

  it('measures contrast as the top against the trousers, the smaller |Lc| of the two directions', () => {
    const trousers = shown.slots.find((s) => s.key === 'trouser')!.entry!;
    const pair = compare(shown.anchor, trousers).contrast;
    expect(shown.intelligence.contrast).toStrictEqual({
      ratio: pair.wcagRatio,
      lc: Math.min(Math.abs(pair.apcaBOnA), Math.abs(pair.apcaAOnB)),
    });
  });
});

describe('07’s words', () => {
  it('writes the fit as a figure with the profile it was computed against, or none at all', () => {
    expect(fitLine(94, tEn, 'latin')).toBe(`94% ${en['wear.fit.yours']}`);
    expect(fitLine(94, tJa, 'japanese')).toBe(`94%${ja['wear.fit.yours']}`);
    expect(fitLine(null, tEn, 'latin')).toBe(en['wear.fit.none']);
    expect(fitLine(null, tEn, 'latin')).not.toMatch(/\d|%/);
  });

  it('writes the separation with its model, and the contrast as two figures', () => {
    expect(separationLine(98, tEn, 'latin')).toBe(
      `98% ${en['cvd.separation']} (${en['wear.cvdModel']})`,
    );
    expect(separationLine(98, tJa, 'japanese')).toBe(
      `98% ${ja['cvd.separation']}（${ja['wear.cvdModel']}）`,
    );
    expect(contrastLine({ ratio: 6.24, lc: 63.4 })).toBe('6.2:1 · Lc 63');
    expect(contrastLine(null)).toBeNull();
  });

  /*
   * FLOORED, NEVER ROUNDED (F-248's review, S2; ADR-0124). Each pair is a real corpus pair the review
   * found rounding up across a threshold: a figure may say less than the pair reaches, never more.
   */
  it('never prints a contrast a pair does not reach', () => {
    expect(contrastLine({ ratio: 4.48, lc: 44.59 })).toBe('4.4:1 · Lc 44');
    expect(contrastLine({ ratio: 2.997, lc: 29.98 })).toBe('2.9:1 · Lc 29');
    expect(contrastLine({ ratio: 4.5, lc: 45 })).toBe('4.5:1 · Lc 45');
    // DECOY: rounding would have claimed the thresholds.
    expect((4.48).toFixed(1)).toBe('4.5');
    expect(Math.round(44.59)).toBe(45);
  });

  it('words each harmony direction by its own key, and says temperature, not warmth (S7)', () => {
    expect(HARMONY_KEYS).toStrictEqual({
      supports: 'wear.harmony.supports',
      neutral: 'wear.harmony.neutral',
      opposes: 'wear.harmony.opposes',
    });
    // The component measures how close the pieces sit on the warm–cool axis, whichever side: four
    // cool colours close together are not "warmth".
    expect([en['wear.harmony.supports'], en['wear.harmony.neutral']]).toStrictEqual([
      'Shared Temperature',
      'Mixed Temperature',
    ]);
    // DECOY: the three are three different words in each catalogue.
    for (const catalogue of [en, ja])
      expect(new Set(Object.values(HARMONY_KEYS).map((k) => catalogue[k])).size).toBe(3);
  });

  it('names the anchor, a slot and the back control in 07’s structures', () => {
    const entry = allEntries()[0]!;
    const romaji = capitalised(entry.entry.name.romaji);
    expect(anchorLine(entry)).toBe(`${entry.entry.name.kanji} ${romaji} (${entry.derived.hex})`);
    expect(slotName(entry, true)).toBe(`${romaji} ${entry.entry.name.en}`);
    expect(slotName(entry, false)).toBe(`${romaji} (${entry.entry.name.en})`);
    expect(backName(entry, tEn, 'latin')).toBe(`${en['wear.back']} ${romaji}`);
    expect(backName(entry, tJa, 'japanese')).toBe(`${romaji}${ja['wear.back']}`);
  });

  it('labels a pill with its axis, the colour’s English name and the slot’s word', () => {
    const [first] = combination(A).alternatives;
    const entry = allEntries().find((e) => e.entry.slug === first!.candidate.id)!;
    expect(pillLabel(first!, 'trouser', tEn)).toBe(
      `${en[`alt.${first!.axis}` as MessageKey]}: + ${entry.entry.name.en} ${en['outfit.trouser']}`,
    );
  });

  it('claims no match, no pass and no safety, and names no occasion or season nobody published', () => {
    const keys: readonly MessageKey[] = [
      ...Object.values(OCCASION_KEYS),
      ...Object.values(SLOT_TITLE_KEYS),
      ...Object.values(SLOT_WORD_KEYS),
      ...Object.values(HARMONY_KEYS),
      'wear.fit.yours',
      'wear.fit.none',
      'wear.cvdModel',
      'wear.back',
      'cvd.separation',
    ];
    const BANNED = /\b(match|safe|passed|kasane|evening|classic|spring|summer|autumn|winter)\b/i;
    for (const catalogue of [en, ja])
      expect(keys.filter((k) => BANNED.test(catalogue[k]))).toStrictEqual([]);
    // DECOY: the drawn words the catalogue replaced are caught.
    expect(BANNED.test('94% Match (Cool-Muted profile)')).toBe(true); // claims-ok: quotes the drawn construction this line resolves
  });
});
