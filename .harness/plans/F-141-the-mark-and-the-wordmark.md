# Plan: F-141 — The mark and the wordmark

| | |
|---|---|
| **Feature** | F-141 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-69 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/ui` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

The repository has had a brand document since R0 and no identity asset of any kind — no mark,
no wordmark, nothing. This draws them, to the brief that is already written in
[`BRAND.md` §7](../../docs/design/BRAND.md#7-the-mark), and makes the one hard constraint on
them checkable rather than a matter of opinion.

To a user: the app has a face. To F-142: an icon and a splash exist to be derived from.

## The design, and why this one

**The brief:** *"a wordmark-led identity with a geometric mark suggesting **arranged** colour —
relationship, adjacency, interval — rather than a swatch or a droplet. It must work in one
colour, at 16 px, and under protan, deutan and tritan simulation."*

**The mark is two fields and the interval between them.**

On a 24-unit grid: two identical rectangles, 7 wide and 14 tall. The left sits at (3, 3), the
right at (14, 7). The horizontal gap between them is **4**, and the vertical offset between
them is **also 4** — one quantity, stated on both axes. The ink occupies an 18 × 18 square
centred in the 24 × 24 field.

That single equality is the whole idea. The mark is not two shapes that happen to sit near each
other; it is two fields in a *measured* relationship, which is what an arrangement is and what
間 (*ma*) means in [`BRAND.md` §6](../../docs/design/BRAND.md#6-visual-direction). It is also
the one thing about the mark that can be asserted in a test rather than admired.

**What was rejected, and why:**

| candidate | rejected because |
|---|---|
| Three bars of increasing height | A bar chart. Generic, and on the visual-taste cliché list. |
| Nested rectangles — a sample on its well | That **is** a swatch. Excluded by the brief in as many words. |
| Overlapping translucent circles (colour mixing) | Wrong about the product: this measures colour, it does not mix it. Circles also contradict *"rectilinear… swatches are true rectangles"*. |
| A droplet | Excluded by the brief. |
| Three fields rather than two | More busy, not more meaningful. *Interval* needs exactly two edges; the third only costs legibility at 16 px. |

**The wordmark** is the product name set from the type scale, and the lockup rule reuses the
mark's own geometry: the gap between mark and wordmark is the mark's interval, scaled to the
type step. One quantity again, so the lockup cannot drift from the mark.

## Approach

**Reused:** `nativeType` and `nativeSpacing` from `@irodora/design-tokens`; `Text` and
`useTheme` from `@irodora/ui`; the layout primitives from F-140. The colour comes from a theme
token the contrast gate already checks — the mark introduces no colour of its own.

**New:** `packages/ui/src/brand.tsx` — `MARK`, the geometry as data; `Mark`, a component; and
`markSvg`, a pure string generator. `Wordmark` for the lockup.

**Two renderers, ONE geometry.** `Mark` draws two `View`s — the mark is two rectangles, so it
needs no SVG and `@irodora/ui` gains no dependency (it has none today beyond the workspace).
`markSvg` emits the same rectangles as a string, because F-142 needs a file and an icon
pipeline cannot consume a React component. Both read `MARK`; neither carries its own numbers,
which is the `cardSvg` arrangement one level smaller.

**Increments:**

1. `MARK` + `markSvg` + tests. Pure data and a pure function, no React.
2. `Mark` and `Wordmark` components, registered in the conformance registry.
3. Reached from a real surface — `Screen`'s header, so the wordmark is on Home.

## Files to touch

```
packages/ui/src/brand.tsx              — NEW: MARK, Mark, Wordmark, markSvg
packages/ui/src/index.ts               — export them
packages/ui/test/brand.test.tsx        — NEW: the geometry, the one-colour rule, 16px
packages/ui/test/conformance.test.tsx  — register Mark and Wordmark
apps/mobile/src/screens/Home.tsx       — the wordmark, so the mark reaches a real surface
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| `MARK` geometry | `markSvg`, `Mark`, and F-142's icon and splash | `gate:test` — one constant, asserted; a second copy is what the single source prevents |
| New exports from `@irodora/ui` | `a11y-scope.mjs` requires a registry subject | gate 8, already blocking |
| The mark reaches Home | conformance subjects render Home | gates 8 and 9, already blocking |

**F-142 depends on this geometry and will consume it as an artefact rather than a picture.**
That is the link worth recording: an icon regenerated from `markSvg` cannot drift from the mark
in the app, and an icon exported by hand from a drawing tool certainly would.

## Test plan

- **Geometry:** the interval equality holds — horizontal gap `===` vertical offset. This is the
  design, so it is the assertion; if a later edit breaks it the mark has stopped being the idea
  it was approved as.
- **16 px:** the narrowest feature — the interval — is computed at a 16 px render and asserted
  above a floor. A number, not an opinion.
- **One colour, and this is the CVD half:** the emitted SVG contains **exactly one** distinct
  fill, and it is the colour the caller passed. *A mark with one colour cannot fail a CVD
  simulation, because simulation maps colours and there is only one to map* — so the honest
  check is that there is only one, not a simulation theatre that would pass whatever it drew.
- **Negative, with a decoy:** a two-colour mark must fail that check, or it asserts nothing. And
  the single-colour case must pass, or the check is refusing everything.
- **Conformance:** `Mark` and `Wordmark` as subjects, both themes.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm test:cvd && pnpm test:a11y && pnpm test:contrast
```

## Risks and open questions

**A mark is a design object and this is one designer's answer.** The brief constrains it more
than most — one colour, 16 px, not a swatch, not a droplet — and every one of those is checked
below. What is *not* checkable is whether it is any good, and no test will close that. It is
recorded as an attested criterion rather than pretended away.

**The wordmark is set type, not drawn letterforms.** A drawn wordmark is the usual answer for a
wordmark-led identity, and it is out of reach here: React Native has no path-text and the
product has no type designer. Setting the name from the scale with its own tracking is honest
and reversible; a drawn wordmark can replace it without touching the lockup rule.

## Out of scope

The app icon, the adaptive icon and the splash screen — F-142, which this unblocks. No brand
colour is introduced: the mark takes a foreground token, and the brief's own rule is that a
mark depending on colour is disqualified.
