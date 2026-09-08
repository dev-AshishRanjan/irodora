# Plan: F-187 — The swatch well is a shape, and selection does not move it

| | |
|---|---|
| **Feature** | F-187 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-25 |
| **Package** | `@irodora/ui` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

*"The bg of color div, which is grey color, is still square/rectangle shaped, no roundness here.
add roundness here too."*

Exactly right, and the history explains it: ADR-0090 replaced `radius.swatch: 0` with a
proportional corner **on the sample**, ADR-0094 capped it, and F-161 called the roundness done.
The ground the sample sits on was never touched. **A rounded sample inside a square well is a
shape somebody drew half of.**

## Approach

**The same rule, one level out.** The keyline's corner is already the sample's plus its own 1 px
inset — because two nested rounded rectangles are only concentric when the outer radius exceeds
the inner by the inset. Give them the same radius and the outer arc is *tighter*, and a sliver of
ground shows through each corner.

The well is one more nesting with a larger inset, so the arithmetic is identical:

```
sample   = min(size × ratio, radius.xl)
keyline  = sample  + 1              (the hairline's own inset)
well     = keyline + spacing.sm     (the well's padding)
```

**The well is not capped**, and that is a decision rather than an omission. `SWATCH_MAX_CORNER`
exists so a *sample* does not become a curve at the sizes this product draws heroes at. A
container following its own content past that is the correct direction — and capping the well
while the keyline kept growing is precisely the sliver the concentric rule exists to prevent.

**`WELL_INSET` is the padding, named once.** The corner is derived from the gap, so a padding
that drifted from it would put the ground back through the corners.

### The second half was already done

*"A selected swatch is the same size as an unselected one"* became true in F-176, when
`selectionTone` started reserving the edge in every state. It was **not asserted against the
component** — only against the tone that feeds it, which is necessary and not sufficient: a
component could take the tone and then add its own conditional border, which is exactly what
`Swatch` and `Chip` each did independently before F-176.

## Files to touch

```
packages/ui/src/Swatch.tsx                — WELL_INSET, and the third corner
packages/ui/test/swatch-corners.test.tsx  — concentricity one level out, and the uncapped well
packages/ui/test/selection.test.tsx       — the rendered component, not only the tone
```

## Test plan

- **Concentricity at ten sizes**, including both sides of the cap: `well − keyline` must be
  exactly the padding, the way `keyline − sample` must be exactly 1.
- **The well grows past the cap** while the sample stops at it — asserted, because the opposite
  is the failure and it would look like a rounding difference.
- **The rendered `Swatch` declares the same border width chosen or not**, in both themes.

## Verification

`typecheck · lint · format · test · a11y · contrast · build · state`. Not run: `cvd`,
`color-golden`, `content` — no colour value, no maths, no corpus.

## Risks

- **Nobody has looked at it.** Whether the well's corner reads as *following* the sample or as a
  second competing curve is a judgement about geometry at 32 px, and it is the third R7 feature
  to end owing exactly that. Attested.
- **`swatch-edge.test.ts` is untouched and still passes.** Contrast is per-pixel and indifferent
  to geometry, so F-068's two-tone proof carries over — the same reasoning ADR-0090 recorded
  when it rounded the sample.

## Out of scope

Every other container's corner. The radius scale reaches cards, sheets, fields and chips
already; this is the one shape that was left square.
