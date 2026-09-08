# Plan: F-180 — Settings, and the appearance choice lives in it

| | |
|---|---|
| **Feature** | F-180 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-70, FR-71 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

*"I don't see settings, and options to choose themes in app."* Correct, and the reason is not
that the feature is missing.

**The appearance chooser has existed since F-153**, and the device-colour explanation since
F-154. Both live on `/profile/preferences` — a route **nothing in the product navigates to**.
This is the first of the eight orphans F-179's gate now names.

## Approach

Almost nothing is built. Two things are wrong and only one was reported.

**There is no way in.** A control at the top of the Profile tab, with the destination supplied
by the route — the convention every screen here follows, because a screen that called
`router.push` itself could not be rendered by the conformance suite.

**The screen is called the wrong thing.** Its title is `preferences.title` — *"What the app has
learned"* — which is the name of **one section of it**. A person who did reach it would have
found the theme picker under a heading about learned pairing weights. The screen becomes
*Settings*; the learned block keeps its own name one level down.

**Criterion 4 is amended before the work, not after.** It asked for language, motion and the data
controls to be *"reachable from here rather than from nowhere"*. Language follows the device
locale and reduced motion follows the accessibility setting; neither has an in-app switch and
neither should get one — the platform already asked, and asking twice is how two answers start
disagreeing. The data controls are `/profile/export`, which is F-182's. So the criterion becomes:
**the screen states what the platform owns**, which turns an absence somebody has to infer into a
designed state.

## Files to touch

```
apps/mobile/src/i18n/{en,ja}.ts          — settings.title / open / openHint / platform
apps/mobile/src/screens/ProfileSetup.tsx — onOpenSettings, and the control
apps/mobile/src/screens/Preferences.tsx  — retitled; the learned block gains its own heading
apps/mobile/app/(tabs)/profile/index.tsx — supplies the destination
apps/mobile/test/screens.test.tsx        — the subject renders the control
.harness/verification/unreachable-routes.json — /profile/preferences expires
```

## Test plan

- **Reachability:** the gate must go from 8 orphans to 7 and from 9 reachable to 10, and
  `/profile/preferences`'s declaration must be **removed** — leaving it would fail as a dead
  exemption, which is the direction that matters.
- **Conformance:** the subject passes `onOpenSettings`, so the new control is rendered and its
  contrast and accessibility are measured. A subject that omitted it would leave the one control
  this feature adds outside every run.
- **i18n:** both catalogues gain the four keys; the completeness check covers the rest.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · reachability · build`.
Not run: `cvd`, `color-golden`, `content` — no colour, no maths, no corpus.

## Risks

- **Nobody has chosen a theme and looked.** Eight palettes exist, all eight pass every gate, and
  seven of them have never been seen. Attested, joining F-175's.
- **The route path still says `preferences`.** Renaming it would invalidate the declarations
  F-182 depends on and the generated e2e flow ids, for a string no person ever sees. The label
  and the title are what a person reads, and both say Settings.

## Out of scope

The other seven orphans (F-181, F-182), and any new setting.
