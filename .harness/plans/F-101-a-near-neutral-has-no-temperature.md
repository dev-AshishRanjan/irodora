# Plan: F-101 — A near-neutral has no temperature, everywhere it is judged

| | |
|---|---|
| **Feature** | F-101 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-29, FR-30 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `packages/recommendation` · `apps/mobile` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-26 |

---

> **This plan was written after the ADR, not before the code, and that is recorded rather than
> tidied.** Golden rule 3 asks for a plan in `.harness/plans/` before any source is edited; what
> happened was investigation → measurement →
> [ADR-0076](../../docs/adr/0076-a-near-neutral-has-no-temperature-and-scorecolor-now-agrees.md)
> → code, and gate 0 caught the missing artefact at close-out. The ADR did the design work and
> is the document to read. This file exists so the plan trail is not a gap, and it says what it
> is instead of pretending to have come first.

## Intent

Finish what F-031 started. `hueBias` answers the pure hue question with equal confidence for a
vivid red and for a grey whose hue angle is a rounding artefact — and three call sites still
read it.

The hard part is not the change. It is that F-031 explicitly refused to make it on an argument:
*"'this near-neutral garment is warm' may be a defensible thing to tell somebody whose profile
leans warm. THAT IS A PRODUCT QUESTION."*

## Approach

### Measure before deciding, and measure before changing anything

The decision needs evidence, and evidence taken **after** a change is an artefact of it. So:
count how much of the corpus is affected, find the pair that makes the case (or fails to), and
take the score impact — all against the engine as it stands.

If the numbers say a near-neutral's temperature is a real signal, the feature is a comment and
an ADR saying so. If they say it is noise, all three sites move.

**What the numbers said:** 45 of 120 entries below `NEUTRAL_CHROMA`; two published off-whites at
+0.644 and −0.933; a 33-point score gap between two pale greys. They said noise.

### All three sites, and the one that is not obvious

| site | subject | verdict |
|---|---|---|
| `scoreColor` temperature fit | any garment | moves |
| `alternativesFor` `warmer`/`cooler` | any candidate | moves — *"like that, but warmer"* pointing at a grey is the same defect, and here the label makes it visible |
| `photo.ts` | a camera reading | moves — and it matters most, because the answer is stored in a profile |

`hueBias` stays exported and unchanged. It is the honest primitive; this moves **call sites**.

### Every assertion carries a decoy

*"Two greys now score alike"* is also true of a temperature factor that has been switched off.
So each new case is paired with one that must still discriminate: two saturated opposites far
apart, a saturated reading still proposing a temperature, and the ramp asserted directly.

### Watch it fail

Revert each change separately, re-run the suite, confirm red and confirm the output names the
right block — then restore byte-for-byte and verify. A scratch script with an unconditional
`finally`, because F-100 is what happens without one.

## Files to touch

```
docs/adr/0076-...md                             — NEW. The product decision
packages/recommendation/src/score.ts            — the temperature fit
packages/recommendation/src/outfit.ts           — warmer/cooler
packages/recommendation/src/index.ts            — export temperatureOf, NEUTRAL_CHROMA
apps/mobile/src/profile/photo.ts                — the stored-profile path
packages/recommendation/test/score.test.ts      — the rule, with decoys
apps/mobile/test/profile.test.ts                — the consequence, with a decoy
.harness/state/effects.json                     — E-034 resolved
```

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| The temperature fit | **every personal-compatibility score** | `gate:test`, watched failing |
| `warmer`/`cooler` | FR-38's alternatives | `gate:test` |
| `photo.ts` | a **stored** profile, and every recommendation after it | `gate:test` (app suite) |
| `temperatureOf` exported | the package's public surface | `typecheck` |

## Test plan

- The published pair scores alike at every profile bias — **and** two saturated opposites do not.
- The ramp is asserted directly: the same hue matters more as chroma rises.
- `hueBias` itself is unchanged and still exported.
- App side: a grey reading proposes no temperature; a saturated one still does.
- Both changes watched failing, separately.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
```

**NOT RUNNABLE HERE:** jest, in either app zone, so the app-side consequence test is written and
not run. Its thresholds are computed directly against the built engine rather than guessed, and
the measured numbers are in the test's own comment.

## Risks and open questions

- **Every score containing a near-neutral changes.** Stated as a number rather than a worry: 45
  of 120 move, mean |Δfit| 0.055, largest 0.407. Nothing stores a recommendation yet.
- **`NEUTRAL_CHROMA` and the linear ramp are conventions**, borrowed from the lexicon and not
  measured. Better than ignoring chroma; not evidence about anything.
- **The abstention design is the one to revisit** if somebody ever measures how a near-neutral
  actually performs. ADR-0076 records why it was not taken now.

## Out of scope

Tuning `NEUTRAL_CHROMA` · moving the poles into a new rule-set version · anything that scores a
colour on a screen.
