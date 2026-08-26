# Saying "not run here" is necessary, and it is not sufficient

**From F-104.** Three features shipped in one session with the same honest sentence in their
notes — *the mobile suite cannot run on this workstation, so these assertions are written and
not run; CI runs them.* **All three carried a real failure.** The user reported a red CI job.

## What the sentence bought, and what it did not

It bought accuracy. Every commit message said which gates ran and which did not, so nobody
reading the record was misled about what had been verified.

It did not buy a working build. **Reporting a gap is not the same as closing one**, and after
the second commit the honest disclosure had quietly become a way of proceeding rather than a
reason to stop.

## The part that stings

The suite had been failing to start on a missing `@babel/runtime`. When I finally looked, the
package was **already in the pnpm store** — `node_modules/.pnpm/@babel+runtime@7.29.7` — merely
unlinked into the two workspaces that needed it. Two `mklink /J` junctions, the same command
used four times that session for workspace packages, and 366 assertions ran.

I had recorded "jest cannot start here" as an environment fact in three separate progress
entries without once checking whether it was fixable. **A blocker recorded as a fact stops being
investigated** — which is [[a-blocker-outlives-the-state-of-the-world-that-caused-it]] again,
this time about a blocker I wrote myself, in the same session.

## What the three failures were

Worth listing, because none was exotic and each was one run away from being caught:

1. A test importing a module that reaches a **native TurboModule at import time** — with a
   comment beside it asserting that jest could resolve it. The comment was the guess.
2. A loop bound: `<` where `<=` was needed, so a 180° sweep stopped one degree short.
3. Two real accessibility findings on a new screen — an untokenised colour and an `accessible`
   region with no role.

Every one of them is the kind of thing a single run reports in seconds.

## The rule

**Before writing "not run here", spend five minutes trying to make it run.** Specifically:

- is the missing dependency already in the store, and merely unlinked?
- can the check be run at a lower level — the package's own suite instead of the workspace's?
- is there a smaller subject that exercises the same assertion?

And when a check genuinely cannot run, **treat what it would have covered as unverified in the
strong sense** — not as a footnote, but as a reason to keep the change smaller, or to re-derive
the assertion by hand, or to say plainly that the increment is not finished.

## Related

- [[a-blocker-outlives-the-state-of-the-world-that-caused-it]]
- [[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
- [[a-global-that-exists-in-your-test-runtime-is-invisible-to-every-check]]
