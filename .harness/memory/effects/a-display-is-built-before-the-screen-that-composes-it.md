# E-168 — A display is built before the screen that composes it

**Link:** the data displays in `@irodora/ui` (`ReadoutTable`, `DeltaBars`, `ProximityHeadline`,
`CoverageDial`, `Radar`, `MetricTile`, `FactorRows`, `RankedRow`, `StepPill`, `Carousel`, `PageDots`)
→ the screen features that compose them (F-245, F-247, F-249, F-252–F-255, F-257–F-260)
**Guard:** each display's conformance subjects in four palettes, and its recompute test
(`readout`, `delta`, `charts`, `rows`, `carousel`) **Severity:** medium **Feature:** F-235

---

## Why B changes when A does

F-235 built every display the mockups draw before any screen used one, each to the screen that
draws it, with its numbers recomputed from that screen's inventory. A screen feature composes a
display; it does not re-draw it. So a change to a display — a constant, a form, what its accessible
name says — reaches every screen that composes it at once, and the screens' own sweeps see it only
when they run.

What each display leaves to its caller is the part a screen owns: the slot's content (E1), the
band's words (F-222), the ink a token not yet minted would take (E-170), and for a carousel the
items and their names. A screen feature that finds itself styling a display's insides has found a
display that is wrong, and fixes it here, with its recompute test.

The forms are by type: a `RankedRow` in `harmony` form refuses a `rank`, a `fields` row an `action`.
A screen that needs what its drawing does not have is a question for the drawing, not a new prop.

Related: [[a-controls-default-size-is-a-median-of-the-drawings]], [[an-inventory-is-the-structure-a-surface-is-built-from]]
