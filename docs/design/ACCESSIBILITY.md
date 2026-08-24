# Accessibility

| | |
|---|---|
| **Status** | Binding |
| **Implements** | NFR-8, NFR-9, NFR-10, FR-4, FR-5, FR-35 |
| **Decisions** | [ADR-0009](../adr/0009-cvd-is-an-engine-concern-not-a-ui-filter.md) · [ADR-0021](../adr/0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md) |

---

## 1. Why this is different here

Most products treat accessibility as compliance. For Irodora it is a **primary use case**.
A person with colour-vision deficiency is one of the six personas the product is built for
(PRD §3), and "can everyone tell these apart?" is one of the six core journeys.

That has a specific consequence: an inaccessible Irodora is not a product with a defect.
It is an argument that we do not believe our own thesis.

---

## 2. Commitments

| # | Commitment | Enforced by |
|---|---|---|
| **A1** | WCAG 2.2 **AA** on every component and every screen | `a11y` gate — zero violations over the rendered accessibility tree. Not axe: there is no DOM ([ADR-0055](../adr/0055-the-a11y-gate-renders-under-jest-expo-and-proves-the-tree-not-the-pixels.md)) |
| **A2** | Colour is **never** the sole channel for any meaning | `contrast` gate + token structure |
| **A3** | Every colour swatch has an accessible name **and** its numeric value | Component contract + axe |
| **A4** | Every journey completes **without touch precision** — VoiceOver and TalkBack gestures, Switch Control, and an external keyboard where the platform supports one | `e2e` on a device. **Rewritten in F-017:** "by keyboard alone" is unsatisfiable on a phone, and an unsatisfiable commitment gets quietly dropped rather than met |
| **A5** | Every journey completes under simulated CVD | `e2e` with CVD simulation |
| **A6** | Reduced motion fully honoured; every duration collapses to 0. On a device that is `AccessibilityInfo.isReduceMotionEnabled`, not a CSS media query | Token layer |
| **A7** | Dynamic Type and text scaling to 200 % without loss of content or function | `e2e` |
| **A8** | Screen readers: VoiceOver and TalkBack verified per release. NVDA is a Windows screen reader and there is no Windows surface | Release checklist |
| **A9** | Accessibility features are **never** behind a paywall | [ADR-0027](../adr/0027-monetisation-tiers.md) |
| **A10** | Real CVD users test the product before every major release | Release checklist |
| **A11** | **Structure is announced.** A heading carries the heading role, so a screen reader can navigate by it rather than reading a screen top to bottom | Component contract + the conformance suite, which asserts the role on the **rendered node** rather than trusting the prop was passed. Whether it is spoken as one is a device attestation (A8) |

**A11 arrived in F-088**, from comparing our `Text` with HeroUI's. Ours had no heading role
at all, so every screen announced as a flat run of text — a structural gap that no contrast or
colour check could ever have surfaced, and that a sighted developer never encounters. Recorded
here rather than only in the component, because the commitment is the product's, not the
component's.

**AA and not AAA.** AAA contrast (7:1) would make the muted, low-contrast Japanese
aesthetic the product is built around unexpressible. We meet AA everywhere and exceed it
where it costs nothing — rather than claiming AAA and quietly excepting the surfaces where
it was inconvenient. That distinction is the honest one.

---

## 3. Colour-vision deficiency

### It is engine, not display

CVD simulation lives in `@irodora/cvd-engine` and feeds recommendation scoring
([ADR-0009](../adr/0009-cvd-is-an-engine-concern-not-a-ui-filter.md)). A person choosing
trousers does not want to see what their outfit looks like to someone else. They want to
know whether it *works*, and if not, what to wear instead.

### Supported

| | |
|---|---|
| Dichromacy | Protanopia, deuteranopia, tritanopia (Brettel–Viénot) |
| Anomalous trichromacy | Protanomaly, deuteranomaly, tritanomaly at severity 0…1 (Machado) |
| Also | Achromatopsia, greyscale preview, high-contrast mode |

### In the product

- **Separation score** on every recommendation (FR-5), from the same definition the UI uses.
- **CVD outfit mode** flags reduced separation and proposes alternatives with the measured
  improvement (FR-35).
- **Simulation preview** — original beside each deficiency, labelled with text.
- **Audio colour naming** — a colour can be spoken.
- **Haptic confirmation** on selection, mobile.

### In our own interface

The token set is held to the same standard: `cvdPairs` in
[`design-system.manifest.json`](design-system.manifest.json) declares the semantic pairs
that must remain distinguishable, and the `cvd` gate asserts them. Success and error must
be separable at severity 1.0 for every deficiency type.

**That assertion first ran in F-003, and the approved palette failed it** — five of the
eighteen theme × pair × deficiency combinations were below the declared minimum of 60, the
worst at 44.4. The status values changed
([ADR-0044](../adr/0044-status-tokens-corrected-and-status-colour-is-text.md)). It is
recorded here because the sentence above was true as an intention for a year before anything
measured it, and the gap between the two is the thing this document exists to close.

The score is `separationScore` from `@irodora/cvd-engine` — literally the same function the
recommendation engine ranks with (E-005). "Held to the standard the product applies to
outfits" is only true if it is the same function, not the same idea.

---

## 4. Never colour alone (A2)

The rule is total. Every meaning carried by colour is also carried by at least one of:
text, icon, shape, pattern, or position.

| Instead of | Do |
|---|---|
| A red border for an invalid field | Red border **+ an error icon + the error text** |
| Green and red status dots | Dots **+ icons + labels** |
| A colour-coded score | Score **+ numeric value + label** |
| A highlighted selected row | Highlight **+ a checkmark + `aria-selected`** |
| Colour-coded chart series | Colours **+ direct labels + distinct markers** |

Enforced structurally: every `status.*` token pairs with an icon token in the manifest
(§Status), so a status expressible only as colour cannot be constructed.

---

## 5. Colour swatches specifically (A3)

A swatch is the product's atom and the place accessibility most easily fails. Every swatch,
at every size, carries:

- an **accessible name** — the colour's name, not "swatch" or "colour";
- its **numeric value** — visible, or available to assistive technology;
- its **provenance** — source class and confidence
  ([ADR-0005](../adr/0005-measurement-provenance-is-a-type.md));
- a **defined border**, so its edges are perceptible against any surface;
- a **neutral separator** from any adjacent coloured element.

```html
<div role="img"
     aria-label="Ai-nezumi, muted indigo-grey. Hex 526A6B. Estimated, 81 percent confidence.">
```

A swatch without a name is an empty box to a screen reader and to a CVD user. It is the
single most common accessibility failure in colour tooling, and it is trivially avoidable.

---

## 6. The Lens

The hardest surface, and it must work for everyone:

- **Keyboard**: arrow keys move the sampling target; Enter samples; a manual coordinate
  entry is always available.
- **Screen reader**: the colour under the crosshair is announced, throttled so it is
  useful rather than a stream. Confidence and lighting condition are announced with it.
- **Motor**: a large target area, no required precision gesture, no time limit.
- **Photosensitivity**: no flashing, no rapid luminance change from the live preview.
- **Audio naming**: the result can be spoken on demand.

---

## 7. Testing

**Automated, every build:** the accessibility tree of every component and screen (`a11y` gate) · token and surface contrast
(`contrast` gate) · CVD separation of semantic pairs (`cvd` gate) · keyboard journey
completion (`e2e`) · simulated-CVD journey completion (`e2e`).

**Manual, every release:** VoiceOver (iOS, macOS) · TalkBack (Android) · NVDA (Windows) ·
keyboard-only · 200 % text · reduced motion · high contrast.

**Every major release:** testing with real CVD users, and with real screen-reader users.

> Automated tools catch roughly half of real accessibility problems and none of the ones
> about whether someone can actually complete the task. The gates are the floor, not the
> ceiling.

---

## 8. Feedback

Accessibility issues go to **accessibility@irodora.com** and are triaged as defects with
the same severity as functional bugs — because that is what they are.
