# E-174 — The lockup's arithmetic reads the bundled faces' metrics

**Link:** `apps/mobile/assets/fonts` → `brand.tsx#GELASIO`, `brand.tsx#GOTHIC` **Guard:**
`apps/mobile/test/fonts.test.tsx` **Severity:** medium **Feature:** F-230

---

## Why B changes when A does

The lockups align ink, not boxes (ADR-0123): a Text's line box is not its ink, and centring Gelasio's
line box would set the name's ink 2.5 dp high in `01`'s row. The arithmetic is the faces' metrics
written down as constants, because a component cannot read a TTF: units per em, `hhea`'s ascender
and descender, "Irodora"'s advance and ink, and Noto Sans JP's ideographic character face from
`BASE`.

So a font file change moves the lockup. Re-subsetting Noto Sans JP — F-231 adds 知 with the splash
copy — or updating Gelasio could shift an ascender, the character face or the name's advance, and
the lockup would sit a dp or two off with every component test green.

## How it is guarded

`fonts.test.tsx` reads the tables from the bundled bytes and requires the constants to equal them.
Its decoys are Noto's typographic pair, which that face does not use (no USE_TYPO_METRICS), and
another word's extent. It sits beside the fonts, so no cached task outside the app keys on them.

## F-230's review: kerned, and each face's own line

Platforms kern by default, so the name's advance is read with GPOS's `kern` pairs applied. None
adjusts "Irodora"; Gelasio's one kerned class (L before two unencoded glyphs, −300) is the decoy.
The manifest's `ownLine` for every bundled face is held to its hhea line here too: it decides
whether iOS centres a line or bottom-aligns it.
