/**
 * The coordinate types.
 *
 * Every one is a `readonly` tuple of three `number`s, and they are structurally identical —
 * TypeScript will let a `Lab` be passed where an `Xyz` is expected. That is deliberate and it
 * is not an oversight to be fixed with branded types here. This package converts between
 * representations of the same physical quantity, and a branded coordinate would have to be
 * unwrapped and re-wrapped at every step, which is where transcription errors come from.
 *
 * The type that makes a colour impossible to misuse is `Color` in `@irodora/color-core`
 * (F-010), which carries its `Provenance` and its origin space. This package sits below that
 * on purpose: it knows nothing about provenance and must not, or every caller that wants a
 * conversion would have to invent one.
 */

/** CIE XYZ at the D65 white point. Canonical — everything else derives from it (ADR-0003). */
export type Xyz = readonly [x: number, y: number, z: number];

/**
 * Encoded (non-linear) RGB, nominally `[0, 1]` per component.
 *
 * Components outside `[0, 1]` are not an error here. Nothing in this package clamps, because
 * clamping mid-pipeline destroys information a round trip needs and hides an out-of-gamut
 * result from the code whose job is to map it (F-009).
 */
export type Rgb = readonly [r: number, g: number, b: number];

/** Linear-light RGB — the space in which averaging is correct. */
export type LinearRgb = readonly [r: number, g: number, b: number];

/** CIELAB. `l` in `[0, 100]`; `a` and `b` unbounded in principle. */
export type Lab = readonly [l: number, a: number, b: number];

/** CIELCh — CIELAB in polar form. `h` in degrees, `[0, 360)`. */
export type LCh = readonly [l: number, c: number, h: number];

/** OKLab (Ottosson 2020). `l` in `[0, 1]` for in-gamut colours. */
export type OkLab = readonly [l: number, a: number, b: number];

/** OKLCh — OKLab in polar form. `h` in degrees, `[0, 360)`. */
export type OkLCh = readonly [l: number, c: number, h: number];

/**
 * A 3×3 matrix in row-major order.
 *
 * Nine numbers rather than three rows of three, because a nested literal makes a
 * transcription error easy to hide behind formatting and hard to see in a diff.
 */
export type Matrix3 = readonly [
  m00: number,
  m01: number,
  m02: number,
  m10: number,
  m11: number,
  m12: number,
  m20: number,
  m21: number,
  m22: number,
];

/**
 * Spaces a colour may arrive in or be rendered to. Never canonical.
 *
 * XYZ is deliberately absent: it is the hub, not an origin. A value that "arrived in XYZ" is
 * a value whose real origin was lost, and `Provenance.originSpace` exists to record what a
 * round trip is honest back to.
 *
 * Pinned to the wire enum in `@irodora/contracts` at compile time (ADR-0036) — adding a
 * member here without adding it there fails `pnpm typecheck`.
 */
export type ColorSpace = 'srgb' | 'display-p3' | 'linear-srgb' | 'lab' | 'lch' | 'oklab' | 'oklch';

/** The canonical illuminant. Stated as a value so a caller can assert what it was given. */
export const CANONICAL_ILLUMINANT = 'D65' as const;
