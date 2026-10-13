# E-204 — The bookmark set is written on 06 and read back on 05

**Link:** `color_bookmark` and `BookmarksProvider` → the colour page's header (`06.bookmark`), the
Atlas screen and its route, `SearchField`'s `trailing`, F-246, F-247, R9 §4 E4, ADR-0135
**Guard:** `bookmarks.test` (the provider, 06's toggle, the Atlas cases, and the three route
assertions, with a decoy route); the screens registry's Atlas and bookmark subjects in every
condition; `bookmark.test`, `bookmark-durability`, `bookmark-atomicity` and the force-quit test in the
store **Severity:** high **Feature:** F-237

---

## Why B changes when A does

A bookmark is written on one route and read back on another. The set is one value, held once, and
both controls draw it. So a change to how the set is stored, read or written reaches two screens
through one provider. Dropping either control silently breaks the feature:

- drop 06's toggle and nothing can be bookmarked;
- drop the Atlas toggle and a bookmark is a write nothing reads (OQ-39's problem, back again).

F-246 rebuilds 05 and F-247 rebuilds 06, and each rebuild is where a control is most likely to go
missing. So the route assertions name both, and each feature's notes say what to keep.

## What the provider promises

- **It reads the store once, at mount**, because nothing else on the device writes.
- **It writes first, then reads the set back**, so a failed write shows nothing the next launch
  would not.
- **An in-app restore or erase would change the store underneath it.** Neither exists yet. F-263
  must make the provider read again, and its notes say so.

## What it does not guard

- **Layout inside the native header** (06's toggle is in `headerRight` until F-247): only a
  device capture shows it.
- **Encryption at rest.** The bookmark is in the database file with every other row, and that
  file is protected only when SQLCipher is built in (F-336).
