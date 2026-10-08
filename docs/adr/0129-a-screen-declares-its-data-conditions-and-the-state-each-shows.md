# ADR-0129 — A screen declares its data conditions and the state each shows

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-08 |
| **Feature** | F-236 |
| **Builds on** | [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md) (the four states and what each draws) |
| **Applies** | R9-MOCKUP-FIDELITY §8 row 27; golden rules 13 and 14; NFR-8, NFR-9; F-236 criterion 2 |
| **Decided on** | F-236's second criterion; where it leaves something open, the delegation of 2026-10-05 (*"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."*) |

---

## Context

F-236's second criterion asks that every screen declare which of the four states it shows in each
data condition, and that a test hold it to that. Before F-236, nothing recorded which states a
screen shows. Some screens drew an `EmptyState`, some an inline sentence, some a bare `0`, some
nothing.

Three problems followed:

- **Coverage could not be counted.** A screen that forgot its empty branch failed silently; the
  conformance suite only checks what it is given.
- **"Data condition" was undefined.** F-152 found the stores' reads synchronous, so most screens are
  never pending. A loading state declared everywhere would be a skeleton nobody can reach.
- **Some nothing slips past the existing checks.** A blank card or a printed `0` in place of
  "nothing" has no text the suite can fault and no colour to measure.

## Decisions

### 1. A data condition is a state of the data a panel exists to show

There are four, and each shows one of ADR-0128's states:

| condition | means | state |
|---|---|---|
| `absent` | the panel has nothing to show | `empty`, in one of its two forms |
| `pending` | the data is being produced, and the time is real | `working` |
| `refused` | the pipeline declined the input, with a reason | `refused` |
| `notPermitted` | the platform has not granted what the panel needs | `denied`, or its ask form while the permission is undetermined |

Two things are **not** data conditions:

- **Feedback about an action just taken:**
  - the Lens's `failed`;
  - `AddGarment`'s refused file;
  - Export's saved or failed message.

  The panel's data has not changed state; the person is told what happened to what they did.
- **A fault:** `CameraUnavailable`, F-117's error boundary for a build defect, is a fault, not a
  condition.

### 2. Every screen module declares, even when the answer is "none"

Every module in `apps/mobile/src/screens/` exports `STATES: ScreenStates` from
`apps/mobile/src/states.ts`. It is a record from each condition the screen can reach to the state
it shows there. An empty record is a declaration: the screen has no condition to show. It is never
an omission, because the module must export the name.

### 3. The registry holds a screen to its declaration, in both directions

Each subject in the app's conformance registry that renders a state names it in `shows`, typed from
its module's `STATES`, so a subject cannot claim a state its screen does not declare. The
declarations test then checks:

- **every declared condition has a subject** that renders that state's root (`state.empty`,
  `state.working`, `state.refused`, `state.denied`);
- **every subject that renders a state's root declares it**;
- **every screen module exports `STATES`**.

Each check carries a decoy that must fail: a planted condition with no subject, a subject that
renders a state it does not declare, and a module without the export.

### 4. Two rules catch the nothing the states replace

- **A blank panel is refused.** That is a node painted with a surface colour, or a `Card`, with no
  text, accessible name or image anywhere beneath it.
- **A bare zero is refused.** In a subject that declares a condition, a figure of zero standing
  for "nothing" is refused: "0%", "0 pieces", "0件". A zero that is part of a reading passes:
  "Showing 0 / 120", "#20232A".

Both run in `checkAll`, so every subject in both registries is held to them in both themes and both
locales.

## Consequences

**Good.**

- Coverage is countable. A new screen cannot ship without saying what it shows when there is
  nothing.
- The screen features F-242 to F-263 inherit the declaration and its test.

**Bad.**

- **Invisible conditions stay invisible.** A condition nobody declares and no subject renders goes
  unseen: the test holds a declaration, not the truth of it (R8). A screen whose empty branch is
  undeclared and unregistered still passes. Review is the guard there.
- **Every screen module carries an export**, even when it is `{}`.
- **The zero rule reads text.** A zero drawn as a picture, or spelled out ("none"), is outside it.

**Neutral.** Feedback and faults stay where they are and are not counted here.

## Alternatives considered

- **Infer the conditions from the code.** Static analysis of the branches would need no
  declaration. But a branch is not a condition, a condition can live in a child, and the inference
  would be a second implementation of every screen, which the repository has learned not to trust
  (a check that reimplements its subject agrees with it on the day it is written).
- **Declare loading everywhere.** Uniform. But most reads are synchronous (F-152), so the state
  would be unreachable, and a declared state no person can see is a claim the test cannot hold.
- **One registry of conditions outside the screens.** One place to read. But it drifts from the
  modules it describes. The export sits beside the code it describes, and the type system ties the
  subjects to it.

## Revisit when

- A store becomes asynchronous. `pending` then reaches screens that declare none today.
- A mockup draws a fifth state.
- The blank-panel or zero rule refuses something a mockup draws on purpose. The rule then needs an
  exception with its element, not a weaker rule.
