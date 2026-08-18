/**
 * Derived colour values — computed from `xyz` by the engine, never typed by an editor.
 *
 * **No colour maths is written here.** Every number comes from `@irodora/color-spaces` and
 * `@irodora/color-difference`. This module decides *which* conversions a corpus entry carries
 * and *when* they are computed; if one of the values is wrong, the bug is in a package with a
 * golden dataset behind it, not in this file (`AGENTS.md` §7).
 *
 * ## Why the derived block is not in the source entry
 *
 * `parseEntry` rejects `lab`, `lch`, `oklch`, `rgb`, `hex` and `gamut` outright, so they
 * cannot be typed at all. They are computed once at publish and stored in the version bundle.
 * That is one step stronger than ADR-0043, which must regenerate-and-compare because the
 * design manifest has to keep its `srgb` for browsers to read; nothing needs the hex inside a
 * source entry, so the stronger form is available here.
 *
 * ## E-001 — this is the destination end
 *
 * A change to `srgbToXyz`, an OKLab matrix or the adaptation transform invalidates every
 * stored value produced by this function, with no compiler error and no failing test unless
 * one exists for it. The `content` gate recomputes the latest published version through this
 * same code and compares; the fix is always to republish, never to edit a published entry.
 *
 * ## Why the hex is gamut-mapped rather than clipped
 *
 * A measured indigo on silk can sit outside sRGB. Clipping per channel shifts hue by up to
 * 33.6° (F-009's decoy measured it), which would make the entry's swatch a different colour
 * from the entry. `gamutMapDetail` reduces OKLCh chroma and holds hue, and reports what it
 * cost — so "closest digital reference" (ADR-0031) is a claim with a number behind it rather
 * than a phrase.
 */

import { deltaE00 } from '@irodora/color-difference';
import {
  gamutMapDetail,
  srgbToHex,
  srgbToXyz,
  xyzToLab,
  xyzToLch,
  xyzToOklch,
  type Triple,
} from '@irodora/color-spaces';

export interface DerivedColor {
  /** CIELAB (D65). */
  readonly lab: Triple;
  /** CIELCh — Lab in polar form. FR-21 names it separately, and it is what the UI shows. */
  readonly lch: Triple;
  readonly oklch: Triple;
  /**
   * Encoded sRGB, gamut-mapped. Unclamped values never reach here — `hex` could not represent
   * them, and this is the boundary where that decision is made.
   */
  readonly rgb: Triple;
  readonly hex: string;
  /** Whether the true colour fits in sRGB. False means `hex` is an approximation. */
  readonly inSrgbGamut: boolean;
  /**
   * ΔE00 between the true colour and what `hex` will render — `0` when it fits.
   *
   * This is the number behind "closest digital reference". Without it the phrase is a
   * disclaimer, and ADR-0031 exists because disclaimers are not measurements.
   */
  readonly renderDeltaE00: number;
  /**
   * True when the colour is out of range in **lightness**, so the result is a clamp rather
   * than a chroma reduction. Reported separately because "we reduced saturation" would be the
   * wrong sentence here, and it is not inferable from the chroma numbers.
   */
  readonly lightnessOutOfRange: boolean;
}

/** Every derived value for one entry, from its canonical XYZ. */
export function deriveColor(xyz: Triple): DerivedColor {
  const mapping = gamutMapDetail(xyz, 'srgb');
  const hex = srgbToHex(mapping.rgb);

  // The comparison is between the TRUE colour and the colour that will actually be drawn —
  // measured after the round trip through the hex, not after gamut mapping. Rounding to a
  // byte per channel is part of what the viewer sees, and leaving it out would understate the
  // gap by exactly the amount the display introduces.
  const renderDeltaE00 = mapping.wasInGamut ? 0 : deltaE00(xyzToLab(xyz), xyzToLab(hexToXyz(hex)));

  return {
    lab: xyzToLab(xyz),
    lch: xyzToLch(xyz),
    oklch: xyzToOklch(xyz),
    rgb: mapping.rgb,
    hex,
    inSrgbGamut: mapping.wasInGamut,
    renderDeltaE00,
    lightnessOutOfRange: mapping.lightnessOutOfRange,
  };
}

/**
 * `#RRGGBB` back to canonical XYZ.
 *
 * Used to measure what the rendered hex actually is, and by the gate to check an entry's
 * `sourceHex` against its `xyz` — the lossy path most likely to carry a transcription error.
 */
export function hexToXyz(hex: string): Triple {
  const m = /^#?([0-9a-fA-F]{6})$/u.exec(hex.trim());
  if (m === null) throw new TypeError(`deriveColor: expected #RRGGBB, got ${JSON.stringify(hex)}`);
  const [, raw = ''] = m;
  const channel = (at: number): number => parseInt(raw.slice(at, at + 2), 16) / 255;
  // `srgbToXyz` is the `from` end of E-001: every derived value in the corpus traces back
  // through this call.
  return srgbToXyz([channel(0), channel(2), channel(4)]);
}
