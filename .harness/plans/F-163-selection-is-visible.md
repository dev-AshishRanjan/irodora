# F-163 — Selection is visible, and nothing has a stray outline

**Status:** in_progress · **Release:** R6 · **Blocked by:** F-161 (done)

> **This plan was written after the work had started, and gate 0 caught that** — golden rule 3
> says a plan exists before source is edited. It is written from what the code turned out to be
> rather than from what I assumed, which is worse than planning first and better than pretending
> the order was different. Two of the four things below are corrections to my own first attempt.

---

## Two reports, one subject: what a surface says about its own state

- *"we are seeing a white border/outline … in navbar and around colors. This looks unprofessional"*
- *"Anytime we select something, it should be marked/highlighted … if it's selectable"*

---

## The outlines are two different causes

### The navbar

`tabBarStyle` sets `borderTopWidth: 1` in `border.strong`. `surface.1` already separates the bar
from `background` — that is what a tonal elevation system is *for*, and ADR-0044's *"elevation
lifts by tint, never by shadow"* is the same argument one step along. A line on top of a tint is
the system not trusting itself. It goes.

### Around colours — and the fix was already implied by the proof

The halo is the `Swatch` keyline, and the component drew its two tones in a **fixed order**:
`swatch.hairline` always against the sample, `swatch.hairline.inverse` always outside it. On the
dark theme `hairline` is `#F6F5F3`, so **every pale sample was ringed in white**.

`swatch-edge.test.ts` scans the gamut with `worstCase([tone, inverse])` — it takes **the better of
the two** against each sample and asserts the worst such best clears the floor. So the guarantee
has always been *"for any sample, at least one of these contrasts"*, and the component was
satisfying its letter while ignoring its point.

**Choosing the better tone for the inner ring is strictly stronger than what was proved and uses
the same evidence.** The other tone stays one pixel further out, guaranteeing an edge against the
*well* — which is a known colour, so it is the easy half. F-068 is untouched.

---

## Selection: the product was in better shape than the report

`Chip` and `Swatch` both carry three channels already — a tick in the accessible name,
`accessibilityState.selected`, and a ground change — and `ProfileSetup` uses `Chip` for every
band. The selectable things are marked.

**What was missing was a rule**, so the next selectable component cannot ship with only a
highlight. `checkSubject` already required `disabled` and `loading` to be announced and said
nothing about `active`.

### `active` is overloaded, and the first draft of the rule was wrong

Requiring `accessibilityState.selected` for every active subject flagged `Button`, `SearchField`
and `TextField` — where `active` means *being pressed or typed into*, not *chosen*. Three false
positives on components doing nothing wrong, which is how a rule gets deleted.

So the **registry declares it**: `selectable: true`, one word beside the subject, the same shape
as `sampleValues` and `forbiddenNames` — both of which are also facts about a component that no
tree can report.

### And the wardrobe cell is not selectable at all

My first attempt marked the open garment's cell. **That state can never be seen**: tapping a cell
sets `selectedId`, and the screen then renders the *editor*, which replaces the grid. A marked
cell would have been unreachable code with a test asserting it.

What the cell was actually missing is the other half of the report — **a tap should visibly
register**. It is a hand-rolled `Pressable` with a static style, so nothing happened until the
editor appeared. Opacity on press, because `motion.animatable` is opacity and transform and
`verify-motion` rejects anything else.

---

## Risks

**The keyline choice moves a decision from a designer to a function.** Which tone touches the
sample now depends on the sample, so two swatches side by side can have differently-coloured
edges. That is correct — each is the better edge for its own colour — and it will look like an
inconsistency to anyone who does not know why.

**Press opacity is a guess at a feel.** 0.7 is enough to register and not enough to look broken,
which is a sentence, not a measurement.

---

## Definition of done

- [ ] The navbar rule is gone; `surface.1` does the separating
- [ ] The keyline puts its better tone against the sample, in both themes, with tests
- [ ] Both tones are still drawn — the guarantee is not traded for the halo
- [ ] A conformance rule fails a selectable component that only highlights, with decoys both ways
- [ ] A tap on a gallery cell visibly registers
- [ ] `pnpm verify:ci` green
