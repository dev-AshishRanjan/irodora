# A replacement string is a pattern, not text

**Date:** 2026-10-14 · **Found in:** F-238, increment 7

## What happened

Tests were added to a file with a script that called `s.replace(anchor, newText + anchor)`. One of
the new tests ended a template literal with `` }$` `` — a `$` followed by a backtick. In a
JavaScript replacement string, `` $` `` means *the text before the match*. So the script pasted a
second copy of the whole file's first half into the middle of it, and typecheck failed hundreds of
lines from the edit.

Nothing about the inserted text looked special. The same scripts had run cleanly dozens of times,
because the code they inserted never happened to hold `` $` ``, `$'`, `$&` or `$1`.

## The rule

1. **When the replacement is code or prose, never pass it as a string to `replace`.** Use
   `s.split(anchor).join(newText)`, after checking the anchor occurs exactly once, or pass a
   function: `s.replace(anchor, () => newText)`. A function's return value is inserted literally.
2. **Count a file's title line after a scripted edit.** A file whose header appears twice was
   pasted into itself.

## How to apply

Any script that splices source text: anchors are matched literally only if they are strings, and
replacements are inserted literally only through `split`/`join` or a function.

Links: [[a-package-gate-is-not-the-repository-gate]]
