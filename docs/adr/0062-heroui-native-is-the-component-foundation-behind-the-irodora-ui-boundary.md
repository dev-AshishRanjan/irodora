# ADR-0062 — HeroUI Native is the component foundation, and it lives behind the `@irodora/ui` boundary

## Status

Accepted

## Date

2026-08-24

## Context

[ADR-0054](0054-react-native-core-primitives-and-ui-stays-a-package.md), accepted four days
ago, decided that component behaviour comes from React Native's own primitives and that we add
no component library. It was right about the surface: on React Native the accessibility tree is
the platform's, so the ARIA argument that decided
[ADR-0033](0033-frontend-foundation-own-the-token-layer-headless-primitives.md) and
[ADR-0034](0034-base-ui-over-radix-for-headless-primitives.md) does not transfer.

It also recorded, in its own Bad consequences, the cost it was accepting:

> **We now own behaviour we would otherwise have inherited.** Modal focus return, list keyboard
> handling for an attached hardware keyboard, and Switch Control ordering are ours to get right.

**What changed is the size of that bill.** ADR-0054 was written against six components and one
screen — 836 lines in total. The next release is F-018 (Colour Atlas), F-019 (Colour Compare),
F-020 (Palette Studio), F-021 (Colour Finder) and F-023 (Shareable colour cards): five screens
needing dialogs, bottom sheets, selects, menus, tabs, toasts, sliders, search fields and OTP-
shaped inputs. That is roughly fifteen components with real focus and dismissal behaviour, not
six with none, and every one of them is a place NFR-8 fails quietly rather than loudly.

ADR-0054's own revisit clause anticipated this as a *measured* failure — "the first time a
screen-reader attestation fails on focus return". Waiting for that measurement means building
the fifteen components first and discovering the cost afterwards, which is the expensive order.

### What the earlier ADRs actually objected to, and whether it still holds

ADR-0033 and ADR-0054 rejected Astryx, Tamagui and gluestack on one substantive ground, stated
most sharply in ADR-0054:

> They **own the token layer**, which is precisely the objection ADR-0033 sustained against
> Astryx — and here it is worse, because our manifest is the source of truth for a *contrast
> gate*.

**HeroUI Native does not own the token layer.** Its theme is CSS custom properties in OKLCh
that the application supplies; the library defines the variable *names*, we define every
*value*. `@irodora/design-tokens` is already OKLCh-native and already emits CSS and a Tailwind
theme, so the manifest generates the theme rather than competing with one.

That was measured rather than assumed. A spike mapped the real manifest onto HeroUI's required
variable set:

| Result | Count |
|---|---|
| Required variables per theme | 35 |
| Map to an existing manifest token | **27** |
| Shadows resolved to `none` (`elevation.shadow` is already `"none"`) | 3 |
| No manifest answer — new tokens required | **5** |

The five are `--backdrop`, `--success-foreground`, `--warning-foreground`, `--danger-foreground`
and `--link`. Every implied text pairing cleared WCAG 2.2 AA in both themes, from **5.90:1** to
**18.30:1**, and every mapped value stayed under `chromaCeiling.maxChroma: 0.01`.

### The three findings that shape the decision

**1. The contrast gate goes blind.** HeroUI styles through `className`, and Uniwind resolves
classes in its **Metro** plugin. Jest does not run Metro. A HeroUI component rendered under the
`a11y` harness produces a tree with no colours in it at all:

```json
{ "className": "button__root button__root--variant-primary",
  "style": [{ "borderCurve": "continuous" }, { "transform": [{ "scale": 1 }] }] }
```

The only colour present read literally `"backgroundColor": "invalid"`. The contrast and CVD
gates would have passed vacuously — a gate failing open, which this repository has already paid
for once [[a-gate-that-errors-is-failing-open]].

The same spike proved the fix. HeroUI documents `style` as taking precedence over `className`,
and a resolved token passed that way is visible again:

```
ROOT style  = {"borderCurve":"continuous","transform":[{"scale":1}],"backgroundColor":"#F6F4F1"}
ROOT a11y   = {"busy":true,"disabled":false}
```

**2. HeroUI derives roughly twenty colours the manifest has never seen**, with
`color-mix(in oklab, …)` — every hover state and every `-soft` variant. These are not
decorative: `Alert` tints its **title text** with `--color-success-soft-foreground`. Twenty
unmeasured colours carrying text is the same failure as the first, arriving by a different road.

**3. The press feedback animates `background-color`.** `motion.animatable` is `["opacity",
"transform"]` and nothing else, because the intermediate frames of a colour transition are
plausible colours the engine never produced. HeroUI's `PressableFeedback` highlight is on by
default on every `Button`.

`react-native-gesture-handler` resolves to **3.2.1** here through `expo-router`, while HeroUI
declares `^2.28.0`. It is an unmet peer, and it broke the spike's test run until mocked.

NFR-3, NFR-8, NFR-9 and NFR-24 are all at stake. The shape below was chosen by a human, on the
record, as [`adr-policy.md`](../../.harness/governance/adr-policy.md) requires for a decision
that touches a gate.

## Decision

**HeroUI Native (`heroui-native`, Apache-2.0) is the component foundation, and `apps/mobile`
never imports it.**

1. **The boundary is enforced, not intended.** `apps/mobile` imports `@irodora/ui`. Only
   `@irodora/ui` imports `heroui-native`. The dependency direction
   (`apps/mobile` → `@irodora/ui` → `@irodora/design-tokens`) is already machine-checked by the
   boundary guards; `heroui-native` is added to that check as a package `apps/mobile` may not
   name. This keeps ADR-0054's lint zone and conformance registry exactly as they are.

2. **`@irodora/ui` remains a package, `private: true`.** ADR-0054's second half is not
   superseded — it is reinforced. Every component is still either consumed by a real screen or
   registered in the conformance registry, and the a11y scope reporter still fails on one that
   is neither.

3. **Colour reaches a HeroUI component through `style`, never through `className`.** This is
   the rule the first finding forces, and it is checked two ways: a lint rule in `@irodora/ui`
   banning colour-bearing utility classes, and a conformance assertion that every registered
   subject renders at least one resolved colour. A component whose colours are invisible to the
   gate fails the gate.

4. **The manifest generates the theme.** `@irodora/design-tokens` gains a fifth emit target
   producing HeroUI's `global.css` from `design-system.manifest.json`. The manifest gains the
   five missing tokens, each with declared pairings, so the contrast and CVD gates cover
   HeroUI's full schema rather than only our current 23.

5. **Derived colours are computed and verified, never left to `color-mix`.** The generator
   evaluates each `color-mix(in oklab, …)` itself — `@irodora/color-spaces` already does the
   maths — runs the results through `checkContrast` and `checkSeparation`, and emits literal
   values. Twenty unmeasured colours become twenty measured ones.

6. **Colour animation is off.** HeroUI's highlight feedback is disabled at the provider, and
   `verify-motion.mjs` gains a check asserting that no `@irodora/ui` wrapper re-enables it.
   Scale and opacity feedback stay.

7. **The peer versions are pinned deliberately.** `pnpm.overrides` holds
   `react-native-worklets` at `0.11.4` and `react-native-reanimated` at `4.5.3` — the versions
   VisionCamera resolves, and both inside HeroUI's declared ranges. `react-native-gesture-handler`
   stays at `3.2.1` as an accepted unmet peer, recorded with the reason: downgrading it would
   break `expo-router`, and HeroUI's own use of it is gesture composition we do not invoke.

**Superseding.** ADR-0054's first half — *"component behaviour comes from React Native's core
primitives; we add no headless primitive library"* — is retired. Its second half, and its
structural guard against a package with zero consumers, stand unchanged. ADR-0033's token-layer
half also stands: we still own the token layer, which is the entire reason this adoption is
possible.

**What stays hand-built.** `Swatch`, and the provenance, confidence and separation components.
No library has them, and the rules they carry — `radius: 0` forever, the mandatory
`swatch.well`, the two-tone opaque keyline, a `Color` argument that cannot exist without
provenance — are the product.

## Consequences

**Good**

- The fifteen components R2 needs arrive with focus return, dismissal, portalling and list
  behaviour already solved, against a blocking `a11y` gate. That is the cost ADR-0054 accepted,
  paid off before it came due rather than after.
- The manifest stays the single source of truth, and its reach *grows*: five new tokens and
  twenty derived colours enter the contrast and CVD gates that were previously either absent or
  computed past them.
- The boundary makes the dependency reversible. HeroUI is fourteen months old with two test
  files across 607 source files; if its governance or its release cadence becomes a problem, the
  engine is swapped inside `@irodora/ui` without touching a screen.
- Uniwind is measurably faster than NativeWind (2.4–3.2× on published benchmarks) and is a Metro
  plugin rather than a Babel transform, so cold builds do not pay for it.
- HeroUI ships an MCP server and agent skills. ADR-0033 named exactly this as the thing worth
  taking from Astryx — "an agent building a surface queries the real system instead of inferring
  it from examples" — and it arrives without being built.

**Bad**

- **We adopt a library for its behaviour and discard its design.** HeroUI's value proposition is
  being beautiful by default; `chromaCeiling: 0.01` removes every accent colour it ships, and
  `elevation.shadow: "none"` removes its shadows. We are paying a dependency's cost for the half
  we keep, and the app will not look like HeroUI's marketing.
- **A young dependency at the foundation** — created June 2025, 1.0 recent, and its own test
  suite is two files. ADR-0033 refused Astryx partly on "beta at the foundation layer"; this is
  better than beta and still not mature. Our conformance suite is the compensating control, and
  it only checks what we register.
- **`react-native-gesture-handler` is a knowingly unmet peer.** It is accepted, not solved, and
  it will resurface on any HeroUI component that leans on gesture composition.
- The jest harness grows three pieces of configuration it did not need — extended
  `transformIgnorePatterns` for pnpm's nested `node_modules`, the worklets resolver, and a
  gesture-handler mock. Each is a thing that can silently stop being right.
- **HeroUI's design is closed.** Its contributing guide is explicit that only the core team adds
  components or changes behaviour. We cannot upstream; we can theme, override and wrap.
- Uniwind's fastest engine is a paid Pro tier. The MIT tier is production-capable and is what we
  use, but the performance ceiling is behind a licence.

**Neutral**

- Token naming stays shadcn-compatible, which HeroUI's schema already largely is. That was
  always interoperability rather than adoption, and it survives again.
- `@irodora/ui` grows a wrapper per component. That is more files and less code per file.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Keep ADR-0054 — hand-roll the fifteen components** | The honest option, and the one with no new dependency at all. It keeps a component layer that inherits the engine's zero-dependency property, which is genuinely coherent rather than austere. But it spends several features' worth of effort on Dialog, BottomSheet, Select, Menu and Toast behaviour that is solved elsewhere, and it concentrates the risk in exactly the components where a screen-reader failure is least visible to us and most costly to a user. ADR-0054 priced this; the price went up fivefold. |
| **React Native Reusables** (MIT, shadcn-for-RN over `@rn-primitives` + NativeWind) | The closest fit to this repository's instincts, and it was a real contender. Copy-paste means we own every line outright — no vendor governance, no upstream breaking change, and its token naming is already what DESIGN-SYSTEM.md targets. Against it: NativeWind v4 is still Tailwind v3 and v5 is preview, its release cadence is slower, and copy-paste means we maintain fifteen components' behaviour ourselves — which is ADR-0054's bill again, discounted rather than paid. Genuinely the right answer if HeroUI's youth proves disqualifying. |
| **HeroUI imported directly by screens** | Less code, faster to write, and honest about there being one consumer. It gives up the enforced dependency direction, the total lint bans in `@irodora/ui`, and the ability to swap engines — against a dependency young enough that swapping is a real possibility rather than a hypothetical. |
| **Tamagui** | The most mature option here by a distance, with a compiler that genuinely optimises and a strong RN accessibility story. It owns the token *values*, which is the objection ADR-0033 sustained and ADR-0054 restated — and unlike HeroUI's CSS-variable theme, feeding it from our manifest means maintaining a second token system beside the one the contrast gate reads. |
| **gluestack-ui v3** | Copy-paste over NativeWind, so it shares React Native Reusables' ownership advantage. Less momentum, and it brings the same NativeWind-on-Tailwind-v3 constraint without RNR's community. |
| **React Native Paper** | Mature, comprehensive, and Material 3's tonal elevation is genuinely well-suited to a `surface.1/2/3` model. But M3 derives its UI palette from a source colour — for a colour product that tints the entire interface from the garment being examined. ADR-0033 called that fatal and it still is. |
| **`@expo/ui`** | Still the best accessibility story available anywhere, and still disqualified for the same reason: platform widgets will not honour a token contract with a `chromaCeiling` and a mandatory `swatch.well`. Worth revisiting for genuinely chromeless surfaces. |

## Revisit when

- **A HeroUI release breaks a wrapper twice in one release cycle**, or a needed fix sits
  unmerged for longer than a milestone — the closed-design governance has then become the cost
  its Bad consequence anticipated, and React Native Reusables should be re-costed.
- **Uniwind's MIT tier stops being sufficient** — if a measured frame budget in F-038 fails on
  styling resolution and the Pro engine is the remedy, that is a licence decision with its own
  ADR.
- **HeroUI widens its `react-native-gesture-handler` peer range to include v3**, which retires
  an accepted-not-solved item above.
- **A screen-reader attestation fails on focus return or list ordering inside a HeroUI
  component** — ADR-0054's trigger, pointed the other way. It would mean the behaviour we
  adopted to stop owning is behaviour we still own.
