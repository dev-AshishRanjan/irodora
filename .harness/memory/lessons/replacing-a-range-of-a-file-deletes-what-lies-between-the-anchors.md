---
kind: lesson
title: Replacing a range of a file deletes what lies between the anchors
created: 2026-11-03
feature: F-251
severity: medium
scope: [apps/mobile]
links: [[a-heredoc-can-turn-an-escape-into-an-invisible-control-character]]
---

# Replacing a range of a file deletes what lies between the anchors

Rewriting screens.test, I replaced the text from the old Studio's FR-49 describe up to the comment
that opens the route-seam describe. Between them sat the old headings describe — meant to go — **and**
the F-069 test that no screen puts a status colour beside a sample, which was not. It was deleted with
the rest. The suite stayed green (a removed test cannot fail); lint caught it only because
`checkStatusAdjacency` became an unused import.

## What to do

- Replace each block by its own start and end, not a range spanning several.
- Before committing a scripted rewrite, read what it removed: `git diff -U0 | grep '^-describe\|^-  it('`.
