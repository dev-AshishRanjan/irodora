# A memory note without its link turns gate 0 red, and strands a plant

**Date:** 2026-09-09 · **Found in:** F-207

I wrote the effects note first, meaning to add the effect link and the index line in the next
step. Between the two, `pnpm lint` ran. It failed like this:

```
✗ the run plants something to interrupt
    No marker appeared within two minutes, so nothing below could be tested.
✗ DECOY — an uninterrupted run on a clean tree still passes
    The script now refuses a tree it should accept.
```

Neither message mentions memory, an effect link, or an index. It took two runs and a direct
invocation to find the actual cause, three layers down:

```
memory note with no effect link  →  gate 0 red
gate 0 red                       →  verify-gate-mirror refuses (correctly: nothing below
                                     a red gate 0 can mean anything)
the mirror proof had already planted  →  the refusal is not the outcome it expects, and
                                          .github/workflows/*.yml stay planted
```

The plant journal is what made this recoverable — `node scripts/plant.mjs --recover` put both
files back byte for byte — but only after I stopped believing the error message.

## The two things worth keeping

**A note, its link and its index line are one edit.** Gate 0 checks all three against each
other, so writing one of them alone is not "progress towards" a record; it is a red gate, and
every proof downstream inherits the redness with a message about itself instead.

**When a proof reports something implausible about its own machinery, check gate 0 first.**
"No marker appeared" and "the script refuses a tree it should accept" are what a *correct*
baseline refusal looks like from inside a proof that assumed the baseline was green. The
proof is not broken; it is downstream.

## And a smaller one

Do not run two gate scripts at once. The second one's `plant.mjs` read a journal the first had
just written and reported `ENOENT`, which sent me looking in the wrong direction entirely.

[[a-pipe-hides-the-exit-code-that-decides-the-commit]]
