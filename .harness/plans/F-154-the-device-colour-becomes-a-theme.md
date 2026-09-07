# Plan: F-154 — The device colour becomes a theme, and the gate runs at runtime

|                       |                                                             |
| --------------------- | ----------------------------------------------------------- |
| **Feature**           | F-154 — [`feature_list.json`](../state/feature_list.json)    |
| **Requirements**      | FR-70, NFR-8, NFR-9                                          |
| **Service / package** | `packages/design-tokens` · `apps/mobile`                     |
| **Author**            | Claude Code (generator)                                      |
| **Date**              | 2026-09-07                                                   |

---

## Intent

The Material You half of the request, and the half F-153 deliberately left: a theme whose seed is
unknown until runtime **cannot be verified at build time**, so the contrast and CVD checks have to
run on the device against the derived values.

That is only possible because the engine has no runtime dependencies, no platform APIs, and
returns bit-identical values everywhere (NFR-3). **The property that exists for colour correctness
turns out to be what makes a provably accessible dynamic theme possible** — and this feature is
where that stops being a nice sentence in the architecture and becomes a function somebody calls.

## What can be built here, and what cannot

**Nothing in this repository can read a platform accent.** Android exposes the dynamic palette
from API 31; no dependency in `apps/mobile` surfaces it, and React Native's `PlatformColor`
returns an opaque token that resolves natively — JS never sees its channels. Reading it needs a
native module, an EAS build, and a device.

So criterion 1 is **attested**, and everything downstream of the seed is built and proven:

| | |
| --- | --- |
| **Dischargeable now** | the derivation from an arbitrary seed · the checks running over the derived values, in-process · the correction policy and its bounds · the refusal and its reason · the absent state · a sweep over every hue |
| **Attested, not done** | reading the accent off a device |

Inventing a seed and calling it the device colour would be worse than saying this.

## Approach

### 1. The gate checkers take a theme list

`checkContrast` and `checkSeparation` iterate `THEMES`. A runtime check needs them over **one**
derived theme, so both gain a `themes` parameter defaulting to what they use now.

That is the whole reuse strategy, and it is the point: **the device runs the same code the gate
runs**, not a second implementation that agrees with it until it does not.

### 2. The derivation has one home

F-153's rule — L unchanged, hue from the seed, chroma capped at the manifest's ceiling and fitted
to the gamut — is currently private to `parseManifest`. It becomes exported, so a build-time theme
and a runtime theme are derived by the same function rather than by two that resemble each other.

### 3. Correction within stated bounds, and what the bounds are

Chroma is the only lever that preserves lightness and hue, so a correction is a chroma reduction,
reported per token with what it was and why. **Two bounds, both stated:** the manifest's chroma
ceiling, and the sRGB gamut at that token's own lightness.

The second is the common one and it is worth being concrete: at L 0.99 the gamut is a sliver, so
almost every seed is corrected somewhere. A correction is normal; silence about it would not be.

### 4. Refusal, and the honest shape of it

**A seed with no chroma has no hue to take.** A greyscale wallpaper is a real thing, and the
answer is a refusal with that reason and the base theme unchanged — not a fabricated hue.

A seed outside sRGB, or carrying a non-finite number, is refused for the same reason.

**What cannot currently fail is the contrast check itself**, and this plan says so rather than
manufacturing a case: the derivation preserves lightness exactly and caps chroma at 0.01, so a
derived theme differs from one the gate already passed by less than the check can resolve. The
check still runs — it is cheap, it is the same code, and *"it cannot fail today"* is a statement
about today's derivation rule rather than a licence to stop asking.

### 5. The seed is a port, and its absence is a designed state

`SeedSource` returns a seed or `null`. iOS returns `null` and always will — Apple exposes no user
accent — so the answer there is F-153's preloaded set, said in words rather than by a theme that
silently does not change.

## Files to touch

```
packages/design-tokens/src/check.ts    — a themes parameter
packages/design-tokens/src/manifest.ts — export the derivation
packages/design-tokens/src/seed.ts     — new: derive, check, correct, refuse
packages/design-tokens/test/seed.test.ts — the hue sweep and both outcomes
packages/ui/src/theme.tsx              — a seeded theme reaches the provider
apps/mobile/src/appearance.tsx         — the port and the absent state
apps/mobile/src/screens/Preferences.tsx — the choice, and what it says when absent
apps/mobile/src/i18n/{en,ja}.ts        — its copy
```

## Anticipated effects

- **`checkContrast` / `checkSeparation` gain a parameter** ⇒ every caller, all of which pass
  nothing today. Default preserves behaviour; the gates are the proof.
- **A ninth theme name at runtime** ⇒ `Theme` is a literal union, so the seeded palette needs a
  name in it, and everything that iterates `THEMES` will see it — including the gates, which
  cannot check a palette that does not exist until runtime. That is the interesting seam and the
  plan is to keep it **outside** `THEMES`: the runtime theme is a `ThemeColors` value, not a
  member of the build-time list.
- **The store** ⇒ the appearance string gains a family that means "the device colour", and
  `parseAppearance` is already total.

## Test plan

- **Every hue, 0–359**, derived and checked: each one either applies or is refused, with a reason,
  and never applies unchecked. Asserted as a sweep rather than three sampled hues.
- **The corrections are real**: at least one token is corrected for a seed whose hue has a tight
  gamut at high lightness, and the report names the token and the bound.
- **The refusals are reachable**: an achromatic seed, a seed outside sRGB, a non-finite seed.
- **L is preserved exactly** in every derived runtime theme — the same assertion F-153 makes of
  the build-time ones, because it is the same rule and this is where a second copy would drift.
- **The checks are the gate's own**: asserted by running them over a built-in theme through the
  runtime path and getting the same answer the gate gets.
- **Absence is a state**: the provider with a `null` seed renders the chosen family, not a crash
  and not a silent base.

## Risks and open questions

- **The correction could be perceptually wrong even when it passes.** Reducing chroma to fit the
  gamut at L 0.99 leaves a background nearly neutral while a darker surface keeps its tint — which
  is defensible and is what the base palette already does, but nobody has looked at it.
- **Criterion 1 stays open indefinitely** unless somebody adds a native module. Worth stating: the
  rest of this feature is useful without it, because the same machinery is what a future
  wallpaper-derived or photograph-derived seed would use.

## Out of scope

- Writing the native module, or adding a dependency to read the accent.
- Any change to the build-time themes. F-153 shipped them; this reuses their rule.
- A seed from a photograph or from the Lens. The engine would support it; the feature asked for
  the platform's colour.
