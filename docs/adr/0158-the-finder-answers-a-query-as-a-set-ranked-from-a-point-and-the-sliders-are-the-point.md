# ADR-0158: The Finder answers a query as a set ranked by ΔE00 from a point, and the sliders are the point

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-27 |
| **Feature** | F-250 |
| **Applies** | Golden rules 11, 12, 14; FR-47; R9 §4 E1/E4, §8; [ADR-0143](0143-the-atlas-controls-do-what-05-draws-and-its-overflow-holds-the-facets-05-does-not-draw.md) D1 (one ranking route) and D4 (the medoid); E-003, E-015, E-210, E-229 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`09` draws a query field, three perceptual dimensions (OKLCh lightness, chroma and hue, each a slider
with its value) and *"Instantaneous nearest results ranked by ΔE00"* under them. Nothing in `09`
draws how the three relate, so the model is this feature's to decide.

`finder.ts#find()` answers a query three ways (F-021, FR-47): a hex with its nearest `HEX_LIMIT` (8)
by ΔE00; a phrase with the lexicon region's entries, unranked; anything else with a substring match
over each entry's kanji, kana, romaji, English name and slug. Two other surfaces read it: the Atlas's
field (E-210) and Compare's chooser (E-229). The Lens ranks through `nearestByOklch`.

FR-47's acceptance is that *"a hex query returns its nearest entries; a phrase query maps to a
lightness/chroma/hue region deterministically"*. `09` adds a ranking to every answer and a point a
person can move.

## Decision

- **D1. `find()` keeps its contract.** `findAs(query, reading)` is added: it reads the text as the
  kind a person chose. `find(q)` equals `findAs(q, find(q).kind)` for every query, so the Atlas and
  Compare read exactly what they read today.
- **D2. A query names a set, and sets a point:**

  | query | set | point (what the sliders show) |
  |---|---|---|
  | a hex | the whole corpus | the hex's own OKLCh, through the engine (`hexToXyz` → `xyzToOklch`) |
  | a phrase | the region's entries (`find(q).entries`) | the set's medoid |
  | a name | `byName(q)` | the set's medoid |
  | the empty field | the whole corpus | the corpus medoid |

  The medoid is ADR-0143 D4's: the member whose summed CIEDE2000 to the others, over each entry's
  published Lab, is least, ties to the earlier slug. One function (`medoid.ts`) serves the Atlas's
  family dots and the Finder; a second copy would be a second definition.
- **D3. The results are the set, ranked through the one route.** `nearestByOklch(point, corpus
  size)`, narrowed to the set, as the Atlas narrows it (ADR-0143 D1). A named set is shown whole; the
  whole corpus is shown as its nearest `HEX_LIMIT`. So a hex lists exactly `find(q).entries`, with the
  same distances (E-210), and a phrase or a name lists its first card at its own medoid, ΔE00 0.00.
- **D4. A slider moves one axis of the point.** The set stays, and the results re-rank in the same
  render — the drawn *"Instantaneous"*. A new answer resets the point; an answer with no entries leaves
  it where it was and shows `00`'s caption (ADR-0160 D8).
- **D5. The point is held as set.** The sliders print it at their precision (ADR-0159 D1), and every
  card's ΔE00 is measured from the point as held.
- **D6. The point is a search target (rule 11).** It is never drawn as a colour, never called a
  measurement, and spoken as *the search point*. No sample of it is drawn: `09` draws none, and a
  colour without corpus provenance would be rule 12's problem.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| The results always the corpus's nearest N; the query only sets the point | Loses FR-47's region answer and every name match but the nearest few |
| A phrase's point at its region's centre | *dark* centres at L 0.1975, darker than any entry; an axis the phrase does not constrain has no centre |
| The region's centroid (mean OKLab) | A colour no entry holds; chroma collapses as opposing hues average |
| A slider move ends the query (the whole corpus) | The field would describe results it no longer filters |
| The empty field lists nothing (the old screen) | Three sliders that move nothing |
| A named set cut at 8 | Hides region members with no drawn count to say so |

## Evidence, and its limits

The census over corpus 2026.08.1 and lexicon 2026.08.1 (F-250, increment 1; a scratch reader, not
committed — `finder-readout.test` pins what it relies on):

- **The corpus medoid** is *hai-suna* (`#87817A`), printed 61 % · 0.012 · 72°. None of `09`'s 48 %,
  0.045 or 142°.
- **Every term's own region, read at its medoid, reads that term** — 27 of 28; *pink* holds no entry.
- **Phrases:** of 5,220 English queries of one to three distinct terms, 2,010 resolve and 729 hold an
  entry; the largest set is 62 (*muted*). Japanese: 258 of 820 resolve, 156 hold an entry.
- **Names:** a single letter matches up to 106 entries (*a*); a whole name form matches at most 2.
- **A typed corpus hex is not its record.** Every entry's hex is its record rounded to 8 bits: the
  hex's own point lies ΔE00 0.08–0.58 from the record. A hex answer measures from the hex typed, so the
  entry it came from prints a small ΔE00, not 0.00. That is the true distance, and it is shown.
- **The fixture phrase**, chosen by the plan's rule: *dark muted green* holds 3 (fewer than 4), so
  *muted green*, which holds 12 at *yama-kage*, printed 53 % · 0.050 · 148°, chroma *Muted / Soft*.

ΔE00 is not a metric (it can break the triangle inequality); the medoid is still well defined as a
least sum. The medoid is chosen for being a real corpus colour with provenance and a stated rule, not
for being a perceptual centre.

## Consequences

- `screens.test`'s *no ΔE00 on a phrase answer* is reversed: the point is drawn, so every figure has
  a question behind it.
- E-210's and E-229's guards hold unchanged. E-230 (the readout) and E-231 (the medoid) are new.
- A Japanese reader's start state reads no term on any axis (ADR-0159's census) — the lexicon's gaps,
  not this model's.

## Revisit when

A mockup draws a region, a count or a sample of the point; the lexicon gains weights; a person asks
that a slider leave the set.
