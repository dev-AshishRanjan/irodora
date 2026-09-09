# Plan: F-208 — The alternatives are computed on every ranking and shown nowhere

| | |
|---|---|
| **Feature** | F-208 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-38 |
| **Service** | `mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## The engine half is finished, and that is the finding

`alternativesFor` runs inside every `recommendForSlot` call. It is careful work — relative to
the top pick rather than to the garment, `temperatureOf` rather than `hueBias` (ADR-0076), one
candidate to one axis after F-101 found three chips over one swatch — and every object it
produces is discarded by the only screen that asks for it.

`OutfitRecommendation.alternatives` reaches `Wear.tsx`, and `Wear.tsx` renders `rec.ranked`.

So this is a rendering feature, and the risk is the opposite of the usual one: there is nothing
to compute, and every temptation is to compute something.

## What gets drawn

Under each slot's ranked cards, one small card per alternative:

```
Trousers
  [card] 実赤 Fruit Red        68
  [card] 秋畑 Autumn Field     64
  … four more …

  Or, one step along
  [card] Warmer   · 夏影 Summer Shade   [Open]
  [card] Cooler   · 沖凪 Calm Offing    [Open]
  [card] Lighter  · 夜川 Night River    [Open]
```

**The axis is the heading, and it is words.** Colour is never the only channel
(`ACCESSIBILITY.md`), and here it would be tempting to let the swatch say "warmer" — it cannot,
which is exactly the case ADR-0076 already argued about at the engine level.

**Same `Card` shape as the ranked list, not a new component.** The screen's idiom for an
optional handler is a conditionally-rendered `Button` in the footer, and reusing it keeps these
inside a component the conformance suite already covers.

**An alternative is worth drawing even when it is already in the list above.** It is not a
duplicate: the label is the content, and *"like that, but cooler"* is a different statement from
*"fourth"*. It can also be a colour the list never reached — `alternativesFor` searches all of
`ranked` up to `SHORTLIST_LIMIT` (64) while the screen shows six.

## An axis with no candidate stays omitted

Criterion 2, and the screen does this by having **no branch for it**: it maps
`rec.alternatives`, which the engine has already filtered. The failure mode to avoid is a screen
that renders four slots and fills the missing one — so the test asserts a pool that produces
fewer than four produces fewer than four chips, rather than asserting the happy path twice.

When `alternatives` is empty the whole section is absent, heading included. A heading over
nothing is the "0 results" of this screen.

## The four names, pinned in both directions

```
alt.warmer · alt.cooler · alt.lighter · alt.higherContrast
```

`ALTERNATIVE_MESSAGE_KEYS` in `wear.ts`, derived from `ALTERNATIVE_AXES` rather than listed
beside it — the same mechanism as `COMBINATION_MESSAGE_KEYS`, and for the same reason: the
screen builds the key from the axis, so no literal exists for the unused-key scan to find. That
exclusion is only safe pinned both ways.

`alt.` is a prefix with no screen-copy sibling, so the reverse pin needs no segment-count
partition — and a decoy asserts that, rather than leaving it to be true by luck.

## Files to touch

```
apps/mobile/src/wear.ts             — ALTERNATIVE_MESSAGE_KEYS, and the axis type re-exported
apps/mobile/src/i18n/en.ts          — four keys
apps/mobile/src/i18n/ja.ts          — four keys, written not copied
apps/mobile/src/screens/Wear.tsx    — the section
apps/mobile/test/i18n.test.ts       — the two pins, the decoy, the scan exclusion
apps/mobile/test/wear.test.ts       — the screen cases
```

## Test plan

- **Every alternative the engine returns is drawn, labelled with its axis.**
- **An axis with no candidate is not drawn** — a pool small enough to starve one, asserted by
  counting what the engine returned against what the screen rendered, so the case cannot pass by
  the pool happening to be full.
- **No section at all when there are none**, heading included.
- **Both pins plus the prefix decoy**, in `i18n.test.ts`.
- Japanese is written, not copied — the existing catalogue check covers it once the keys exist.

## Verification

`state · typecheck · lint · format · test · a11y · contrast`.

## Risks

- **The section reads as a second ranking.** It is mitigated by copy and by weight, and copy is
  the weakest kind of mitigation. If it still reads wrong on a device it is a design defect this
  plan cannot settle here — no gate in this repository sees layout [[a-test-tree-has-no-height]].

## Out of scope

Anything in `@irodora/recommendation`. The engine half is finished and touching it would be the
scope creep this feature was filed to avoid.
