/**
 * The twelve comparisons, and the budget they have to fit inside.
 *
 * > *Guided setup — build a profile from swatch comparisons, no camera. Completes in ≤ 90 s
 * > median.* — FR-26
 *
 * ## Declared, then checked against the corpus
 *
 * Each trial names corpus slugs. Nothing here holds a colour value — the swatches come from
 * the verified bundle at render time, so a trial cannot disagree with what is published
 * ([ADR-0046](../../../../docs/adr/0046-published-corpus-is-an-immutable-generated-bundle.md)).
 *
 * What the slugs *encode* is a claim about the published values: that each trial **separates
 * on its own axis and stays matched on the others**. `test/profile.test.ts` checks that claim
 * against the bundle's own OKLCh, trial by trial. Without it a corpus publish could move an
 * entry and turn a temperature question into a lightness question — which changes what the
 * answers mean, produces a perfectly plausible profile, and is invisible from the screen.
 *
 * That is the same shape as [E-022](../../../../.harness/state/effects.json) and a different
 * destination: E-022 asks whether the bundle the app reads is the one that was published,
 * this asks whether a constant naming the bundle's contents still means what it said.
 *
 * ## Why forced choice, and why twelve
 *
 * A forced choice between two swatches is the question a person can answer about themselves
 * without vocabulary. "How much chroma do you tolerate?" is not.
 *
 * Three trials per axis is the smallest number that distinguishes *unanimous* from *split* —
 * with two, every disagreement is a tie and no answer carries more weight than another. It is
 * also what keeps the flow inside the budget below. It is **not** enough to make this an
 * instrument: twelve taps establish a tendency, and `CONFIDENCE_UNANIMOUS` is capped at 0.75
 * to say so.
 */

/** The four axes a trial can be about. The three list dimensions are derived, never asked. */
export const TRIAL_AXES = ['temperature', 'lightness', 'chroma', 'contrast'] as const;
export type TrialAxis = (typeof TRIAL_AXES)[number];

/**
 * One side of a comparison.
 *
 * `slugs` rather than a slug because a contrast trial asks about a *pairing*: the question is
 * how much separation the person wants between two garments, which cannot be asked with one
 * swatch. Every other axis uses a single slug.
 *
 * `pole` is which end of the axis this option represents, and it is what the derivation reads
 * — so the answer is interpreted by the trial's own declaration rather than by the screen
 * inferring it from position.
 */
export interface TrialOption {
  readonly slugs: readonly string[];
  readonly pole: 'a' | 'b';
}

export interface Trial {
  readonly id: string;
  readonly axis: TrialAxis;
  /** Two options. `a` is warm / light / chromatic / high-contrast; `b` is the other end. */
  readonly options: readonly [TrialOption, TrialOption];
}

const trial = (id: string, axis: TrialAxis, a: readonly string[], b: readonly string[]): Trial => ({
  id,
  axis,
  options: [
    { slugs: a, pole: 'a' },
    { slugs: b, pole: 'b' },
  ],
});

/**
 * The trials, in the order they are asked.
 *
 * **Interleaved by axis rather than grouped**, so three temperature questions in a row cannot
 * teach somebody that the "right" answer is the one they gave last time. The spread across the
 * lightness range within each axis is deliberate too: a temperature preference established
 * only among dark colours is a preference about dark colours.
 *
 * `a` is consistently the warm / light / chromatic / high-contrast end. That consistency is
 * for the derivation, not for the screen — `ProfileSetup` shuffles nothing, but it also never
 * says which side is which, because a labelled answer is an answer about the label.
 */
export const TRIALS: readonly Trial[] = [
  // Temperature: matched in OKLCh L and C, separated in hue class. `ame-doro`/`shimo-yo` and
  // `kari-ato`/`yu-mizu` are matched to three decimal places in the published bundle.
  trial('temperature-dark', 'temperature', ['ame-doro'], ['shimo-yo']),
  trial('lightness-blue', 'lightness', ['fuka-moya'], ['shizumi-ao']),
  trial('chroma-cool-mid', 'chroma', ['en-yo'], ['kumori-iwa']),
  trial('contrast-deep', 'contrast', ['soko-zumi', 'usu-gami'], ['yu-dachi', 'fuka-moya']),

  trial('temperature-mid', 'temperature', ['aki-yu'], ['fuyu-yo']),
  trial('lightness-green', 'lightness', ['kawa-goke'], ['kuro-midori']),
  trial('chroma-warm-mid', 'chroma', ['aki-batake'], ['hai-suna']),
  trial('contrast-warm', 'contrast', ['kuro-tsuchi', 'shira-tsuchi'], ['aki-batake', 'asa-bukuro']),

  trial('temperature-light', 'temperature', ['kari-ato'], ['yu-mizu']),
  trial('lightness-warm', 'lightness', ['furu-gami'], ['fuyu-tsuchi']),
  trial('chroma-cool-dark', 'chroma', ['fuka-mizu'], ['tetsu-suna']),
  trial('contrast-cool', 'contrast', ['yoru-gami', 'kai-jiro'], ['natsu-kage', 'ja-mon']),
];

/** How many trials each axis carries. Read by the derivation and asserted by the test. */
export const TRIALS_PER_AXIS = 3;

/**
 * The seconds one trial is designed to take, and the seconds around the trials.
 *
 * **A budget, not a measurement.** Nobody has been timed on this flow, and no copy or report
 * may say otherwise (ADR-0031). What the budget does is make FR-26's ceiling a constraint on
 * the design rather than a hope: `test/profile.test.ts` asserts the arithmetic fits, so adding
 * a thirteenth trial or a fifth axis fails a test instead of quietly spending the margin.
 *
 * The human half — whether a real person actually finishes inside 90 seconds — is attested on
 * F-026 and blocks the release. It is the half no check in this repository can reach.
 */
export const TRIAL_BUDGET_SECONDS = 5;
/** The intro, the summary, and the taps between them. */
export const FLOW_OVERHEAD_SECONDS = 20;
/** FR-26's ceiling, verbatim. */
export const FLOW_CEILING_SECONDS = 90;

/** What the design budget adds up to. */
export function budgetSeconds(): number {
  return TRIALS.length * TRIAL_BUDGET_SECONDS + FLOW_OVERHEAD_SECONDS;
}

/** Every slug the flow will ask the bundle for. For the corpus check, and for preloading. */
export function trialSlugs(): readonly string[] {
  return [...new Set(TRIALS.flatMap((t) => t.options.flatMap((o) => o.slugs)))];
}

/** An answer: which pole the person chose, for one trial. */
export interface TrialAnswer {
  readonly trialId: string;
  readonly pole: 'a' | 'b';
}
