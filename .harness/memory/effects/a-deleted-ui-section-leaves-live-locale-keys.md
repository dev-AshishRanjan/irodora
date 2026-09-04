# A deleted UI section leaves live locale keys

**Effect:** [E-066](../../state/effects.json) · `apps/mobile/src/i18n/en.ts` →
`apps/mobile/src/i18n/ja.ts` · **low**

## What happened

F-148 folded the four name forms of a colour into the hero, which made the whole names section
redundant. Deleting it left five labels — `detail.names`, `detail.kanji`, `detail.kana`,
`detail.romaji`, `detail.english` — that no screen reads.

Nothing breaks when a key outlives its caller. It is a valid string in two locales, it typechecks,
it lints, it ships. **That is the hazard**: a dead string is the cheapest thing in a codebase to
leave behind, and there is no moment at which anyone is forced to notice it.

The cost is deferred and paid by someone else. Every locale added after this one is priced per
key, including the keys nobody renders.

## What the guard actually covers

`ja` is typed against `en`, so the two cannot drift — deleting from one and forgetting the other
is a type error in both directions. That is what makes a half-deletion impossible.

It says nothing about whether a key is **reached**. Typecheck is a parity check, not a liveness
check, and those are different questions.

## If this grows

Colour tokens had the identical problem and it has a gate: enumerate the names, find the readers,
and require every exemption to name the feature that closes it
([ADR-0088](../../../docs/adr/0088-an-unreached-design-token-is-unfinished-work-not-a-declared-exemption.md)).
A string-reach gate would be the same script with a different corpus.

It is not worth writing for five keys. It becomes worth writing the first time somebody cannot
tell by reading whether a key is live.

Related: [[an-unreached-token-is-unfinished-work]]
