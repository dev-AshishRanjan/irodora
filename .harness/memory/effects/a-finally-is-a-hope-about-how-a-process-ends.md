# A `finally` is a hope about how a process ends

**Effect:** [E-094](../../state/effects.json) · `scripts/plant.mjs` → every mutation proof,
`scripts/verify-ci.mjs`, `.github/workflows/ci.yml` · **high**

## What happened

Eight incidents. Every mutation proof in this repository plants a deliberate defect into a tracked
file, watches the check reject it, and restores in a `finally`. Three mechanisms defeated that:

| how the run ended | what the `finally` did |
| --- | --- |
| a timeout, a Ctrl+C, a closed terminal | never ran |
| Windows `EPERM` on `rmSync` | ran, and threw inside itself |
| Windows `UNKNOWN` on `writeFileSync` | ran, and the restoring write failed |

The damage: a CI workflow with a gate step disabled by `if: false`, a performance budget of
`0.0001`, four deleted corpus fixtures, a benchmark whose `percentile` returned constants, a
design manifest with a colour value quietly changed, and an OKLab matrix element off by one digit
that failed 374 checks in a gate nobody had touched. **Every one is something `git add -A` would
have committed.**

## Why the guard added after the fourth incident never helped

`verify-ci.mjs` compared `git status` before and after and warned when a file a proof plants into
was modified. It failed on three consecutive incidents for one reason:

**It cannot tell a leak from ordinary work.** Each of those runs was a feature that had
legitimately edited a file in the same session, so the warning was correct, expected, and
dismissed — by me, twice, in writing.

> A guard whose signal is indistinguishable from ordinary work trains people to ignore it, which
> is worse than not having one.

And it is not fixable by making the heuristic cleverer. Git can only say whether *anybody* changed
a file; the question is whether *this run* did.

## The part worth keeping: record intent, not state

The journal writes the original bytes **before** the mutation and removes the entry after the
restore. So an entry that outlives a run means a proof did not finish — whatever git thinks, and
whatever else anybody edited. **No false positive is possible**, because the journal only ever
holds what a proof deliberately put there.

**The ordering is the safety property.** Journal first, mutate second: a failure to journal means
no mutation happens, so there is no window in which a file is broken and unrecorded. It also means
this feature makes some runs fail that used to pass, which is the correct direction.

It **refuses rather than repairing**. Automatic restore would overwrite whatever is in the file
now, and somebody who has already fixed the damage by hand should not have it reverted by a tool
being helpful.

## Proving it needed a run that actually dies

Every mutation proof here is verified by letting it finish — the one path where `finally` works.
That is precisely why eight incidents got past them.

So `plant-proof.mjs` spawns a child that plants and then blocks, `SIGKILL`s it, and asks: is the
file still broken (so the kill really did skip the cleanup), does the journal name it, does
recovery restore it byte for byte. Plus the decoy: a child allowed to finish leaves no journal —
without which "no leftovers" and "a journal that was never written" are the same observation.

## Two things the feature found inside itself

**A partial journal reports clean over the half it does not cover.** My first migration of the
content proof journalled the fixture corpus and missed the OKLab matrix beside it — so
`scripts/plant.mjs` said *"no plant is outstanding"* over a perturbed colour engine, within the
hour, inside the fix. That is every blind spot in this directory, arrived at from inside the
remedy for one. The answer was a coverage check: **every script that writes into the tree either
uses the journal or is on a list, with a reason**, and the list is checked for staleness in the
other direction.

**Restoring the source is not always restoring the tree.** The content proof rebuilds the packages
it perturbs, so putting the file back leaves the *built* artefacts still holding the defect —
which then surfaced as a taxonomy-boundary failure that looks nothing like a leftover plant. A
journal entry can now carry a note, and recovery prints it.

## And the one it found in passing

`verify-a11y-proof.mjs` had **no CI step at all**, so one of its six cases had been reporting
*"cannot plant: source moved"* to nobody for as long as the Button wrapper has used HeroUI's own
`isDisabled` prop. A proof nothing runs is a proof that decays. It has a step now.

Related: [[a-mechanism-nobody-used-is-a-mechanism-nobody-measured]] ·
[[a-check-must-report-its-scope-not-only-its-verdict]] ·
[[a-decoy-that-is-not-broken-proves-nothing]]
