# E-230 — A search point is a question its sliders print, and its words must hold

**Link:** `apps/mobile/src/finder-readout.ts` → `09`'s Finder, `finder.ts#findAs` and `#rankedFrom`, the medoid, the lexicon
**Guard:** `finder-readout.test` over every case the data allows; `finder-fidelity.test`, `finder-states.test`, the `09.screen` sweep **Severity:** high **Feature:** F-250

---

## What it couples

`09` reads a query as a set and a point (ADR-0158): a hex at its own OKLCh over the whole corpus, a
phrase or a name at its set's medoid over the set. The sliders print that point — L to whole percent,
C to 3 dp, h to whole degrees — and after each figure the locale's lexicon terms whose region holds
the PRINTED point, each read on its naming axis (ADR-0159). The cards are the set ranked by ΔE00 from
the point as held.

So four things must agree on every change: the figure, the word beside it, the point the ΔE00s are
measured from, and the set the query named. A new precision, a moved band edge, a term that
constrains a second axis, or a set built a second way breaks one of them silently.

## What it does not guard

- **Whether the words read well in Japanese.** The lexicon's Japanese terms are unreviewed by a
  competent speaker (ADR-0060), and its gaps print 該当語なし often (F-353, F-356).
- **Drag cost on a device.** Every slider tick re-ranks through the corpus in the render that makes it;
  that it is fast enough is the attested half of criterion 5.
