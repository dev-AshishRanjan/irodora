# Plan: F-198 — Every combination is CVD-checked and profile-weighted, and says so

| | |
|---|---|
| **Feature** | F-198 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-73, NFR-10, NFR-21 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## Intent

The combinations screen proposes colours to put beside one another. **Two of those colours can be
hard to tell apart**, and this product's whole position on colour vision is that it says so with
a measurement rather than filtering a preview.

And the ranking is currently pure geometry: hue-first, stated in `combinations.ts` as *"a decision
with no measurement behind it"*. Where a person has a profile there **is** something to weigh it
with, and the engine has been able to do it since F-028.

## Nothing here computes a separation or a score

Both already exist, and both have exactly one definition:

- **`worstSeparation`** in [`outfit/cvd.ts`](../../apps/mobile/src/outfit/cvd.ts) — the worst of
  the three deficiencies at `SEVERITY`, built on `separationScore` from `@irodora/cvd-engine`,
  which is FR-5's and the same one the design system and the recommendation engine read (E-005).
- **`scoreColor`** in `@irodora/recommendation` — the personal fit, with its four factors.

**`findSeparationProblems` is deliberately NOT used.** It searches the corpus for a replacement
per pair, which is FR-35's outfit feature; here it would be a corpus scan per pair per
relationship — twelve of them — for a proposal these criteria do not ask for.

## What is checked, and on what

**All pairs including the source.** A combination is the source colour *and* its companions
placed together, so a companion that vanishes against the shirt is the case that matters most —
and it is exactly the pair a check over companions alone would miss.

**The worst pair is what is reported**, not the mean. A set that survives two pairs and collapses
on the third is a set that collapses.

## The copy rule, which is criterion 3 and is already written down

> *"These two are hard to tell apart"* — an observation about the colours.
> Never *"you may not be able to distinguish these"* — a claim about the reader's vision, which
> this product knows nothing about and must not imply it does.
> — [`outfit/cvd.ts`](../../apps/mobile/src/outfit/cvd.ts)

The note names the **deficiency** and the **severity** and gives the separation as a number on a
stated scale. It never hides a combination and never ranks one below another for it: a person
choosing a low-separation pair on purpose is making a decision, not a mistake.

## Profile weighting, and what it may not do

Where a profile exists, each relationship carries the mean personal score of its companions and
the list is ordered by it. Where one does not, F-195's answer already applies —
`NO_EVIDENCE_PROFILE` makes every personal score the engine's midpoint, so **the order is
unchanged and the screen says the personal half is missing**, with the way to fix it.

**The weighting reorders; it never removes.** All twelve still render, for the reason F-194
recorded: the ranking decides what somebody sees first, not what they are allowed to see.

## Files to touch

```
apps/mobile/src/combinations.ts           — separation of a set; the optional profile weight
apps/mobile/src/screens/Combinations.tsx  — the note, and the missing-profile line
apps/mobile/app/(tabs)/atlas/with/[slug].tsx     — pass the profile
apps/mobile/app/(tabs)/wardrobe/with/[id].tsx    — pass the profile
apps/mobile/src/i18n/{en,ja}.ts           — the note, the deficiency names, the severity label
apps/mobile/test/combinations.test.ts     — the check and the weighting
apps/mobile/test/screens.test.tsx         — a subject that RENDERS a flagged combination
```

## Test plan

- **A pair that is genuinely hard to separate is flagged**, with the deficiency named — resolved
  by searching the corpus for such a pair rather than by pasting two hexes, so the fixture
  survives a republished corpus.
- **A pair that separates cleanly is not flagged** — the decoy, since a checker that flagged
  everything would satisfy the first assertion.
- **The source is included in the pairs**: a companion that separates from every other companion
  and not from the source must still be reported.
- **Weighting reorders and never removes:** with a profile the order may change; the SET is
  identical either way, and a profile-less run is byte-identical to the geometric default.
- **Copy:** the claims lint already refuses the banned phrasings; a test asserts the note names a
  deficiency and a severity rather than addressing the reader.
- **Conformance:** a subject whose combination is flagged, so the note is rendered and measured.

## Verification

`state · typecheck · lint · format · test · cvd · a11y · build`.

## Risks

- **A flag people learn to dismiss is worse than no flag.** `HARD_TO_SEPARATE = 20` is the
  existing convention and is reused rather than re-tuned here; if it proves noisy on generated
  colours that is a measurement to take, not a number to nudge.
- **Nobody has looked at a flagged combination.** Attested.

## Out of scope

Proposing alternatives (FR-35's, already built for outfits), and the hand-off onward (F-199).
