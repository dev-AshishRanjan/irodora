# Plan: F-146 — Home is an editorial surface

| | |
|---|---|
| **Feature** | F-146 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, NFR-25 |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

Home is a title, two 72px swatches, three lines of grey text, and **ten identical secondary
buttons**. F-145 gave those buttons a tab bar to be replaced by; this replaces them.

To a user: the front door opens on the product rather than on a menu. To the release: the first
screen where the editorial direction is a thing you can look at rather than a document.

## What it becomes

**The wordmark at `display.1`.** 72px, the top of the scale, and the token whose exemption names
this feature: *"Its surface is Home (F-146), where the wordmark and the product name lead."* This
closes it, and the closing is checked — `verify-token-reach` fails on an exemption that outlived
its owner.

**Three blocks, in this order, because it is the order of what a person came for:**

| block | source | when it is absent |
|---|---|---|
| **The last reading** — the colour, at photographic scale, on its well | `listColors()`, most recent by `created_at` | first run: an invitation to take one, not an empty card |
| **The wardrobe** — a count and the colours in it | `listGarments()` | first run: what it would hold |
| **Today's colour** — one corpus entry, at photographic scale | the corpus, picked by the date | never absent; the corpus always has 120 |

**The ten buttons go.** Every one of their destinations is a tab or lives inside one — that was
F-145's whole point, and leaving the list would mean the tab bar had been added *beside* the old
navigation rather than instead of it.

## Today's colour is deterministic, and that matters

A different entry each render would make Home flicker and would make "today's colour" a lie. It
is derived from the **local date** and the corpus length — the same day gives the same colour, on
every device, with no state stored and nothing random.

**It is not a recommendation.** The copy says what it is — a colour from the corpus, today's —
and claims nothing about suiting anyone. The claims lint is binding on every string here, and a
front door is exactly where an overstatement would be most tempting and least noticed.

## Approach

**Reused:** `Screen`, `Section`, `Stack`, `Row` (F-140); `Wordmark` (F-141); `Swatch`, `Surface`,
`Button`, `EmptyState`; `deviceRepository()`, already wired into other routes; `allEntries` and
`colorFor` from the corpus.

**New:** `apps/mobile/src/home.ts` — the *selection* logic as a pure module: which reading is
most recent, what the wardrobe summary is, which entry is today's. Pure so it is testable without
rendering, and separate so the screen draws an answer rather than deciding one — the arrangement
`palette.ts`, `finder.ts` and `browse.ts` already use.

**Increments:** the pure module and its tests; the screen; the states; the route wiring.

## Files to touch

```
apps/mobile/src/home.ts               — NEW: the three selections, pure
apps/mobile/test/home.test.ts         — NEW
apps/mobile/src/screens/Home.tsx      — rewritten
apps/mobile/app/(tabs)/index.tsx      — hands it the repository; the ten callbacks go
apps/mobile/src/i18n/{en,ja}.ts       — new copy, both locales
.harness/verification/unreached-tokens.json — display.1's exemption is REMOVED
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| `display.1` reached | its exemption must go | `a11y` (token reach) — fails on a stale declaration |
| Home reads the repository | the route must supply it; `screens.test.tsx` asserts routes wire the real one | `test` |
| Ten `onOpen*` props removed | `HomeProps` consumers — the route, and the conformance subject | `typecheck` |
| New message keys | the i18n completeness and unused-key checks | `test` |

## Test plan

- **Selection, pure:** the most recent reading is by `created_at` and ignores `deleted_at` rows;
  an empty store yields `null` rather than throwing; today's colour is **the same for the same
  date and different for a different one** — both halves, because a function returning a
  constant satisfies the first.
- **States:** first-run, populated and loading each render a *different* tree. The conformance
  suite already asserts that for `data` kind, so Home is registered as one rather than `static`.
- **The wordmark:** `display.1` reaches the rendered node — asserted from the tree, not the prop.
- **No buttons:** the screen renders no navigation control, because the tab bar is the navigation
  now. A negative assertion, so it needs the positive one beside it: the tab bar's own subject.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm test:a11y && pnpm test:contrast
```

## Risks and open questions

**This is the first screen judged on whether it looks good**, and nothing gates that. The
pre-flight in [`visual-taste`](../skills/visual-taste/SKILL.md) is the closest thing, and it is a
checklist a person runs. The Irodora-specific test applies here more than anywhere: *put a real
garment colour on screen inside this interface — can you judge it accurately?* Home shows two
colours at photographic scale, so if the chrome interferes it will show here first.

**A first-run Home has almost nothing to say**, and that is the state most people see. It is
listed as a criterion for exactly that reason; the temptation is to design the populated case and
let the empty one fall out.

## Out of scope

The Atlas and the colour page (F-147, F-148) — Home links to them and does not become them.
Motion (F-144). Any change to what a reading *is* or how one is taken.
