---
kind: lesson
title: A compound mutation reports a miss only if every part misses
category: convention
confidence: 1.0
created: 2026-08-20
scope: [root]
links: [[a-decoy-that-is-not-broken-proves-nothing]], [[a-decoy-written-against-old-values-quietly-stops-discriminating]], [[a-task-runner-that-walks-packages-cannot-see-a-file-outside-one]], [[prose-in-a-state-file-rots-and-no-schema-can-see-it]]
---

# A compound mutation reports a miss only if every part misses

`verify-contrast-proof.mjs` plants a change, runs a gate, and asserts it goes red. Its guard
against rot is one comparison: **if the mutated text equals the original, the anchor has moved
and the case says so.** That guard works — until a case makes *two* edits.

F-068 and F-070 reformatted `design-system.manifest.json` from compact to expanded JSON. Four
cases anchored on the old text. Three of them announced it:

```
?? gate 9 — the recorded salience rank swapped (F-067): MUTATION DID NOT APPLY
?? gate 9 — a token nudged below AA:                    MUTATION DID NOT APPLY
?? gate 10 — success rotated 84 degrees toward caution: MUTATION DID NOT APPLY
```

**The fourth said nothing at all.** Its mutation was a chain:

```js
s.replace('"status": "approved",', '"status": "placeholder",')
 .replace('"status.warn":   { "oklch": { "l": 0.540, …', …)
```

The first replace still matched, so `mutated !== original` and the case looked applied. The
second — the half that plants the *real failure* — silently did nothing. Its name is
*"report-only under a placeholder status, **WITH a real failure present**"*, and for two features
it had been asserting that a placeholder status is report-only about **nothing**. It printed
`OK` the whole time.

## Why this is worse than the loud three

The three that broke were **fixed by reading the output**. The fourth needed someone to notice
that a passing case's *name* no longer described what it did. A red check gets attention; a green
check that has quietly stopped testing anything gets none, and it is indistinguishable from a
working one until the day it was supposed to catch something.

## The fix, and why it is not "split the chain"

Splitting into two cases would restore the miss report and would rot again the next time anyone
touches the file. **The text was never the thing being asserted.** These cases mean *"set this
value to that value"* — a path and a value — so that is what they say now:

```js
mutate: (s) => jsonEdit(s, WARN, WARN_NOW, WARN_TOO_LIGHT)
```

`jsonEdit` parses, asserts the current value **is what the case believes it is**, sets the new
one, and re-serialises. Reformatting cannot touch it. Retuning a token cannot silently redirect
it either — the assertion throws and names the path, both values, and what to do:

```
color.light.status.warn.oklch holds {"l":0.55,…}, expected {"l":0.54,…} — the manifest was
retuned and this mutation is no longer the change its name describes.
```

Watched: planted a retune, saw it throw; restored, saw all ten proofs hold.

## The general form

**A check that detects its own rot needs the detection to cover every part it depends on.** Any
"did my setup actually apply" guard that reduces several conditions to one boolean — a chained
replace, an `||` across probes, a single `changed?` flag — reports only the case where *all* of
them failed. The partial failure, which is the likely one, passes through as success.

And the deeper form: **anchor on meaning, not on formatting.** A text match on a generated or
formatted file is a bet that nobody will ever run a formatter over it. Someone always does.
