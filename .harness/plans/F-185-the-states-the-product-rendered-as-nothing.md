# Plan: F-185 — The states the product currently renders as nothing

| | |
|---|---|
| **Feature** | F-185 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-9 |
| **Package** | `@irodora/ui` · `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

`EmptyState` covers *nothing here yet*; `Status` covers *something went wrong*. Between them the
product filled a gap with prose: a button whose label changed to `"Reading…"`, a `<Text>` that
appeared saying `"Saved"`, and — while a screen was computing — **nothing at all**.

A screen that renders nothing while it works is indistinguishable from one that finished and
found nothing, which is the single confusion an empty state exists to prevent.

## Approach

Two components, both wrapped, both with a real consumer.

| | wrapped | what is inherited | consumer |
|---|---|---|---|
| `Skeleton` | yes | a repeating opacity animation | the Lens, while a capture is in flight |
| `useConfirm` | yes | a portal, a queue, auto-dismiss, swipe-to-dismiss | `AddGarment`'s save |

**The toast's provider is already mounted.** `HeroUINativeProvider` wraps its children in
`ToastProvider`, so `ThemeProvider` has been supplying one since F-087 with nobody using it. No
root-layout change — the capability was already there and unreached.

**Reduced motion turns them off rather than slowing them down.** These are the only things in
the product that animate *continuously*, so F-144's rule bites hardest here: the skeleton becomes
a static tinted block and still announces `busy`, because the announcement was never the
animation's job.

**The toast is rendered as our own component**, not configured. HeroUI's configured form takes
`label`/`description`/`variant` and **no `style`**, so a configured toast is coloured by the
active library theme — the same *"a colour nobody in this repository chose"* hazard `Dialog`,
`Popover` and `Sheet` each refuse with `background={null}`. `tsc` refused the first draft for
exactly that.

## Files to touch

```
packages/ui/src/feedback.tsx              — new
packages/ui/src/index.ts                  — export
packages/ui/test/conformance.test.tsx     — Skeleton subject
apps/mobile/src/screens/Lens.tsx          — a placeholder shaped like the reading
apps/mobile/src/screens/AddGarment.tsx    — the confirmation becomes one
```

## Test plan

- **Conformance:** `Skeleton` in both themes. `static`, because a skeleton has one state by
  definition — it *is* the state — and what the suite checks is that it announces itself.
- **The toast is not registered**, and that is stated rather than skipped: it is transient and
  portalled, so a subject would render an empty tree. Its colours are declared pairings the
  contrast gate measures at the token level; what is *not* checked here is the rendered toast,
  and that is a device judgement.

## Verification

`typecheck · lint · format · test · a11y · contrast · motion · build`. Not run: `cvd`,
`color-golden`, `content`.

## Risks and open questions

- **`Spinner` was built, registered, and refused.** See the notes — the conformance suite caught
  it painting `#000000` in all eight palettes.
- **The Lens placeholder is 56 px because the swatch is.** The number is named once, so the two
  cannot drift; a placeholder that is not the size of its subject reintroduces the jump it was
  added to remove.

## Out of scope

`Alert` — the wrapper rule already records that HeroUI's is a banner and cannot carry ADR-0044's
three channels inline; `Status` stays ours. `Separator` and `ScrollShadow`: no consumer, and the
rule refuses a wrapper without one.
