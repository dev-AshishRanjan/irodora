# E-216 — A target reaches its size only inside its parent, on Android

**Link:** `AppBarTrailing.targetRoom` (`packages/ui/src/AppBar.tsx`) → the colour page's three icons,
`platformTapTarget`, F-305 **Guard:** `app-bar.test` (as iOS and as Android: the row the platform's target
tall, each icon's size plus slop inside it; decoy: without the flag the row is as tall as its icons);
`bookmarks.test` (the page asks for it) **Severity:** medium **Feature:** F-247

---

## Why B changes when A does

An icon is drawn at its glyph's size and reaches the tap target through its slop (ADR-0114). On iOS the
slop works past the parent's edge; **on Android a touch is delivered only inside the parent's bounds**.
An app bar's trailing row is as tall as its icons, so the slop above and below a 21.5 dp glyph is a
target in the rule and not on a phone — F-237's review found exactly this on the header bookmark (S3),
and gave that one toggle a box of its own.

When F-247 moved the bookmark into `06`'s app bar, the box went with the platform header. `targetRoom`
makes the room in the row instead: the row is the platform's target tall, padded at each end by the
widest slop an icon in it reaches, and given that padding back as a negative margin, so nothing `06`
draws moves.

A change to the slop arithmetic, or an app bar that drops the flag, shrinks the real target with every
render test still green — a test renderer has no Android clipping.

## What it does not guard

- **The overlap.** At `06`'s ~33 dp pitch, three full targets cannot exist side by side; F-305 holds it.
- **A device.** The attested check taps the edge of each icon.

Related: [[the-target-is-the-hit-area-and-the-rule-adds-it-back]].
