# E-221 — 07's drawn actions open routes other features rebuild

**Link:** `app/(tabs)/atlas/wear/[slug].tsx` → `/atlas/[slug]`, `/wardrobe/outfit`,
`/profile/export?colours=`, `/wardrobe/shopping`, `/wardrobe/add` **Guard:** `wear-states.test` (every
drawn control fired and its argument read; each handler's own body read from the route, with decoys for
a back that pops, swapped targets and the Lab opened before the offer); `export-subject.test` (the
colours parameter; decoy: an unknown colour falls back); `verify-route-targets` **Severity:** medium
**Feature:** F-248

---

## Why B changes when A does

`07` draws a back, a save, an export, and — in a slot's sheet — Open, Shop for this and Add to wardrobe.
Each opens a screen another feature owns: the colour page (F-247), the Lab (F-257, `13`), the export
centre (F-263, `18`), the shopping check (F-258, `22`) and the add flow (F-256, `12`). A rebuild that
renames a route, or an export that stops reading `colours`, breaks `07`'s action with nothing on `07`
failing.

The targets are held where `06`'s are (E-215): read from the route's source, per handler, so a target
moved to the wrong control is seen, and in the order that matters — the combination offered before the
Lab opens.

## What it does not guard

- **What the opened screen does.** Each is its own feature's.
- **A device.** The attested check presses each.

Related: [[06s-drawn-actions-open-routes-other-features-rebuild]],
[[a-hand-off-the-receiving-screen-forgets-opens-it-empty]].
