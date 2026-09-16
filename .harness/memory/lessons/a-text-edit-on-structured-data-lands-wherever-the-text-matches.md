# A text edit on structured data lands wherever the text matches

**Date:** 2026-09-16 · **Found in:** F-275, by its single review

To claim F-275 I found `"id": "F-275"` in `feature_list.json`, took the next 1,200 characters, and
replaced the first `"status": "backlog"` inside them. F-275's own status sat outside that window, so
the replacement hit the **next** entry: F-276 went `in_progress` carrying F-275's plan, and F-275 stayed
in the backlog with none. Gate 0 passed — it checks only that an in-progress feature's plan file
exists — and it passed again on the commit that did F-275's work. The single review found it.

The same session made the same mistake in a different shape: it quoted **line numbers from a grep** of
a scoring log as **ranks** in a governing document. Line 1 of the log was its header, so all five
published ranks were one too high. Both are the same error — trusting where text happened to sit
rather than what the data says.

## What to do instead

- **Edit structured data as structured data.** Parse the JSON, find the record by its key, change
  the field, write it back, and let the formatter restore the layout. The repair took eight lines,
  and it asserted the state it expected before it changed anything.
- **Read a number from the structure that means it.** A rank is a position in a sorted list, not a
  line in a file that also holds a header.
- **After any state edit, read the result back by key** — `status` and `plan` of the feature you
  meant — rather than trusting that the edit landed where you aimed it.

## Why it is worth a note

Both errors produced output that looked right and passed every gate, and both were in the records a
person reads to make a decision. Gate 0's missing check is now F-278; the habit is this note.

[[a-duplicate-json-key-silently-deletes-the-earlier-one]] · [[a-package-gate-is-not-the-repository-gate]]
