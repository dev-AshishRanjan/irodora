# Plan: F-200 — A colour can be a target

| | |
|---|---|
| **Feature** | F-200 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-74, FR-71 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## Intent

Reported as: *"scan a colour and check its similarity/difference against a target colour."*

This is the **target** half. F-201 is the Lens answering against it. Splitting them is the
backlog's own decision and it is a good one: a target that nothing reads is still a feature
somebody can arm and see, and it is testable without a camera.

## A target is not a mailbox

[`handoff.ts`](../../apps/mobile/src/lens/handoff.ts) is module state with no subscribers,
deliberately — *"a mailbox: two functions, one slot, no subscribers, and nothing re-renders when
it changes"*.

**A target is the opposite.** Criterion 1 says it is *visible wherever it is armed*, so surfaces
have to re-render when it changes. That makes it a context, and this app already has exactly one
of those and says why: [`appearance.tsx`](../../apps/mobile/src/appearance.tsx) is a context
because it is written from a screen several routes down and read at the root, with expo-router
owning everything in between. **The target is the same shape**, so it follows the same pattern —
including the part that matters: **screens still take props**, and the route reads the hook.

A screen reaching for the hook itself would throw in the conformance suite, which is the one
place the accessibility guarantees are actually checked.

## Session-held, and NOT persisted

Criterion 2 says *held for the session*. `appearance` persists through a store port; this does
not, and the difference is deliberate: a target is a thing somebody is doing right now, and one
that survived a restart would be a comparison nobody remembered arming. **No store port**, which
also means no device dependency and nothing to fake.

## Disarmed deliberately, never silently

The whole of criterion 2's second clause. Concretely:

- **Navigation does not clear it.** That is the failure mode this criterion exists against, and
  it is what a mailbox would have done.
- **The only ways out are the disarm control and arming a different colour.** Arming a second
  colour replaces the first, which is deliberate — a queue would hold a target somebody had
  moved on from — and it is visible, because the bar changes.
- A test asserts the target survives a re-render with different children, which is the closest a
  unit test gets to "it survived a navigation".

## Any colour the product can show

Criterion 1. A target carries what a swatch carries — hex, OKLCh, the `Color` with its
provenance — plus a label and, **when it has one**, a corpus slug.

`slug: string | null`, because a generated companion has neither a slug nor a name. That is the
same distinction F-199 drew for the wardrobe offer, and here it is not a restriction: a target is
something to compare against, not something to store, so a colour with no provenance beyond
*this engine computed it* can legitimately be one.

## Where it is visible

A bar above the router, rendered by the root layout when a target is armed — so it is visible on
**every** screen without every screen having to know about it. It carries the swatch, the label
and the disarm control.

## Files to touch

```
apps/mobile/src/target.tsx                 — new. The context, the value, the provider.
apps/mobile/src/TargetBar.tsx              — new. The indicator and the disarm control.
apps/mobile/app/_layout.tsx                — the provider and the bar
apps/mobile/src/screens/ColourDetail.tsx   — arm a corpus colour
apps/mobile/src/screens/Combinations.tsx   — arm a companion
apps/mobile/app/(tabs)/atlas/[slug].tsx    — the routes read the hook
apps/mobile/app/(tabs)/atlas/with/[slug].tsx
apps/mobile/src/i18n/{en,ja}.ts            — the bar's copy
apps/mobile/test/target.test.tsx           — arm, replace, disarm, survive
apps/mobile/test/screens.test.tsx          — the bar, and a screen with the affordance
```

## Test plan

- **Armed, replaced, disarmed** — and the decoy: after a disarm the value is `null`, not the
  previous target, so a disarm that merely stopped rendering would fail.
- **It survives a re-render**, which is the unit-test reading of *"navigation does not clear
  it"*.
- **Nothing else clears it:** arming does not clear on unmount of the arming screen.
- **A colour with no slug can be a target**, because a generated companion is a legitimate
  thing to compare against.
- **Conformance:** the bar in both themes, and a screen rendering the arm affordance.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · build`.

## Risks

- **A persistent bar costs vertical space on every screen.** That is the price of criterion 1's
  *visible wherever it is armed*, and it is only paid while a target is armed. Attested.
- **Nobody has looked at it.** Attested.

## Out of scope

The Lens answering against it (F-201) — this feature stores and shows a target, and computes no
difference at all.
