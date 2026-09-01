/**
 * The app's single import site for the colour engine.
 *
 * ## Why this file exists rather than importing the packages from a screen
 *
 * A dependency nobody imports passes every gate and ships nothing
 * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]] — that failure has already
 * happened once in this repository, when six increments of API machinery were unit-tested,
 * green, and attached to nothing.
 *
 * So the engine has **one** entry point into the app, and that entry point has a test which
 * reproduces the committed cross-platform identity digest. If the wiring breaks, or a screen
 * quietly starts computing colour by hand, the test notices.
 *
 * ## What this does NOT prove
 *
 * The test runs under **Node**. NFR-3 claims byte-identical output in Node, the browser AND
 * React Native, and the interesting engine is **Hermes** — Node and Chromium both run V8, so
 * agreeing with each other proves less than it looks. The Hermes leg is attested on F-039 and
 * needs a device. This file makes that a day's work rather than a redesign.
 *
 * ## What may never happen here
 *
 * No colour maths. Every value below is computed by `@irodora/color-*`, which has zero runtime
 * dependencies and no platform APIs precisely so that this file can be a thin pass-through
 * (NFR-3, and the purity gate enforces it from the other side).
 */

import { fromSpace, type Color } from '@irodora/color-core';
import { deltaE00 } from '@irodora/color-difference';
import {
  oklchToXyz,
  xyzToLab,
  xyzToOklch,
  xyzToSrgb,
  srgbToHex,
  type Triple,
} from '@irodora/color-spaces';

/** A colour the app can show, with every number the engine's. */
export interface DisplayColour {
  readonly hex: string;
  readonly oklch: Triple;
  readonly color: Color;
}

/**
 * Build a displayable colour from OKLCh.
 *
 * `fromSpace` is what makes the provenance non-optional: a `Color` cannot exist without one
 * ([ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md)), so a screen cannot
 * render a value whose origin nobody recorded.
 */
/**
 * The hex a `Color` renders as (F-055).
 *
 * Here rather than in the screen that needed it, because `srgbToHex(xyzToSrgb(…))` is a colour
 * conversion and `apps/mobile/AGENTS.md` is explicit that those are imported, never written:
 * the first draft of the professional surface hand-rolled a channel clamp and a hex pad, and
 * the compiler caught it only because `Color` has no `srgb` field to read.
 *
 * Out of gamut, `xyzToSrgb` returns what it returns and this renders the nearest thing a
 * screen can draw — the same value `displayFromOklch` reports, and the reason it reports the
 * difference alongside it.
 */
export function hexOf(color: Color): string {
  return srgbToHex(xyzToSrgb(color.xyz));
}

export function displayFromOklch(oklch: Triple): DisplayColour {
  const xyz = oklchToXyz(oklch);
  return {
    hex: srgbToHex(xyzToSrgb(xyz)),
    oklch: xyzToOklch(xyz),
    color: fromSpace('oklch', oklch, {
      source: 'declared',
      confidence: 1,
    }),
  };
}

/**
 * Perceptual difference between two OKLCh colours, in ΔE00. The ranking authority.
 *
 * **ΔE00 is defined on CIELAB, not on OKLCh.** Handing it OKLCh triples type-checks — both are
 * `Triple` — and returns a plausible number that means nothing. Both inputs go through XYZ to
 * Lab first, which is the only correct route [[deltae00-is-the-ranking-authority]].
 */
export function differenceOklch(a: Triple, b: Triple): number {
  return deltaE00(xyzToLab(oklchToXyz(a)), xyzToLab(oklchToXyz(b)));
}
