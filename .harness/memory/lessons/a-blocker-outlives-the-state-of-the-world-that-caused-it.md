# A blocker outlives the state of the world that caused it

**From F-099.** The feature said *"BLOCKED ON THE TOOLCHAIN, NOT ON A DECISION… DO IT ON THE
PINNED TOOLCHAIN."* It was right when it was written and had stopped being right two features
later, and nothing anywhere noticed.

## What happened

F-099's note explained precisely why it could not be done on this workstation: adding a
workspace dependency needs a junction in `node_modules`, and

> a hand-made junction is what F-098's own notes call the workaround that hid a stale lockfile
> for four features

That is a good reason, carefully argued, citing the right evidence. **And F-098 is the feature
that removed it.** Gate 0 section 7b now compares every manifest against `pnpm-lock.yaml`
before install, on Node built-ins, on a clean clone — built exactly so somebody who cannot run
pnpm can still be told the lockfile is stale. The junction can no longer hide anything.

So the blocker described a world that F-098 ended, in a note written *because* of F-098.

## Why nothing caught it

A blocker is prose in a state file, and [[an-effect-rationale-is-prose-in-a-state-file-and-nothing-executes-it]]
applies to it exactly. Nothing re-evaluates it. There is no dependency edge from *"F-098 shipped
a lockfile check"* to *"F-099's stated reason for being blocked"*, because the relationship is
between an argument and a fact, not between two files.

The feature also stayed `backlog` rather than `blocked`, which is the honest status and is
therefore no signal at all: everything eligible is `backlog`.

## What to do about it

**Re-derive a blocker before accepting it, especially a well-argued one.** The better the
argument, the less likely anybody re-checks its premise — and the premise is the part that
rots. Concretely, when a note says *"blocked because X"*, the question is not "is X still
annoying" but **"has anything since made X checkable?"**

Here that took one command: add the dependency and run gate 0. It went red, named the missing
importer entry, and told me what to write. The blocker's own hazard had become a gate.

## The related trap

This is the same shape as a stale rationale in an effect link, and the repository already has a
check for that one — `verify-stale-rationale-proof.mjs` fails when a rationale cites a state
that has moved. Nothing equivalent reads `feature_list.json` notes, and it is not obvious that
anything could: the citation here is to an *argument* F-098 made, not to a symbol or a file.

What is cheap and works: when a feature closes, ask which other entries cited the thing it just
changed. F-098 changed what a junction can hide, and F-099 was the entry that cited it.

## Related

- [[an-effect-rationale-is-prose-in-a-state-file-and-nothing-executes-it]]
- [[a-failing-gate-is-usually-already-filed]] — the other direction: check the record before
  concluding something is new.
- [[the-warm-cool-rule-is-written-twice-because-an-install-cannot-run]] — the note this closed.
