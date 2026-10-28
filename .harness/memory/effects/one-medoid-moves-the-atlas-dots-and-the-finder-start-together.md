# E-231 — One medoid moves the Atlas's dots and the Finder's start together

**Link:** `apps/mobile/src/medoid.ts#medoid` → `atlas.ts#familyDotEntry` (`05`) and `finder-readout.ts` (`09`)
**Guard:** `medoid.test` (the rule stated in the test over every family group and the whole corpus; the tie; a decoy); `atlas.test`; `finder-readout.test` **Severity:** medium **Feature:** F-250

---

## Why one function

`05` draws each family chip's dot in its group's medoid (ADR-0143 D4); `09` puts its search point at
the medoid of the set a query names, and at the corpus's while the field is empty (ADR-0158 D2). Both
want a real corpus colour chosen by a stated rule, so both read one definition. A second copy of the
loop would be a second answer to one question.

## What moves with it

A change to the metric, the Lab it reads (the record's, not the hex's) or the tie moves `05`'s dots and
`09`'s start and every phrase's first card at once. The corpus medoid is pinned (`hai-suna`) so the
move is seen as a number.
