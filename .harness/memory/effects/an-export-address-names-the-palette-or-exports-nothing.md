# E-237 — An export address names the palette, or exports nothing

**Link:** `apps/mobile/src/export/subject.ts#exportSubjectFor` (`palette`, `saved`) → `/profile/export`
**Guard:** `export-subject.test`; the states test; `compare-states.test`’s route literal **Severity:** medium **Feature:** F-251

---

## The rule

Read after `pair`, before `colours`. A slug or id the device does not hold exports nothing — not
the latest palette, which is a different one.

## What it does not guard

- F-263’s rebuild of the export screen: it carries a note to keep reading both.
