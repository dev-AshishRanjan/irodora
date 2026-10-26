/**
 * Wear it — a colour goes in a slot, and the engine fills the others (FR-31, FR-73).
 *
 * ## The gap
 *
 * `recommendForSlot` and `recommendOutfit` have been exported from `@irodora/recommendation`
 * since **F-030** and called by nothing. Same defect F-194 found one package along, and the same
 * report behind it: *"if shirt is a color, then what color could pants should be."*
 *
 * F-194 answered *what colour goes with this colour* — geometry, twelve relationships. This
 * answers *what do I wear with it*, which is a different question with a different engine behind
 * it: a garment, a slot, and a ranking that knows a shoe is not a shirt.
 *
 * ## Nothing here scores
 *
 * Every number comes from `recommendOutfit` — and for `07`'s combination (F-248) from
 * `recommendForSlot`, `alternativesAround`, `scoreOutfit` and `compare()`. The 50/50
 * personal/pairing blend, the shortlist bound, the tie-break on `id` and the alternatives are the
 * engine's and stay there. This module builds the pool, resolves the slot, and answers one
 * question the engine cannot: **whether there is a person to score against at all.**
 *
 * ## `recommendOutfit`, not `recommendForSlot` twice
 *
 * The engine already refuses to recommend a second top — *"a second top is not what 'what goes
 * with this' means, and returning one would be the kind of answer that is technically
 * responsive"*, in its own words. Calling it once fills every other slot and keeps that rule
 * where it is defined.
 */

import {
  recommendOutfit,
  recommendForSlot,
  alternativesAround,
  scoreOutfit,
  ALTERNATIVE_AXES,
  SCORE_FACTORS,
  OUTFIT_SLOTS,
  type Alternative,
  type Candidate,
  type ComponentScore,
  type ExplanationDirection,
  type Occasion,
  type OutfitComponent,
  type OutfitPiece,
  type OutfitRecommendation,
  type OutfitScore,
  type OutfitSlot,
  type PersonalProfile,
  type RankedCandidate,
  type RuleSet,
} from '@irodora/recommendation';
import { compare } from './compare';
import { allEntries, colorFor, entryBySlug, type PublishedEntry } from './corpus';
import type { MessageKey } from './i18n';
import { capitalised } from './notation';
import { occasionRuleSet } from './rules';

/** The slot a colour can be put in. The engine's three, re-exported so a screen has one import. */
export { OUTFIT_SLOTS, type OutfitSlot };

/** Where a colour goes unless somebody says otherwise. A shirt is what people hold up. */
export const DEFAULT_SLOT: OutfitSlot = 'top';

/**
 * The message key naming each alternative axis, in the order the engine offers them.
 *
 * **Derived from `ALTERNATIVE_AXES`, not listed beside it.** `Wear` builds the key from the
 * axis, so the literal never appears in source and `i18n.test.ts`'s unused-key scan — which
 * is a source-literal scan — cannot see the consumer. That exclusion is safe only while both
 * directions are pinned: every key here exists in both catalogues, and the catalogue declares
 * no `alt.*` the engine does not emit. Same mechanism, and same protection, as
 * `COMBINATION_MESSAGE_KEYS` and `OUTFIT_MESSAGE_KEYS` (F-124, F-194).
 */
export const ALTERNATIVE_MESSAGE_KEYS: readonly string[] = ALTERNATIVE_AXES.map(
  (axis) => `alt.${axis}`,
);

/**
 * The profile used when nobody has built one.
 *
 * **Not a fabricated person — the engine's own representation of having nothing to go on.**
 * `scoreColor` returns `NO_EVIDENCE_SCORE` (50, `confidence: 0`, every factor `neutral`) when no
 * dimension carries confidence, and its docblock names this exact case: *"a profile nobody has
 * filled in is zero across the board"*. F-027 made that reachable rather than theoretical.
 *
 * So the personal half of every blend contributes nothing, and the ranking is driven entirely by
 * pairing — which is the answer that does not need a profile.
 *
 * **The interval values assert nothing and never reach a score.** Full range on both axes, no
 * temperature bias, the middle contrast preference: each is the value that expresses *no
 * constraint*, and each is multiplied by a weight of zero before it reaches the total.
 *
 * **They DO still reach `factors[].fit`, which is why {@link personalKnown} exists.** A
 * full-range interval makes `intervalFit` return 1 on every axis, so the explanation object
 * reports a perfect fit on four dimensions nobody has measured. That object must not be drawn
 * for somebody with no profile, and a screen deciding that for itself would eventually forget.
 */
export const NO_EVIDENCE_PROFILE: PersonalProfile = {
  lightness: { min: 0, max: 1 },
  temperatureBias: 0,
  chroma: { min: 0, max: 1 },
  contrast: 'medium',
  confidence: { temperature: 0, lightness: 0, chroma: 0, contrast: 0 },
};

/** What the screen draws. */
export interface WearAnswer {
  /** The colour in hand. */
  readonly source: PublishedEntry;
  /** The slot it was put in. Never one of the slots recommended back. */
  readonly slot: OutfitSlot;
  /**
   * Whether there was a person to score against.
   *
   * **A value, not something a screen infers.** When false the blended score is an artefact —
   * personal is pinned at 50 for every candidate, so the order is right and the magnitude is
   * not — and the explanation object reports a perfect fit on four unmeasured axes. Both are
   * reasons to draw a different tree, and neither should depend on a caller remembering to
   * check a confidence field.
   */
  readonly personalKnown: boolean;
  /** One per slot other than {@link slot}, in the engine's order. */
  readonly recommendations: readonly OutfitRecommendation[];
  /** How many corpus colours were offered to the engine, before its own bound. */
  readonly poolSize: number;
}

/**
 * Every corpus colour except the one in hand.
 *
 * **The source is excluded, and it is not a nicety.** `recommendOutfit` would happily rank a
 * colour against itself and put it first — pairing fit with yourself is as good as it gets — and
 * "wear these trousers with that shirt" pointing at the same colour is an answer that looks like
 * a bug because it is one.
 *
 * The whole corpus goes in. The engine's `SHORTLIST_LIMIT` is what bounds the work, and it
 * reports `considered` and `scored` so the bound is observable rather than assumed.
 */
function poolFor(source: PublishedEntry): readonly Candidate[] {
  return allEntries()
    .filter((e) => e.entry.slug !== source.entry.slug)
    .map((e) => ({ id: e.entry.slug, color: colorFor(e.entry) }));
}

/**
 * What to wear with a colour.
 *
 * `null` when the slug resolves to nothing, which is a state a route parameter can produce and
 * the screen renders as a sentence.
 *
 * Pure with respect to its arguments: the corpus and the rule set are both immutable published
 * content, so the same slug and slot always produce the same ranking.
 */
export function wearWith(
  slug: string,
  slot: OutfitSlot,
  profile: PersonalProfile | null,
  rules: RuleSet,
): WearAnswer | null {
  const source = entryBySlug(slug);
  if (source === null) return null;

  const pool = poolFor(source);

  return {
    source,
    slot,
    personalKnown: profile !== null,
    recommendations: recommendOutfit(
      { slot, color: colorFor(source.entry) },
      pool,
      profile ?? NO_EVIDENCE_PROFILE,
      rules,
    ),
    poolSize: pool.length,
  };
}

/**
 * The number a person is shown for a candidate.
 *
 * **The blend when there is a profile; the pairing figure when there is not.** With personal
 * pinned at 50 the blend is pulled toward the middle for every candidate — a compression that
 * changes no order and makes every magnitude a statement about the engine's midpoint rather
 * than about the colour. Showing it would be reporting a number that means less than it looks
 * like it means, which is what NFR-21 is about.
 */
export function shownScore(
  candidate: { readonly score: number; readonly pairing: number },
  personalKnown: boolean,
): number {
  return personalKnown ? candidate.score : candidate.pairing;
}

/**
 * The factors worth drawing for a candidate.
 *
 * Empty without a profile — see {@link NO_EVIDENCE_PROFILE} for why the explanation object is
 * not merely uninformative there but actively wrong.
 */
export function shownFactors(
  candidate: {
    readonly personal: { readonly factors: readonly { readonly messageKey: string }[] };
  },
  personalKnown: boolean,
): readonly { readonly messageKey: string }[] {
  return personalKnown ? candidate.personal.factors : [];
}

/** Every factor the engine scores on, for a screen that lists what a profile would add. */
export { SCORE_FACTORS };

/* ================================================================== 07: the combination (F-248) */

/**
 * The occasions `07` draws, as FR-34's published weightings, in drawn order (ADR-0151 D1). Each is
 * named by its own word: *Office* (FR-34 publishes `office` and `minimal` apart), *Japanese-inspired*
 * (no "classic" weighting exists, FR-23), *Formal* (no evening weighting is published).
 */
export const WEAR_OCCASIONS = [
  'casual',
  'office',
  'japanese-inspired',
  'formal',
] as const satisfies readonly Occasion[];
export type WearOccasion = (typeof WEAR_OCCASIONS)[number];

/** Where the occasion control rests: on *Office*, as `07` draws it chosen. */
export const RESTING_OCCASION: WearOccasion = 'office';

/** Each occasion's catalogue word. */
export const OCCASION_KEYS = {
  casual: 'wear.occasion.casual',
  office: 'wear.occasion.office',
  'japanese-inspired': 'wear.occasion.japaneseInspired',
  formal: 'wear.occasion.formal',
} as const satisfies Record<WearOccasion, MessageKey>;

/**
 * The slots `07` ranks — the colour is the top, so these three are the rest (ADR-0151 D2). The outer
 * layer is ranked by the engine as a TOP, because the builder files coats and jackets under top, and
 * the engine's three slots stay three: a fourth would count no valid outfit for a wardrobe without a
 * coat (`OUTFIT_SLOTS`, coverage, the Lab and the lookbook are untouched).
 */
export const RANKED_SLOTS = ['trouser', 'shoe', 'outer'] as const;
export type RankedSlot = (typeof RANKED_SLOTS)[number];

/** The engine's slot each of `07`'s slots is ranked and scored as. */
export const ENGINE_SLOT: Readonly<Record<RankedSlot, OutfitSlot>> = {
  trouser: 'trouser',
  shoe: 'shoe',
  outer: 'top',
};

/** Each slot's title, numbered as `07` draws them, the colour's own slot first. */
export const SLOT_TITLE_KEYS = {
  top: 'wear.slot.1',
  trouser: 'wear.slot.2',
  shoe: 'wear.slot.3',
  outer: 'wear.slot.4',
} as const satisfies Record<'top' | RankedSlot, MessageKey>;

/** A slot as a pill names it: *+ ‹name› ‹slot word›*. */
export const SLOT_WORD_KEYS = {
  trouser: 'outfit.trouser',
  shoe: 'outfit.shoe',
  outer: 'wear.slotWord.outer',
} as const satisfies Record<RankedSlot, MessageKey>;

/**
 * What a person has done on `07` (ADR-0152): the occasion, the slot in hand, the colour each slot
 * shows (`null` is its ranking's first), and which slots are locked. Every change below is a pure
 * function of this and the rankings, so the same actions give the same page.
 */
export interface WearState {
  readonly occasion: WearOccasion;
  readonly inHand: RankedSlot;
  readonly shown: Readonly<Record<RankedSlot, string | null>>;
  readonly locked: Readonly<Record<RankedSlot, boolean>>;
}

/** `07` as drawn: Office, slot 2 (the trousers) in hand, each slot its ranking's first, none locked. */
export const RESTING_WEAR: WearState = {
  occasion: RESTING_OCCASION,
  inHand: 'trouser',
  shown: { trouser: null, shoe: null, outer: null },
  locked: { trouser: false, shoe: false, outer: false },
};

/** A slot's ranking, as far as the reducers need it. */
type Ranking = readonly { readonly id: string }[];

/** The id a slot shows: the one chosen, or its ranking's first. */
export function shownId(state: WearState, slot: RankedSlot, ranking: Ranking): string | null {
  return state.shown[slot] ?? ranking[0]?.id ?? null;
}

/**
 * *Swap*: the next candidate in the slot's ranking, wrapping at its end (ADR-0152 D2). A locked slot
 * does not move. A shown id the ranking no longer holds (a locked colour the occasion dropped, then
 * unlocked) steps to the ranking's first.
 */
export function swap(state: WearState, slot: RankedSlot, ranking: Ranking): WearState {
  if (state.locked[slot] || ranking.length === 0) return state;
  const at = ranking.findIndex((r) => r.id === shownId(state, slot, ranking));
  const next = ranking[(at + 1) % ranking.length];
  return next === undefined ? state : { ...state, shown: { ...state.shown, [slot]: next.id } };
}

/** *Lock*: on or off. A locked slot keeps its colour across Swap, the pills and the occasion. */
export function toggleLock(state: WearState, slot: RankedSlot, ranking: Ranking): WearState {
  const locking = !state.locked[slot];
  return {
    ...state,
    // Locking pins what is shown NOW, so an occasion change cannot move it from under the lock.
    shown: locking ? { ...state.shown, [slot]: shownId(state, slot, ranking) } : state.shown,
    locked: { ...state.locked, [slot]: locking },
  };
}

/** A pill: that candidate in the slot. A locked slot does not move. */
export function substitute(state: WearState, slot: RankedSlot, id: string): WearState {
  return state.locked[slot] ? state : { ...state, shown: { ...state.shown, [slot]: id } };
}

/** An occasion: the rankings change, so each unlocked slot returns to its new ranking's first. */
export function chooseOccasion(state: WearState, occasion: WearOccasion): WearState {
  const shown = { ...state.shown };
  for (const slot of RANKED_SLOTS) if (!state.locked[slot]) shown[slot] = null;
  return { ...state, occasion, shown };
}

/** A slot's words pressed: that slot in hand. */
export function putInHand(state: WearState, slot: RankedSlot): WearState {
  return { ...state, inHand: slot };
}

/** One of `07`'s ranked slots, as the page draws it. */
export interface WearSlot {
  readonly key: RankedSlot;
  /** The corpus colour the slot shows; `null` only when its ranking is empty. */
  readonly entry: PublishedEntry | null;
  /** That colour's place in its ranking, with its reasons (FR-11); `null` when it is not in it. */
  readonly candidate: RankedCandidate | null;
  /** Its place from 1; `null` when it is not in the ranking (a locked colour the occasion dropped). */
  readonly rank: number | null;
  /** How many the ranking holds. */
  readonly of: number;
  readonly locked: boolean;
}

/** The card's warm–cool relation: the harmony component's own direction (ADR-0151 D4). */
export type HarmonyRelation = ExplanationDirection;

/** What `07` draws for a colour, under a state (ADR-0151, ADR-0152). */
export interface WearCombination {
  readonly anchor: PublishedEntry;
  readonly personalKnown: boolean;
  readonly slots: readonly WearSlot[];
  /** Each ranked slot's ranking, for Swap and the sheet. */
  readonly rankings: Readonly<Record<RankedSlot, OutfitRecommendation>>;
  /** The slot in hand's alternatives, relative to the colour it shows (FR-38, `alternativesAround`). */
  readonly alternatives: readonly Alternative[];
  readonly intelligence: {
    readonly harmony: HarmonyRelation;
    /** The outfit's `personalFit` (FR-32), or `null` with no profile (ADR-0150 D2, E-101). */
    readonly fit: number | null;
    /** The worst pair's separation under the three deficiencies at severity 1 (FR-5). */
    readonly separation: number;
    /** The top against the trousers: the WCAG ratio, and the smaller |Lc| (FR-3); `null` without trousers. */
    readonly contrast: { readonly ratio: number; readonly lc: number } | null;
  };
}

/**
 * What a combination is scored against beside the occasion's rules: the outfit weights and the corpus
 * reference, as `rankingContext` gives them (E-208), so `07` scores an outfit as the Lab does.
 */
export interface WearContext {
  readonly weights: Readonly<Record<OutfitComponent, number>>;
  readonly reference: readonly Candidate[];
}

/** A component the engine always reports (`OutfitScore.components`: all six, always). */
function componentOf(score: OutfitScore, name: OutfitComponent): ComponentScore {
  const found = score.components.find((c) => c.component === name);
  if (found === undefined) throw new Error(`scoreOutfit reported no ${name} component`);
  return found;
}

/**
 * `07` for one colour under one state: each slot's ranking under the occasion's published weighting,
 * the colour each shows, the slot in hand's alternatives around it, and the card's four figures
 * (ADR-0151 D4).
 *
 * The rules are read from the state's occasion HERE, not passed in, so a page cannot rank under one
 * occasion while its control shows another. `null` when the slug names no colour this corpus holds.
 * Pure: the corpus and the rules are published content, so the same slug, state and profile give the
 * same page.
 */
export function wearCombination(
  slug: string,
  state: WearState,
  profile: PersonalProfile | null,
  context: WearContext,
): WearCombination | null {
  const anchor = entryBySlug(slug);
  if (anchor === null) return null;
  const rules = occasionRuleSet(state.occasion);
  const pool = poolFor(anchor);
  const input = { slot: DEFAULT_SLOT, color: colorFor(anchor.entry) };
  const scoredAs = profile ?? NO_EVIDENCE_PROFILE;
  const rankings: Record<RankedSlot, OutfitRecommendation> = {
    trouser: recommendForSlot(input, ENGINE_SLOT.trouser, pool, scoredAs, rules),
    shoe: recommendForSlot(input, ENGINE_SLOT.shoe, pool, scoredAs, rules),
    outer: recommendForSlot(input, ENGINE_SLOT.outer, pool, scoredAs, rules),
  };

  const slots = RANKED_SLOTS.map((key): WearSlot => {
    const { ranked } = rankings[key];
    const id = shownId(state, key, ranked);
    const index = ranked.findIndex((r) => r.id === id);
    return {
      key,
      entry: id === null ? null : entryBySlug(id),
      candidate: ranked[index] ?? null,
      rank: index < 0 ? null : index + 1,
      of: ranked.length,
      locked: state.locked[key],
    };
  });
  const slotOf = (key: RankedSlot): WearSlot | undefined => slots.find((s) => s.key === key);

  const inHand = slotOf(state.inHand)?.entry ?? null;
  const alternatives =
    inHand === null
      ? []
      : alternativesAround(input, inHand.entry.slug, rankings[state.inHand].ranked, pool, rules);

  const pieces: OutfitPiece[] = [
    input,
    ...slots.flatMap((s) =>
      s.entry === null ? [] : [{ slot: ENGINE_SLOT[s.key], color: colorFor(s.entry.entry) }],
    ),
  ];
  const score = scoreOutfit(pieces, context.reference, scoredAs, rules, context.weights);
  const trousers = slotOf('trouser')?.entry ?? null;
  const pair = trousers === null ? null : compare(anchor, trousers).contrast;

  return {
    anchor,
    personalKnown: profile !== null,
    slots,
    rankings,
    alternatives,
    intelligence: {
      harmony: componentOf(score, 'harmony').direction,
      fit: profile === null ? null : componentOf(score, 'personalFit').score,
      separation: componentOf(score, 'cvdAccessibility').score,
      contrast:
        pair === null
          ? null
          : {
              ratio: pair.wcagRatio,
              // The SMALLER magnitude of the two directions, so the figure never overstates (rule 11).
              lc: Math.min(Math.abs(pair.apcaBOnA), Math.abs(pair.apcaAOnB)),
            },
    },
  };
}

/* ------------------------------------------------------------------ 07's drawn sizes */
/*
 * Each from `07.json` at its 0.6809 dp a pixel, to the half dp; `wear-fidelity.test` recomputes every
 * one. A glyph's size is (ink − line) × 24 ÷ its path's extent, as F-247's are: the back arrow spans
 * 12 units, the turn 17, and the padlock, a solid drawing with no line, 17.7.
 */

/** The app bar: `07.header`, 54 px. */
export const WEAR_APP_BAR = 37;
/** The back arrow: 20 px of ink. */
export const BACK_GLYPH = 24;
/** The rule between the back word and the title: 28 px. */
export const DIVIDER = 19;
/** The anchor's sample: 76 px. */
export const ANCHOR = 51.5;
/** The occasion control: 43 px. */
export const OCCASION = 29.5;
/** Slot 2's *Swap* and *Lock*: 40 and 41 px, siblings drawn alike, so one height. */
export const SWAP = 27.5;
/** Their turn: 18 px of ink. */
export const SWAP_GLYPH = 15;
/** Their padlock: 22 px of ink. */
export const LOCK_GLYPH = 20.5;
/** Slots 3 and 4's compact *Swap*: 34 px. */
export const SWAP_COMPACT = 23;
/** Its turn: 15 px of ink. */
export const SWAP_COMPACT_GLYPH = 12;
/** A substitution pill: 33 px. */
export const PILL = 22.5;
/** *Save to Outfit Lab*: 54 px. */
export const SAVE = 37;
/** *Export Palette Tokens*: 50 px. */
export const EXPORT = 34;
/** The card's label column: its values start 178 px in. */
export const LABEL_COLUMN = 121;

/* ------------------------------------------------------------------ 07's words */

type T = (key: MessageKey) => string;
type Script = 'latin' | 'japanese';

/** The anchor's line: *‹kanji› ‹Romaji› (‹hex›)* (ADR-0151 D3; the brackets are notation). */
export function anchorLine(entry: PublishedEntry): string {
  return `${entry.entry.name.kanji} ${capitalised(entry.entry.name.romaji)} (${entry.derived.hex})`;
}

/**
 * A slot's name, in the structure `07` draws for it: the colour's own slot `‹Romaji› ‹English›`, the
 * ranked slots `‹Romaji› (‹English›)`. 07's garment and material words are its sample content (E1).
 */
export function slotName(entry: PublishedEntry, anchor: boolean): string {
  const romaji = capitalised(entry.entry.name.romaji);
  return anchor ? `${romaji} ${entry.entry.name.en}` : `${romaji} (${entry.entry.name.en})`;
}

/** A pill: *‹axis›: + ‹English name› ‹slot word›* (ADR-0152 D3). */
export function pillLabel(alternative: Alternative, slot: RankedSlot, t: T): string {
  const entry = entryBySlug(alternative.candidate.id);
  const name = entry === null ? alternative.candidate.id : entry.entry.name.en;
  return `${t(`alt.${alternative.axis}` as MessageKey)}: + ${name} ${t(SLOT_WORD_KEYS[slot])}`;
}

/** The harmony row's words, from the component's direction (ADR-0151 D4). */
export const HARMONY_KEYS = {
  supports: 'wear.harmony.supports',
  neutral: 'wear.harmony.neutral',
  opposes: 'wear.harmony.opposes',
} as const satisfies Record<HarmonyRelation, MessageKey>;

/** The fit row: *‹n›% (your profile)*, or *No profile yet* and no figure (ADR-0150). */
export function fitLine(fit: number | null, t: T, script: Script): string {
  if (fit === null) return t('wear.fit.none');
  return `${String(fit)}%${script === 'japanese' ? '' : ' '}${t('wear.fit.yours')}`;
}

/** The CVD row: *‹n›% Separation (Protan/Deutan/Tritan · Machado 2009)* (FR-5; never *Safe*). */
export function separationLine(separation: number, t: T, script: Script): string {
  const [open, close] = script === 'japanese' ? ['（', '）'] : [' (', ')'];
  return `${String(separation)}% ${t('cvd.separation')}${open}${t('wear.cvdModel')}${close}`;
}

/**
 * The contrast row: *‹ratio›:1 · Lc ‹n›* — two figures, because APCA has no ratio (FR-3). `null` when
 * there are no trousers to measure the top against; the row then draws no figure (R9 §4 E2).
 */
export function contrastLine(contrast: { ratio: number; lc: number } | null): string | null {
  if (contrast === null) return null;
  return `${contrast.ratio.toFixed(1)}:1 · Lc ${String(Math.round(contrast.lc))}`;
}

/** The back control's name: *Back to ‹Romaji›*, in each script's order. */
export function backName(entry: PublishedEntry, t: T, script: Script): string {
  const romaji = capitalised(entry.entry.name.romaji);
  return script === 'japanese' ? `${romaji}${t('wear.back')}` : `${t('wear.back')} ${romaji}`;
}
