# A limit that fires on real data is worse than no limit

**Effect:** [E-142](../../state/effects.json) · **Feature:** F-288 · **Date:** 2026-09-22

The threat model said the archive import had *"hard limits on bytes and record count before
parsing"*. It had none — for about a year, in a table whose own header says **"every control below
maps to a test or a gate"**. `F-286`'s review found the row describing a check nobody had written.

Writing the check was the easy half. The hard half is that **a bound is trivial to write and easy
to get wrong in the direction nobody notices**: not letting a bomb through, but refusing a file the
rest of the product was happy to write.

## What that discipline actually costs

Every bound here is tested twice — refusing a hostile file *by name*, and leaving a realistic
archive an order of magnitude clear with the **distance asserted**, not a bare `does not throw`.
And the fixture has to be realistic enough to carry the claim. The first version proved a
**photograph-free** archive was inside a limit whose entire derivation is *"a photograph arrives at
quality 0.8, one to three megabytes, base64 costs 4/3"*. It proved nothing about the case the limit
exists for, and the threat-model row read it as if it had.

The review also caught the two numbers being sized against **two different wardrobes** — 100
photographed garments for the byte cap, 500 for the row cap. A person with the second writes a
backup the reader refuses. Which surfaced the real gap: **the export side is unbounded.** A limit
on reading, with no limit on writing, means the product can produce a file it will not accept —
and it finds out at restore time, which is the worst moment available.

## Three specific traps, all found by review rather than by the tests

- **`text.length` is not bytes.** It counts UTF-16 code units, and the message said "bytes". For a
  product whose subject is the Japanese colour corpus, that under-counts the file on disk by up to
  3×, and a JS string costs up to 2 bytes per unit — so "256 MiB" was really "up to 512 MiB of
  heap". It errs permissive, so it never refused a good file; it was still a claim the code could
  not support.
- **A hand-rolled scanner's riskiest branch had no discriminating test.** `maxNestingOf` counts
  brackets outside strings, and the escape branch is the only part a hostile file could target. The
  fixture was depth 4 and the limit was 8 — a scanner with escape handling *deleted* reported 8,
  and `8 > 8` is false, so both passed. Moving the limit to 5 is the whole fix, and it is the
  difference between a test and a decoration.
- **Composing two doors found a bug neither had alone.** `deserialiseArchive` parses, then
  `importArchive` parses again — so `parseArchive` has to be idempotent, and it was not: a decoded
  `Uint8Array` *is* an object whose keys are decimal indices and whose values are bytes, which is
  exactly the broken pre-`F-286` shape. The early return that fixed it then skipped the
  declared-column check one line below, re-opening a hole a previous review had closed. **A fix
  placed above a guard is a fix that skips it.**

## The lesson

**When you add a bound, write the test that proves it does NOT fire on the real thing — and make
the fixture real enough to carry the claim.** Then check the other side: a reader's limit with no
writer's limit is a product that can make files it cannot open.

And when a limit is a number, say where the number came from *beside the number*. Every one of
these findings was a mismatch between an arithmetic written in a docblock and what the code
actually measured.

[[a-backup-nobody-restored-is-not-a-backup]]
[[a-negative-test-needs-a-decoy-not-an-empty-fixture]]
