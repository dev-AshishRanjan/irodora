# ADR-0020 — The design system's own tokens are defined in OKLCH

## Status

Accepted

## Date

2026-08-13

## Context

A product that tells people their hex-based colour reasoning is imprecise, while defining
its own interface in hand-picked hex values, is not credible. The design system is the
first thing every user sees and the most visible demonstration of whether we believe our
own argument.

There are practical reasons too, independent of the dogfooding one:

- **Contrast is gateable when lightness is a parameter.** In OKLCh, `L` is perceptual
  lightness. Generating a scale with predictable contrast steps is arithmetic; in hex it is
  eyeballing.
- **Dual themes come almost free.** A dark theme derived by transforming `L` while holding
  `C` and `H` preserves hue identity. Hand-picked dark palettes drift in hue, and users
  perceive it as two different brands.
- **P3 is reachable.** OKLCh tokens can express colours outside sRGB with a defined sRGB
  fallback, rather than being capped at the narrower gamut by the notation.

## Decision

**Tokens are authored in OKLCh in `@irodora/design-tokens`, with a machine-readable
manifest that the contrast gate reads.**

1. **`design-system.manifest.json` is the source of truth.** Every token: OKLCh
   components, the sRGB fallback, semantic role, and its intended contrast pairings.
2. **Compiled to four targets** from that one source: CSS custom properties (with
   `@supports` P3 upgrades), TypeScript constants, React Native styles, and a Tailwind v4
   theme.
3. **Scales are generated, not picked.** A ramp is defined by its hue, chroma curve and
   lightness steps; the steps are computed. Individual overrides are allowed but must be
   recorded with a reason — an unexplained override is how a scale silently stops being a
   scale.
4. **The `contrast` gate reads the manifest** and asserts every declared foreground/background
   pairing meets WCAG 2.2 AA, and reports APCA Lc alongside
   ([ADR-0021](0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md)). A token change
   that breaks a pairing fails the build.
5. **Dark theme is derived**, not authored separately — an `L` transform with `C` and `H`
   preserved, plus recorded exceptions where perception genuinely requires one.
6. **No raw colour literals in application code.** Lint-enforced. A hex string in a
   component is a token that was never defined.
7. **CVD verification of the token set itself.** Semantic pairs that must remain
   distinguishable — success/error, selected/unselected — are checked under protan, deutan
   and tritan simulation. The product's own interface has to pass the standard it applies
   to outfits.

## Consequences

**Good.** Contrast becomes a build-time property rather than a design review item. Dark
theme stays hue-consistent. The design system demonstrates the product's thesis. P3-capable
displays get richer colour with an automatic sRGB fallback. Every surface consumes the same
tokens, so web and mobile cannot drift.

**Bad.** OKLCh is unfamiliar to most designers, and design-tool support is still uneven —
which means part of the design workflow involves values that the tool does not natively
show. Generated scales occasionally need overrides, and each one is a small erosion of the
system. Older browsers need the sRGB fallback path maintained.

**Neutral.** Designers can still work in familiar spaces; conversion to OKLCh happens at
token definition, and the manifest records both.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Hex tokens** | Universal support, every tool understands them. Contrast becomes unpredictable, dark theme drifts in hue, and a colour product defining its interface in hex undercuts its own argument |
| **HSL tokens** | Human-readable, has a lightness parameter. HSL's `L` is not perceptual — `hsl(60 100% 50%)` and `hsl(240 100% 50%)` have wildly different perceived lightness, so contrast is no more predictable than hex |
| **A third-party token system (Radix Colors)** | Excellent, accessibility-tested, saves substantial work. Brings its own colour semantics, which a colour product cannot outsource — and it is authored in a space we would then be translating out of |
| **P3-only tokens** | Richest colour on capable displays. Excludes sRGB-only displays or forces an ungoverned automatic conversion; the fallback needs to be a decision, not a browser guess |

## Revisit when

- CSS Color 5 relative colour syntax has support broad enough to generate scales in the
  browser rather than at build time.
- Design tooling gains native OKLCh authoring, which would remove the workflow friction
  that is this decision's main cost.
