---
kind: lesson
title: A run in the locale’s words inside a notation line takes the locale’s face
created: 2026-11-04
feature: F-252
severity: medium
scope: [apps/mobile]
links: [[an-app-test-reads-a-packages-build-not-its-source]]
---

# A run in the locale’s words inside a notation line takes the locale’s face

19's anchor line is `OKLCh: L • C • h°`: notation, the same in both locales, set as a Latin
numeric run. For the one record outside sRGB, rule 11 adds 06's note after it — *nearest sRGB rendering,
ΔE00 0.31*, in Japanese もっとも近いsRGB表示. Appended to the same string, the Japanese words were set in
the Latin run's face; the sweep's F-152 check (Japanese copy in the bundled face) reported it, on the
one subject that renders that record as the anchor.

## What to do

- **A line that joins notation and words in the locale's language is two runs**: the notation in its
  run, the words in a nested `Text` with the locale's `script`.
- **Render the rare record as a subject.** The check found it only because the record outside sRGB was
  registered as an anchor and as a row; one fixture anchor would have hidden it.
