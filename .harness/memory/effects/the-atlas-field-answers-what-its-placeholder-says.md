# E-210 — The Atlas field answers what its placeholder says

**Link:** `atlasShown` (`apps/mobile/src/atlas.ts`) → the Atlas screen, the Finder's `hexNearest` and
`looksLikeHex`, `bookmarks.test`, the Atlas journey, F-250
**Guard:** `atlas.test` (a hex lists exactly what `find()` lists when nothing else narrows; with a
facet the whole corpus is ranked and then narrowed; a lexicon phrase is read as words; `beaded` is a
word, not a hex); `bookmarks.test` (its query is only a name) **Severity:** medium **Feature:** F-246

---

## Why B changes when A does

`05`'s field says *Search kanji, romaji, family or #hex…*, and the hex half is the Finder's own: the
Atlas ranks the whole corpus through `hexNearest`, then the filters and the bookmark toggle narrow
that ranking, then the nearest eight are shown. There is no second nearest-match implementation, so
a change to how the Finder recognises a hex (`looksLikeHex`) or ranks one changes what the Atlas
lists, in a screen the change never touched.

The order matters, and the test says why: narrowing the Finder's eight afterwards gives fewer or
different colours than ranking everything and narrowing first.

A natural phrase is the Finder's alone (ADR-0143 D1). `dark` here is a word matched against names;
in the Finder it is a region. A phrase branch on this field would be a second, undrawn way to the
lightness and chroma the overflow's facets already hold.

## What it does not guard

- **What a person types.** The e2e journey types a romaji; nothing exercises a hex on a device.
- **F-250.** The Finder is rebuilt to `09` there; this link is the reminder that the Atlas reads its
  hex branch.

Related: [[a-superseded-element-is-declared-not-counted]], [[a-family-chips-dot-is-its-groups-medoid]].
