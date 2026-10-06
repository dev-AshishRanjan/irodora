---
kind: lesson
title: A plant that picks by position goes vacuous when the data gains a row
category: convention
confidence: 1.0
created: 2026-10-06
scope: [scripts, tests]
links: [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], [[a-compound-mutation-reports-a-miss-only-if-every-part-misses]]
---

# A plant that picks by position goes vacuous when the data gains a row

`verify-mockups --prove` planted "two elements out of reading order" by swapping inventory 01's
elements 1 and 2. That was the mark and the wordmark, which the reading-order rule tells apart. F-230
added a lockup container before them, sharing the mark's top-left corner, so elements 1 and 2 became
the container and the mark. **Swapping two elements at the same position breaks nothing**, and the
plant stopped planting.

The proof caught it: it reports "the check does not discriminate" when a plant is not refused. A
proof whose plants were only expected to pass would have gone on passing.

## What to do

**Name what a plant moves.** Pick the elements by id (`01.header.mark`, `01.header.wordmark`), so
the plant means the same thing whatever the data around it gains. A positional plant is a claim about
the data on the day it was written.
