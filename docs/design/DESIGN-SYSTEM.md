# Irodora — Design System

| | |
|---|---|
| **Status** | **Architecture defined; concrete values pending design approval.** |
| **Source of truth** | [`design-system.manifest.json`](design-system.manifest.json) |
| **Decisions** | [ADR-0020](../adr/0020-design-tokens-are-oklch-native.md) · [ADR-0021](../adr/0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md) |

This document defines **how tokens work**. The values arrive from
[`DESIGN-BRIEF.md`](DESIGN-BRIEF.md) after design approval and are filled into the
manifest, not into prose here.

---

## 1. The manifest is the source of truth

```
design-system.manifest.json
   │
   ├─→ CSS custom properties     (with @supports P3 upgrade)
   ├─→ TypeScript constants      (@irodora/design-tokens)
   ├─→ React Native styles
   └─→ Tailwind v4 theme
```

Four targets, one source. A token that exists in CSS but not in React Native is a
divergence between web and mobile, and there is no mechanism for one to appear.

**The `contrast` gate reads this file.** A token change that breaks a declared pairing
fails the build ([ADR-0021](../adr/0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md)).

---

## 2. Colour tokens

Authored in OKLCh. Every token carries its components, an sRGB fallback, a semantic role,
and the pairings it is intended to be used in:

```jsonc
{
  "surface.base": {
    "oklch": { "l": 0.98, "c": 0.004, "h": 85 },
    "srgb": "#FAF9F7",
    "role": "The page. Warm off-white, near-neutral by design.",
    "pairsWith": ["text.primary", "text.secondary", "border.subtle"]
  }
}
```

`pairsWith` is what makes the contrast gate possible: it declares the combinations that
must hold, so the gate checks the pairings that actually occur rather than the cartesian
product of every token.

### Semantic layers

| Layer | Purpose |
|---|---|
| `surface.*` | Page, raised, sunken, overlay |
| `text.*` | Primary, secondary, tertiary, inverse, link |
| `border.*` | Subtle, default, strong, focus |
| `accent.*` | The single restrained accent, and its states |
| `status.*` | Success, warning, error, info — **each with a required icon token** |
| `swatch.*` | Chrome *around* colour samples: border, separator, checkerboard |

**`swatch.*` exists as its own layer for a reason.** The chrome surrounding a colour under
examination is the most perceptually sensitive surface in the product, and it must be
governable independently of general UI surfaces — including a stricter neutrality
requirement.

### The rules

1. **No raw colour literals in application code.** Lint-enforced. A hex in a component is a
   token that was never defined.
2. **Every `status.*` token pairs with an icon token.** A status expressible only as colour
   violates NFR-9, and pairing them in the token layer makes the violation impossible
   rather than merely discouraged.
3. **Scales are generated** from hue, a chroma curve and lightness steps. Overrides are
   permitted but must carry a recorded reason.
4. **Dark theme is derived** by transforming `L` while preserving `C` and `H`, with
   recorded exceptions.
5. **Interface colour is near-neutral.** Chroma above a defined ceiling requires
   justification — the interface must not compete with the subject.

---

## 3. Other token families

| Family | Basis |
|---|---|
| **Spacing** | A single base unit; a small scale. 間 (*ma*) means the larger steps get used more than in a typical product |
| **Type** | Modest ratio. **Tabular numerals everywhere.** Separate line-height scale for Japanese, which needs more leading than Latin at the same size |
| **Radius** | Restrained. **`radius.swatch` is 0** — a rounded swatch changes the perceived area and therefore the perceived colour |
| **Border** | Hairline default. Swatch borders are their own token |
| **Motion** | Short durations, few easings. Every duration collapses to 0 under `prefers-reduced-motion` |
| **Elevation** | Borders and surface changes, **not shadows**, anywhere near a swatch |
| **Z-index** | A named, enumerated scale. No arbitrary numbers |

---

## 4. Component contract

Every component in `@irodora/ui` must:

1. Consume tokens. No literal values.
2. Define all states: default · hover · **focus-visible** · active · disabled · loading ·
   error · empty.
3. Have an accessible name, correct role, and correct keyboard behaviour — inherited from
   Radix primitives where one exists, rather than reimplemented.
4. Work in both themes and both locales.
5. Ship with axe assertions in its tests.
6. **Never rely on colour alone** to convey state.

### Colour components carry two additional obligations

7. **Never render a colour without its provenance.** The type system enforces this
   ([ADR-0005](../adr/0005-measurement-provenance-is-a-type.md)) — a component that takes a
   `Color` necessarily has its provenance and must show it.
8. **Never place a decorative colour adjacent to a sample.** A neutral separator is
   mandatory. Simultaneous contrast is not a subtlety here; it is the difference between a
   correct and an incorrect reading.

---

## 5. Verification

| Gate | Checks |
|---|---|
| `contrast` | Every `pairsWith` combination meets WCAG 2.2 AA; APCA Lc reported; a scan for colour-only status indicators |
| `a11y` | axe WCAG 2.2 A/AA on every route, zero violations |
| `cvd` | Semantic pairs that must stay distinguishable — success/error, selected/unselected — remain separable under protan, deutan and tritan simulation |
| `web-perf` | First-load JS budget per route; LCP and CLS |
| `lint` | No raw colour literals; no arbitrary z-index; no hard-coded user-facing strings |

**The token set is subject to the same CVD standard the product applies to outfits.** An
interface that fails its own accessibility engine would be an argument against the product.

---

## 6. Pending design approval

Everything below arrives from the design deliverable and is written into the manifest:

- [ ] Concrete OKLCh values for every semantic token, both themes
- [ ] Type families, scale and the Japanese line-height scale
- [ ] Spacing base and scale
- [ ] Radius, border and motion values
- [ ] The `pairsWith` declarations the contrast gate will enforce
- [ ] Icon set and the `status.*` icon pairings
- [ ] The mark and wordmark

Until then `design-system.manifest.json` holds the **schema and the structure** — enough
for the gate and the build pipeline to exist and be tested with placeholder values, and
not enough to pretend a design decision has been made.
