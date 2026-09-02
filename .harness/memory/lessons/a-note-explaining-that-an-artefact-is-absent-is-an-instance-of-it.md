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

**F-122.** `test/screens.test.tsx` asserts that the new wardrobe route imports the device
repository. The route sits one directory deeper than the two routes already asserted, so its
specifier has an extra ascent — and written as a literal, `verify-app-imports.mjs` read it as an
import made by the *test* file, from a directory outside the app. The specifier was assembled
from a variable. Then the **comment explaining the assembly spelled the path out**, and the gate
failed again on the next run: same gate as F-026, same second failure, four months later.

That is the part worth recording. This note existed, named the gate, and described the exact
second failure — and it did not prevent it, because the shape only becomes visible once the
first fix is already written. **The re-run is the mechanism; the note is not.**

Also worth keeping from F-122: the two assertions this one joined resolve **by coincidence**.
They name routes one level shallower, so their literal specifiers happen to point at a real
directory. Nothing about them was more careful — the depth was.

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

## The third option: fix the check (F-127)

The two remedies above are workarounds, and they have a price this note under-stated for four
features. **What gets deleted is the explanation.** F-055's comment said which boundary was being
preserved and why `unsafeFromHex` is not called; F-056's fixture said the test was about a path
traversal. Both survived as assertions and died as prose.

That price is worst on exactly the checks whose whole argument is *"a sentence about people is
not a check."* A check that cannot tell a call from a sentence **teaches people to stop writing
the sentences.**

So the third option is to make the check able to tell:

| | reference | mention |
|---|---|---|
| an identifier | an import that binds it, or a call of it | a comment, a string, a longer name containing it |
| a path literal | a module specifier, or an argument to a path/fs function | an argument to a function that is not about paths |

Both distinctions are AST-level and neither needs a type-checker — `ts.createSourceFile` is
enough, and `typescript` is already a devDependency. F-116 established the technique; F-127
applied it to `verify-unsafe-call-sites.mjs` and `verify-cache-scope.mjs`, and **put both
suppressed sentences back as the acceptance test**.

**When to reach for which.** Narrowing a matcher is the more dangerous change: a check that
accepts everything is worse than the false positive it replaced, because nobody will ever see it
fail. Do it only with decoys in **both** directions, and mutate the matcher to nothing to prove
the ACCEPT cases are not carrying the whole suite. Where the check is a whole-file content scan
with no syntax to lean on — a font subset, a banned-phrase list — the workarounds above remain
right, and `claims.json`'s by-path exemption is the designed version of them.

## The generalisation worth keeping

> When a check reads raw text, the file's prose is inside its scope. Writing *about* the
> forbidden thing produces the forbidden thing.

This is the same reason `claims.json` is the one home for the banned marketing phrases and
`verify-claims.mjs` exempts it by path: a rule cannot list its own violations in a file the rule
scans. That exemption was designed in; these two were discovered by failing.
