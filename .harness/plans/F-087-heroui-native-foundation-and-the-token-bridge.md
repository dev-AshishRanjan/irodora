# Plan: F-087 — HeroUI Native foundation and the token bridge that keeps the gates seeing colour

| | |
|---|---|
| **Feature** | F-087 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-9, NFR-24 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `@irodora/design-tokens` · `@irodora/ui` · `scripts/` |
| **Decision** | [ADR-0062](../../docs/adr/0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md) |
| **Author** | Claude Opus 5 |
| **Date** | 2026-08-24 |

---

## Intent

Make HeroUI Native usable here **without letting it take colour away from the manifest.**

A spike proved the shape of the problem. HeroUI styles through `className`; Uniwind resolves
classes in its **Metro** plugin; jest never runs Metro. So a HeroUI component rendered under
the `a11y` harness produces a tree with **no colours in it**:

```json
{ "className": "button__root button__root--variant-primary",
  "style": [{ "borderCurve": "continuous" }, { "transform": [{ "scale": 1 }] }] }
```

The only colour in the tree read literally `"backgroundColor": "invalid"`. The `contrast` and
`cvd` gates would have gone on passing, over nothing
[[a-gate-that-errors-is-failing-open]].

To a user, done looks like nothing at all — no screen changes in this feature. To the build,
done looks like: HeroUI bundles, the theme is generated from the manifest, and **a component
whose colours the gate cannot see fails the gate.**

## Approach

**Colour reaches a HeroUI component through `style`, never `className`.** The spike proved
this works — HeroUI documents `style` as taking precedence, and a resolved token passed that
way is back in the tree where the gate can measure it:

```
ROOT style  = {"borderCurve":"continuous","transform":[{"scale":1}],"backgroundColor":"#F6F4F1"}
ROOT a11y   = {"busy":true,"disabled":false}
```

`className` still carries everything that is not a colour — layout, spacing, radius, weight —
because none of that is what the contrast gate reads.

**Reused.** `@irodora/design-tokens` already parses the manifest, derives sRGB from OKLCh
(`derivedSrgb`), resolves translucency against every ground it may sit on (`resolveAll`), and
checks pairings and CVD separation (`checkContrast`, `checkSeparation`). The generator is a
**fifth emit target beside `emit/css.ts`, `emit/tailwind.ts`, `emit/react-native.ts` and
`emit/typescript.ts`** — not a new mechanism. `@irodora/color-spaces` already does the Oklab
conversions the `color-mix` evaluation needs. `scripts/verify-app-imports.mjs` and the
existing boundary guards already know how to fail an import; `heroui-native` is a new entry,
not a new guard.

**New.**

- `emit/heroui.ts` — the manifest → HeroUI `global.css` emitter.
- `derive.ts` gains `mixOklab(a, aPct, b, bPct)` — the `color-mix(in oklab, …)` evaluation,
  including the `transparent` case, which is a premultiplied mix rather than a lerp.
- Five manifest tokens: `backdrop`, `status.ok.foreground`, `status.warn.foreground`,
  `status.bad.foreground`, `link` — each with declared `pairsWith`, so they are covered rather
  than merely present.
- A conformance assertion: a registered subject whose tree carries no resolved colour is a
  **failure**, not a pass.
- An ESLint rule in the `@irodora/ui` zone: no colour-bearing utility class in a `className`.

**Increments.** Each leaves the build green.

1. **Dependencies and pinning.** `heroui-native`, `uniwind`, `tailwindcss@4`, `tailwind-merge`,
   `tailwind-variants`, `react-native-svg`. `pnpm.overrides` pins `react-native-worklets` to
   `0.11.4` and `react-native-reanimated` to `4.5.3` — the versions VisionCamera resolves, both
   inside HeroUI's declared ranges. A naive install pulled `0.12.1` and `4.6.0` and duplicated
   both; the override is the difference between one copy and three. Assert one copy of each in
   the app tree.
2. **`mixOklab` and its tests, alone.** Property tests against the two endpoints and the
   midpoint, plus a fixture set checked against a CSS reference. No emitter yet — this is the
   maths, verified before anything depends on it.
3. **The five manifest tokens**, with pairings, run through the existing `contrast` and `cvd`
   gates. Values chosen to pass, never tolerances widened
   ([`contrast.md`](../rules/frontend/contrast.md)).
4. **`emit/heroui.ts`**, producing all 35 required variables per theme — 27 mapped, 3 shadows
   resolved to `none` (`elevation.shadow` is already `"none"`), 5 from increment 3 — and every
   `color-mix`-derived value computed as a literal. The emitter runs `checkContrast` and
   `checkSeparation` over the derived set and **refuses to emit** on a failure.
5. **Metro and jest.** `metro.config.js` with `withUniwindConfig`; the jest harness gains the
   three pieces the spike proved necessary — `transformIgnorePatterns` extended for pnpm's
   nested `node_modules`, `react-native-worklets/jest/resolver.js`, and the gesture-handler
   mock. Each carries a comment saying what breaks without it.
6. **The guards.** Boundary guard rejects `heroui-native` in `apps/mobile`. Lint rule rejects a
   colour-bearing utility class in `@irodora/ui`. `verify-motion.mjs` rejects a wrapper
   re-enabling HeroUI's highlight animation. Conformance rejects a subject with no resolved
   colour. **Each guard is proved by a decoy that must fail**, not by an absence of failures.
7. **One wrapper, to prove the pattern end to end.** `Button` re-expressed over
   `heroui-native`'s `Button`, same public API, colours through `style`, `busy` preserved.
   Home consumes it unchanged and the conformance suite is green in both themes.

## Files to touch

```
apps/mobile/package.json               — heroui-native, uniwind, tailwind*, svg
package.json                           — pnpm.overrides pinning worklets + reanimated
apps/mobile/metro.config.js            — NEW; withUniwindConfig, cssEntryFile, dtsFile
apps/mobile/global.css                 — NEW; GENERATED, imports heroui-native/styles
apps/mobile/jest.config.mjs            — transformIgnorePatterns, resolver, setupFiles
apps/mobile/jest.setup.js              — NEW; gesture-handler mock and why it is needed
docs/design/design-system.manifest.json— the five new tokens and their pairings
packages/design-tokens/src/derive.ts   — mixOklab
packages/design-tokens/src/emit/heroui.ts — NEW; the emitter
packages/design-tokens/src/index.ts    — export the new surface
scripts/generate-design-tokens.mjs     — write apps/mobile/global.css
scripts/verify-app-imports.mjs         — heroui-native is forbidden in apps/mobile
scripts/verify-motion.mjs              — a wrapper may not re-enable colour animation
eslint.config.mjs                      — no colour-bearing utility class in @irodora/ui
packages/ui/src/testing/conformance.ts — a subject with no resolved colour fails
packages/ui/src/Button.tsx             — the one wrapper that proves the pattern
```

## Anticipated effects

| Change | Dependents | Guard |
|---|---|---|
| `design-system.manifest.json` gains five tokens | `contrast` gate, `cvd` gate, every emit target, `nativeColors` type | Existing — `checkContrast`, `checkSeparation`, `checkStructure` run over the whole manifest, so a token with no pairing already fails |
| A fifth emit target | `generate-design-tokens.mjs`, the generated-file freshness check | Existing — the generator's `--check` mode fails on a stale artefact; extend it to `global.css` |
| `derive.ts` gains `mixOklab` | `@irodora/design-tokens` consumers | Existing — engine purity (`verify-engine-purity.mjs`); no `node:*`, no platform API |
| Colour may now reach a component through `className`, where no gate can see it | Every future `@irodora/ui` component | **MUST BE BUILT** — the lint rule and the conformance assertion in increment 6. This is the effect that matters, and nothing existing catches it |
| `apps/mobile` could import `heroui-native` directly, bypassing the boundary | ADR-0062's entire reversibility argument | **MUST BE BUILT** — boundary guard entry in increment 6 |

Both new guards are recorded in [`effects.json`](../state/effects.json) with their notes
before this feature closes, per the [effect-link protocol](../protocols/effect-link.md).

## Test plan

- **Unit / property:** `mixOklab` — endpoints return their inputs, the midpoint is symmetric
  under argument swap, and a mix with `transparent` premultiplies rather than lerps. Fixtures
  cross-checked against a CSS `color-mix` reference implementation, cited in the test.
- **Golden:** none new. This feature adds no colour science; it evaluates a documented CSS
  function. The manifest's own values are the reference.
- **Conformance:** `@irodora/ui/testing` — every registered subject, both themes, plus the new
  resolved-colour assertion. `apps/mobile` runs the same suite over Home.
- **Negative, with decoys** — each guard gets a fixture that **must fail**:
  - a component whose only colour is a `className` → conformance fails;
  - `bg-[#ff0000]` in a `@irodora/ui` component → lint fails;
  - `import { Button } from 'heroui-native'` in `apps/mobile` → boundary guard fails;
  - a wrapper setting `highlightAnimation` → `verify-motion` fails;
  - a derived `color-mix` value below its pairing's requirement → the emitter refuses to emit.
- **E2E:** none. No user-facing behaviour changes in this feature.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
pnpm test:contrast && pnpm test:cvd && pnpm test:a11y
pnpm build
node scripts/verify-motion.mjs --prove
node scripts/verify-app-imports.mjs --prove
```

Evidence captured per the [verification protocol](../protocols/verification.md). The `--prove`
runs matter more than the plain ones here: **four of the five acceptance criteria are guards,
and a guard that has never failed has not been shown to work.**

## Risks and open questions

- **The jest configuration is three pieces of glue that can silently stop being right.** A
  HeroUI or Uniwind release can break any of them, and the failure mode is a suite that stops
  seeing components rather than one that goes red. Mitigated by the resolved-colour assertion:
  if the tree stops carrying colours, conformance fails loudly.
- **`react-native-gesture-handler` is a knowingly unmet peer** — 3.2.1 here via `expo-router`,
  `^2.28.0` declared by HeroUI. Accepted in ADR-0062, not solved. It broke the spike's test run
  until mocked, and it will resurface on any component that uses gesture composition.
- **`uniwind` pulls `culori`**, which ADR-0004 designates a test *oracle* and deliberately not a
  runtime dependency. The spike indicates it is reached through `uniwind/metro` (build-time,
  beside `lightningcss` and `@tailwindcss/oxide`) rather than the runtime entry — **but this is
  not yet proven.** Increment 1 must confirm `culori` is absent from the app bundle, and if it
  is not, that is a finding for ADR-0004 rather than something to wave through.
- No `OQ-*` blocks this.

## Out of scope

- **Rebuilding the other components.** `Text`, `Icon`, `Status` and `Surface` are F-088.
  `Button` is rebuilt here only as the proof that the pattern holds end to end.
- **Wrappers for components no screen consumes.** No dialog, bottom sheet, select, menu, tabs,
  toast or slider. Each R2 feature brings the wrappers it consumes — a package with no
  consumers passes every gate and ships nothing, and six increments have already been lost to
  that shape [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
- **Changing `chromaCeiling`, `motion.animatable`, or any gate threshold.** HeroUI is themed to
  the rules; the rules are not relaxed to HeroUI.
- **The HeroUI MCP server and agent skills.** Worth having, recorded in ADR-0062 as a benefit,
  and not installed as part of this feature.
