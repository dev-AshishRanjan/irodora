# Plan: F-147 — The Atlas and the colour card are photographic, not tabular

| | |
|---|---|
| **Feature** | F-147 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-20, FR-50, NFR-25 |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

The Atlas is 120 rows of **56px swatch beside three lines of concatenated text**, all rendered at
once. The reporter named this: *"even the color cards are looking very bad"*.

The `Swatch` is not the defect — it is the most rigorous component in the UI package, with a
gamut-verified two-tone keyline proven to hold 3:1 against every sRGB sample. **What is wrong is
composition**: the artefact the product exists to show is the smallest considered element on the
screen.

## What it becomes

**One column of full-width entries**, not two. A 2-column grid gives a cell ~160px wide on a
phone, and criterion 2 asks for the Japanese name at a **display size** — 34px kanji does not sit
in 160px without wrapping. One column makes the colour genuinely photographic *and* leaves the
name room to lead.

| element | was | becomes |
|---|---|---|
| the colour | 56px square | full-width band, 180px tall, on its well with the keyline intact |
| the name | `${kanji} ${en}` at 15px, concatenated | **kanji at `display.2`**, kana beneath at `small` |
| romaji, English | in the same 13px string | subordinate, on their own line |
| the hex | appended to a third concatenated string | `numeric`, tabular, subordinate |

**Concatenation is the tell.** `${kanji} ${en}` and `${family} · ${temperature} · ${hex}` are
three fields flattened into one `Text` because nothing had decided their relative weight. Giving
each its own node is what makes a hierarchy possible at all.

## Criterion 4 is a real change, not a hope

*"Browsing 120 entries is smooth on a four-year-old mid-range Android."* Today every entry is
rendered eagerly inside `Screen`'s `ScrollView` — **there is no virtualisation anywhere in this
app**. 120 mounted subtrees, each with a `Surface`, a `Swatch` and three `Text` nodes.

So: `Screen scroll={false}` + a `FlatList` whose `ListHeaderComponent` carries the corpus line,
the search field and the filters. That is also the only correct arrangement — a `VirtualizedList`
inside a plain `ScrollView` is a documented React Native error, and it is what a naive "add a
FlatList" would produce.

## This is where `xl4` and `xl5` are spent

Their exemption names F-147, and the reason given was *"hero rhythm — the space around a single
large thing, which needs a surface built around one"*. A full-width colour band is that thing:

- **`xl4` (56)** between entries. Each is a single large object and 56 is what stops a list of
  them reading as a table.
- **`xl5` (96)** between the header block and the first entry — the break between *the controls*
  and *the work*, which is the one place on this screen a 96px interval means something.

If either turns out not to earn its place, the honest move is to re-own the exemption to F-148
rather than keep a number that is only there to close a gate.

## Approach

**Reused:** `Screen`, `Stack`, `Row`, `Section` (F-140); `Swatch`, `Surface`, `Chip`,
`SearchField`; `colorFor`, `familyLabel`; every existing filter and query function — **the
selection logic does not change at all**, only its presentation.

**New:** nothing outside the screen. This is a composition change.

**Increments:** the entry cell; the FlatList and its header; the spacing.

## Files to touch

```
apps/mobile/src/screens/Atlas.tsx            — the list and the cell
apps/mobile/test/screens.test.tsx            — the subject's sampleValues follow the cell
.harness/verification/unreached-tokens.json  — xl4/xl5 closed, or re-owned with a reason
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| `xl4`/`xl5` reached | their exemption must go | `a11y` (token reach), which fails on a stale one |
| `Screen scroll={false}` here | F-104's lesson — a fixed screen can hide content below the fold | the FlatList scrolls instead, which is the point; but it is the exact shape of that bug and worth stating |
| The entry cell's tree changes | the conformance subject, the a11y and contrast gates | gates 8 and 9, already blocking |
| The e2e journey taps an Atlas entry | `atlas.journey.json` selectors | `lint` — the flow generator resolves selectors against the catalogue |

## Test plan

- **The cell:** kanji, kana, romaji, English and hex are **five separate nodes**, not two
  concatenated strings — asserted by finding each independently.
- **Type hierarchy:** the kanji renders at the display step and the hex does not. Both halves,
  because asserting only the first passes on a screen where everything is 34px.
- **Tabular:** the hex node carries the numeric variant; a name node does not. The decoy again.
- **Virtualisation:** the list is a `FlatList` and `Screen` does not scroll — asserted from the
  rendered tree, because "we added a FlatList" and "it is not nested in a ScrollView" are
  different claims and only the second one prevents the warning.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm test:a11y && pnpm test:contrast
```

## Risks and open questions

**Criterion 4 cannot be verified here.** Virtualisation is the right change and the reason for it
is sound, but *"smooth on a four-year-old mid-range Android"* is a measurement on a device, and
`perf` is not in this feature's gates because nothing here can run it. Attested, not claimed.

**A full-width band at 180px is a lot of screen for one entry.** Browsing 120 of them means more
scrolling than a 2-column grid would. That is the trade the register asks for — the colour has to
be judgeable — and it is worth flagging rather than assuming.

## Out of scope

The colour **page** (F-148) — this changes how an entry looks in a list, not what opens when you
tap one. The shareable card document (`cardSvg`) is untouched: it is already a composed artefact
and its arithmetic is pinned by `card.test.ts`.
