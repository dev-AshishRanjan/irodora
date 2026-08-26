# ADR-0074 — The spacing scale is a four-point grid, and the step that was not one goes

## Status

**Accepted.**

## Date

2026-08-26

## Context

[`design-system.manifest.json`](../design/design-system.manifest.json) declares:

```json
"spacing": { "base": 4, "scale": [4, 8, 14, 20, 28, 40, 56, 96] }
```

[ADR-0071](0071-a-token-with-no-reader-is-a-decision-nobody-applied.md) established that a token
nothing reads is a decision nobody applied, and F-092 found `nativeSpacing` to be exactly that:
emitted to four targets, exported, and imported by no component. It was declared unreached with
a pointer to F-095 rather than excused.

**F-095 counted the other half, which nobody had.** Across `packages/ui/src` and
`apps/mobile/src` there are **102** padding, margin and gap declarations:

| value | uses | | scale step | uses |
|---:|---:|---|---:|---:|
| 1 | 1 | | 4 | 19 |
| 2 | 10 | | 8 | 25 |
| 4 | 19 | | **14** | **0** |
| 6 | 10 | | 20 | 13 |
| 8 | 25 | | **28** | **0** |
| 12 | 15 | | **40** | **0** |
| 16 | 9 | | **56** | **0** |
| 20 | 13 | | **96** | **0** |

45 of the 102 are off-scale. **And five of the scale's eight steps are used zero times.**

That second fact changes what this is. It is not a codebase that drifted off a declared scale.
It is **two systems that were never reconciled**: an editorial rhythm authored in the manifest,
and a conventional four-point grid the screens were actually built on. Neither side had a check,
so both were true at once for as long as nobody counted.

One more fact decides it. The manifest declares `base: 4`. Of the eight steps, exactly one is
not a multiple of four: **`14`**. The scale contradicts a rule the manifest states about itself,
in the one step that no code uses.

## Decision

**The scale becomes `4, 8, 12, 16, 20, 28, 40, 56, 96`.** `14` is removed; `12` and `16` are
added.

Three reasons, in order of weight:

1. **`14` violates the declared `base: 4`.** Every other step is a multiple of four. `12` and
   `16` are. A base that one step ignores is not a base.
2. **`14` is used zero times; `12` and `16` are used 24 times between them.** Removing a step
   nothing references costs nothing. The two added are the product's commonest mid-range values.
3. **It closes the hole that produced the drift.** `8` to `20` is a 2.5× jump, and every screen
   needed something inside it. A scale with a hole gets worked around once per screen, which is
   precisely what the count above records.

**`28`, `40`, `56` and `96` are used zero times and are kept.** Stated rather than passed over:
they are large steps for layouts not yet built, and the manifest's own note calls 間 (*ma*) a
design element. Deleting them would decide that generous rhythm never happens — a design
decision with no evidence behind it. `14` is a different case: it is the step that contradicts a
stated rule, and it is removed for that reason rather than for being unused.

### What moves in the product

With the scale moved, 21 declarations remain off it.

| value | uses | disposition |
|---:|---:|---|
| 2 | 10 | **→ 4** |
| 6 | 10 | **→ 8** |
| 1 | 1 | **declared off-scale, with a reason** |

**`2 → 4` is the change with a visible effect, and it is chosen deliberately.** All ten are a
`gap` inside a stacked text pair — a name over its romaji, a label over its value. At 2 they
read as one unit; at 4 they are slightly looser, on every screen. The alternative was exempting
ten declarations, and a scale that exempts its most common small value is not a scale.

**`6 → 8` rounds up rather than down.** Seven of the ten are row padding or label gaps where the
taller result also helps a touch target, and where either step would do, 間 argues for the more
generous one.

**`padding: 1` in `Swatch.tsx` stays, declared off-scale.** It is not spacing. It is
[F-068's](../../.harness/state/feature_list.json) two-tone keyline: a 1px opaque hairline sized
to the pixel, which is what makes a sample readable against an arbitrary garment colour.
Rounding it to 4 would turn a keyline into a frame.

## Consequences

**Every emitted step index shifts, and the scale gains a ninth step.** `--space-3` meant 14 and
now means 12; `--space-4` meant 20 and now means 16; `--space-9` did not exist. Three artefacts
change — `tokens.css`, `tokens.tailwind.css` and the two generated TypeScript bindings.
`apps/mobile/global.css` is regenerated and **does not change**, because it carries no spacing
variables; that is worth knowing rather than assuming, since it is the artefact that ships. Gate
9 byte-compares all five (F-094), so a stale one fails rather than ships.

**The blast radius is empty today, which is why this is the moment.** Nothing reads `--space-N`
(there is no web surface, ADR-0051) and `nativeSpacing` had no readers at all. Doing this after
the scale acquired consumers would mean renumbering live call sites. Recorded as an effect link
so the next person knows the indices are positional and shift.

**Layout changes on every screen**, by 2px in twenty places. There is no automatable guard for
*"the layout is now subtly wrong everywhere"* — a screenshot comparison is the right check and
it could not be run on the workstation this was implemented on. The change is reported as
**unverified visually** rather than verified.

**A check now enforces the scale**, naming the file, line, property and value, reading the scale
from the manifest rather than repeating it. Off-scale values live in a declared exemption list
with a `why`, checked in both directions so a dead exemption fails too.

**This ADR is the thing to reverse** if the editorial rhythm was deliberate in a way the count
cannot see. Restoring `14` means restoring one step and renumbering the indices back; the
twenty moved declarations are independent of it.

## Alternatives considered

**Keep the scale and move all 45 declarations onto it** — `12 → 14`, `16 → 20`, plus the `2` and
`6` moves. Rejected on two grounds. It leaves `14` violating the declared base, so the manifest
still contradicts itself. And `16 → 20` makes the gap between sections equal to the page's own
padding, which flattens the hierarchy it exists to express — a worse layout arrived at by
obeying a scale nobody had used.

**Extend the scale to cover usage** — add `2`, `6`, `12` and `16`, keeping `14`. This is the
zero-visual-change option and it was rejected because the result is twelve steps with five of
them inside a 4px span. That is not a scale; it is the set of numbers already in the code, with
a manifest wrapped round it. The check would then permit everything and enforce nothing.

**Name the steps in the manifest** — `spacing.tight`, `spacing.section` — the way
`nativeRadius` already names its steps. This is a real defect: `nativeRadius.swatch` reads and
`nativeSpacing[2]` does not, and that asymmetry is why this token had no reader long before
anyone counted. It changes the manifest schema and all four emitters, so it is filed as its own
work rather than smuggled into this one.
