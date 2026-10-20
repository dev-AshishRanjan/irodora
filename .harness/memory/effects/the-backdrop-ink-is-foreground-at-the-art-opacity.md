# E-209 — The backdrop ink is foreground, at the art opacity

**Link:** `IllustrationProps` (`packages/ui/src/Illustration.tsx`), a backdrop that may take
`foreground` → Home's three plum branches, and every backdrop a surface feature draws from F-243 on
**Guard:** `illustrations.test` (a backdrop in `foreground` inks every shape in `foreground` at the
declared `opacity.art`; a figure in `foreground` without the hanger's tint does not compile)
**Severity:** medium **Feature:** F-242

---

## Why B changes when A does

R9 §5 measured the backdrop art as *the `foreground` token at a declared opacity* — 0.15 of it, the
ink a branch is drawn in behind a screen's content. `Illustration` let a drawing take only the quiet
inks, `foreground.2` and `foreground.3`, so the measured reading could not be drawn. Home is the
first surface to draw a backdrop as measured, and the type now admits `foreground` there and only
there.

The effect runs through the opacity. `opacity.art` (E-136) is what keeps a `foreground` drawing quiet;
change that token and every backdrop drawn in `foreground` changes with it, Home's three branches
first. The figure case stays refused, because a drawing in `foreground` at full strength is as loud as
the sentence beside it.

## What it does not guard

- **Orientation.** There is one `plum-branch` drawing and no transform. Whether `01`'s three
  placements are drawn the same way round is for the capture's comparison, not a test.
- **Contrast.** Backdrop art carries no meaning, so it is not a declared pairing; nothing measures it
  against the text over it beyond the 0.15 opacity keeping it faint.

Related: [[the-caption-is-the-median-of-what-the-mockups-draw]].
