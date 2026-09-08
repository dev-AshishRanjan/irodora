# Plan: F-176 — Selection is one treatment, everywhere

| | |
|---|---|
| **Feature** | F-176 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-9 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/ui` |
| **Author** | Claude Opus 5 |
| **Date** | 2026-09-08 |

---

## Intent

Reported as: *"when we select a color, it's not highlighted as active or marked. Have a
universal ui/ux for active/selection marking … follow one single pattern everywhere."*

Both halves are true and they are different defects.

**It is not marked well.** `Swatch` draws selection as a 2 px `border.strong` — a mid-grey, on
a grey well, at 48 px — plus a `✓` prepended to the caption *text*. The border is added to a
view with no reserved space for it, so **selecting a swatch moves it**.

**There is no single pattern.** Three components express selection three ways:

| | fill | edge | mark | announced |
|---|---|---|---|---|
| `Swatch` | — | 2 px `border.strong` | `✓ ` in the caption | yes |
| `Chip` | `inverse` | — | ` ✓` in the caption | yes |
| `Tabs` | `surface.1` | — | — | yes |

Done, to a user: choosing something anywhere in the app looks the same, is unmistakable at
48 px, and does not make the thing jump.

## Approach

**Reused:** the accent from F-175 — `accent`, `accent.muted`, and `accent.foreground` — which
were searched and approved together in ADR-0099 precisely so this feature would not have to
re-derive them. The tick is `icon.check` from the existing `Icon` registry: a **drawn glyph**,
not a `✓` character, so it has no tofu failure mode and is distinguishable in greyscale.
`accessibilityState.selected` and the F-163 conformance rule stay exactly as they are.

**New:** one module, `packages/ui/src/selection.tsx`, holding the treatment as data and one
small component. Nothing else is introduced.

### The treatment

```
selected          →  accent.muted fill · accent edge · the tick · announced
focused           →  ring edge (the existing focus token), nothing else changes
selected+focused  →  accent.muted fill · RING edge · the tick · announced
neither           →  the caller's own ground · TRANSPARENT edge of the same width
```

Four things about it are decisions rather than styling.

**1. The edge is always drawn, and is transparent when it means nothing.** That is what stops
selection moving anything — the current `borderWidth: selected ? 2 : 0` reflows the view. It is
the difference between a state and a layout change.

**2. Focus takes the edge; selection keeps the fill and the mark.** They are different states
and both must be visible at once. `Swatch` today writes
`borderColor: focused ? colors.ring : colors['border.strong']` on a single border, so **a
selected swatch that is focused shows only focus** — selection disappears at the moment somebody
navigating by keyboard or Switch Control needs it most. This is a live defect and the split
fixes it.

**3. The mark is a drawn glyph in its own badge, not a character in the label.** A `✓` inside
the accessible name is a good *announcement* channel and a poor *visual* one: it inherits the
caption's size and colour, it is invisible on a 48 px sample whose caption is 13 px grey, and on
`Chip` it changes the label's width. The badge sits on the corner of the target at a fixed size.
The name keeps its tick too — that channel is not being removed, it is being joined.

**4. Navigation is not selection, and the treatment says so.** A tab is *where you are*; a chip
is *what you chose*. A tick on a tab would claim the second. So the module exposes two:
`selectionTone` for choosers (fill + edge + mark) and `currentTone` for navigation (fill + edge,
no mark). They draw from the same tokens, so the colour language is one thing, and the mark is
the part that means "I picked this".

### What changes at each call site

| component | before | after |
|---|---|---|
| `Swatch` | `border.strong` edge, `✓ ` caption, layout shift, focus hides selection | the treatment; caption tick kept |
| `Chip` | `inverse` fill, ` ✓` caption | the treatment; caption tick kept |
| `Tabs` | `surface.1` fill | `currentTone` — same tokens, no mark |

**Increments**, each leaving the build green:

1. `selection.tsx` with its unit tests. Nothing consumes it yet.
2. `Swatch` adopts it. Conformance in both themes.
3. `Chip` adopts it.
4. `Tabs` adopts `currentTone`.
5. The conformance rule gains the treatment check, with a decoy.
6. `accent.muted`'s exemption is **removed** — it now has a reader, and the gate checks that
   direction too.

## Files to touch

```
packages/ui/src/selection.tsx        — new. The treatment, and the mark.
packages/ui/src/index.ts             — export it
packages/ui/src/Swatch.tsx           — adopt
packages/ui/src/Chip.tsx             — adopt
packages/ui/src/overlay.tsx          — Tabs adopts currentTone
packages/ui/src/testing/conformance.ts — the rule
packages/ui/test/conformance.test.tsx  — the decoys
packages/ui/test/selection.test.tsx  — new
.harness/verification/unreached-tokens.json — accent.muted's entry is REMOVED
docs/design/DESIGN-SYSTEM.md         — the treatment is documented
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| `Swatch` repaints | every colour surface in the product — Atlas, colour page, wardrobe, Lens, AddGarment, Compare, Shopping, PaletteStudio | gate 8 (a11y) + gate 9 rendered half, over every screen subject |
| `Chip` repaints | Atlas filters, ProfileSetup bands, Lens mode, Wardrobe, Measure | the same |
| new token pairings drawn | gate 9 checks only pairings the manifest **declares** | `accent.muted` already declares `foreground`, `foreground.2` and `accent`; the tick uses `accent` on `accent.muted`, which is declared |
| `accent.muted` becomes read | gate 8 fails on a declared-unreached token that IS read | removing the entry is the fix, and leaving it would fail |

E-007 covers the token→component link and needs no new id. The **new** fact for its note is
that selection is now one treatment, so a change to it is a change to every chooser at once.

## Test plan

- **Unit:** `selectionTone` returns a transparent edge of the same width when nothing is
  selected; the edge is `accent` when selected, `ring` when focused, and `ring` when both; the
  fill is `accent.muted` only when selected. `currentTone` never returns a mark.
- **Conformance:** `Swatch`, `Chip` and `Tabs` in both themes, in all five states, plus the
  **selected+focused** combination — which no subject renders today, and is the state that
  carries the live defect.
- **Negative, with a decoy:** a subject declaring `selectable: true` that draws a fill change
  and nothing else must FAIL the new rule; one that draws the treatment must pass; a subject
  with `selectable: false` must be left alone. Two of those three already exist in
  `conformance.test.tsx` and are reused rather than rewritten.
- **Reach:** `accent.muted`'s exemption is removed and gate 8 must pass — then, as a check that
  the removal was necessary rather than cosmetic, putting it back must make gate 8 **fail** on
  a dead exemption. That direction is what makes the entry honest.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
pnpm test:a11y && pnpm test:contrast
node scripts/verify-token-reach.mjs
node scripts/verify-motion.mjs
pnpm build
```

`cvd` is run because the treatment introduces a new adjacency — the tick sits on
`accent.muted` — even though no token value moves. `color-golden` and `content` are **not** run:
no colour maths and no corpus record changes.

## Risks and open questions

- **The acceptance criterion over-reaches and is amended, not quietly under-delivered.** It
  names "swatch, chip, card, tab and list row". **Card and list row do not exist** — they arrive
  in F-184 and F-186. The criterion is corrected to the three that exist, and F-184/F-186 gain
  the obligation to adopt the treatment rather than invent one. Writing a treatment for a
  component nobody has built is how a value with no consumer gets shipped
  [[a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing]].
- **Nobody has looked at it**, again. A tick badge on a 48 px sample is a judgement about
  crowding that no gate here can make. It joins F-175's attestation rather than pretending to
  be checked.
- **The tick is `icon.check`, whose type is derived from `statusPairing`.** Reusing it is right —
  a second tick glyph would be a duplicate — but the type name will read oddly at the call site.
  Noted rather than solved; renaming the token is an ADR about the manifest, not this feature.

## Out of scope

The card and the list row (F-184, F-186), the tab bar's own indicator (already accented in
F-175), pressed/hover feedback (F-189), and any change to focus behaviour beyond letting it and
selection be visible at the same time.
