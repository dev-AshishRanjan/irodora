# F-150 — The wardrobe is a gallery

**Status:** in_progress · **Release:** R6 · **Blocked by:** F-147 (done)

---

## The dials

[`R6-EDITORIAL-DIRECTION.md`](../../docs/design/R6-EDITORIAL-DIRECTION.md): **medium variance — a
gallery grid**, low motion, medium density. Between the Atlas (editorial, spacious) and the Lens
(task, plain). The notes put it plainly: *"the surface that most resembles a retail product and
currently resembles a list."*

---

## What is there now

A list. Grouped by colour family, and each garment is a row:

```
[44px swatch]  Name          [Edit]
               type
```

Everything about that is a table: a swatch too small to judge, a name doing the work the colour
should do, and a secondary `Button` per row — so a wardrobe of forty garments is forty buttons.

**And the photographs are not shown at all.** `garment_image` has existed since F-042, stores the
image as a BLOB inside SQLCipher deliberately (an `image_path` would have made NFR-13 false while
looking like it satisfied it), and `AddGarment` writes one. Nothing reads it back.

---

## The four criteria, and what each actually requires

### 1. Images at a size worth looking at, with colour on the neutral well

The cell is the **photograph**, with the garment's measured colour as a `Swatch` on it — the
retail shape, and the one the criterion describes. Where there is no photograph the colour becomes
the cell, at gallery scale.

**The plumbing does not exist yet.** `WardrobeStore` in `apps/mobile/src/wardrobe.ts` declares
four methods and none of them reads an image; the repository has `getGarmentImage` and the cheap
`getGarmentImageInfo`, and the schema comment says the split exists *"so the list query is
cheap"*. So this feature widens the app-side interface, and must honour that split rather than
undo it: a grid that pulled every BLOB into memory to draw twelve visible cells would make the
list query expensive again by another route.

`bytesFromBase64` exists in `wardrobe/source.ts`; the inverse does not and is what a `data:` URI
needs.

### 2. Add, edit and filter without leaving the grid

Add and filter already are on the screen. **Edit is the one that changes**: the per-row `Button`
becomes the cell itself. A gallery cell that needs a separate control to open it is a list with
pictures.

### 3. Coverage and gaps, with the chart tokens, never by colour alone

`chart.1`–`chart.5` are declared unreached, and **this feature is named as their closer** — so
this criterion is not optional; leaving it would leave a stale exemption that gate 8 refuses.

The engine is finished and unused here. `coverage()` returns `valid`, `perGarment` and the
`threshold` it was produced at; `gaps()` returns each gap's published terms, `wouldUnlock` and the
`representative` colour the projection used. `Shopping.tsx` already calls both.

What gets plotted:

- **Coverage** — garments bucketed into five bands by how many outfits they appear in, one band
  per chart tone. Five buckets because the ramp has five steps, not the other way round.
- **Gaps** — each gap named in its published words, with `wouldUnlock` as a bar on the same ramp.

**Never by colour alone**: every band carries its count as text and its label as words. The ramp
is near-achromatic precisely so a series stays separable without hue — that is why it exists, and
it is the reason a rainbow palette was refused under deadline.

**And the numbers stay honest.** `wouldUnlock` is a projection from a synthetic colour, not a
measurement; `valid` is a count at a stated threshold. The copy says so, or the claims lint should
fail it.

### 4. Empty, single-item and large-wardrobe states

- **Empty** — `EmptyState` owns the add affordance, as F-139 established. Unchanged.
- **Single item** — one cell in a grid built for many looks broken. The grid needs to say
  something at one garment, and a coverage chart of one garment is not a chart.
- **Large** — the grid virtualises. The Atlas learned this in F-147 and E-064 records what it
  costs: a test that walks the mounted tree to prove reachability breaks, because *reachable is
  not the same as simultaneously rendered*.

---

## Order of work

1. The image read path — interface, `base64FromBytes`, a bounded cache.
2. The cell and the grid, with edit on the cell.
3. Coverage and gaps, on the chart ramp.
4. The three states, and the copy.

Each is verifiable on its own; 1 and 3 are the two that can go wrong quietly.

---

## Risks

**Base64 of a photograph on the JS thread is not free.** The BLOBs are bounded by `ingestImage`,
but a 40-garment grid decoding every one at mount would stall the first paint. Mitigations, in
order: virtualise so only visible cells ask; cache by garment id; and read `getGarmentImageInfo`
rather than the BLOB wherever only the dimensions are needed.

**A chart is the first thing in this product that plots anything.** There is no charting
component, no axis convention and no precedent. Five labelled bands is the smallest honest thing
that uses the ramp for what it was designed for — and small is right for a first one, because the
second surface (F-055's dE tables) will want to share whatever this establishes.

**The grouping may not survive.** The list groups by colour family with the family word as a
heading, which is the second channel NFR-9 wants. A grid of photographs has a different natural
order. If grouping stays, it is section headers over a grid; if it goes, the family word has to
survive somewhere else — losing it would be a real accessibility regression, not a layout choice.

---

## Definition of done

- [ ] Garment photographs render in the grid; the colour sits on its well; no-photo cells work
- [ ] The cell opens the editor; no per-row button
- [ ] `chart.1`–`chart.5` are reached, and their exemption is closed rather than re-pointed
- [ ] Coverage and gaps carry text and number, never colour alone
- [ ] Empty, one-garment and many-garment states each designed and tested
- [ ] Claims lint passes on every new string, in both locales
- [ ] `pnpm verify:ci` green
- [ ] Effects traced; the visual judgement attested rather than claimed
