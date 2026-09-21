# Plan: F-239 — The display preferences mockup 15 draws are real settings

| | |
|---|---|
| **Feature** | F-239 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-61, NFR-8 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `@irodora/ui` |
| **Author** | implementing session |
| **Date** | 2026-09-21 |

---

## Intent

The three switches `15` draws under *Engine* do what they say: tabular figures, a haptic on
choosing a swatch, and provenance badges. Each persists across a restart, each changes the app
wherever it applies, and turning the last one off hides a badge without ever hiding provenance from
a screen reader.

## Approach

**Reused.** The settings table F-153 added — `getSetting` / `putSetting` on the repository, with
`AppearanceProvider` as the pattern for holding a persisted choice and handing it to the tree. The
`Haptics` port (F-206). `Text`'s `numeric` prop, which already applies `nativeNumericFeature`.
`Swatch`, which already takes `onPress`.

**New.** `DisplaySettingsProvider` and `useDisplaySettings()` in `@irodora/ui` — beside
`ThemeProvider`, because `Text` is a ui component and cannot read an app context — plus the three
rows on `Preferences`, and one ADR (below).

### Which settings, and what they default to

`15` draws all three switches **on**, so on is the default and the shipped behaviour does not change
until a person changes it. The keys follow F-153's: `display.tabular`, `display.haptics`,
`display.provenanceBadges`.

| drawn | what it changes |
|---|---|
| *Tabular Numeric Figures (ΔE / OKLCh)* | every `Text` that declares it carries figures |
| *Haptic Feedback on Swatch Selection* | whether this app fires a haptic when a swatch is chosen |
| *Show Provenance Badges on Swatches* | whether the sample family draws its provenance chip |

### The decision this forces, and why it is an ADR rather than a question

**F-206 refused both halves of the middle row, in writing.** Its module docblock says the port has
**one verb** — *"There is no `light()`, no `selection()`, no `impact(style)` — every one of those is
an invitation to fire on something that is not a commit"* — and that *"this app adds no preference
of its own, deliberately — a second switch beside the platform's is a setting somebody has to keep
in sync with one they already set"*.

`15` draws that second switch, and names selection as the moment. Golden rule 14 settles which wins:
the mockup is the specification for what a person can see, and a recorded default it contradicts
yields — the same shape as ADR-0103, where `25`'s drawn shadow superseded *"depth is tint, never a
shadow"*. So this is a decision to record, not an open question to wait on: **ADR-0104**, stating
what is given up (a port that could not express "buzz on a selection", and the argument against a
preference beside the platform's) and how the erosion is contained (one new verb, used at one call
site, and a preference that gates only what this app fires — never what the OS decides).

### What each switch reaches, honestly

- **Tabular** reaches every `Text` with `numeric`. The prop stops meaning *"use tabular figures"* and
  starts meaning *"this text carries figures"*; the setting decides. A `Text` outside the provider
  keeps today's behaviour, which is what every conformance subject renders.
- **Haptics** reaches the swatch call sites in the app. The port gains `select()`; `Swatch` itself
  stays a ui component with no device seam — the screens that own a selection call it.
- **Provenance badges** reach **nothing yet, and that is recorded rather than glossed**: the
  provenance chip *"belongs to the component"* by F-233's fourth criterion, and F-233 is blocked
  behind F-225 (OQ-36). F-239 ships the setting, the provider and the rule; F-233's chip reads it
  when it lands, and a note on F-233 says so. What this feature CAN assert today is the half that
  matters most: a swatch's accessible name carries its provenance whatever the setting says.

### Increments

1. **Record**: the claim, this plan, ADR-0104.
2. **The settings**: the provider, the three keys, persistence through the repository, and the
   `Preferences` rows `15` draws.
3. **Tabular**: `Text` reads the setting; the figures it applies to are unchanged.
4. **Haptics**: the port's second verb, the swatch call sites, and the switch that gates them.
5. **Provenance**: the setting, the rule, and the boundary with F-233 — with the accessible name
   asserted to carry provenance either way.
6. **Effects and the record.**

## Mockup fidelity

- **Governing mockup:** `15` (Preferences). `23` draws the profile that links to it.
- **Inventory:** `15.engine.tabular.*`, `15.engine.haptics.*`, `15.engine.provenance.*` — label,
  switch and drawn state for each, in `15.section-3`.
- **Bindings:** `store:settings.tabular`, `store:settings.haptics`, `store:settings.provenance`;
  labels are `static:settings.*` copy.
- **Departures:** none. The clash with F-206 is a recorded default superseded by a mockup
  (ADR-0104), not a departure from the mockup.
- **Two readings of the picture, after the review.** The heading is rendered with `15`'s leading
  ordinal — *"3. Professional Engine & Controls"*. The first draft dropped it on the reasoning that
  the number is a position in a section order `F-262` establishes; the review was right that this
  is an agent deciding what a person sees, and *"the screen is not rebuilt yet"* is not one of rule
  14's five causes. The gutter dot (`15.engine.*.state`) is drawn when the switch is on, and
  **that is now OQ-41** rather than a decision: `15` draws it in one state only, the two readings
  fail symmetrically in the other, and `F-262` — which draws the off state first — carries the
  question.

## Files to touch

```
docs/adr/0104-…                                 the haptics preference and the second verb
packages/ui/src/displaySettings.tsx (new)       the provider and the hook
packages/ui/src/Text.tsx                        `numeric` reads the setting
packages/ui/src/index.ts                        exports
apps/mobile/src/haptics.ts                      select(), and what it costs
apps/mobile/src/screens/Preferences.tsx         the three rows 15 draws
apps/mobile/app/(tabs)/profile/preferences.tsx  wiring: persistence and the haptics port
apps/mobile/src/i18n/*                          the three labels, both scripts
packages/ui/test/*, apps/mobile/test/*          the tests below
.harness/state/*, .harness/memory/effects/*
```

## Anticipated effects

1. **`Text`'s `numeric` changes meaning** → every screen that shows figures. Guard: the ui suite and
   the screens suite, plus a test that the default is unchanged behaviour.
2. **A second haptic verb** → the one-verb guarantee F-206 built. Guard: ADR-0104, and a test that
   `select()` is called only where a swatch is chosen.
3. **A new settings key set** → the settings table. Guard: the persistence test, including the
   decoy that turning one setting off leaves the other two alone and writes exactly one row.

   **CORRECTED AFTER THE REVIEW (2026-09-21).** This said *"the settings table, backup and restore
   (rows already covered) … the archive's existing table coverage"*, and that is false in both
   halves: `ARCHIVE_TABLES` is `[...SYNC_TABLES]` and `createRepository` says in its own comment
   that a setting is not in `SYNC_TABLES`. **These three preferences do not survive a backup and
   restore**, which is F-153's design for a device-local choice — the appearance does not survive
   one either — but the plan claimed the opposite and nothing would have caught it. The committed
   `effects.json` guard for E-138 never repeated the claim, so the record is clean; this file was
   not.
4. **A setting whose reader is F-233's chip** → the sample family. Guard: the note on F-233 and the
   accessible-name test here.

## Test plan

- **Persistence**: each setting round-trips through the repository and survives a reopen; an absent
  key reads as the drawn default (on), and a corrupt value does too rather than throwing.
- **Tabular**: a `Text` with `numeric` carries the font feature when the setting is on and does not
  when it is off, with a decoy (a `Text` without `numeric` never carries it).
- **Haptics**: choosing a swatch fires exactly one `select()` when the setting is on and none when it
  is off; a commit still fires `commit()` either way — the switch is not a mute button for the app.
- **Provenance**: `swatchAccessibleName` carries the source and the confidence whether the setting is
  on or off — the rule ADR-0005 is about, asserted rather than asserted-about.
- **The screen**: `Preferences` renders the three rows `15` draws, each announcing its state, each
  reachable by its accessible name; the conformance suite covers the screen in both themes.
- **Gates**: state, typecheck, lint, format, test, build, security.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm security
```

## Risks and open questions

- **No open question blocks this.** The one real clash — F-206's refusal — is settled by rule 14 and
  recorded in ADR-0104.
- **The provenance switch has no visible reader until F-233**, which is blocked behind OQ-36. Shipping
  the setting without its badge is a write whose reader is named and scheduled, not missing; the
  alternative is building the sample family's chip inside this feature, which is scope that belongs
  to F-233.
- **A preference that silently disagrees with the platform** is the failure F-206 named. ADR-0104
  keeps the app's switch subordinate: off means this app fires nothing; on means it asks, and the OS
  still decides.

## Out of scope

The provenance chip itself (F-233); the appearance and theme rows `15` also draws (F-153, F-262);
the weights and security sections of `15` (F-277, F-262); haptics anywhere but a swatch selection.
