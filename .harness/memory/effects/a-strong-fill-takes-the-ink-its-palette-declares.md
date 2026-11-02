# E-238 — A strong fill takes the ink its palette declares

**Link:** `@irodora/ui` (`Button` tonal strong, pills `sm` and ids, `TextField` inside, `Tategaki`) → `10`, `16`
**Guard:** each component’s test with decoys; the manifest’s pairings under gate 9; the sweep’s decoys **Severity:** medium **Feature:** F-251

---

## The shapes

- `border.strong` is decorative as an outline and a fill under words on `10`’s export bar: it pairs
  with `foreground` on the dark palettes and `accent.foreground` on Washi (`STRONG_INK`).
- `Tategaki` is one accessible node, the whole name; each character advances by its em.

## What it does not guard

- How the vertical setting renders on a device: the capture.
