# E-199 — A list arrives once

**Link:** `motion.tsx#Arrival` → the six list screens, the arrival registry in `screens.test`, and
every list surface F-246 to F-259 rebuilds
**Guard:** `motion.test`'s Arrival cases · `screens.test` "every list surface arrives once" · the
`Arrival (a list arriving)` subject **Severity:** medium **Feature:** F-266

---

## Why B changes when A does

A virtualised list re-entered every row it scrolled in, and re-entered rows it had windowed out
when they came back. `Arrival` makes a list arrive once (ADR-0133 §7): rows mounting within 540 ms
of its first row stagger; a row after that, or at index 20 or more, is simply there. Each list
screen wraps its records in one `Arrival` and indexes them in reading order — the Wardrobe across
its sections, Combinations and Contemporary across their sub-lists.

## The limit

The registry names the surfaces that have one. A NEW list surface added without an `Arrival` is
not detected; a rebuilt one keeps its entry.

## A jest fact the registry works around

The Wardrobe's `SectionList` renders its first four items under jest, and a section header is one
of them, so a second section's rows never draw. Its cross-section index is read by calling the list's
own `renderItem` for the second section's first row.

## F-238 (2026-10-14): the lookbook is a list surface, added by hand

The Wardrobe's saved outfits are one `Arrival`, each in an `Appear` indexed 0…n−1, and
`screens.test` has its own case for them. It was added by hand, because the registry's stated
limit is that a new list without one goes undetected.
