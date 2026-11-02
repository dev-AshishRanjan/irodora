# E-236 — A slot holds one colour, and a lock holds it

**Link:** `apps/mobile/src/palette.ts` (slots, category, lock) → `16`, `10`’s card form, the schema
**Guard:** `palette.test` (96 shapes, every slot pair × lock); the states test’s refusals **Severity:** high **Feature:** F-251

---

## The shapes

- One colour a role, members in slot order; rank is a filled slot’s place, weights `deriveWeights`’.
- A held colour moves; the slot’s own colour chosen again leaves it; a locked slot keeps its colour.
- A stored palette with a role held twice is not opened in the slots: Edit says why.

## What it does not guard

- The kasane layer floor (ΔE00 > 5) on a device draft: gate 11 checks the corpus only.
