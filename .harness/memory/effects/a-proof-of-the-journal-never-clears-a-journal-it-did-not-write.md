# E-202 — A proof of the journal never clears a journal it did not write

**Link:** `scripts/plant-proof.mjs` → every leftover journal, and so `plant.mjs#recover` (E-094)
**Guard:** `plant-proof` in `lint` and `ci.yml`: a second run refuses over a journal it did not
write and leaves it byte for byte; no other script imports `JOURNAL` or `recover` or names the file
**Severity:** high **Feature:** F-296

---

## Why B changes when A does

The journal holds the only record of a plant a killed proof left, and the bytes to undo it.
`plant-proof` proves the journal by planting and killing children of its own. It used to make room
for them with `rmSync(JOURNAL)`, at the start of every case and in its `finally`. It runs after other
proofs in `pnpm lint` and in `ci.yml`, so it deleted whatever they had left:

- **F-291:** the record of two real plants, one of them a CI step deleted from `ci.yml`, with both
  plants still in the tree;
- **every run since F-232:** the a11y proof's leaked entry. Its tap-target case cannot plant (F-324),
  and it opened its journal before finding that out. The leak was invisible because the very next
  CI step deleted it.

Its baseline, "no plant is outstanding", was asserted after that deletion, so it could not fail.

## What holds it now

- `plant-proof` refuses to start while any journal exists, and names the files and owners.
- It clears only entries its own two child owners wrote, through `recover()`.
- A case runs it again over a foreign leftover; the journal must survive byte for byte.
- No other script can reach the journal's path or `recover` — a person acts, through
  `node scripts/plant.mjs --recover`.
- The a11y proof opens its journal only once a case can plant.

## What it does not do

It does not stop a proof opening its journal before an early exit (F-271, E-127), and it does not
retry a restore (F-333). Both still leave a leftover — now one that survives until a person acts,
which is the point.
