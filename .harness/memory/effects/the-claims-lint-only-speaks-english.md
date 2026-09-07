# The claims lint only speaks English

**Effect:** [E-089](../../state/effects.json) · `apps/mobile/src/i18n/ja.ts` →
`scripts/verify-claims.mjs`, `.harness/verification/claims.json` · **high**

## What happened

While rewriting Home's copy I went to edit `home.lastReading` in the Japanese catalogue and found:

```ts
'home.lastReading': '最後の測定',     // "the last MEASUREMENT"
'home.noReadings': 'まだ測定がありません',   // "no MEASUREMENTS yet"
```

測定 is *measurement*. A camera reading is `estimated` provenance, and ADR-0031 binds that word to
`reference` and `calibrated` — the two sources with an instrument behind them. **The Japanese
Home screen had been calling an estimate a measurement**, which is golden rule 11 broken in the
one place it is most damaging: the front door.

The claims gate was green throughout, and correctly by its own lights. It walks **every file in
the repository**, including `ja.ts` — and every one of its eleven banned patterns is ASCII: the
ones about exactness, about a colour being the true or the actual one, about a numeric accuracy
percentage, about laboratory or professional grading, about guarantees, about the
machine-learning marketing phrase this category leans on, and about the app doing the measuring
itself.

*(Listed rather than quoted, because writing them out here trips the gate — which it did, three
times, on this very note and on the records beside it. A lint that catches you explaining it is a
lint that works.)*

So half of the product's user-facing copy has never been checked for the rule the product cares
about most.

## The part worth keeping

**A checker's scope can be defined by its patterns rather than by its file list**, and those two
look identical from the outside. Every previous blind spot recorded here was a checker that could
not *see* its subject — a style engine resolving in Metro, colour arriving as an SVG prop, a
signature reading the wrong axis. This one **read every byte of the file** and had nothing to say
about it, because the thing it knows how to recognise is written in one language.

*"It scans everything"* and *"it checks everything"* are different claims, and the first one is
the one that gets stated.

## Six of the eight uses were fine, and that is the interesting half

The other 測定 uses are on the `measure` screen — 「お手持ちの測定器の値を入力すると」, *enter the
values from your own measuring device*. Those are **correct**: the person really did measure it,
with an instrument, and that is exactly the provenance the word is reserved for.

So the fix is not "ban 測定". It is the same shape the English list already has — ban the specific
overstatements, not the vocabulary — and getting that right in Japanese needs somebody who reads
Japanese. **Widening the gate on my own guess would be inventing a policy in a language I cannot
audit**, which is how a lint ends up either useless or blocking correct copy.

Two defects fixed here; the gate's scope is recorded as **F-172** rather than half-done.

## And the smaller thing underneath it

`home.title` — *"The engine is running on this device"* — was deleted, and the e2e journey spec
refused: `message key "home.title" is not in the catalogue`. That is the flow generator doing
exactly its job, and worth noting as the good case: **a deleted string had one consumer outside
the app, and the gate named it by file and step number** rather than letting a journey fail on a
device months later.

Related: [[a-second-technology-a-second-blind-spot]] ·
[[two-thorough-checks-and-neither-looked-at-a-pair]]
