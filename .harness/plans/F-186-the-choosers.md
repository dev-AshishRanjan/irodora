# Plan: F-186 — The choosers

| | |
|---|---|
| **Feature** | F-186 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-9 |
| **Package** | `@irodora/ui` · `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

The criterion named six components — list, menu, checkbox, radio, tags and avatar — and its
third clause is the one that matters: *"A component that adds no behaviour over a styled box is
refused rather than wrapped."*

Reading the code first, **five of the six have no consumer**, and the sixth is a real
accessibility defect affecting twelve places.

## What was found, before deciding what to build

There are **twelve single-select rows** across the screens — the Atlas's five filters, the
Lens's mode, the wardrobe's, and ProfileSetup's four bands. Every one is a row of `Chip`s, and a
chip is a `button` carrying `accessibilityState.selected` and a tick in its name. So a screen
reader hears:

> *"Warm, button, selected. Cool, button. Neutral, button."*

Three unrelated buttons, one of which happens to be on. What it should hear is:

> *"Temperature, radio group. Warm, radio button, selected, 1 of 3."*

**The group, the count and the position are all missing**, and none of them can be added to a
chip — they are properties of the *set*, and a set of siblings is not a thing.

## Approach

**`ChoiceGroup`, wrapping `RadioGroup`.** The inherited behaviour is `role="radiogroup"` and
`role="radio"`, read out of HeroUI's source rather than assumed — after F-185 found a component
that accepted a colour and painted black anyway.

**The chips are not reused inside it.** A `Chip` is a `Pressable`; rendering one inside a
`RadioGroup.Item`, which is also pressable, nests two controls and announces both. The item
draws `selectionTone` directly: one treatment, one control, one announcement. `Chip` stays the
right component for a row where *any number* may be on.

**`null` is a value.** Every one of the twelve rows has an "All". That is not the absence of a
choice, it is the choice to impose none, and the sentinel is translated at this boundary rather
than at twelve call sites each picking their own.

**The five with no consumer are refused, and that is criterion 3 being met rather than dodged:**

| | why not |
|---|---|
| `Menu` | nothing in the product opens one |
| `Avatar` | there are no people in this app |
| `TagGroup` | multi-select exists nowhere; `Chip` covers it when it does |
| `Checkbox` | the one boolean is a preference, and `Switch` already wraps it |
| `ListGroup` | adds no behaviour over `Stack` + `Surface`, which is the rule's own example |

## Files to touch

```
packages/ui/src/ChoiceGroup.tsx           — new
packages/ui/src/testing/tree.ts           — announcedStates
packages/ui/src/testing/conformance.ts    — the state rules ask about the subject
packages/ui/test/conformance.test.tsx     — the subject, and three decoys
apps/mobile/src/screens/Atlas.tsx         — five filters become five groups
```

## The conformance suite had to change, and that is the interesting half

Its three state rules — `disabled`, `loading`, `selected` — were **per node**. That is the same
question while a subject is one control, and every subject was one, until this.

A radio group is four controls of which exactly one is chosen, so the per-node form reported the
three that correctly are not: **nine findings per theme, none of them a defect**, on a component
doing the thing a radio group is for.

*"Anything selectable shows whether it is selected"* is a claim about the **subject**. The tally
is now collected across the tree and judged once — and the announcement is read from **any**
node, because a group announces its own unavailability once on the container rather than four
times, once per option.

Three decoys hold both directions: a group where exactly one option announces passes; one where
nothing announces is still reported; and an announcement made on a plain container is read.

## Verification

`typecheck · lint · format · test · a11y · contrast · build · state`. Not run: `cvd`,
`color-golden`, `content`.

## Risks

- **The horizontal scroll is gone from the Atlas filters.** Deliberate, and a gain: a group
  wraps, so no option is off-screen with nothing to say it is there. A horizontally scrolling
  filter row hides its own contents, which is what somebody reports as *"the filter does not
  have X"* when X is two swipes right. Nobody has seen the wrapped form on a phone.
- **Eight of the twelve rows are still chips.** The Atlas's five are converted; the Lens's mode,
  the wardrobe's and ProfileSetup's four are not, and converting them is F-203's sweep.

## Out of scope

The other eight rows, and the five refused components.
