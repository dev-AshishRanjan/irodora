# A changed image is a changed specification

**Effect:** [E-126](../../state/effects.json) · `mockups/index.json` → the fidelity specification
§7 · `feature_list.json` · gates 0 and 2 · **high**

## Why the link exists

Golden rule 14 made `mockups/` the specification for everything a person can see. Until F-218 the
only statement of which image governs which route was a markdown table, and three failures were
silent:

| failure | what it becomes |
|---|---|
| a route nobody drew | a screen an agent designs by taste — the thing rule 14 forbids |
| an image that governs nothing | a picture every feature is free to ignore |
| an image that changes | every feature built from it now checks against a picture nobody specified |

## What holds it

- **The hash.** Each row pins its image by sha256. Replacing `06_color_detail_centerpiece.jpg`
  with a new render turns gate 2 red until the row — and, once F-220 writes it, the inventory —
  moves with it. The image and its specification change in one commit or not at all.
- **One primary per route.** A second primary is a screen with two layouts; the conflict register
  resolves which, not the implementer.
- **The undrawn list is not an escape hatch.** A route may lack a mockup only while an open
  question in PRD §10 asks for one — `/profile/measure` waits on OQ-7 — and the check fails once
  the question disappears or the route is drawn.
- **The two maps are compared as sets, column by column.** `R9-MOCKUP-FIDELITY.md` §7 is what a
  person reads; the index is what the build reads. §7's governing column must name exactly the
  index's primaries for a route and its variants column exactly its variants — a missing id and an
  extra one both fail.

## The inventory half, and who owns it

An inventory (F-220) records the sha256 of the image it describes. One written against a different
image fails today. **Once F-220 is done, a null inventory fails as well** — the check reads F-220's
status, and F-220's acceptance carries the criterion — so after F-220 an image cannot change without
the structure it describes, and nobody has to remember to switch that on.

## What the first version got wrong

The evaluator found the §7 comparison checked only that each primary appeared somewhere on the row:
mockup 27 was a state of Home in §7 and not in the index, and the gate could not see it. It also
found the inventory gap recorded as "not guarded yet" with no feature owning it, which golden rule 5
does not allow. Both are closed, and the proof grew from 15 cases to 27 — every branch the evaluator
could delete with the proof still green now has a case that goes red when it is deleted.

The second evaluation passed, and found three more gaps it could still delete without a red case:
the scope walk that makes gate 0 read `mockups/AGENTS.md`, the narrowing of the open-question lookup
to PRD §10, and the rows of §7 that are not routes. Each has a case now — **30 in all, 26 that must
fail and 4 that must pass.**
