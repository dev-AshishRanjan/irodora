# Plan: F-095 — The spacing scale reaches a component, or the value is not on the scale

| | |
|---|---|
| **Feature** | F-095 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-24 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `packages/ui` · `packages/design-tokens` · `scripts/` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-26 |

---

## Intent

The manifest declares a spacing rhythm the product does not follow, and nothing was looking.
After this, the scale and the product agree, one of them having moved on the evidence, and a
check names any value that is not a step.

## What was measured first

F-092 recorded 69 declarations, 36 off-scale. **Re-counted today: 102 declarations, 45
off-scale** — the codebase grew. The full inventory:

| value | uses | on the current scale? |
|---:|---:|---|
| 1 | 1 | no — and it is not spacing (below) |
| 2 | 10 | no |
| 4 | 19 | yes |
| 6 | 10 | no |
| 8 | 25 | yes |
| 12 | 15 | no |
| 16 | 9 | no |
| 20 | 13 | yes |

**The disagreement runs in both directions, and the second direction is the one nobody had
counted.** The scale is `4, 8, 14, 20, 28, 40, 56, 96`. Of its eight steps, **three are used and
five are used zero times** — `14`, `28`, `40`, `56` and `96` appear in no padding, margin or gap
anywhere in the product. So this is not "the product drifted off a scale". It is two systems
that were never reconciled: a declared editorial rhythm, and a conventional 4-point grid the
screens were actually built on.

## Approach

### The scale moves, and an ADR says why

**Proposed: `4, 8, 12, 16, 20, 28, 40, 56, 96`** — `14` removed, `12` and `16` added.

Three reasons, in order of weight:

1. **`14` violates the manifest's own `base: 4`.** It is the only step in the whole scale that
   is not a multiple of the declared base. `12` and `16` are.
2. **`14` is used zero times; `12` and `16` are used 24 times between them.** Removing a step
   nothing references costs nothing; the two being added are the product's two commonest
   mid-range values.
3. **It closes the gap that produced the drift.** The jump from `8` to `20` is 2.5×, and every
   screen needed something in it. A scale with a hole gets worked around, once per screen.

**`28`, `40`, `56` and `96` are used zero times and are KEPT.** Said out loud rather than
quietly: they are large steps for layouts not yet built, and the manifest calls 間 (*ma*) a
design element. Deleting them would be deciding that generous rhythm never happens, which is a
design decision this feature has no evidence for. Deleting `14` is different — it is the one
step that contradicts a rule the manifest states about itself.

### The remaining 21 declarations

Under the proposed scale, off-scale usage falls from 45 to 21.

| value | uses | disposition |
|---:|---:|---|
| 2 | 10 | **moved to 4** |
| 6 | 10 | **moved to 8** |
| 1 | 1 | **declared off-scale, with a reason** |

**`2 → 4` is the change with visible effect, and it is chosen deliberately.** All ten are `gap`
inside a stacked text pair — a name over its romaji, a label over its value. At 2 they read as
one unit; at 4 they will be slightly looser on every screen. The alternative was exempting ten
declarations, and **a scale that exempts its most common small value is not a scale**. The
F-095 note is right that a screenshot comparison is worth more than a test here.

**`6 → 8`, rounding up rather than down.** Seven of the ten are row padding or label gaps where
the taller result also helps a touch target, and `間` argues for the more generous step where
either would do.

**`padding: 1` in `Swatch.tsx` is not spacing at all.** It is F-068's two-tone keyline — a 1px
opaque hairline, sized to the pixel, that is what makes a sample readable against an arbitrary
garment colour. Rounding it to 4 would turn a keyline into a frame. It is declared off-scale
with that reason, which is what acceptance criterion 1 provides for.

### `nativeSpacing` gets real readers, in the package that should have them

`packages/ui` holds ten spacing declarations and **five of them contradicted the scale** — the
design system was the worst offender. Those components read `nativeSpacing` by index instead of
hard-coding a number. All four emit targets are positional (`--space-1..8`, `--spacing-1..8`,
`SPACING[]`, `nativeSpacing[]`), so an index is the system's own idiom rather than an
awkwardness invented here.

**The app screens keep numeric literals**, checked against the scale. 92 style objects indexing
an array would be harder to read, and criterion 3 is explicitly a check on the *value*.

**A finding to record, not to fix here:** `nativeRadius` is a named record and `nativeSpacing` is
an unnamed array, so `nativeRadius.swatch` reads and `nativeSpacing[2]` does not. That asymmetry
is why this token had no reader long before anybody counted. Naming the steps would change the
manifest schema and all four emitters — filed as a follow-up, not smuggled in here.

### The check, watched failing

`scripts/verify-spacing-scale.mjs` scans `packages/ui/src`, `apps/mobile/src` and
`apps/mobile/app`, and fails on any padding/margin/gap literal that is not a step of the scale,
**naming the file, the line, the property and the value**. It reads the scale from the manifest
rather than repeating it — a checker carrying its own copy agrees with the manifest on the day
it is written and never again.

`apps/mobile/app` has zero declarations today and is scanned anyway. An unscanned directory is
how the next one stops being noticed (F-078).

Exemptions live in a declared list with a `why` and are checked **in both directions**: an
exempt value that is no longer present fails, the same way `unreached-tokens.json` fails on a
dead entry. `--prove` plants cases and watches them go red — and watches the legitimate hairline
stay green, because a proof where everything is red cannot tell a working check from one that
fails on everything.

Wired into **gate 8**, beside `verify-token-reach.mjs`, which is what F-095 declares. It is a
source scan and needs no build, so it is safe anywhere in the order.

### `unreached-tokens.json` loses its `nativeSpacing` entry

And that is self-verifying: `verify-token-reach.mjs` fails on a listed name that a component
*does* read. Leaving the entry would fail gate 8 on the very change that makes it false.

## Files to touch

```
docs/design/design-system.manifest.json       — spacing.scale: 14 out, 12 and 16 in
packages/design-tokens/src/generated/*        — regenerated (4 targets + global.css)
docs/adr/00NN-the-spacing-scale-follows...md  — NEW. The scale decision
packages/ui/src/{Chip,SearchField,Status,Swatch,TextField}.tsx — read nativeSpacing
apps/mobile/src/screens/*.tsx                 — 20 declarations moved (2→4, 6→8)
scripts/verify-spacing-scale.mjs              — NEW. The check and its --prove
package.json                                  — test:a11y runs it; a :prove script
.github/workflows/ci.yml                      — a step for the proof
.harness/verification/unreached-tokens.json   — the nativeSpacing entry goes
```

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| `spacing.scale` in the manifest | **four emit targets + `apps/mobile/global.css`** | `gate:contrast` byte-compares all five (F-094) |
| A step index shifts (`20` moves from `[3]` to `[4]`) | every emitted `--space-N`, and any reader | the new check; `nativeSpacing` readers are typed |
| 20 spacing values change | **layout on every screen** | none automatable — a screenshot comparison, said plainly |
| `nativeSpacing` gains readers | `unreached-tokens.json` becomes wrong | `gate:a11y` (`verify-token-reach.mjs`, both directions) |

**The index shift is the sharp edge.** `--space-3` means 14 today and 12 afterwards. Nothing
reads `--space-N` (no web surface), and `nativeSpacing` has no readers yet — so the blast radius
is empty *today*, which is exactly why this is the cheapest moment to do it. Recorded as an
effect link with that reasoning, because it will not be empty later.

## Test plan

- **The check names the file, line, property and value** — asserted on planted cases, not just
  the exit code.
- **A planted off-scale value goes red**; the hairline exemption **stays green**.
- **A dead exemption goes red** — the both-directions half, without which the list rots.
- **The scale comes from the manifest:** a case perturbs `spacing.scale` and asserts the check
  follows it, which is what distinguishes reading the manifest from carrying a copy.
- `verify-token-reach.mjs` passes with the `nativeSpacing` entry removed **and fails with it
  restored** — the entry's removal is proven, not assumed.
- Existing `packages/design-tokens` tests byte-compare the regenerated artefacts.

## Verification

```
node scripts/verify-state.mjs
node scripts/generate-design-tokens.mjs --check
node scripts/verify-spacing-scale.mjs && node scripts/verify-spacing-scale.mjs --prove
node scripts/verify-token-reach.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:a11y
```

**NOT RUNNABLE HERE and will be said so:** anything needing `pnpm` — Node 22.16.0 / pnpm 9.3.0
against `engines` demanding 24.19.0 / 11. That includes gate 8's Jest suite, so the *rendered*
half of the a11y gate cannot be run on this workstation.

## Risks and open questions

- **Acceptance criterion 4 names five values — `1, 2, 6, 12, 16` — and this plan resolves all
  five**, two by moving the scale, two by moving the values, one by declaring it. That is the
  criterion met exactly.
- **No screenshot is possible here.** There is no emulator and no JDK on this workstation, so
  *"the layout is now subtly wrong everywhere"* cannot be checked the way it should be. The
  mitigation is that the diff is mechanical and enumerated, and the change is reported as
  **unverified visually**, not as verified.
- **`14` may have been deliberate.** The `_note` calls the rhythm editorial. Removing a step
  nobody used is still a design change, and the ADR is where it is argued rather than assumed —
  if the author disagrees, the ADR is the thing to reverse.
- **Rounding `6` up rather than down** grows several components by 2px each. Chosen for touch
  targets and stated; it is a judgement, not a derivation.

## Out of scope

Naming the spacing steps in the manifest (a schema change across four emitters — filed as a
follow-up) · the 57 already-on-scale literals becoming token references · any other token group ·
`borderWidth`, which is not spacing and is not scanned.
