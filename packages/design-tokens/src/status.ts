/**
 * NFR-9, made structural: **a status expressible only as colour cannot be constructed.**
 *
 * The rule is written down in three places already — `ACCESSIBILITY.md` §4, the contrast
 * rules, and a `_note` in the manifest. Written-down rules are followed until the afternoon
 * someone needs a green dot and there is no icon to hand. So the type is the enforcement:
 * `statusPresentation` takes all three channels or it does not compile, and there is no
 * overload, no optional field and no default that produces a colour-only status.
 *
 * This is the same move as `Provenance` on `Color` (ADR-0005) —
 * [[provenance-in-the-type-is-what-makes-honesty-structural]]. Ask what makes a guarantee
 * impossible to violate, not what reminds people not to.
 *
 * The type has a matching negative test: removing the icon must fail `tsc`. A rule that has
 * never been watched fail is configuration that parses
 * [[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]].
 */

import type { StatusEntry } from './manifest.js';

/** The three semantic states the manifest declares. */
export type StatusKind = 'ok' | 'warn' | 'bad';

// `TextToken` and `LargeTextToken` are NOT defined here. They are derived in
// `generated/tokens.ts` from the `usage` field of the manifest itself, as literal unions of
// the actual token names.
//
// The first attempt declared them here as phantom brands — `string & { __text: unique
// symbol }`. That version was rejected in review and deserved to be: nothing produced a
// value of either type, so the only way to obtain one was a hand-written cast, the generated
// tokens were plain strings, and a consumer reading `COLOR.light['foreground.3']` got no
// error anywhere. The test that "proved" the brands differ was true and vacuous.
//
// Derived unions cost nothing, cannot drift from the manifest, and make the
// non-assignability structural rather than declared.

/**
 * A status as it may be presented. Three channels, all required.
 *
 * `text` is the visible label, not an `aria-label`: a label only assistive technology can
 * reach still leaves a sighted CVD user looking at two dots.
 */
export interface StatusPresentation {
  readonly kind: StatusKind;
  readonly colorToken: string;
  readonly iconToken: string;
  readonly text: string;
}

/**
 * Build a status presentation from its manifest entry and a visible label.
 *
 * Throws on an empty label. That is not belt-and-braces over the type: `text: ''` satisfies
 * `string`, and an empty label is the colour-only status the type exists to prevent, arrived
 * at through the front door.
 */
export function statusPresentation(
  kind: StatusKind,
  entry: StatusEntry,
  text: string,
): StatusPresentation {
  if (text.trim().length === 0)
    throw new Error(
      `status "${kind}": a visible text label is required (NFR-9). An empty label is a ` +
        'status carried by colour and an icon alone.',
    );
  return { kind, colorToken: entry.colorToken, iconToken: entry.iconToken, text };
}
