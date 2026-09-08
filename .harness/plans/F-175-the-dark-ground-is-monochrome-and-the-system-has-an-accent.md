# Plan: F-175 — The dark ground is monochrome, and the system has an accent

| | |
|---|---|
| **Feature** | F-175 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-70, NFR-8, NFR-9, NFR-25 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/design-tokens` · `@irodora/ui` · `apps/mobile` |
| **Author** | Claude Opus 5 |
| **Date** | 2026-09-08 |

---

## Intent

Two things a person will see. **The dark themes stop being near-black** — the ground lifts
from `#090807` to `#12100F`, which is the monochrome the report asked for, keeping the warm
trace the system already carries. And **the product gets an accent**, which it has never had:
`link` is currently defined as the same value as `foreground`, so every emphasis in the app is
made of weight and grey.

Done, to a user, is: the dark app reads as charcoal rather than as a hole; the primary button
and the active tab are gold; and nothing next to a colour sample changed.

This blocks the rest of R7. Every surface feature after it spends the accent, and tuning
components against a palette that is about to move is the ordering mistake F-152 and F-161
both recorded against themselves.

## Approach

**Reused:** everything. `oklchToRgb`, `isInGamut`, `derivedSrgb`, `resolveAll` from
`derive.ts`; `checkContrast`, `checkSeparation`, `checkChromaCeiling`, `checkSalience` from
`check.ts`; `wcagContrast`/`apcaLc` from `@irodora/color-difference`; `separationScore` from
`@irodora/cvd-engine`. **No colour maths is written in this feature.** The values below were
found by scanning OKLCh with those exact functions, so a value that clears here clears the
gate for the same reason rather than for a parallel one.

**New:** three tokens per theme, and nothing else — `accent`, `accent.foreground`,
`accent.muted`.

### The dark ramp

**CORRECTED DURING IMPLEMENTATION, BY THE GATE.** The plan said "every ground moves by exactly
+0.040 L, so every existing relationship is preserved". That is wrong, and gate 9 said so within
one run: `swatch.well` is a **ground**, so lifting it does not lift what sits on it — it eats
the contrast of everything that does. At 0.325 it put `border.strong` at 2.88:1 and
`status.ok` at 4.39:1, both below their floors. Measuring the well against every token that
declares a pairing with it gives a hard ceiling at **L 0.310**.

So the ramp **compresses**: the floor rises by 0.040 where the report was about, and the lift
tapers to 0.005 at the top, where there is no room. Hue and chroma are untouched everywhere.

| token | L before | L after | before | after |
|---|---|---|---|---|
| `background` | 0.135 | **0.175** | `#090807` | `#12100F` |
| `surface.1` | 0.175 | **0.210** | `#12100F` | `#191816` |
| `surface.2` | 0.212 | **0.240** | `#1A1817` | `#201F1D` |
| `surface.3` | 0.248 | **0.265** | `#22211F` | `#262523` |
| `swatch.well` | 0.285 | **0.290** | `#2B2A28` | `#2D2B29` |
| `inverse.foreground` | 0.150 | **0.190** | `#0C0B09` | `#151312` |

`swatch.well` still moves rather than staying put, because it sits above `surface.3` and
leaving it behind would put the well *below* the surface it is drawn on — a sample on a level-3
card would lose its ground. It moves by 0.005 instead of 0.040, and the elevation steps go from
40/37/36/37 to 35/30/25/25. **The ramp is measurably less separated at the top than it was**,
which is the cost of raising the floor and is recorded in ADR-0099 rather than absorbed. `swatch.hairline` and
`swatch.hairline.inverse` **do not move**: F-068 proved the two-tone keyline against those
exact tones by scanning the sRGB gamut, and moving a value a proof was run against invalidates
the proof rather than the value.

Nothing else in either palette changes. The status colours, the charts, the foregrounds, the
ring and both hairlines keep the values ADR-0044, ADR-0053 and ADR-0098 approved.

### The accent

| | dark | light |
|---|---|---|
| `accent` | L 0.920 · C 0.110 · h 92 → `#FFE38D` | L 0.385 · C 0.079 · h 98 → `#4F4301` |
| `accent.foreground` | L 0.175 · C 0.004 · h 70 → `#12100F` | L 0.985 · C 0.004 · h 85 → `#FBFAF7` |
| `accent.muted` | L 0.270 · C 0.030 · h 92 → `#2C2615` | L 0.930 · C 0.025 · h 98 → `#ECE8D6` |

Every hex above is what `derivedSrgb` produces from the OKLCh beside it. None is typed by
hand — ADR-0043 makes a hand-edited hex a gate failure, and these were read out of the engine.

**Measured, not asserted.** `accent` against the four grounds it declares:

| | background | surface.1 | surface.2 | surface.3 |
|---|---|---|---|---|
| dark | 14.99:1 | 14.01:1 | 13.01:1 | 12.10:1 |
| light | 9.50:1 | 9.78:1 | 9.02:1 | 8.45:1 |

(The dark row is measured against the COMPRESSED ramp above, so it reads higher than the
numbers this plan first carried — those were taken against the +0.040 grounds that gate 9
refused.)

`accent.foreground` on `accent`: **14.99:1** dark, **9.37:1** light. `foreground` and
`foreground.2` on `accent.muted`: 13.73 / 5.96 dark, 14.92 / 5.57 light. Every one clears the
4.5 text floor.

### Why the light accent is olive-gold and not gold

**On a light theme, "golden yellow" and "warning amber" are the same region of colour space,
and that is a measurement rather than an opinion.** An accent that clears 4.5:1 on white must
be dark; a dark gold is a bronze; and `status.warn` light is a bronze at h 70 (`#905B06`). The
first candidate this feature drew — `#845A00` — measured **ΔE00 5.6** from it. Not "similar":
the same colour.

Scanning the space for an accent that clears contrast on all four grounds *and* stays ΔE00 ≥ 18
from every signal and both foregrounds leaves 202 candidates on light, all of them at h 98–105
and L 0.38–0.41. The chosen value is the warmest of them. On dark there is no such squeeze —
gold sits at L 0.92, far above every signal, with 23.1 ΔE00 of clearance from `status.warn`.

Alternatives taken seriously, for the ADR: move `status.warn` off h 70 (rejected — its values
are approved by a person against ADR-0098 measurements, and moving a signal to make room for
decoration is the wrong way round); give light no accent at all (rejected — the report asked
for both themes); accept ΔE00 ≈ 6 (rejected — that is one colour with two meanings).

### Why the accent joins `NEUTRAL_IN_EVERY_THEME`

Forced, not chosen. `deriveTheme` clamps every tinted token to the chroma ceiling of 0.01, so
an accent left tintable would be **flattened to grey in all four derived theme families** — the
gold would exist only in `base`. Listing it alongside `ring` keeps one accent across all eight
palettes, which is also the right reading: a theme tints the chrome, and the accent is a
signal. A signal that changes colour with the decoration has to be relearned.

### Where it is spent, so it is not an unreached token

- `accent` and `accent.foreground` → the **primary button**, which currently fills with
  `inverse` and labels with `inverse.foreground`. The manifest must declare the pairing or the
  contrast gate fails, and `Button.tsx` already says so in a comment.
- `accent` → the **active tab**, replacing `foreground` on the indicator and the glyph. The
  three NFR-9 channels are unchanged: the indicator is still drawn, the token still differs
  from the inactive one, and `accessibilityState.selected` is still set.
- `accent.muted` → **exempted, `closedBy: F-176`**, which is the selection treatment that will
  fill with it. This is what ADR-0088 prescribes an exemption for, and it expires next feature.

**Increments**, each leaving the build green:

1. Manifest: lift the dark ramp. Run contrast + cvd. Nothing else touched.
2. Manifest: add the three tokens, their pairings, their chroma exceptions and the neutral
   list entry. Regenerate. Run contrast + cvd.
3. `Button.tsx`: primary fills with the accent.
4. `app/(tabs)/_layout.tsx`: the active tab carries the accent.
5. ADR, exemption record, `valuesChangedSinceApproval`.

## Files to touch

```
docs/design/design-system.manifest.json        — the ramp, three tokens, exceptions, pairings
packages/design-tokens/src/manifest.ts         — NEUTRAL_IN_EVERY_THEME gains the three
packages/design-tokens/src/generated/*.ts      — regenerated, never hand-edited
packages/design-tokens/generated/*.css         — regenerated
packages/ui/src/Button.tsx                     — primary is accent-filled
apps/mobile/app/(tabs)/_layout.tsx             — active tab carries the accent
docs/design/DESIGN-SYSTEM.md                   — the accent is documented
docs/adr/0099-…                                — the decision and its measured cost
.harness/state/off-scale-*.json (exemptions)   — accent.muted, closedBy F-176
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| dark ramp lifts | all four dark theme families, the runtime seeded theme, every screen | gate 9 (contrast) over the **derived** values, gate 10 (cvd) |
| `swatch.well` lifts | every colour sample in the product | `swatch-edge.test.ts` — the keyline proof, unchanged tones, new ground |
| three new tokens | `nativeColors` type, `ThemeColors`, the conformance registry | `emit.test.ts` byte-compare, gate 8 token-reach |
| primary button repaints | every screen with a primary action | gate 9, gate 8 (a11y), conformance suite |
| active tab repaints | the tab bar test asserting three channels | `tab-icons.test.tsx` |

E-007 is the existing effect for the token pipeline; this extends it rather than adding one.
The effect note and `effects.json` are updated at trace time, not now.

## Test plan

- **Unit:** the three tokens parse, derive to the stated hexes, and appear in every theme.
- **Golden:** none new. No colour maths changes; the datasets are untouched.
- **Contrast (gate 9):** every declared pairing in all eight palettes, blocking.
- **CVD (gate 10):** `cvdPairs` unchanged and still passing on the lifted ramp.
- **Conformance:** every component re-rendered in both themes; the button in both variants.
- **Negative, with a decoy:** revert one dark ground to its old L and assert gate 9 still
  passes (it must — the old values passed too), then set `accent` to a value that fails on
  `surface.3` and assert gate 9 goes red. A negative test whose fixture cannot fail proves
  nothing.
- **Reach:** `verify-token-reach` must find `accent` and `accent.foreground` painted, and must
  accept `accent.muted` **only** through its exemption — checked by deleting the exemption and
  watching the gate fail.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
pnpm test:contrast && pnpm test:cvd && pnpm test:a11y
pnpm build
```

`color-golden` and `content` are **not** run: no colour maths and no corpus record changes.
That is stated here so the report can say which gates ran and which did not, rather than
implying all of them did.

## Risks and open questions

- **Nobody has looked at it.** The arithmetic is proven and the perception is not — the same
  attestation F-161 and F-165 both still owe. A palette that measures correctly and reads
  badly is the failure mode this repository has hit twice. The dark gold and the light
  olive-gold both need a human eye before the release, and that is recorded as an attested
  criterion rather than assumed.
- **`border.strong` on `surface.3` drops from 3.51:1 to 3.29:1.** Still above its 3.0 floor,
  but the margin is thinner. Recorded because a later lift of the same ramp would break it.
- **The light accent is not the gold that was asked for.** It is the closest colour to it that
  is not the warning colour. If that trade is wrong, the alternative is moving `status.warn`,
  and that needs its own ADR and its own approval.

## Out of scope

Selection treatment (F-176), the sheet (F-177), the tab bar's shape, `link` (still identical
to `foreground` — the underline is the channel, and changing that is a separate decision), and
every other surface. This feature moves values and spends the accent in exactly two places.
