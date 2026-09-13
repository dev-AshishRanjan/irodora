# Plan: F-218 — The mockup set says which route it is a mockup of, and the gate can tell

| | |
|---|---|
| **Feature** | F-218 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, NFR-26 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | root — `scripts/`, `mockups/`, `.harness/state/` |
| **Author** | Claude (generator), 2026-09-14 |
| **Date** | 2026-09-14 |

---

## Intent

Golden rule 14 makes `mockups/` the specification for everything visible. Today nothing a machine
can read says which image governs which route, so a route can go undrawn, an image can govern
nothing, and an image can change under every feature built from it — all silently. Done means:
each of those is a red build, and a UI feature that names no mockup is refused by gate 0.

## Approach

**Reused:** `routePatterns()` from `scripts/verify-route-targets.mjs` — the one route enumerator;
a second would disagree with it about groups and `index` (F-215). `guardPlants()` from
`scripts/plant.mjs` for the mutation proof. The self-proving shape of `verify-viewport.mjs`.

**New:**

- **`mockups/index.json`** — one entry per image: file, **sha256**, and what it governs —
  `primaryFor` (routes whose layout it decides, P1), `variantFor` (routes it varies: light,
  Japanese, states, drafts, P2), `surfaces` (non-route: components, brand, states), and
  `inventory` (the F-220 inventory path, `null` until then). Plus `undrawn`: a route with no
  mockup, allowed only while an open question in PRD §10 names it (`/profile/measure` → OQ-7).
- **`scripts/verify-mockups.mjs`** — `findProblems()` and `--prove`. Fails on: an image on disk
  not in the index or an entry whose file is gone; a sha256 that does not match the bytes; a route
  with no primary mockup and no open question; a route with two primaries (a screen has one
  layout); an entry naming a route that does not exist; an open question that is not in PRD §10;
  an inventory whose recorded sha256 differs from the image; a §7 row of the fidelity specification
  that disagrees with the index. Reports how many images still have no inventory, so "no problems"
  and "nothing checked" cannot read alike.
- **Schema field `mockups`** on a feature — two-digit ids from the index, or `"all"`.
- **Gate 0, two changes** in `scripts/verify-state.mjs`: the scope walk includes `mockups/`, and a
  feature in R9 or later whose service is `mobile` or whose package is `@irodora/ui` must name its
  mockups — empty only while it carries an open question. Every id must exist in the index.

**Increments** (green between each):

1. Schema field, and `mockups` on every R9 feature. Gate 0.
2. `mockups/index.json`, hashes computed from the files.
3. `verify-mockups.mjs` wired into gate 2 (lint), with `verify:mockups` and `verify:mockups:prove`,
   and the proof as a CI step beside the viewport proof.
4. Gate 0: scope walk and the feature rule. Proof extended to plant a UI feature with no mockups.
5. Effect link and its note.

## Mockup fidelity

Not a visible change — this is the check that makes rule 14 enforceable. **Governing mockup:** none;
the feature names `all` because it indexes every one.

## Files to touch

```
mockups/index.json                                  — new; the machine-readable route ↔ mockup map
scripts/verify-mockups.mjs                          — new; the check and its --prove
scripts/verify-state.mjs                            — scope walk + the "names its mockups" rule
.harness/state/schemas/feature_list.schema.json    — the optional `mockups` field
.harness/state/feature_list.json                    — `mockups` on every R9 feature
package.json                                        — verify:mockups, :prove, and the lint chain
.github/workflows/ci.yml                            — the proof step
.harness/state/effects.json + memory/effects/…      — the new link and its note
```

## Anticipated effects

- **Image ↔ index ↔ inventory ↔ feature.** Changing an image now breaks the build until its row and
  (once F-220 lands) its inventory move with it. Guard: `verify-mockups.mjs` in gate 2 — the new
  critical link.
- **Route tree ↔ index.** Adding a route under `apps/mobile/app` now needs a mockup or an open
  question. Guard: the same check. Existing guards on routes (`verify-route-targets`,
  `verify-reachability`) are unaffected; the enumerator is shared, not copied.
- **Gate 0's scope count goes from 3 to 4.** The weakening scan now reads `mockups/AGENTS.md`.

## Test plan

- **Negative (proof, with decoys):** unindexed image; entry for a missing file; wrong sha256; route
  with no mockup; route with two primaries; entry naming a non-route; unknown OQ; inventory with a
  stale sha256; a UI feature with no `mockups` refused by gate 0.
- **Must stay GREEN:** an undrawn route carrying a real OQ; an extra variant on an existing route; a
  `packages` feature with no `mockups` (the rule is scoped to UI).
- **Baseline asserted green before any plant**, or a plant proves nothing.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-mockups.mjs && node scripts/verify-mockups.mjs --prove
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
```

`build` does not read any of this and is run anyway for the evaluator's clean record.

## Risks and open questions

- **The §7 comparison reads markdown.** Each route's row is split into columns, and the governing
  and variants columns are compared with the index as exact sets — a missing or an extra id fails.
  Every mockup id must also appear somewhere in §7, which covers the non-route rows (icon and
  splash, components). A reworded row fails loudly rather than passing silently.
- **"Touches packages/ui" is read as `package: "@irodora/ui"`.** A feature's files are not recorded in
  `feature_list.json`, so a feature with `service: packages` that edits `packages/ui` without that
  field is not seen. No R9 feature is shaped that way today; the limitation is stated in progress.
- **Revised after the first evaluation (FAIL):** the first version compared §7 for primaries only
  and left the inventory half unowned. Both are closed; the proof went from 15 cases to 27, and then
  to 30 with the scope walk, the §10-only open-question lookup and §7's mention of every mockup.
- No open question blocks this feature.

## Out of scope

Element inventories (F-220), the fidelity captures (F-221), and any change to a screen.
