# Plan: F-199 — A combination goes somewhere

| | |
|---|---|
| **Feature** | F-199 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-73, FR-52 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## Intent

The release has built the answer — twelve generated relationships, four curated combinations, a
slot ranking — and every one of them is a dead end. A person is told what goes with their shirt
and can then do nothing with it.

## Which colours can go anywhere, and which cannot

**Only a corpus colour.** `ColourOrigin` in [`wardrobe.ts`](../../apps/mobile/src/wardrobe.ts)
is `{ kind: 'corpus', slug }` or `{ kind: 'reading', reading }` — a published colour, or a
measurement. A **generated** companion is neither: it is a coordinate the engine computed, with
no slug and no capture behind it, and F-207 already records that the provenance model has no word
for it.

So generated companions are **not** addable, and that is the correct answer rather than a gap.
Adding a third `ColourOrigin` here would be deciding ADR-0005's open question as a side effect of
wiring a button.

That leaves the colours that *can* travel:

- a **curated** combination's members (corpus entries, F-196)
- a **`Wear`** candidate (a corpus entry, and the only colour that carries a **slot**)

Criterion 1 says *"carrying its slot"*, and `Wear` is the only screen where a colour has one.

## The offer channel, and why it is not a route parameter

`AddGarment` takes a `LensReading` today. **A chosen colour is not a reading**, and constructing
one would fabricate `usableSamples`, `variance`, `illumination` and a `confidence` that nobody
measured — the exact dishonesty ADR-0005 exists to prevent.

So [`handoff.ts`](../../apps/mobile/src/lens/handoff.ts)'s mailbox widens from a reading to an
**offer union**:

```ts
type Offer =
  | { kind: 'reading'; reading: LensReading }
  | { kind: 'corpus';  slug: string }
```

The mailbox is kept rather than a route parameter for the reasons its own docblock gives, and the
addressed-offer discipline (F-043) covers both kinds: an offer meant for the wardrobe is not
eaten by profile setup.

`ColourOrigin` already has a `corpus` member, so `AddGarment` needs no new colour concept — only
a second way to arrive at one it already understands.

**Nothing is stored until the person saves.** That is already true of `AddGarment` and is
criterion 2's second clause; a test asserts it for the new path rather than assuming the old one
covers it.

## The nesting problem, and what it costs

`Card` makes the whole card one target (F-184), and `Wear`'s candidate cards use that to open the
colour. Putting buttons inside a pressable card nests pressables — which `ChoiceGroup` refused
for the same reason one feature earlier.

**So a candidate card that carries actions stops being pressable itself**, and gains an explicit
row: open, shop, add. Three named controls beat one target with two invisible ones, and it is
what makes "one interaction" true rather than "one interaction after you find the right part of
the card".

## Files to touch

```
apps/mobile/src/lens/handoff.ts          — the offer union
apps/mobile/src/screens/AddGarment.tsx   — accept a corpus offer
apps/mobile/app/(tabs)/wardrobe/add.tsx  — pass it through
apps/mobile/src/outfit/builder.ts        — wordForSlot, the inverse of slotFor
apps/mobile/src/screens/Wear.tsx         — the action row
apps/mobile/app/(tabs)/atlas/wear/[slug].tsx — the two destinations
apps/mobile/src/screens/Combinations.tsx — the same two, on curated members
apps/mobile/src/i18n/{en,ja}.ts          — the action labels
apps/mobile/test/handoff.test.ts         — the union, addressed, one-shot
apps/mobile/test/screens.test.tsx        — subjects for the action row
```

## Test plan

- **The offer union is addressed and one-shot for BOTH kinds** — a corpus offer meant for the
  wardrobe is not taken by the profile, and taking it consumes it. The existing reading tests
  stay; the new ones are not a copy of them but the same guarantees asserted of the new member.
- **`wordForSlot` round-trips:** `slotFor({ type: wordForSlot(s) }) === s` for all three slots.
  That is the guarantee that matters — a prefilled type the shopping check cannot map back to a
  slot would silently drop the slot the criterion says it carries.
- **Nothing is stored until saved:** a fake store records no write when the screen mounts with a
  corpus offer.
- **Conformance:** the candidate card with its action row, in both themes.

## Verification

`state · typecheck · lint · format · test · a11y · build`.

**`e2e` is listed on this feature and is `pending`** — the gate refuses rather than passing when
there is no Maestro CLI, and moving it to active is F-091's attested criterion. It will be
reported as **not run**, with that reason, rather than counted.

## Risks

- **The action row makes the Wear card busier.** Three controls per candidate, six candidates per
  slot. If that reads as clutter it is a layout finding, not a reason to hide a destination.
  Attested.

## Out of scope

A third `ColourOrigin` for a generated colour — that is ADR-0005's question and F-207's.
