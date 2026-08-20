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

**No status colour beside a sample** — the same physics, one step out. A saturated `status.*`
token adjacent to a colour sample changes how that sample reads, and the person is looking at
the sample in order to decide something about it. A red "poor quality" chip beside a green
fabric makes the fabric look different from the same fabric beside a grey one.

The rule is narrow so that it survives: **siblings**, and `swatch.well` on their shared parent
is the escape — if the sample is already in its well, the status colour is not touching it. A
rule that flagged a status chip in a header and a sample three screens down would be switched
off within a week, which is worse than no rule.

**Every component involved can be individually correct while the composition is wrong**, which
is why this is checked over the rendered tree (`checkStatusAdjacency`, F-069) rather than by a
token pairing. No `pairsWith` can express it: the other side of the adjacency is an arbitrary
garment colour.

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
2. Define every state its **kind** requires — `interactive` (default · focus · active ·
   disabled · loading), `data` (default · loading · error · empty), `static` (default).
   The kind is the only lever: a component cannot shorten its own list. There is no
   `hover` on a touch surface, and the conformance suite asserts that two declared states
   **render differently**, because a state that returns an identical tree exists in name only.
3. Take behaviour from **React Native's own primitives** — `Pressable`, `Text`, `Modal`,
   `FlatList` ([ADR-0054](../adr/0054-react-native-core-primitives-and-ui-stays-a-package.md)).
   There is no headless library: ADR-0033's argument was ARIA and focus management, and on
   React Native the accessibility tree *is* the platform's.
4. Work in both themes and both locales.
5. Be registered in the conformance registry, or rendered by something that is —
   `scripts/a11y-scope.mjs` fails on a component reachable from neither.
6. **Never rely on colour alone** to convey state.

### Colour components carry two more

7. **Never render a colour without its provenance.** The type system enforces it
   ([ADR-0005](../adr/0005-measurement-provenance-is-a-type.md)).
8. **Never place a decorative colour adjacent to a sample.** The `swatch.well` is mandatory.

---

## Verification

| Gate | Checks |
|---|---|
| `contrast` | Every `pairsWith` combination at the AA minimum its `usage` selects, **both themes**; APCA reported, never substituted; every `srgb` recomputed from its own OKLCh (ADR-0043); `chromaCeiling` on **every** token, exceptions recorded in the manifest. The **rendered** half landed in F-017: every colour a component paints must resolve to a token — an unresolvable one is a failure, never a skip — and a `largeText`-only token used below the size floor is reported. Each half prints which one it is, because neither can do the other's job |
| `a11y` | WCAG 2.2 A/AA over the rendered **accessibility tree**, every component and every screen, zero violations. Not axe — there is no DOM ([ADR-0055](../adr/0055-the-a11y-gate-renders-under-jest-expo-and-proves-the-tree-not-the-pixels.md)). It proves the tree, **not the pixels**: clipping at 200 %, overflow and measured tap-target size stay attested |
| `cvd` | `cvdPairs` separable at severity 1.0 |
| ~~`web-perf`~~ | Retired with the web surface ([ADR-0051](../adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)). It was still listed here, and still named in F-017 and F-038, nine months after the gate stopped existing — see F-074 |
| `lint` | No raw colour literals; no hard-coded user-facing strings; no arbitrary z-index |

---

## Still open

- ~~**Primitives**~~ — settled: React Native's own
  ([ADR-0054](../adr/0054-react-native-core-primitives-and-ui-stays-a-package.md)).
- **Perceptual Atlas arrangement** — colours positioned by hue and lightness rather than in
  rows. Possibly the most distinctive thing on the site, possibly an unnavigable novelty.
  Needs a prototype.
- ~~**Default theme on first visit**~~ — settled: the manifest's `defaultTheme` (`dark`),
  applied when the platform expresses **no preference**. `unspecified` counts as no
  preference; a stated `light` is honoured. It had been decided three ways at once —
  a fallback in a screen, `dark` in the manifest, and "open" here.
- **The mark** — in-product, or app icon only.
- **Fonts:** the Japanese face is a bundled Noto Sans JP subset generated from the corpus
  ([ADR-0057](../adr/0057-the-japanese-face-is-a-bundled-noto-sans-jp-subset-generated-from-the-corpus.md));
  **F-076** carries the asset. Latin is the platform face — Geist was "intended, licensing to
  confirm" and nobody confirmed it, and Latin has no tofu failure mode, so the script that can
  fail silently gets the bundled font and the script that cannot, does not.
  **The manifest's `families` are CSS stacks and React Native has no fallback cascade**, so
  the RN target deliberately emits no family name until the asset exists — naming a face the
  bundle does not carry fails over to the system font silently.
