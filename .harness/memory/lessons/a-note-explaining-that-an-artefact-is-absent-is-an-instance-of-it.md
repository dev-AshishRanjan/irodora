---
kind: lesson
title: A note explaining that something is absent is an instance of it, and text-reading gates cannot tell the difference
category: engineering
confidence: 0.95
created: 2026-08-25
scope: [apps/mobile, scripts]
links: [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]], [[prose-in-a-state-file-rots-and-no-schema-can-see-it]]
---

# The comment explaining the fix broke the gate, twice, in two different gates

Two failures, two features apart, same shape:

**F-026.** `test/profile.test.ts` needed a decoy string that looks like a camera import. Written
as a literal, `scripts/verify-app-imports.mjs` read it as a real relative import and failed —
correctly. The specifier was split into parts. Then the **comment explaining why it was split**
quoted the specifier, and the gate failed again on the next run.

**F-027.** `src/i18n/ja.ts` needed a note saying a particular kanji is not in the bundled font
subset, so a different word was used. The note **contained that kanji**, and
`verify-font-coverage.mjs` reported 441 required codepoints with one missing.

## Why it keeps happening

These gates read **source text**, and they are right to. A gate that parsed the AST and skipped
comments would miss a real import commented out and then restored; a font gate that skipped
comments would miss a character in a string it could not statically resolve. Reading everything
is the conservative choice and the correct one.

The consequence is that **a file cannot describe its own constraint using the thing the
constraint is about.** Documentation and content occupy the same scanned space.

## What to do instead

- **Name it obliquely.** Romaji for a kanji, a description for a path — "the natural word here
  is *te-gakari*, and its first character is not in the face."
- **Assemble fixtures from parts** so no literal instance exists in the source, and say in the
  note that this is why.
- **Expect the second failure.** The first fix is to the code; the comment explaining it is a
  second instance, and it fails on the following run. Re-run the gate after writing the
  explanation, not only after writing the fix.

## The generalisation worth keeping

> When a check reads raw text, the file's prose is inside its scope. Writing *about* the
> forbidden thing produces the forbidden thing.

This is the same reason `claims.json` is the one home for the banned marketing phrases and
`verify-claims.mjs` exempts it by path: a rule cannot list its own violations in a file the rule
scans. That exemption was designed in; these two were discovered by failing.
