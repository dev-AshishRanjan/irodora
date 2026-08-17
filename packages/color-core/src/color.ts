/**
 * The colour value, and the reason it has no public constructor.
 *
 * A `Color` is canonical XYZ (D65) plus its `Provenance`. Both are required, and the second
 * is the point: **a component that accepts a `Color` necessarily has how that colour came to
 * exist**, because there is no way to build one without it
 * ([ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md)).
 *
 * The type does not stop someone writing `{ xyz, provenance }` by hand — nothing structural
 * can, in TypeScript. What the constructors add is the *validation* that goes with it, and
 * the `originSpace` being recorded from the call rather than passed alongside it, so it
 * cannot disagree with where the value actually came from.
 *
 * ## No colour maths lives here
 *
 * This package is a facade. Every conversion is `@irodora/color-spaces`, every metric is
 * `@irodora/color-difference`. A conversion implemented here would be a second
 * implementation — a defect by definition (`AGENTS.md` §7) — and the fact that this is the
 * package everything else imports is exactly what would make it hard to notice.
 */

import {
  displayP3ToXyz,
  labToXyz,
  lchToXyz,
  oklabToXyz,
  oklchToXyz,
  srgbToXyz,
  type ColorSpace,
  type Triple,
  type Xyz,
} from '@irodora/color-spaces';
import { assertProvenance, type Provenance } from './provenance.js';

/**
 * A colour, and how it came to exist.
 *
 * `xyz` is canonical CIE XYZ at D65 (ADR-0003). It is **not clamped and not gamut-mapped** —
 * a colour outside sRGB is a real colour, and F-009's `gamutMap` is what decides how to show
 * it. Storing a mapped value here would throw away the thing the mapping needs.
 */
export interface Color {
  readonly xyz: Xyz;
  readonly provenance: Provenance;
}

/** Every space a colour can arrive in, and how it reaches canonical XYZ. */
const TO_XYZ: Record<ColorSpace, (components: Triple) => Xyz> = {
  srgb: srgbToXyz,
  'display-p3': displayP3ToXyz,
  'linear-srgb': (c) => srgbToXyz(c),
  lab: labToXyz,
  lch: lchToXyz,
  oklab: oklabToXyz,
  oklch: oklchToXyz,
};

/**
 * A colour whose canonical XYZ is already known.
 *
 * `provenance` is positional and has no default. Forgetting it is a compile error, which is
 * the difference between a rule and a convention.
 */
export function fromXyz(xyz: Xyz, provenance: Provenance): Color {
  assertProvenance(provenance);
  if (!xyz.every(Number.isFinite))
    throw new TypeError(`Color.fromXyz: XYZ must be finite; got [${xyz.join(', ')}]`);
  return { xyz, provenance };
}

/**
 * A colour arriving in a named space.
 *
 * **`originSpace` is taken from `space`, not from the provenance the caller passed.** A
 * caller who converts from Display-P3 and labels it `srgb` has produced a value whose round
 * trip is dishonest, and the argument that would let them do it is simply not accepted.
 */
export function fromSpace(
  space: ColorSpace,
  components: Triple,
  provenance: Omit<Provenance, 'originSpace'> & { readonly originSpace?: never },
): Color {
  const complete = { ...provenance, originSpace: space } as Provenance;
  assertProvenance(complete);
  return fromXyz(TO_XYZ[space](components), complete);
}

/** Parse `#RGB`, `#RRGGBB` or their unprefixed forms. Returns null rather than throwing. */
function parseHex(hex: string): Triple | null {
  const raw = hex.trim().replace(/^#/u, '');
  const expanded =
    raw.length === 3 ? raw.replace(/([0-9a-fA-F])/gu, '$1$1') : raw.length === 6 ? raw : null;
  if (expanded === null || !/^[0-9a-fA-F]{6}$/u.test(expanded)) return null;
  return [
    parseInt(expanded.slice(0, 2), 16) / 255,
    parseInt(expanded.slice(2, 4), 16) / 255,
    parseInt(expanded.slice(4, 6), 16) / 255,
  ];
}

/** What `unsafeFromHex` records. Exported so a test can assert it rather than restate it. */
export const UNSAFE_HEX_PROVENANCE = {
  source: 'declared',
  confidence: 0.5,
  originSpace: 'srgb',
} as const satisfies Provenance;

/**
 * The **only** untracked construction path (ADR-0005).
 *
 * A hex string carries no information about how the colour was obtained, so this records
 * `declared` at confidence 0.5 — a value that is honest about knowing nothing, rather than a
 * `1.0` that would let the claims lint permit language the colour cannot support.
 *
 * **The name is unpleasant on purpose.** It is the grep target: "every call site is
 * reviewed" is only enforceable if the call sites can be counted, and
 * `scripts/verify-unsafe-call-sites.mjs` counts them on every `pnpm lint`. A new call site
 * fails the build until someone adds it to that script's reviewed list — which is the moment
 * the review actually happens.
 */
export function unsafeFromHex(hex: string): Color {
  const rgb = parseHex(hex);
  if (rgb === null)
    throw new TypeError(`Color.unsafeFromHex: not a hex colour: ${JSON.stringify(hex)}`);
  return fromXyz(srgbToXyz(rgb), UNSAFE_HEX_PROVENANCE);
}

/**
 * Replace a colour's provenance.
 *
 * Exists because re-deriving a colour to correct its provenance would round-trip the value
 * and change it. Takes a whole `Provenance`, never a patch — a partial update is how an
 * `estimated` source keeps someone else's `conditions`.
 */
export function withProvenance(color: Color, provenance: Provenance): Color {
  assertProvenance(provenance);
  return { xyz: color.xyz, provenance };
}
