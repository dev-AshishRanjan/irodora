# A table-driven check is only as complete as its table

**E-040** · from `scripts/verify-state.mjs#ID_SPACES` · guard `gate:state`, proven by
`scripts/verify-state-id-proof.mjs` — **with a stated limit**

## What depends on what

Gate 0 checks id uniqueness across `.harness/` by walking a declared table of seven spaces:
which file, which array, which key, and how to describe an entry in the message. Every one of
those files depends on being **in** that table, and nothing about adding a new id space to a
data file makes it appear there.

So the dependency runs the unusual way round: the *check* depends on somebody remembering to
extend it, and the failure is silent in the direction that looks like success — a new space is
simply never mentioned, and gate 0 prints a green line with a smaller number in it than it
should have.

## Why this got its own link instead of joining E-039

[[an-effect-id-is-a-primary-key-and-the-schema-cannot-check-it]] is about one key being
unchecked. This is about a **check that covers six of seven things and says nothing about the
seventh**. Different failure, different tell:

- E-039's tell is a warning that is right and wrong at once.
- E-040's tell is **no output at all**, which is indistinguishable from correctness.

## How it was found — the one-off is what produced it

F-102 wrote the duplicate check for `effects.json` alone. Tracing that feature's effects took
about ten minutes and found the same hole twice more: a second feature numbered `F-102` and two
gates sharing an id both left gate 0 **green**. Writing two more one-off checks would have
scheduled the third, so the check became a table.

Which means the table now carries the risk the one-offs did not, and this note is the record of
that trade rather than a claim that it went away.

## The guard, and exactly where it stops

`verify-state-id-proof.mjs` proves the table **fails closed** on the two ways a declared space
can go missing — the array renamed, and the file absent. Both were watched: with the check
mutated to `continue` instead of `fail`, those two cases and only those two go the wrong way,
while the three duplicate cases keep passing. The halves are independent, which is what makes
each one evidence about a distinct property rather than about the check in general.

**What no check here can do is notice an id space nobody declared.** There is no schema that
says "this array is keyed", and inferring it — every array whose entries carry an `id`-shaped
field — would be a guess that fires on data that merely happens to look keyed. So the honest
guard is: every *declared* space is real and checked, proven; an *undeclared* one is invisible.

What stands in for the missing half is that the table lives beside the data it reads, in the
one script every session runs first, and the pass line prints the space count — `7 id space(s),
164 entries` — so a number that stops matching the files in `.harness/verification/` is visible
on every run rather than only to someone auditing.

## Deliberately not in the table, and why

Both established by running something rather than by reading:

- **`unreached-tokens.json`** — `group` is not a key. Ten entries, five distinct groups;
  `verify-token-reach.mjs` maps (group, token) pairs. A group-uniqueness check would fire on
  correct data on its first run, which is how a real check gets deleted for being noisy. Same
  measurement F-102 made when it mutated its own check to key on `from.ref` and turned the
  baseline red on five legitimate pairs.
- **`off-scale-spacing.json`** — a compound (file, property, value) key, and a duplicate is
  already caught by a different mechanism: `verify-spacing-scale.mjs` matches with `findIndex`,
  so the second identical entry matches nothing and a dead exemption is already a failure.
  Verified by planting one and watching it exit 1 with *"is exempt and MATCHES NOTHING"*.

A second check over either would be redundant at best and a false positive at worst, and
[[a-decoy-that-is-not-broken-proves-nothing]] cuts both ways: a check nobody can trust is
worse than one that is honestly absent.
