# Irodora — Design System

| | |
|---|---|
| **Status** | **Approved** · 2026-08-14 · **values corrected 2026-08-15** ([ADR-0044](../adr/0044-status-tokens-corrected-and-status-colour-is-text.md)) |
| **Source of truth** | [`design-system.manifest.json`](design-system.manifest.json) |
| **Decisions** | [ADR-0020](../adr/0020-design-tokens-are-oklch-native.md) · [ADR-0021](../adr/0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md) · [ADR-0033](../adr/0033-frontend-foundation-own-the-token-layer-headless-primitives.md) · [ADR-0043](../adr/0043-the-oklch-field-is-authoritative-and-srgb-is-derived.md) · [ADR-0044](../adr/0044-status-tokens-corrected-and-status-colour-is-text.md) |
| **Skills** | [`build-ui`](../../.harness/skills/build-ui/SKILL.md) · [`visual-taste`](../../.harness/skills/visual-taste/SKILL.md) · [`contrast-checker`](../../.harness/skills/contrast-checker/SKILL.md) · [`motion`](../../.harness/skills/motion/SKILL.md) |

---

## The thesis

> **Soft chrome, unaltered colour.**

Everything is generous — 20 px cards, 28 px containers, full pills, 44 px targets, warm
neutrals. Except the swatch, which is `radius: 0` at every size, forever.

Corner radius removes sampled area from exactly the region the eye uses to judge a large flat
colour, and the effect grows as the swatch shrinks — at 24 px a 10 px radius eats a fifth of
the shape. Surrounded by softness, the hard edge reads as *deliberate precision* rather than
as something unstyled. **The tension between the two is the design idea.**

### Where it comes from

**A colour page is a product page, and here the colour is the product.** Fashion retail
solved our hardest constraint years ago: SSENSE, Net-a-Porter, COS and Aesop are near
monochrome *because the clothes carry the colour*. An entire industry arrived independently
at "the interface must not compete with the product"
([[the-constraint-and-the-taste-usually-agree]]).

So the swatch gets the treatment a garment photograph gets — 400 px, uninterrupted, undecorated
— and the specification sits quiet beneath it, exactly where size-and-composition sits on a
product page.

### Taken and refused, deliberately

| From | Taken | Refused |
|---|---|---|
| **Apple HIG** | Deference — chrome recedes, content leads. 44 px targets | **Translucency and vibrancy near a swatch.** A material that tints what shows through it is disqualified on a colour surface |
| **Material 3** | Tonal elevation — surfaces lift by tint, not shadow. Generous radii and state layers | **Dynamic colour.** Deriving a UI palette from a source colour would tint the entire interface from the thing being examined. Fatal here |
| **Fashion retail** | The whole information hierarchy: product first at full size, spec quiet beneath, editorial type, air | — |

---

## The manifest is the source of truth

```
design-system.manifest.json
   │
   ├─→ CSS custom properties     (with @supports P3 upgrade)
   ├─→ TypeScript constants      (@irodora/design-tokens)
   ├─→ React Native styles
   └─→ Tailwind v4 theme
```

Four targets, one source. A token that exists in CSS but not in React Native is a divergence
between web and mobile, and there is no mechanism for one to appear — which is also why
[Astryx was not adopted](../adr/0033-frontend-foundation-own-the-token-layer-headless-primitives.md):
it is web-only.

**The `contrast` gate reads this file and is blocking**, from the moment it exists (F-003).

### Token naming is shadcn/Base-UI compatible

Deliberately, so the wider ecosystem's tooling — tweakcn, efferd blocks, coss blocks —
remains usable as reference and as a starting point. **That is interoperability, not
adoption.** The values are ours, and so are the rules a general-purpose system would have no
reason to encode.

---

## What the manifest carries that a normal design system does not

**`swatch.well`** — a mandatory neutral ground beneath every colour sample, at every size.
Functional, not decorative: simultaneous contrast means whatever touches a sample changes how
it reads.

**`radius.swatch: 0`** — an inviolable rule, sitting inside an otherwise generous radius scale.

**`chromaCeiling`** — surfaces and text may not exceed chroma 0.01 without a recorded
exception. The interface is near-achromatic *by rule*, so the garment colour is the only
chroma competing for the eye.

**`cvdPairs`** — semantic pairs asserted distinguishable under simulated CVD at severity 1.0.
The product's own interface is held to the standard it applies to outfits. **The first time
that was measured, in F-003, five of eighteen combinations failed** and the status values
changed as a result ([ADR-0044](../adr/0044-status-tokens-corrected-and-status-colour-is-text.md)).

**`usage`** — every colour token declares whether it is `text`, `largeText`, `nonText` or a
`surface`, because a contrast gate cannot pick a WCAG minimum without knowing which it is
looking at. The default is the strictest, so an omission fails safe. For `status.*` the value
is `text`, and that single classification — not the lightness values — is the decision
ADR-0044 is really about.

**`compositeOver`** — a translucent token names **every** ground it may sit on, and the gate
judges it on the worst. Naming one ground lets a check pass a black hairline on white while
it is invisible on a meter track.

**`foreground.3` is `usage: "largeText"`** — it fails AA against every surface at small sizes,
so micro-labels use `foreground.2`. Until F-003 this restriction was *claimed* to be gate-
enforced while `foreground.3` appeared in no `pairsWith` list, so nothing checked it at all.
It is now declared on the three surfaces that carry secondary text and checked at 3:1, and the
generated TypeScript emits `TEXT_TOKENS` and `LARGE_TEXT_TOKENS` **derived from the manifest's
own `usage` field**, with `TextToken` and `LargeTextToken` as literal unions of those names —
so `foreground.3` is not assignable where a `TextToken` is expected, structurally rather than
by declaration. (The first attempt used phantom brands that nothing produced and nothing
applied, so this sentence was false for as long as it stood. The F-003 evaluation caught it.)
The remaining half — catching a 13 px label that uses it — needs components and lands with
F-017.

**Greyscale `chart.1…5`** — series are separated by lightness, marker shape and a direct
label. A hue-coded chart would put five competing colours beside a sample the user is trying
to read, and hue-coding is also the encoding that fails under CVD. The accessible answer and
the correct-perception answer are the same answer.

---

## Component contract

Every component in `@irodora/ui` must:

1. Consume tokens. No literal values.
2. Define all states: default · hover · **focus-visible** · active · disabled · loading ·
   error · empty.
3. Take behaviour from a headless primitive (Radix or Base UI — decided before F-017) rather
   than reimplementing focus management, keyboard handling or ARIA.
4. Work in both themes and both locales.
5. Ship with axe assertions in its tests.
6. **Never rely on colour alone** to convey state.

### Colour components carry two more

7. **Never render a colour without its provenance.** The type system enforces it
   ([ADR-0005](../adr/0005-measurement-provenance-is-a-type.md)).
8. **Never place a decorative colour adjacent to a sample.** The `swatch.well` is mandatory.

---

## Verification

| Gate | Checks |
|---|---|
| `contrast` | Every `pairsWith` combination at the AA minimum its `usage` selects, **both themes**; APCA reported, never substituted; every `srgb` recomputed from its own OKLCh (ADR-0043); `chromaCeiling` on **every** token, exceptions recorded in the manifest. **The scan for colour-only status is NOT implemented** — it needs rendered components and lands with F-017; the gate says so on every run |
| `a11y` | axe WCAG 2.2 A/AA on every route, zero violations |
| `cvd` | `cvdPairs` separable at severity 1.0 |
| `web-perf` | First-load JS per route; LCP; CLS |
| `lint` | No raw colour literals; no hard-coded user-facing strings; no arbitrary z-index |

---

## Still open

- **Primitives:** Radix or Base UI. Base UI is the Radix / MUI Base / Floating UI convergence
  and is what coss.com/ui is built on. Settle before F-017.
- **Perceptual Atlas arrangement** — colours positioned by hue and lightness rather than in
  rows. Possibly the most distinctive thing on the site, possibly an unnavigable novelty.
  Needs a prototype.
- **Default theme on first visit** — dark is the primary design; light is the harder case.
- **The mark** — in-product, or app icon only.
- **Fonts:** Geist and Geist Mono are intended. Licensing and self-hosting to confirm; the
  fallback stack is in the manifest.
