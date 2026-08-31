/**
 * Six scores and an overall, and the overall never stands in for the six.
 *
 * > *Score an outfit across colour harmony, personal fit, contrast, Japanese aesthetic,
 * > versatility and CVD accessibility, plus an overall. All component scores are shown; the
 * > overall never replaces them in the UI.* — FR-32
 *
 * ## "Japanese aesthetic" is called `corpusAffinity`, and the rename is the honest part
 *
 * FR-32 lists the component and it has to exist. A number claiming to say **how Japanese an
 * outfit is** would be an aesthetic judgement nobody has measured and nobody could defend —
 * exactly what golden rule 11 and
 * [ADR-0031](../../../docs/adr/0031-measurement-claims-policy.md) exist to stop.
 *
 * What *is* measurable is **how close these colours sit to a curated corpus of Japanese
 * colours**: ΔE00 from each outfit colour to its nearest published entry. That is a real
 * distance with a real unit, it is reproducible from the corpus version, and it is a much
 * smaller claim. The field, its doc comment and its message key all say *that*, so the smaller
 * claim is the one that reaches a screen
 * ([ADR-0073](../../../docs/adr/0073-the-japanese-aesthetic-score-is-corpus-affinity-and-says-so.md)).
 *
 * ## Five of the six are conventions; one rests on a published model
 *
 * `cvdAccessibility` reads `separationScore` from `@irodora/cvd-engine`, which implements
 * Machado and Viénot. **The other five are formulas this repository invented**, and each says so
 * in its own doc comment. A component that reads like a measurement is worse than one that
 * admits it is a judgement, because the first is quoted back.
 *
 * ## The one definition of separation
 *
 * [E-005](../../../.harness/state/effects.json) named this consumer before it existed — *"the
 * UI's CVD preview, **the recommendation engine's separation factor** and the design system's
 * cvdPairs check all read the same score"*. This imports it. A second definition here would be
 * a recommendation claiming an accessibility property the interface does not deliver.
 */

import { deltaE00 } from '@irodora/color-difference';
import { xyzToLab, xyzToOklch, xyzToSrgb } from '@irodora/color-spaces';
import { separationScore, type Deficiency } from '@irodora/cvd-engine';
import type { Color } from '@irodora/color-core';
import { preferenceFor, PREFERENCE_NEUTRAL, type PreferenceTable } from './preference.js';
import type { PersonalProfile } from './profile.js';
import type { RuleSet } from './rules.js';
import { CONTRAST_TARGET, scoreColor, temperatureOf, type ExplanationDirection } from './score.js';
import { pairingCoherence, type Candidate } from './outfit.js';
import { SLOT_AREA, type OutfitSlot } from './slots.js';

/** The six FR-32 names, in the order they are reported. `corpusAffinity` is its fourth. */
export const OUTFIT_COMPONENTS = [
  'harmony',
  'personalFit',
  'contrast',
  'corpusAffinity',
  'versatility',
  'cvdAccessibility',
] as const;
export type OutfitComponent = (typeof OUTFIT_COMPONENTS)[number];

/** One garment in the outfit being scored. */
export interface OutfitPiece {
  readonly slot: OutfitSlot;
  readonly color: Color;
  /**
   * The colour's family, when it has one (F-046).
   *
   * Optional because a Lens capture has no family — it is a measurement, not a published entry
   * — and because every caller that predates preference feedback must keep compiling and must
   * keep scoring identically. A piece without a family simply takes part in no preference.
   */
  readonly family?: string | undefined;
}

/** One component's verdict, as data. Never a sentence — FR-11. */
export interface ComponentScore {
  readonly component: OutfitComponent;
  /** [0,100]. */
  readonly score: number;
  readonly direction: ExplanationDirection;
  readonly messageKey: string;
  /**
   * What this component looked at, so a reader can disagree with the number rather than only
   * with its size. Values are numbers; the engine renders nothing.
   */
  readonly evidence: Readonly<Record<string, number>>;
}

export interface OutfitScore {
  /** [0,100]. **Never present without `components`** — see the type, and criterion 2. */
  readonly overall: number;
  /** All six, always, in `OUTFIT_COMPONENTS` order. */
  readonly components: readonly ComponentScore[];
  /** The overall's own decomposition: which component contributed how much. */
  readonly factors: readonly {
    readonly component: OutfitComponent;
    readonly weight: number;
    readonly contribution: number;
    readonly direction: ExplanationDirection;
    readonly messageKey: string;
  }[];
  readonly rulesVersion: string;
}

/** Above this a component supports the outfit; below the floor it opposes it. Conventions. */
export const COMPONENT_SUPPORTS_ABOVE = 66;
export const COMPONENT_OPPOSES_BELOW = 34;

/** Every message key this module can emit. The catalogue contract, as data — like F-028's. */
export const OUTFIT_MESSAGE_KEYS: readonly string[] = OUTFIT_COMPONENTS.flatMap((c) =>
  (['supports', 'opposes', 'neutral'] as const).map((d) => `outfit.${c}.${d}`),
);

/**
 * ΔE00 at or below which a colour counts as "in the corpus".
 *
 * A convention. 5 is roughly where two colours stop reading as the same one to most people;
 * anything tighter would make `corpusAffinity` a test of whether somebody owns exactly the
 * published swatch, which is not a useful question about an outfit.
 */
export const CORPUS_NEAR_DELTA_E = 5;

/** How well two colours pair, above which they count toward versatility. A convention. */
export const VERSATILE_PAIRING = 0.6;

/**
 * The severity CVD is scored at.
 *
 * The strongest tabulated one, as everywhere else in this product: a recommendation that is
 * accessible only to mild deficiency is not an accessibility claim worth making.
 */
export const CVD_SEVERITY = 1;
const DEFICIENCIES: readonly Deficiency[] = ['protan', 'deutan', 'tritan'];

const clamp100 = (n: number): number => Math.max(0, Math.min(100, n));
const oklchOf = (c: Color): readonly [number, number, number] => {
  const [l, ch, h] = xyzToOklch(c.xyz);
  return [l, ch, h];
};

const directionOf = (score: number): ExplanationDirection =>
  score >= COMPONENT_SUPPORTS_ABOVE
    ? 'supports'
    : score <= COMPONENT_OPPOSES_BELOW
      ? 'opposes'
      : 'neutral';

const componentScore = (
  component: OutfitComponent,
  score: number,
  evidence: Readonly<Record<string, number>>,
): ComponentScore => {
  const rounded = Math.round(clamp100(score));
  const direction = directionOf(rounded);
  return {
    component,
    score: rounded,
    direction,
    messageKey: `outfit.${component}.${direction}`,
    evidence,
  };
};

/**
 * Every unordered pair of pieces. An outfit of one has none, and every component says so.
 *
 * Written with `flatMap` over `slice` rather than indexed loops so there is no index that could
 * be out of range — the lint rule forbidding non-null assertions is right, and reaching for one
 * here would have been silencing it rather than answering it.
 */
function pairs<T>(items: readonly T[]): readonly (readonly [T, T])[] {
  return items.flatMap((a, i) => items.slice(i + 1).map((b): readonly [T, T] => [a, b]));
}

/**
 * **Harmony** — how the outfit's hues relate.
 *
 * A convention, and a deliberately modest one: colours whose warm–cool biases are close read as
 * a considered set, and a set spread across the whole axis reads as an accident. It does **not**
 * implement complementary or triadic theory — those are claims about which relationships are
 * pleasing, and this repository has no basis for them.
 */
function harmony(pieces: readonly OutfitPiece[], rules: RuleSet): ComponentScore {
  const combos = pairs(pieces);
  if (combos.length === 0) return componentScore('harmony', 50, { pairs: 0 });
  const spreads = combos.map(([a, b]) => {
    const [, ac, ah] = oklchOf(a.color);
    const [, bc, bh] = oklchOf(b.color);
    // `temperatureOf`, not `hueBias`: three greys are not a scattered outfit just because their
    // hue angles differ, and at C = 0.01 a hue angle is a rounding artefact of two tiny numbers.
    return Math.abs(temperatureOf(ac, ah, rules.poles) - temperatureOf(bc, bh, rules.poles));
  });
  const worst = Math.max(...spreads);
  // Spread is in [0,2]; halving puts it on [0,1] and the score is what remains of 100.
  return componentScore('harmony', 100 * (1 - worst / 2), {
    pairs: combos.length,
    widestTemperatureSpread: Number(worst.toFixed(4)),
  });
}

/**
 * **Personal fit** — `scoreColor` per piece, weighted by how much of the outfit it covers.
 *
 * Area-weighted rather than averaged: a shoe that does not suit somebody is a smaller problem
 * than a coat that does not, and an unweighted mean says otherwise. `SLOT_AREA`'s magnitudes
 * carry that — in F-030 only their order mattered.
 */
function personalFit(
  pieces: readonly OutfitPiece[],
  profile: PersonalProfile,
  rules: RuleSet,
): ComponentScore {
  if (pieces.length === 0) return componentScore('personalFit', 50, { pieces: 0 });
  const totalArea = pieces.reduce((n, p) => n + SLOT_AREA[p.slot], 0);
  const weighted = pieces.reduce(
    (n, p) => n + scoreColor(profile, p.color, rules).score * (SLOT_AREA[p.slot] / totalArea),
    0,
  );
  return componentScore('personalFit', weighted, {
    pieces: pieces.length,
    coveredArea: Number(totalArea.toFixed(4)),
  });
}

/** **Contrast** — the separation between pieces, against the person's preference. */
function contrast(pieces: readonly OutfitPiece[], profile: PersonalProfile): ComponentScore {
  const combos = pairs(pieces);
  if (combos.length === 0) return componentScore('contrast', 50, { pairs: 0 });
  const target = CONTRAST_TARGET[profile.contrast];
  const fits = combos.map(([a, b]) => {
    const separation = Math.abs(oklchOf(a.color)[0] - oklchOf(b.color)[0]);
    // A target, not a floor — overshooting is a miss too (E-033).
    return Math.max(0, 1 - Math.abs(separation - target));
  });
  const mean = fits.reduce((n, f) => n + f, 0) / fits.length;
  return componentScore('contrast', mean * 100, { pairs: combos.length, target });
}

/**
 * **Corpus affinity** — how close these colours sit to the published corpus.
 *
 * NOT "how Japanese this is". See the header and ADR-0073. ΔE00 to the nearest reference entry,
 * per piece, scored against `CORPUS_NEAR_DELTA_E`.
 *
 * An empty reference set scores 50 with `references: 0` in the evidence, rather than 100 — a
 * distance to nothing is not a perfect distance, and this is the branch a caller who forgot to
 * pass the corpus would otherwise never notice.
 */
function corpusAffinity(
  pieces: readonly OutfitPiece[],
  reference: readonly Candidate[],
): ComponentScore {
  if (pieces.length === 0 || reference.length === 0)
    return componentScore('corpusAffinity', 50, {
      references: reference.length,
      pieces: pieces.length,
    });

  const referenceLabs = reference.map((r) => xyzToLab(r.color.xyz));
  const nearest = pieces.map((p) => {
    const lab = xyzToLab(p.color.xyz);
    return Math.min(...referenceLabs.map((r) => deltaE00(lab, r)));
  });
  const mean = nearest.reduce((n, d) => n + d, 0) / nearest.length;
  return componentScore('corpusAffinity', 100 * Math.max(0, 1 - mean / (CORPUS_NEAR_DELTA_E * 2)), {
    references: reference.length,
    meanDeltaE00ToNearest: Number(mean.toFixed(3)),
    furthest: Number(Math.max(...nearest).toFixed(3)),
  });
}

/**
 * **Versatility** — how much else these colours would go with.
 *
 * The proportion of the reference set that **coheres** with the outfit's largest piece —
 * temperature agreement and chroma competition, and deliberately NOT lightness separation.
 *
 * Separation is what the `contrast` component measures. Including it here scored the same
 * property twice AND produced a number that was wrong under its own name: with `pairingFit`,
 * the most "versatile" colour in the corpus came out as a vivid red, because it sits at a
 * central lightness and therefore lands near the target distance from a lot of things. See
 * `pairingCoherence`.
 */
function versatility(
  pieces: readonly OutfitPiece[],
  reference: readonly Candidate[],
  profile: PersonalProfile,
  rules: RuleSet,
): ComponentScore {
  const anchor = [...pieces].sort((a, b) => SLOT_AREA[b.slot] - SLOT_AREA[a.slot])[0];
  if (anchor === undefined || reference.length === 0)
    return componentScore('versatility', 50, { references: reference.length });
  const good = reference.filter(
    (r) =>
      pairingCoherence(anchor.color, anchor.slot, r.color, 'trouser', profile, rules) >=
      VERSATILE_PAIRING,
  ).length;
  return componentScore('versatility', (good / reference.length) * 100, {
    references: reference.length,
    pairsWell: good,
  });
}

/**
 * **CVD accessibility** — the worst separation between any two pieces, over all three
 * deficiencies at the strongest tabulated severity.
 *
 * The **worst**, not the mean: an outfit where one pair vanishes for a deutan is not rescued by
 * three pairs that survive, and a mean would report exactly that.
 *
 * `separationScore` is imported (E-005). This module defines no separation of its own.
 */
function cvdAccessibility(pieces: readonly OutfitPiece[]): ComponentScore {
  const combos = pairs(pieces);
  if (combos.length === 0) return componentScore('cvdAccessibility', 50, { pairs: 0 });
  let worst = 100;
  let worstDeficiency = 0;
  for (const [a, b] of combos) {
    const ra = xyzToSrgb(a.color.xyz);
    const rb = xyzToSrgb(b.color.xyz);
    for (const [index, deficiency] of DEFICIENCIES.entries()) {
      const score = separationScore(ra, rb, deficiency, CVD_SEVERITY);
      if (score < worst) {
        worst = score;
        worstDeficiency = index;
      }
    }
  }
  return componentScore('cvdAccessibility', worst, {
    pairs: combos.length,
    severity: CVD_SEVERITY,
    // An index rather than a string: `evidence` is numbers, so a renderer cannot accidentally
    // print an untranslated English word from the engine.
    worstDeficiencyIndex: worstDeficiency,
  });
}

/**
 * Score an outfit.
 *
 * `weights` is a total record over the six — **content**, supplied by the caller from the
 * published `outfit` block (F-029's machinery, a new version rather than a constant here).
 * Requiring it rather than defaulting is the same refusal `scoreColor` makes: a default would
 * be an editorial number living in code.
 */

/**
 * How much the person's own history should move the harmony of these pieces (FR-37, F-046).
 *
 * **Harmony and nothing else.** Harmony is the component about how colours sit together, which
 * is what "repeated selection of a pairing" is evidence about. Personal fit, contrast and CVD
 * accessibility are deliberately untouched: a habit is evidence about taste, and it is **not**
 * evidence about whether two colours are separable for a deutan or whether text clears a
 * contrast floor. Letting preference reach those would let somebody's repeated choices talk
 * them out of an accessibility finding.
 *
 * The mean over pairs, not the product: three pairs each leaning 1.25 should lean 1.25, not
 * 1.95. A product would let a three-piece outfit accumulate a preference nobody expressed.
 *
 * Pieces without a family take part in nothing, so an outfit with no families at all returns
 * exactly `PREFERENCE_NEUTRAL` and the score is unchanged.
 */
function preferenceMultiplier(
  pieces: readonly OutfitPiece[],
  preferences: PreferenceTable | undefined,
): number {
  if (preferences === undefined || preferences.size === 0) return PREFERENCE_NEUTRAL;

  const weights: number[] = [];
  for (let i = 0; i < pieces.length; i += 1)
    for (let j = i + 1; j < pieces.length; j += 1) {
      const a = pieces[i]?.family;
      const b = pieces[j]?.family;
      if (a === undefined || b === undefined) continue;
      weights.push(preferenceFor(preferences, a, b));
    }

  if (weights.length === 0) return PREFERENCE_NEUTRAL;
  return weights.reduce((n, w) => n + w, 0) / weights.length;
}

export function scoreOutfit(
  pieces: readonly OutfitPiece[],
  reference: readonly Candidate[],
  profile: PersonalProfile,
  rules: RuleSet,
  weights: Readonly<Record<OutfitComponent, number>>,
  /**
   * This device's preference history (FR-37, F-046). **Optional, and absent means unchanged.**
   *
   * Every caller written before this argument existed passes nothing, and must keep getting
   * exactly the score it got before — `PREFERENCE_NEUTRAL` is exactly 1 and the multiplier
   * returns it for an empty or absent table, so the arithmetic is identity rather than
   * approximately identity. A test asserts that rather than trusting it.
   */
  preferences?: PreferenceTable,
): OutfitScore {
  const lean = preferenceMultiplier(pieces, preferences);
  const base = harmony(pieces, rules);
  const components: readonly ComponentScore[] = [
    // HARMONY ONLY. The other five are untouched by preference — see `preferenceMultiplier`.
    lean === PREFERENCE_NEUTRAL
      ? base
      : { ...base, score: Math.max(0, Math.min(100, base.score * lean)) },
    personalFit(pieces, profile, rules),
    contrast(pieces, profile),
    corpusAffinity(pieces, reference),
    versatility(pieces, reference, profile, rules),
    cvdAccessibility(pieces),
  ];

  const factors = components.map((c) => {
    const weight = weights[c.component];
    return {
      component: c.component,
      weight,
      contribution: c.score * weight,
      direction: c.direction,
      messageKey: c.messageKey,
    };
  });

  return {
    // Rounded once, at the end, so the six numbers a person can see add up to the one they are
    // shown beside — the arithmetic they check first when they disagree.
    overall: Math.round(factors.reduce((n, f) => n + f.contribution, 0)),
    components,
    factors,
    rulesVersion: rules.versionId,
  };
}
