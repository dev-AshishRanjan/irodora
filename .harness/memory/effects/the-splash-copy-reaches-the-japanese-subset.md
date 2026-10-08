# E-183 — The splash copy reaches the Japanese subset

**Link:** `brand.taglineJa` (彩り・色の知性, identical in both catalogues) and `brand.splashSubline` →
the Noto Sans JP subset (and through it E-174's GOTHIC metrics), the claims lint, the i18n checks
**Guard:** `test:content` (every codepoint the catalogue needs is in the face); `i18n.test`'s
`IDENTICAL_BY_DESIGN` rules (the entry must be identical, the list at most three); `verify-claims`
**Severity:** medium **Feature:** F-231

---

## Why B changes when A does

The Japanese subline brought 論 and 的, which the subset did not carry; `test:content` refused the copy
until `generate-font-subset.mjs` re-cut the face, and the lockup's arithmetic re-read GOTHIC from it. The
tagline is Japanese in both locales because 14 sets it so under the name, which makes it the first
`IDENTICAL_BY_DESIGN` entry since F-018 emptied the list. The subline says *100% On-Device & Offline*, which
is true (ADR-0051) and which the claims lint reads like any other copy.
