# Plan: F-202 — Home, rebuilt on the system

| | |
|---|---|
| **Feature** | F-202 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, NFR-25 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## Intent

Reported as *"the homepage is unprofessional."* This is the **third** rewrite, and the first two
are why this plan starts with an audit rather than a redesign.

## What the previous two already fixed, and must not be undone

- **F-146** replaced ten identical secondary buttons with three editorial sections.
- **F-164** fixed the hierarchy: it never said what the product was for, it led with an *empty
  state* on a new install, and it spent boldness twice. It now opens on the wordmark, three
  short fragments — *what colour is this, what goes with it, does it suit me* — and **one colour
  at photographic scale**, whichever one there is to show.

Criterion 2 says *"it still says what the product is for without a paragraph, and still leads
with a colour at size"*. **Both are already true.** They are preserved, and a test asserts them
so the third rewrite cannot quietly undo the second.

## What is genuinely left

Criterion 1 says the front door should be composed *"from cards, motion and the accent rather
than from three stacked sections of one shape"*. F-164 differentiated the **content** of the
three blocks — a big sample, a strip, a quiet block — and its docblock says so. But at the
container level the criterion is still literally true: **all three are `Section`**, because
`Card` did not exist until F-184.

| | today | after |
|---|---|---|
| containers | three `Section` | `Card` at three levels |
| the big sample | inside padding | the `media` slot, which escapes it |
| the accent | **nowhere on this page** | one primary action, on the lead |
| motion | `Section index` → `Appear` | kept — it already works |

**Motion is already there** (`index={0,1,2}` → `Appear`, F-188) and is not touched. Saying it is
"added" would be claiming work that F-188 did.

## Criterion 3, and the half that needs a route

*"It offers the combination of the colour it is leading with."*

- **Today's colour** is a `PublishedEntry` and has a slug → `/atlas/with/<slug>`.
- **A reading has no slug and never will** — `SavedColorRow.corpus_slug` is `null` for a Lens
  capture, and the column's own comment says *"its origin is a camera, which is what `source`
  already says"*.

F-197 made `Combinations` take a **colour** subject for exactly this shape of problem. What is
missing is a way in: a new route `/atlas/with/reading/[id]` that reads the saved colour by id and
passes its colour — **the id travels, not the colour**, mirroring `/wardrobe/with/[id]` in both
shape and reasoning.

So the offer is on the lead in **both** cases, which is what the criterion asks and what a
slug-only version would have quietly failed to deliver on a phone that had ever been used.

## Where the accent is spent

Once, on the lead card's action. The rule this page already follows is `visual-taste`'s — *a page
with three bold moves has none* — and the boldness is already spent on one colour at size. The
accent is the second signal and it goes on the one thing this page most wants somebody to do
with that colour.

## Files to touch

```
apps/mobile/src/screens/Home.tsx                     — Card, levels, media, the action
apps/mobile/app/(tabs)/index.tsx                     — the two destinations
apps/mobile/app/(tabs)/atlas/with/reading/[id].tsx   — new route
apps/mobile/src/i18n/{en,ja}.ts                      — the action label
apps/mobile/test/home.test.ts                        — what must not be undone
apps/mobile/test/screens.test.tsx                    — the subjects, both leads
```

## Test plan

- **The second rewrite is not undone:** the page still renders the three fragments and the
  on-device line, and still draws a colour at the lead size. Asserted against the rendered tree,
  because that is the thing a rewrite breaks.
- **The offer follows the lead:** with a reading, the action carries the reading's id; with no
  readings, it carries today's slug. Both, or "it offers the combination of the colour it is
  leading with" is true for one install state and false for the other.
- **The new route resolves**, and the reachability gate sees it.
- **Conformance:** both leads, in both themes — the card levels, the media slot and the accent
  action are all new trees.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · build`.

## Risks

- **A third rewrite is where a good page gets worse.** The mitigation is that criterion 2's two
  guarantees are now asserted rather than remembered.
- **Nobody has looked at it.** Attested — and it is the criterion that matters most on this
  screen, since "unprofessional" was a judgement no gate discharges.

## Out of scope

The other four surfaces (F-203) and the conformance sweep (F-204).
