---
kind: lesson
title: A reading of one drawn instance is not the drawing's number
category: method
confidence: 0.9
created: 2026-10-06
scope: [packages/ui, mockups]
links: [a-controls-default-size-is-a-median-of-the-drawings]
---

# A reading of one drawn instance is not the drawing's number

**Encountered in F-235** (2026-10-05 to 2026-10-06).

F-235's plan took its numbers from the first instance of each drawn element: `21`'s sample at
61.5 dp, `24`'s field columns 74.5 and 92 dp apart, `08`'s label column at 66 dp, `13`'s columns at
0.73 and 0.82 of the row. When each display's recompute test took the **median over every drawn
instance** — five rows, four rows, five rules — every one of those moved: 60 (the default, after
all), 76 and 90.5, 66.5, and 0.458 and 0.553 (the plan's fractions were of another width). A row-1
reading is one sample of a JPEG with ±1 dp of noise, and the drawing's intent is what its instances
agree on.

## What to do

- **Recompute from every instance the screen draws**, and assert the median. Write the test before
  settling the constant, and let the test say what the number is.
- **Keep the planned value only as a reason, never as the answer**: a plan's reading that the median
  overturns is recorded in the plan's status row as changed, with the median.
- **The decoy is the value a single reading gave** where it differs: it proves the test reads the set,
  not the first element.
