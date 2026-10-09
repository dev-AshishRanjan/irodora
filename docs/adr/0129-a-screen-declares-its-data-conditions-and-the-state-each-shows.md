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

As built (F-236 increment 12):

- `shows` is set on **every** subject of a screen that declares a condition, empty where the
  subject renders no state. A subject of such a screen that leaves it unset is named. That is what
  lets §4's zero rule reach the subject where a forgotten empty branch would print its zero.
- A subject that **claims** a state it does not render is named too, so `shows` cannot run ahead
  of the tree.
- Every subject is rendered in its first required state, in light. The registry gained eight
  subjects to witness conditions no subject drew: the Atlas and the Finder finding nothing, a
  colour the corpus does not hold on five screens, and the Lens refusing a capture.

### 4. Two rules catch the nothing the states replace

- **A blank panel is refused.** That is a node painted with a surface colour, or a `Card`, with no
  text, accessible name or image anywhere beneath it.
  - **A panel is sized by what it holds.** The grounds are the elevations above the page:
    `surface.1` to `surface.3`, read from the manifest's levels.
  - **A mark is not a panel.** That is a box drawn smaller than the tap target in either
    direction, or laid over something in absolute position: a rule, a track, a knob, a handle, an
    indicator, a selection frame. Read literally, the rule's first run over the component registry
    flagged only marks of these kinds. Its first form exempted any set size, so an empty panel
    160 dp tall passed; the review narrowed it (S3).
  - **A box inside a named element is part of it.** A sample inside a named swatch is announced by
    the swatch, and its colour can equal a surface token by coincidence. On Combinations a
    generated companion lands on `#FFFFFF`, light `surface.1`. No corpus or CVD colour equals a
    surface token in any palette (the review's M3; an earlier text said a corpus colour did). An
    earlier form exempted every box painted a declared sample hex, which blinded the light pass to a
    blank `surface.1` panel on any subject declaring `#FFFFFF`.
  - **Content is drawn.** Text, an accessible name, an image, a field, or an SVG element that draws
    a shape. An empty `<Svg>` is not content (S3).
- **A bare zero is refused.** In a subject that declares a condition, a figure of zero standing
  for "nothing" is refused: a paragraph that is, whole, "0", "0%", "0 pieces", "0 garments in your
  wardrobe.", "0件". A zero that is part of a reading passes: "Showing 0 / 120", "0 of 12",
  "#20232A", "0.00".

`blank-panel` runs in `checkAll`, so every subject in both registries is held to it, in both themes
and both locales. `bare-zero` runs only on subjects with `shows`: every subject of a screen that
declares a condition. It never runs on the component registry, or on AddGarment and ProfileSetup,
which declare none (M4).

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
- **A labelled zero is read as a value.** Shopping's "New outfits this would add: 0" is a computed
  answer (buying this adds nothing), and "In your wardrobe: 0" was a tally of nothing. The two have
  one form, so a rule that refused both would refuse an answer. A labelled tally of stored things is
  the screen's to handle and a reviewer's to see. AddGarment's tally was one, and is now drawn only
  when there is something to count (F-236's review, S3).
- **The mark bound is a size.** A blank panel drawn smaller than the tap target, or in absolute
  position, is read as a mark and passes.

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
