# Plan: F-214 — Ten surfaces render twice the inset they read as

| | |
|---|---|
| **Feature** | F-214 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-25 |
| **Service** | `mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## The shape

```jsx
<Surface level="1">                              ← md = 12, from the default
  <View style={{ padding: nativeSpacing.md,      ← md = 12, again
                 gap: nativeSpacing.sm }}>
```

`Surface` **always** applies its padding and defaults it to `md`. Ten sites add their own inside
it, so each renders a **24pt inset while reading, at every call site, as 12**. Found by F-210
while classifying, and filed rather than folded in.

## The value: `md`, and the reason is that both sides already say so

24 is not an inset any other surface in this application uses — the vocabulary is `md` and `lg`.
Two independent places both name `md` here: the `Surface` default and the inner `View`. The
reading with the most evidence is that one of them was meant to be the whole inset, and neither
author knew about the other.

**Nobody has looked at the result**, so criterion 1's *"the value a person looked at and chose"*
is recorded as an attestation rather than claimed. Choosing 24 deliberately would need the same
look, and the difference is that 12 is the value the code already asserts twice.

## The fix is a primitive, not a smaller number

```jsx
<View style={{ padding: nativeSpacing.md, gap: nativeSpacing.sm }}>   →   <Stack gap="sm">
```

The inset comes from the `Surface`, and the flow comes from `Stack` — which is F-203's direction
and removes a raw `View` with hand-written spacing at the same time.

## Criterion 2: the shape cannot come back

A rule in `verify-spacing-scale.mjs` (gate 8), because it is a spacing rule and that scanner
already walks every line of `packages/ui/src` and `apps/mobile/src`: **a `Surface` or `Card` whose
first child declares its own `padding` is refused.** Watched refusing in that script's `--prove`.

## The inset fixture WILL move, and that is the pin working

`.harness/verification/screen-insets.json` pins every inset across the 72 conformance subjects,
and F-210 captured it before that conversion. Removing ten padded boxes makes it fire — which is
exactly what it is for. It is re-captured **as part of this feature**, with the numbers recorded,
rather than quietly regenerated.

## Test plan

- The ten sites, asserted through the re-captured fixture rather than by counting `<View>`s.
- The new spacing rule, watched refusing a planted `Surface` wrapping a padded `View`, and
  **watched accepting** one whose child is a `Stack` — a rule that refused both would be a rule
  against nesting.
- The existing suites over all ten screens, unchanged.

## Verification

`state · typecheck · lint · format:check · test · a11y`.

## Risks

- **Nobody has seen it.** Ten screens get 12pt tighter, on a workstation with no device. That is
  criterion 3, and it is an attestation.
- **`md` might be wrong.** If 24 was deliberate, this is a regression — and the evidence for that
  reading is one number written nowhere against two written twice.

## Out of scope

Any other spacing on these screens. The `gap` values are untouched.
