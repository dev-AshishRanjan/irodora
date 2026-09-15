# A seasonal rule renames every profile it is published over

**Effect:** [E-129](../../state/effects.json) · `content/rules/seasonal-summary.*.json` →
`summariseSeason` (`@irodora/recommendation`) → `seasonalSummary` (`apps/mobile/src/profile/season.ts`)
→ `23.profile.label` (`derived:F-223`) → F-260, and through OQ-32 the notes in `07` and `13` · gates
11 and 4 · **high**

## Why the link exists

ADR-0102 made the seasonal label a summary computed from a profile's ranges each time it is read,
by a rule that is content. That is what keeps the label honest — it cannot outlive a corrected
range, it is withheld when a range is unestablished — and it is also what makes a publish powerful:
**moving one boundary relabels people nobody touched**, and changing one cell renames everyone whose
ranges fall in it. Nothing about a profile changes; what every profile is called does.

## What holds it

- **Gate 11** parses every published seasonal rule with the engine's own parser (totality,
  uniqueness, partitions, the closed vocabulary, rationales), checks its provenance and register
  source, compares its digest and cell count with the ledger, runs NFR-22 over its answers and over
  all 48 catalogue labels, refuses eleven in-memory spoilings beside the clean file — each for its
  own reason, the error class and the field it plants, never any exception at all — and prints the
  resolved table so a publish is read for what it does.
- **The app test** enumerates all 4,096 complete guided answer sets against the published rule and
  asserts the label distribution, the classes each axis reaches, and a minimum distance of 1e-3
  from any reachable statistic to a boundary; its symmetry assertion has a decoy with the boundary
  moved onto a reachable value, watched failing.
- **`generate-rules-bundle --check`** keeps the generated module and the ledger in step, and
  `seasonalRules()` refuses a bundle whose digest or cell count disagree.

## What it does not hold

Whether the label a surface draws **agrees with the rows beside it** is F-260's guard to build: the
summary carries a `basis` — the class of every range it summarised — so the pill can be checked
against each row, but no surface draws it yet. The Japanese words are unreviewed (OQ-5), and the
twelve-season convention is a convention, not an instrument (NFR-23, F-037).

## What the first published version does

Enumerated on 2026-09-15: of the 4,096 profiles the guided flow can produce, **3,136 get no
summary** and only four labels are reachable — winter deep and autumn deep (256 each), summer muted
and autumn muted (224 each).

The first version of this note said the rule "withholds exactly where it was written to". It does
not, and F-223's review measured why. The rule reads a range's midpoint against the phrase lexicon's
edges, which classify one colour; a guided range is two spread swatches plus padding, so its midpoint
never passes the light edge (0.6945 at most, against 0.725) or the vivid edge (0.092 at most, against
0.100). *Light* and *bright* are unreachable from the guided flow, the rule and the profile screen's
band chips disagree on three of sixteen answer patterns, and *deep* is reached by a margin of 0.003.
What the pill shows when there is no summary is OQ-33; which statistic and thresholds a range is
read by, and whether contrast is, is OQ-34. Either answer is a publish, and this link is what it
reaches — the app test's asserted distribution is what makes the publish say so.
