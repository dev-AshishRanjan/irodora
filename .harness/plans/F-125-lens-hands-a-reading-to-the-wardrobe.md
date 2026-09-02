# Plan: F-125 — The Lens can hand a reading to the wardrobe

| | |
|---|---|
| **Feature** | F-125 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-40 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-02 |

---

## Intent

`READING_DESTINATIONS` is `['profile', 'wardrobe']`. `offerReading` is called **exactly once in
the whole app** — `CameraLens.tsx`, with `'profile'`. So `takeReading('wardrobe')` in
`app/wardrobe/add.tsx` can only ever return `null`, and `AddGarment`'s *"use the Lens reading"*
control is **unreachable on a device**.

F-043 built the receiver. E-042 records the addressed-mailbox design that made two consumers
safe. **The sender for the second address was never added.**

Done: the Lens offers the reading to the wardrobe as well, and a test asserts every destination
has a producer.

## Why nothing caught it

A consumer with no producer, which is
[[a-column-nothing-writes-makes-its-own-feature-unfalsifiable]] applied to a mailbox rather than
a column — and invisible for the same reason: **every test that exercises the wardrobe path
supplies the reading itself.** `lens.test.ts` calls `offerReading(READING, 'wardrobe')` directly,
so the fixture *is* the missing sender.

That is why criterion 2 is a **source scan over `src/` and `app/` only**. A scan that included
`test/` would find the fixture and report a producer that does not ship.

## Approach

**`Lens` gains `onUseForWardrobe`**, symmetric with `onUseForProfile`; `CameraLens` supplies it
with `offerReading(taken, 'wardrobe')` and `router.push('/wardrobe/add')`.

**One decision worth stating: the same `worthOffering` gate.** It reads
`confidence > CONFIDENCE_NONE && usableSamples > 0` — despite living in `profile/photo.ts`, that
is not a profile-grade bar, it is *"the reading has any signal at all"*. A reading with no usable
samples is not a colour, whatever it is for. A second predicate would be a second answer to one
question, and the wardrobe would then disagree with the profile about what a reading is worth.

**Reused:**

| Piece | Where |
|---|---|
| `offerReading` / `takeReading`, addressed | `src/lens/handoff.ts` (F-043, E-042) |
| `worthOffering` — has this reading any signal | `src/profile/photo.ts` (F-027) |
| `AddGarment`'s `offered` prop and its `fromLens` control | `src/screens/AddGarment.tsx` (F-043) |
| `app/wardrobe/add.tsx`'s `takeReading('wardrobe')` | the receiver, already correct |

**Increments:**

| # | Step | Verified by |
|---|---|---|
| 1 | copy in both locales; font subset | `typecheck`, `test:content` |
| 2 | `Lens`'s prop and control; `CameraLens` supplies it | `typecheck`, `test`, `a11y` |
| 3 | the producer scan, with its decoy | `test` |
| 4 | a registry subject for a reading with **both** offers | `a11y`, `contrast` |

## Files to touch

```
apps/mobile/src/screens/Lens.tsx          — the second offer
apps/mobile/src/lens/CameraLens.tsx       — the producer
apps/mobile/src/i18n/{en,ja}.ts           — two keys
apps/mobile/test/lens.test.ts             — the producer scan and its decoy
apps/mobile/test/screens.test.tsx         — the offer is drawn
apps/mobile/assets/fonts/*                — regenerated if new kanji appear
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-042** the reading mailbox is addressed, and an offer can be eaten | **This is the link's second producer arriving.** The addressing was built for exactly this and has never been exercised by shipped code — only by fixtures | **`test:lens.test.ts`**, now including the producer scan |
| **E-016** `en.ts` → `ja.ts` and every render site | Two keys | **`gate:typecheck`** |
| **E-017** Japanese copy → the bundled font subset | Two Japanese strings | **`script:verify-font-coverage.mjs`** |

**No new effect link.**

## Test plan

- **The producer scan**, over `src/` and `app/` only, matching `offerReading(…, '<dest>')`.
  - **Its decoy is the point:** a destination that is not in `READING_DESTINATIONS` must find
    **zero** producers, or the scan is matching everything.
  - **A second decoy:** the scan must not be satisfied by `test/`. Asserted by checking the
    roots it walks contain no test file, so the exclusion is a property rather than a comment.
- **The screen draws both offers** for one reading, and neither for a reading with no signal.
- **Mutation:** remove the `'wardrobe'` call from `CameraLens` and confirm the scan goes red;
  point it at `'profile'` twice and confirm the same.
- **Not applicable:** `color-golden`, `cvd`, `perf`. `e2e` — gate 7, F-091.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:content
pnpm test:a11y && pnpm test:contrast
pnpm build
```

## Risks and open questions

- **No `OQ-*`.**
- **The whole path is still unattested on a device.** F-040's first attestation is outstanding,
  so no reading has been observed reaching any screen on real hardware. This feature makes the
  wardrobe route *exist*; it does not make it *observed*, and the scan proves a call site rather
  than a working hand-off. That is the same honest limit F-116's static check carries.
- **`worthOffering` is imported into a wardrobe decision from a profile module.** Its rule is
  general and its name says `offering` rather than `profile`, but the file it lives in is a
  profile file. If a third destination ever needs a different bar, this is the seam that moves.

## Out of scope

- **A third destination.** The scan exists so one cannot be added without a producer; adding one
  is not this feature's business.
- **Moving `worthOffering`** out of `profile/photo.ts`. It would be a rename touching two screens
  for no behaviour change, and the risk note above is the record if it becomes wrong.
- **The shopping check as a consumer.** F-125's own notes explain why: building a third consumer
  of a path nobody has seen work on a device would be two dead routes instead of one.
