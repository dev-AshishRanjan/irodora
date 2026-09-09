# Plan: F-205 — Success on the sample well is below the APCA floor

| | |
|---|---|
| **Feature** | F-205 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-9 |
| **Service** | `packages/design-tokens`, `packages/ui` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## What was measured, before anything was changed

| pairing | WCAG | APCA | floor |
|---|---|---|---|
| `status.ok` on `swatch.well` | 4.98:1 ✓ | **43.6** | 45 |
| `border.strong` on `swatch.well` | 3.27:1 ✓ | **27.6** | 30 |
| `border.strong` on `surface.3` | ✓ | **28.8** | 30 |
| `border.strong` on `surface.2` | ✓ | **29.7** | 30 |

**`border.strong` is below the APCA floor on three grounds, not one.** The feature's own notes
named `swatch.well`; the other two were found by measuring.

## `status.ok` cannot be moved, and the numbers say so

Criterion 3 forbids breaking the salience rank (ADR-0053) or the CVD separation (ADR-0098). Both
bind, and they bind in opposite directions:

```
status.ok needs L 0.68 to clear Lc 45 on the well.
At L 0.68 its |Lc| against background is 48.8.
status.warn's is 48.6  →  the rank bad > warn > ok BREAKS.
```

Raising `warn` to make room does not work either:

```
warn at L 0.72  →  separation(warn, bad) under CVD falls to 54.
The declared minimum is 60. Today it is 63.9.
```

**There is no value for `status.ok`, alone or paired with `warn`, that satisfies all three
constraints.** That is why criterion 1 offers a second branch, and it is the branch this takes.

## So the separator changes, not the colour

`Status` takes `adjacentToSample`, which paints `swatch.well` behind the row — F-069's rule that
a status may not sit beside a colour sample without a separator. **The rule is right; the ground
chosen for it is the problem.**

`surface.1` is darker than the well (L 0.210 against 0.290), so every status token gains contrast
on it — `status.ok` measures **Lc 46.5** there, and the pairing is *already declared*. It is also
a better separator on its own terms: a darker ground reads as a caption area rather than as more
of the swatch.

**Every status token value stays exactly where it is**, so criterion 3 is satisfied by
construction — the salience rank and all four CVD pairs are untouched because nothing they
measure has moved.

The three `status.* on swatch.well` pairings are then withdrawn from the manifest, because
nothing renders them any more and a declared pairing no component produces is a claim about a
combination that does not exist.

## `border.strong` moves, because it can

Nothing binds it the way the status ramp is bound: `ring` vs `border.strong` separates at 100,
and it is a border rather than a member of a ranked set. **L 0.578 → 0.610** clears the nonText
floor on all four grounds:

```
             background  surface.1  surface.2  surface.3  swatch.well
L 0.578         31.3       30.6       29.7       28.8       27.6
L 0.610         35.7       35.0       34.2       33.2       32.1
```

0.600 would also clear it, at 30.7 on the well — **0.7 above the floor is not a margin**, and the
next ramp adjustment would put it back under. 0.610 is chosen for room.

## Files to touch

```
docs/design/design-system.manifest.json  — border.strong dark; three pairings withdrawn
packages/ui/src/Status.tsx               — the separator is surface.1
packages/ui/test/status.test.tsx         — the ground it paints, asserted
```

## Test plan

- **The component paints the new ground**, asserted against the rendered tree rather than the
  source.
- **The separator still exists** — a decoy, because "fix the contrast" is also satisfied by
  removing the separator entirely, which is F-069 undone.
- **Gate 9 is the proof for the values**: it measures every declared pairing in all eight
  palettes, and the two failing APCA lines must be gone without any new one appearing.
- **Gate 10 (cvd) and the salience check must be unchanged**, which they will be, because no
  status value moves — asserted by running them rather than by saying so.

## Verification

`state · typecheck · lint · format · test · contrast · cvd · build`.

## Risks

- **The status row will look different**: a darker ground behind a status beside a sample.
  Attested — and it is the point, since the current one is below the floor.

## Out of scope

The light theme's `border.strong`, which measures above the floor on every ground it is declared
against.
