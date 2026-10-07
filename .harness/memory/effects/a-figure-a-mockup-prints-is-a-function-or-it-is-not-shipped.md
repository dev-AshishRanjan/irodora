# E-176 — A figure a mockup prints is a function, or it is not shipped

**Link:** ADR-0124 → `countsAsOutfit`, `profileConcordance`, `gapsAddressedBy`, `wardrobePairings`,
the inventories, F-244, F-257, F-258, F-260 **Guard:** gate 2 (bindings, claims); the predicate,
gap and concordance tests **Severity:** medium **Feature:** F-222

---

## Why B changes when A does

OQ-9 held four drawn figures with no definition. ADR-0124 gives each a computation or a defined figure
in its slot, and replaces three drawn words a claim rule forbids: *Similar* (03), the valid-outfit
label (13), *Garment Concordance* (23). The screens read these; none decides one.

## The shared predicate

`countsAsOutfit` is what `coverage()` counts with AND what 13's label says, so FR-42's threshold
moves both together. The test brute-forces the predicate against `coverage().valid` at four
thresholds, including one an outfit scores exactly — the case a strict comparison would miss.
