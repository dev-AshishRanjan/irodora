# Plan: F-178 — A navigation closes the panel it left open

| | |
|---|---|
| **Feature** | F-178 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, NFR-8 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Opus 5 |
| **Date** | 2026-09-08 |

---

## Intent

Reported first, and it is the plainest defect in the list: *"When I click on any buttons in
bottomsheet on lens page, it redirects to another page, but the bottom sheet is still open as
fullscreen … on navigation close the bottom sheet."*

The Lens sheet is open exactly when `capture.held !== null`. Four controls inside it navigate —
use for profile, use for wardrobe, open the contemporary colours, open a corpus entry — and
**none of them clears the capture**. The sheet is portalled, so it stays mounted over whatever
the router pushed. `CameraLens.tsx:226, 243, 294, 297`.

Done, to a user: leaving the Lens by any door closes the panel behind you, and the reading you
were acting on still arrives.

## Approach

**Reused:** the `dismissed` event, which already exists and already does the right thing — the
reducer clears `held` and deliberately keeps `live`, so a live session does not blank for a
frame. Nothing about the state machine changes. `offerReading` from `handoff.ts` keeps carrying
the reading, and it is called **before** the dismissal, so nothing is lost.

**New:** `apps/mobile/src/lens/exits.ts` — the four doors, as data.

### Why a module rather than four fixed call sites

Fixing the four handlers where they are would work today and would not survive the fifth. The
defect is not that somebody forgot a line; it is that **there was nowhere the rule could live**.

So the exits become a table from a name to an href, and one factory wraps every entry so that
`dismiss()` happens before `navigate()`. Adding a door means adding a row, and a row cannot
forget to close the panel because closing it is not something a row does.

**The order is load-bearing and is asserted.** Dismissing *after* navigating leaves the sheet
over the new screen for at least a frame, which is a smaller version of the same defect.

### The rule that keeps it true

A test reads `CameraLens.tsx` and fails if it contains `router.push` at all. That is criterion
2's *"fails if one is added without one"* made structural rather than hopeful: the only way to
leave the Lens is the table, and the check is what stops a fifth door being opened beside it.

**Criterion 3 is scoped honestly.** *"No overlay in the product can outlive the screen that
opened it"* would need a gate over every overlay, and there is exactly one overlay with exits
today. The check is written for the Lens and the criterion is amended to say so, rather than
claiming a guarantee that covers components nobody has built.

**Increments:** the module and its test; the container adopts it; the source rule.

## Files to touch

```
apps/mobile/src/lens/exits.ts        — new. The four doors, as data.
apps/mobile/src/lens/CameraLens.tsx  — adopts it; loses every router.push
apps/mobile/test/lens-exits.test.ts  — new
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| the Lens's four exits | the four destinations, and `handoff.ts`'s one-shot offer | the new test; `verify-route-targets` still resolves every href |
| `router.push` leaves `CameraLens` | nothing else imports it | typecheck |

No effect id: this is a screen's internal wiring, and inventing a link for it would make the
graph noisier without making anything checkable.

## Test plan

- **Unit:** each of the four exits dismisses, navigates, and does so **in that order**;
  the two that carry a reading offer it before dismissing, addressed to the right destination.
- **Negative, with a decoy:** an exit table entry that navigates without going through the
  factory is not expressible — asserted by checking every key of the table produces a handler
  that dismissed. Plus the source rule, watched failing on a string containing `router.push`.
- **Route targets:** `verify-route-targets` must still resolve all four hrefs, which is what
  stops the table becoming a list of dead strings.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm test:a11y
node scripts/verify-route-targets.mjs
pnpm build
```

`contrast`, `cvd`, `color-golden` and `content` are **not** run: no colour, no maths, no corpus.

## Risks and open questions

- **The fix cannot be seen by a screen test**, and F-158 already recorded why: a `Sheet` renders
  the same tree open or shut, because gorhom mounts its content either way and visibility lives
  in animation state on the UI thread. So this is asserted at the state and call-order level,
  which is where it is decidable, and the visible behaviour is a device judgement.
- **`router` is a module import, not a port.** The exits take navigation as a function so the
  test never touches expo-router; the container supplies the real one. That is the convention
  every screen here already uses.

## Out of scope

Every other overlay (there is one, and it has no exits), the sheet's own behaviour (F-177), and
what the four destinations do when they arrive.
