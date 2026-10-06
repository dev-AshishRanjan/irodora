# E-173 — A lockup is called by its drawing, not sized by its caller

**Link:** `brand.tsx#WordmarkProps` → `Home.tsx`, F-231's splash, F-242's Home **Guard:**
`typecheck` (`form` required, `size` refused); the conformance subjects; `brand.test`
**Severity:** medium **Feature:** F-230

---

## Why B changes when A does

ADR-0123 makes a lockup one figure, so a caller names the drawing — `01`'s row or `14`'s stack —
and never a size. Home's header became `01`'s lockup at 31.6 dp (it led at 72); F-242 rebuilds the
rest of Home around it; F-231's splash calls the stack with the catalogue's tagline.

## What a caller must know

- **The figure's box is its ink.** Place it by the inventory's ink box (`01.header.lockup`,
  `14.splash.lockup`), not by the mark's grid or the name's line box.
- **The row measures the width its column gives it** and holds the name to its share, so the figure
  fits at 200 %. Both drawn placements are columns; in a row parent it would measure only itself.
- **It scales with the name.** Dynamic Type moves the name, and the mark and the intervals follow it.
