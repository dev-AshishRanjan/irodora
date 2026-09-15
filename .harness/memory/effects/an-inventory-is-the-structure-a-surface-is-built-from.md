# An inventory is the structure a surface is built from

**Effect:** [E-128](../../state/effects.json) · `mockups/inventory/NN.json` → every surface feature
(`F-242` – `F-263`, the components `F-232` – `F-236`) · the conformance sweep (`F-221`) · PRD §10's open
questions · gate 2 · **high**

## Why the link exists

E-126 made an image and its index row move together. F-220 adds the third node: for each of the 28
images, a machine-readable list of every element it draws — its box, its dp at its screen's scale,
its token, face, icon, binding and action — and of every region that is not design. From here on a
surface feature builds from the inventory, not from a reading of the picture, and adds the
inventory's elements to the conformance sweep.

| change | what it now forces |
|---|---|
| an image is replaced | its row's sha256 **and** its inventory's `mockupSha256` — gate 2 is red until both move |
| an inventory element changes | the surface built from it, and that surface's sweep assertions |
| an open question in PRD §10 closes | every element it holds at `binding: null` or its drawn form, and the feature §11 says it blocks |
| a §4 rule or a §6 conflict is renamed or removed | every inventory citing it fails, because the check reads the ids from the contract |

## What holds it

- **`scripts/verify-mockups.mjs`** in gate 2 runs `inventoryProblems()` (`scripts/mockup-inventory.mjs`)
  over every inventory: required keys; ids unique and prefixed by their image; the order a strict
  sequence and, on a screen, the reading-order rule; parents before children; component and binding
  kinds; an `oq:` binding naming a question PRD §10 lists; dp equal to the box at its screen's scale;
  every box inside its image and its screen unless declared an overhang with a presentation region;
  departures citing a §4 rule and conflicts a §6 id.
- **The end condition** is F-220's status: once it is `done`, a null inventory fails. The proof
  plants both halves — the missing row with F-220 done (red) and with it not done (green) — each
  planting the status itself, so neither depends on what the set happens to contain.
- **`verify-mockups --prove`** plants 45 cases — 39 that must fail and 6 that must pass, each asserted by the name of the problem it produces.

## What it does not hold

The check reads the record, never the picture. Whether a box was read correctly is repeatable with
`mockups/tools/`, not enforced; a colour read from a render carries ΔE00 ≈ 2. Whether the built
screen matches is `F-221`'s capture and a person's attestation.

## What the first version got wrong

The null-inventory proof case relied on an image the set had not reached yet. The day the 28th
inventory was written it stopped discriminating — the full gate run caught it before F-220 closed.
