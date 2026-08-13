# AGENTS.md — `apps/web`

> **Scoped harness. Extends [`../../AGENTS.md`](../../AGENTS.md), which still applies in
> full.** Stricter, never looser.

Next.js 16 App Router · React 19 · Tailwind v4 · Radix primitives.

**Accessibility here is a build gate, not a review item.** A contrast regression fails the
build.

---

## Server by default

`'use client'` is a decision with a bundle cost. A misplaced one pulls the colour engine
into a page that should ship none.

**The Atlas ships no engine code.** It is server-rendered and static per corpus version.
That is what the route-level first-load budget checks, and the most likely cause of a
failure is a `'use client'` in the wrong place.

## Tokens, never literals

A colour literal in a component is a token that was never defined. Lint-enforced — same for
spacing, radii, motion durations and z-index.

**The exception that matters:** a colour being *examined* — a corpus entry, a Lens result, a
garment — is **data**, rendered from a `Color` value with its provenance. Never a hard-coded
string.

## Colour rendering — the rules unique to this app

- **A neutral separator between a colour sample and any adjacent coloured element.**
  Simultaneous contrast is the difference between a correct and an incorrect reading, which
  is why `swatch.separator` exists as its own token.
- **No gradient, glow or shadow on or near a swatch.** They alter the perceived colour of
  what they surround.
- **`radius.swatch` is 0.** A rounded swatch changes perceived area, and therefore perceived
  colour.
- **No cross-fade between swatches.** Motion must never alter a colour mid-transition.
- **Provenance renders with the colour**, always — never behind a tap.

## Never colour alone

Every meaning carried by colour also carries text, icon, shape or pattern. Enforced
structurally: every `status.*` token pairs with an icon token in the manifest, so a
colour-only status cannot be constructed.

**Every swatch has an accessible name and its numeric value.** A swatch without a name is an
empty box to a screen reader and to a CVD user — the most common accessibility failure in
colour tooling, and trivially avoidable.

## Radix for interaction semantics

Style them. **Do not reimplement** their focus management, keyboard handling or ARIA —
reimplementation is how accessibility regressions get introduced.

## Both locales, from the start

No hard-coded user-facing string; the catalogue is enumerated, so a missing translation
fails the build rather than rendering a key name in production.

Design for both text lengths — Japanese and English differ in both directions. Japanese
needs its own line-height scale and correct kinsoku line breaking.

**Never localise a colour value.** `#263B3C` is the same everywhere.

## Verifying

```bash
pnpm --filter @irodora/web test:e2e   # includes axe WCAG 2.2 AA
pnpm test:contrast
pnpm test:perf
```

Plus by hand: keyboard · screen reader · 200 % text · reduced motion · both themes · both
locales · simulated CVD.

**And the test that matters:** put a real garment colour on screen inside this interface.
Can you judge it accurately? If the chrome interferes, the surface has failed at the one
thing this product exists to do.

## Before you start

[`.harness/rules/frontend/`](../../.harness/rules/frontend/) ·
[`docs/design/ACCESSIBILITY.md`](../../docs/design/ACCESSIBILITY.md) ·
[`build-ui`](../../.harness/skills/build-ui/SKILL.md).
