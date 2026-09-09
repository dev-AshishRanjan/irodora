# ADR-0100 — A computed colour is `derived`, and `declared` goes back to meaning a person

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-09 |
| **Feature** | F-207 |
| **Amends** | [ADR-0005](0005-measurement-provenance-is-a-type.md) — the provenance union gains a fifth member. Everything else in ADR-0005 stands, including the rule this ADR is an application of: an unclassified colour must not be representable |

---

## Context

ADR-0005 made provenance a required field and gave it four members:

| member | the colour was |
|---|---|
| `reference` | published by somebody else, as a value |
| `calibrated` | observed, against a known target |
| `estimated` | observed, without one |
| `declared` | asserted by a person |

That covers everything the product could produce **when it was written**, and it stopped
covering the product some time ago. Three surfaces now render colours that were computed:

- a **harmony companion** (F-194) — a coordinate the engine solved from the colour in hand;
- the **centre of a lexicon region** (`gaps`) — the midpoint of two term constraints, whose
  hue the source itself calls arbitrary;
- every **swatch drawn from a bare OKLCh triple** through `displayFromOklch`.

All three were filed as `declared`, and F-194 recorded the compromise honestly at the time:
*"`declared` is the untracked bucket and is what this app already uses for exactly this, so
following it keeps one answer rather than inventing a second."* Keeping one answer was right.
The answer was wrong.

**`declared` means a human asserted this value.** That is not a shade of meaning — it is the
member's entire content, and the claims table binds "selected" and "entered" to it. A companion
nobody has ever seen, filed as `declared`, is the product stating that somebody vouched for a
number no person has looked at. It is the same class of error ADR-0005 exists to prevent, one
level in: not a colour with no provenance, but a colour with **somebody else's**.

Nothing failed. Nothing could: the only reader of `source` in the repository is `isCaptured`,
and every check downstream was satisfied because the value was in the union.

## Decision

**`MeasurementSource` gains `derived`: a colour this engine computed from another colour.**

```ts
export type MeasurementSource =
  | 'reference'
  | 'calibrated'
  | 'estimated'
  | 'declared'
  | 'derived';
```

### 1. It is untracked, and that is structural rather than incidental

`UntrackedSource` is `Exclude<MeasurementSource, CapturedSource>`, so `derived` lands on the
untracked side **without an edit**. This is the intended answer and it is worth stating why the
`Exclude` formulation is load-bearing: a computed colour owes no capture conditions, and a
future member cannot be quietly forgotten into `CapturedSource` by a list that was not updated.
A `derived` value that claimed an illuminant is refused by the type, not argued with at runtime.

### 2. The line is *derived from another colour*, not *the result of arithmetic*

Every value in a colour engine is derived from something. `xyzToOklch` derives; so does a ΔE00.
That is not what this member is for, and reading it that way would put a camera capture under it
within a release.

> `derived` is for a value **produced from another colour value by this engine**, where no
> observation and no person stands behind it.

A capture converted from sRGB to XYZ is still `estimated` — the conversion did not create the
colour, the camera did. The Lens is the case that proves the line: `displayFromOklch` reports
`derived` for the swatch it renders, while `colourFromReading` writes `estimated` with the four
conditions ADR-0005 requires, because **the measurement is the stored row**, and the swatch is a
rendering of it.

### 3. What it may and may not say

Added to the ADR-0031 §1 table, which is data in `claims.json`:

| | |
|---|---|
| **may** | computed · generated · derived from |
| **never** | measured · detected · sampled · exact |

The bans are stronger than `declared`'s. "Detected" and "sampled" both assert an observation,
and there was none.

### 4. The database is deliberately not migrated

`saved_color.source` is guarded by a SQL `CHECK` that does not list `derived`, and it will not
until something needs to write one. `saveColor` has no callers; the two writers are the wardrobe
(`estimated`) and the corpus (`reference`). SQLite cannot alter a `CHECK` without rebuilding the
table, and rebuilding a table holding user data for a value nothing produces is speculative work
against the one thing that must not break.

**A test pins the gap** rather than a comment describing it — discovering the allowed set from
the migration SQL, naming `derived` as the member the column lacks and `unknown` as the legacy
value the union lacks. The day a screen saves a computed colour, that fails by name with the
migration named as the work, instead of failing on a device as a constraint error.

## Consequences

- **Every call site was decided individually, and two of five moved.** `UNSAFE_HEX_PROVENANCE`
  and the store fixtures stay `declared` — a hex string and a typed fixture are what the word was
  always for. `representativeOf` and `displayFromOklch` become `derived`. The camera, the corpus
  and the profile are untouched.
- **`declared` narrowed without being deprecated.** It did not become wrong; it went back to
  meaning what it says.
- **The wire widened.** `measurementSourceSchema` accepts `derived`, pinned to the engine type at
  compile time by ADR-0036 — a pin that fired during this change, before the schema was updated,
  which is the evidence it works.
- **A payload can now assert `derived`.** That is the intent, and the untracked/captured split
  still refuses one that claims conditions.
- **The next member is cheaper and more dangerous.** Widening a provenance union is a claim about
  what the product knows; the reason this took an ADR is that a fifth member makes a sixth feel
  routine. It is not.
