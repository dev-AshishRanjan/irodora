# The engine names keys and only the app can render them

**Link:** [E-053](../../state/effects.json) ·
`packages/recommendation/src/score.ts#MESSAGE_KEYS` → `apps/mobile/src/i18n/*`
**Severity:** high · **Guard:** `test:apps/mobile/test/i18n.test.ts`
**Introduced by:** F-052 (shopping check), 2026-09-01

---

## The split is right, and it leaves one end unchecked

`@irodora/recommendation` holds **no prose, no catalogue, no locale**. `scoreColor` returns a
`messageKey`; the app renders it. That is FR-11 and ADR-0056, and the reason is concrete: a
sentence produced at scoring time has to be translated at scoring time, and a stored
recommendation becomes a stored English string.

The cost is a type boundary that goes soft in one direction:

```ts
// in the engine
readonly messageKey: string;      // it can be anything

// in the app
t(key: MessageKey): string        // it must be one of these
```

**The engine can name a key the catalogue does not have, with typecheck green.** E-016 guards
the other direction — `en` is the source of `MessageKey` and `ja` must match it — and cannot
see this one at all.

## It was not theoretical

Until F-052, **nothing in the app called `scoreColor`.** Its twelve
`explain.<factor>.<direction>` keys had been emitted since R3 and not one of them had ever been
in either catalogue. FR-29 asks for a per-factor explanation, and the engine had been producing
one for two releases into a catalogue with no word for it.

That is the same shape as
[[a-column-nothing-writes-makes-its-own-feature-unfalsifiable]], one boundary over: the
producer worked, the consumer did not exist, and nothing could tell.

## Why the guard needs both directions

```
(a) every key MESSAGE_KEYS can produce exists in `en`
(b) every `explain.*` key in `en` is one the engine emits
```

(a) is the obvious one. **(b) is what makes it safe for these keys to be excluded from the
existing *"has no key nobody renders"* scan** — that scan looks for a source literal, and these
are rendered through a computed lookup (`t(f.messageKey)`), so the consumer is invisible to it.
Without (b), the exclusion would open exactly the placeholder hole that scan exists to close.

Both were proven by mutation, not by reading:

| Mutation | Failed |
|---|---|
| delete `explain.chroma.neutral` | (a) **and** (b) |
| add `explain.sparkle.supports`, which the engine never emits | (b), plus three more |

## The outfit keys are a declared gap, not an exclusion

`OUTFIT_MESSAGE_KEYS` have no catalogue entries — `OutfitBuilder` renders the raw component
name beside each score. The test asserts the **missing set exactly**, so the gap stays visible
and attributable while a *new* unrenderable key still fails. Filtering them out would have made
the test quietly stop covering them, which is how a check stops checking.

## The screen narrows rather than casts

```ts
isMessageKey(f.messageKey) ? t(f.messageKey) : f.messageKey
```

`t(key as MessageKey)` would compile and render a blank line. The narrowing makes a miss
**visible and reportable** — somebody sees `explain.chroma.neutral` on screen and can say so.
This guard is what stops that fallback ever being reached; it is not a substitute for it.

## How to check it

```bash
node --run test --workspace @irodora/mobile
```

If it fails naming a key, the question is which side is wrong: a new engine key needs copy in
**both** catalogues (and then the font subset — that is [[a-corpus-publish-can-outrun-the-font-that-renders-it]]),
and a catalogue key the engine stopped emitting needs deleting, not exempting.
