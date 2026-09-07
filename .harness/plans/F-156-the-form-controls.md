# Plan: F-156 — the form controls: Switch, Select, Slider, Accordion

| | |
|---|---|
| **Feature** | F-156 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8 (accessibility), NFR-9 (never colour alone), NFR-24 (design system) |
| **Service / package** | `@irodora/ui` · `apps/mobile` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-07 |

---

## Intent

Four controls the product has been working around. A person choosing a theme picks from four
chips because `Select` does not exist; a person reading the CVD block on **Compare** is told
*"simulated at the strongest tabulated severity"* because there is no slider to move; a person
on a long colour page scrolls past four sections because nothing collapses.

Done, to a user: the theme is chosen from a list that shows what is chosen, the CVD severity
moves and the numbers move with it, and the reference sections on a colour page fold away.

## Approach

**These four are legitimately WRAPS.** [`heroui-wrappers.md`](../rules/frontend/heroui-wrappers.md)'s
test is *"wrap HeroUI when there is BEHAVIOUR to inherit"* — gesture handling and a checked
state a screen reader must hear (Switch), list keyboard handling and focus return (Select),
drag with an announced value (Slider), an expanded state and managed focus (Accordion). That is
not the styled-box case F-143 refused eleven times.

**Reused:** `heroui-native@1.0.8`; `nativeRadius` / `nativeSpacing` / `nativeTapTarget` and the
theme colours through `useTheme()`; `Text` and `Row`/`Stack` from this package; the conformance
suite in `src/testing/`; `overlayKeyframes` for the Select's portal; `simulateAnomalous` and
`separationDetail` from `@irodora/cvd-engine` — the severity slider is the control that engine's
own docblock says it exists for, twice.

**New:** `packages/ui/src/controls.tsx`, holding all four. One file rather than four, for the
reason `overlay.tsx` is one file: these share the decisions (label ownership, `style` not
`className`, our timing, no theme-decided background) and four files would make four independent
copies of them that agree today.

### The four decisions that apply to all of them, so they are made once

1. **The label is the wrapper's, not the caller's node.** F-143's finding: HeroUI wraps whatever
   you hand it in a bare pressable and puts no role or name on it. `Switch` takes `label: string`
   and owns `accessibilityLabel`; a switch beside a `<Text>` is unnamed on a device, because
   React Native has no `htmlFor`.
2. **Colour reaches these through `style`.** Uniwind resolves `className` in Metro; jest never
   runs Metro; a colour routed through a class is absent from the tree the contrast gate reads.
3. **`background={null}` wherever HeroUI offers a theme-decided layer** — `Switch.Background`,
   `Slider.Track`'s background, `Select.Content`. One of the theme's choices is a blur, and a
   blur tints what it surrounds.
4. **Controlled only.** A control whose value lives inside it cannot be driven by a conformance
   subject, and criterion 2 is what makes every state checkable at all.

### Increments

1. `controls.tsx` with `Switch` — the smallest, and it carries the motion finding below.
2. `Select`, portalled; `radius.xs` on the item rows.
3. `Slider`, with the value label.
4. `Accordion`, with the separator painting `border`.
5. Registry entries + the tree-asserted state test (criterion 3).
6. The three consumers.

## Findings this plan is built on

### The conformance suite reads `accessibilityRole` and is blind to `role`

`pressableNodes` reads `props.accessibilityRole` only. **Every HeroUI primitive sets `role`** —
`role="switch"`, `role="slider"`, `role="button"` on the accordion trigger. React Native has
accepted `role` since 0.71 and maps it to the same platform attribute, so those components are
correct on a device and would be reported by our own suite as `no-role`.

Left alone this is a false positive that would push four wrappers into declaring
`accessibilityRole` next to a `role` that already says it — and worse, the two vocabularies are
not the same list: `role="slider"` maps to `accessibilityRole="adjustable"`, and a wrapper
"fixing" the finding by writing `accessibilityRole="slider"` would be writing a role React
Native does not have.

So `tree.ts` learns the synonym, and the mapping is the platform's rather than ours.

### The colour-animation check is a table, and Switch is not in it

`verify-motion.mjs` names `highlightAnimation` and `rippleAnimation`. **HeroUI's Switch animates
`backgroundColor` by default**, over 175 ms, through a third prop the table does not know:
`animation={{ backgroundColor: … }}`.

`motion.animatable` is `opacity` and `transform`, and for this product the reason is not
fussiness — the intermediate frames of a colour transition are plausible colours the engine
never produced. The table gains the prop, and `Switch` turns the interpolation off.

Same shape as [[a-table-driven-check-is-only-as-complete-as-its-table]].

### The Switch has no screen consumer, and that is a fact about the product

*"No wrapper without a consumer"* — and after looking, **this product has no user-facing
boolean.** The message catalogue contains no on/off copy at all; the wardrobe schema has no
boolean column; and twice an earlier feature reached the place a toggle would go and chose
labelled alternatives instead, with the reason written down: the Lens (*"two chips rather than a
button that toggles: a toggle says what it will do next"*, F-163) and the profile bands
(*"discrete rather than a slider"*).

A colour product's settings are *which one*, not *whether*. So `Switch` ships wrapped, exported
and registered — which ADR-0054 and gate 8 accept — and the absence is recorded here and in its
own docblock rather than closed by inventing a preference to justify a control.

## The three consumers

**`Select` → Preferences, the theme family.** The screen names this feature in its own comment:
*"CHIPS RATHER THAN A SELECT, and that is an interim worth naming: `Select` is F-156 and does
not exist yet."* Five options including the device colour, which is disabled on a platform that
offers none — so the item-level disabled state has a real caller.

**`Slider` → Compare, the CVD severity.** `packages/cvd-engine/src/index.ts` says
*"anomalous trichromacy at any severity. The common case, and the one a severity slider is
for"*, and `machado.ts` says it again. The screen currently reads *"Simulated at the strongest
tabulated severity."* — a fixed 1.0 with a sentence apologising for it. Machado interpolates
continuously between the tabulated steps, so the control the engine was built for is a slider,
and the three separation readouts move with it.

**`Accordion` → ColourDetail, the four reference sections.** Description, coordinates, taxonomy,
provenance: four `Surface`s a person scrolls past to reach the tabs below. **All four start
expanded**, so nothing a person arrives for is hidden and provenance is never behind a tap
(golden rule 12) — the accordion is a way to fold what you are done with, not a way to hide the
page. Three separators between four items is the first **decorative hairline** in this product,
which is the `border` token's declared closer.

## Files to touch

```
packages/ui/src/controls.tsx        — NEW. Switch, Select, Slider, Accordion.
packages/ui/src/index.ts            — export them.
packages/ui/src/testing/tree.ts     — read `role` as a synonym for `accessibilityRole`.
packages/ui/test/conformance.test.tsx — four registry entries + the role-synonym decoys.
packages/ui/test/controls.test.tsx  — NEW. Criterion 3: state read from the tree.
scripts/verify-motion.mjs           — the Switch's colour animation prop joins the table.
apps/mobile/src/screens/Preferences.tsx  — theme family becomes a Select.
apps/mobile/src/screens/Compare.tsx      — CVD severity becomes a Slider.
apps/mobile/src/screens/ColourDetail.tsx — the four sections become an Accordion.
apps/mobile/src/i18n/{en,ja}.ts     — labels for the new controls.
apps/mobile/test/screens.test.tsx   — the changed screens' subjects.
scripts/verify-token-reach.mjs      — `border` and `radius.xs` reached; entries retired.
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| `tree.ts` reads `role` | every conformance subject, in `@irodora/ui` and `apps/mobile` | the suite's own decoy fixtures — a node with neither must still be reported |
| `verify-motion.mjs` gains a prop | every HeroUI wrapper | the gate's own `shouldFail` cases, which already prove the table discriminates |
| `Compare` computes at a variable severity | `separationDetail` callers | `cvd` gate; the engine is unchanged, only its argument |
| `border` and `radius.xs` reached | the token ledger's unreached entries | `verify-token-reach.mjs` fails on a stale reason |
| four new exports | the a11y scope closure | gate 8 scope fails a component in neither the registry nor a screen |

## Test plan

- **Unit:** `controls.test.tsx` — for each control, render and walk the tree, asserting
  `accessibilityState.checked` / `.expanded` and `accessibilityValue` **from the rendered node**,
  not from the prop that was passed. Both polarities, so a component hard-coding `true` fails.
- **Conformance:** four subjects, `kind: 'interactive'`, every required state, both themes.
- **Negative / decoy:** a fixture pressable with **neither** `role` nor `accessibilityRole` must
  still be reported after `tree.ts` learns the synonym — otherwise the widened reader would have
  turned the rule off. And a fixture with `role` only must now pass, which is the change.
- **Motion:** the gate's existing `shouldFail` table gains a case for the Switch's colour
  animation left on, so the new table entry is proven to discriminate.
- **Contrast / a11y / cvd:** gates 8, 9, 10 over the changed screens.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
pnpm test:a11y && node scripts/verify-contrast.mjs && node scripts/verify-cvd.mjs
node scripts/verify-motion.mjs
node scripts/verify-token-reach.mjs
pnpm verify:ci
```

## Risks and open questions

- **Portals and the conformance suite.** F-157 found that a portalled subject's content mounts
  into a shared host, so the light render was still up when the dark one was captured. `Select`
  is portalled; the registry's unmounting helper already handles it, and this is a re-run of a
  solved problem rather than a new one.
- **`accessibilityValue` is integers only.** RN's bridge takes `long long`, so HeroUI normalises
  to a 0–100 percentage and puts the human label in `text`. A severity of 0.35 therefore
  announces as *35%* plus whatever `formatOptions` renders — so the wrapper must supply the
  format, or a screen reader says "35" about a quantity whose units are not percent.
- **Collapsing content and the screen tests.** HeroUI keeps collapsed content mounted with
  `aria-hidden`. Starting every section expanded sidesteps the question for this feature; a
  future default of collapsed would need the suite to grow an opinion about hidden subtrees.

## Out of scope

- **No new preference, and no new column.** The Switch gets no invented boolean; see above.
- **No change to the CVD engine.** Only the argument the screen passes it changes.
- **`Checkbox`, `Radio`, `Menu`, `InputOTP`, `Toast`** — not in the acceptance list.
- **F-174.** Two status colours failing 4.5:1 on `swatch.well` is a separate must, and it needs
  a person.
