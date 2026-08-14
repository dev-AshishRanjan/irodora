/**
 * Colour space conversions.
 *
 * CIE XYZ (D65) is canonical; everything else derives from it (ADR-0003).
 * ZERO runtime dependencies, NO platform APIs — this must produce byte-identical
 * results in Node, the browser and React Native (NFR-3) and port to WASM.
 */

/** The canonical internal representation: CIE XYZ at the D65 white point. */
export type Xyz = readonly [x: number, y: number, z: number];

/** Spaces a colour may arrive in or be rendered to. Never canonical. */
export type ColorSpace = 'srgb' | 'display-p3' | 'linear-srgb' | 'lab' | 'lch' | 'oklab' | 'oklch';

export const CANONICAL_ILLUMINANT = 'D65' as const;

/** Implemented in F-006. */
export const ENGINE_VERSION = '0.0.0' as const;
