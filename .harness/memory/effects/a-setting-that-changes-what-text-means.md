# A setting that changes what a prop means

**Effect:** [E-138](../../state/effects.json) · **Feature:** F-239 · **Date:** 2026-09-21

Mockup `15` draws three switches. Two of them are ordinary — a haptic, a badge. The first is
*Tabular Numeric Figures (ΔE / OKLCh)*, and it lands on a prop that already existed:

```tsx
<Text size="small" color="foreground" numeric>0.42</Text>
```

`numeric` meant **"use tabular figures"**. After F-239 it means **"this text carries figures"**,
and a setting decides what is done about them. Nothing at any call site changed, and every call
site changed meaning.

## Why the prop could not simply be removed and read from the setting

Because no heuristic can tell `"0.42"` from `"F-019"`. The caller knows its text holds figures;
the component cannot look at a string and find out. So the declaration stays with the caller and
the policy moves to the setting — which is the split that made the switch implementable at all.

## Where the halves live, and why they are in different packages

`Text` is a `@irodora/ui` component and cannot read an app context, so the **values** and the
provider live in the ui package beside `ThemeProvider`, and everything touching the device —
the three keys, the parsing, the writes — lives in `apps/mobile`. The app's provider mounts the
ui one, so the two cannot drift.

## The hook that defaults where its neighbours throw

`useTheme()` and `useAppearance()` throw outside their providers: rendering the base theme inside
a themed app looks merely wrong, and a throw says which. `useDisplaySettings()` **defaults**,
because every `Text` in the product would otherwise need a provider — including the ones the
conformance suite renders alone — and a missing provider is not a wrong setting, it is no
setting.

The default is what `15` draws: all three on. That is also why the whole change is invisible
until somebody moves a switch, which is the property that made it safe to land across a hundred
screens at once.

`useDisplay()` — the app's writer — **does** throw. The two hooks answer different questions:
*what is set* has a correct answer without a provider; *how do I change it* does not, and a
writer that silently did nothing is the one failure a settings screen cannot show you.

## The asymmetry in the parser is deliberate

```ts
const parseSetting = (raw: string | undefined): boolean => raw !== 'false';
```

Only the exact string `"false"` turns anything off. Absent, empty, `"no"`, `"0"`, or something a
future build wrote all read as on. A setting whose OFF state depended on parsing succeeding would
silently turn itself back on after a bad write — and the tests carry as many decoys for that as
they do round trips.

## The one that writes to nothing yet, said out loud

*Show Provenance Badges on Swatches* has no reader: the chip belongs to the sample family by
F-233's fourth criterion, and F-233 is blocked behind F-225 (OQ-36). F-239 ships the setting, the
key and the rule, and records the boundary on F-233 rather than either building the chip here or
leaving the switch undone.

What this feature could assert today is the half that matters most, and it is a negative:
`swatchAccessibleName(name, hex, color)` takes three arguments and none of them is a setting. The
badge is hideable; **the provenance is not** (ADR-0005). A future badge preference cannot change
that string without changing the test that says so.

## The lesson

**When a mockup turns an existing prop into a policy, the prop's meaning changes everywhere at
once — so make the new default identical to the old behaviour, and the blast radius is a
docblock.** The dangerous version of this change is the one that also improves something.

[[one-verb-is-a-stronger-rule-than-a-rule]]
[[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
