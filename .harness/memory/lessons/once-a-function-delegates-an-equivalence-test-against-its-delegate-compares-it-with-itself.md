---
kind: lesson
title: Once a function delegates, an equivalence test against its delegate compares it with itself
created: 2026-10-28
feature: F-250
severity: medium
scope: [apps/mobile]
links: [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]], [[a-fixture-that-shares-a-defect-cannot-find-it]]
---

# Once a function delegates, an equivalence test against its delegate compares it with itself

F-250 added `findAs(query, reading)` beside `find()`, and promised that `find()`'s contract — what the
Atlas (E-210) and Compare's chooser (E-229) read — was unchanged. To prove it, the test checked
`findAs(q, find(q).kind)` against `find(q)` over every corpus hex, name form and term. In the same
increment, `find()` was rewritten to choose a kind and call `findAs`. From then on the test compared a
function with itself: it could not fail, whatever either did, and the effect link cited it as the
guard. The review (M1) found it by reading the two together.

## The rule

- **An equivalence test needs an oracle the refactor did not touch.** When the code under test is
  rewritten to call the thing it is compared with, write the OLD behaviour out in the test — the
  pre-change body, kept as the oracle, as F-249 kept the old harmony formula — and compare both against
  that.
- **Read a guard's own source before citing it.** An effect link that names a test as its guard is only
  as good as that test's ability to fail; follow the call to see whether it reaches what it checks.

## How to check

For each equivalence test, ask: if the function under test returned something else, would this fail?
Then change the function (a planted defect, or by hand in a scratch run) and watch. A test that stays
green against a broken subject is a test of nothing.
