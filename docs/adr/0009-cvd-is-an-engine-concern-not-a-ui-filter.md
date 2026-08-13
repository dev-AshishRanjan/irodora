# ADR-0009 — CVD simulation lives in the engine and scores every recommendation

## Status

Accepted

## Date

2026-08-13

## Context

Most products treat colour-vision deficiency as a display feature: a toggle that applies a
simulation filter to the screen so a designer can check their work.

That helps designers. It does almost nothing for the user the feature is nominally for.

A person with deuteranomaly choosing trousers does not want to see what their outfit looks
like to someone else. They want to know **whether the outfit works** — whether the shirt
and the jacket are distinguishable, whether the combination communicates what they intend,
and if not, what to wear instead. That is not a rendering question. It is a scoring
question, and scoring happens in the engine.

Placing CVD in the UI layer has a second failure mode: the recommendation engine would
generate candidates without any knowledge of separation, and the UI would filter them
afterwards. That produces exactly the wrong behaviour — a highly-ranked recommendation
disappears with no explanation, and the ranking itself never learns to prefer separable
combinations.

## Decision

**CVD is part of `@irodora/cvd-engine` and is an input to recommendation scoring, not a
post-hoc filter.**

1. **Two model families**, chosen for what each is good at:
   - Brettel–Viénot–Mollon (1997) / Viénot (1999) for dichromacy — protanopia,
     deuteranopia, tritanopia.
   - Machado–Oliveira–Fernandes (2009) for anomalous trichromacy at severity 0…1 — which
     is the far more common case and the one a severity control needs.

2. **One separation score, one definition** (FR-5), used identically by the UI and the
   recommendation engine. Two definitions would eventually disagree, and nobody would
   notice which surface was wrong.

3. **Lightness difference is part of separation**, not just post-simulation ΔE00. Two
   colours a dichromat cannot separate by hue may be perfectly separable by value —
   telling someone their outfit fails when it does not is its own accessibility failure.

4. **CVD separation is a weighted factor in every outfit score** (default 0.05, and it is
   content, so it is tunable). Recommendations are *generated* with separation in mind, not
   filtered afterwards.

5. **CVD outfit mode** (FR-35) reports the measured improvement of an alternative, derived
   from the same score, reproducible from the stored envelope.

6. **A dedicated `cvd` verification gate** asserts that recommendations maintain minimum
   separation under protan, deutan and tritan simulation. A regression that makes
   recommendations less accessible fails the build.

7. **Never paywalled.** CVD simulation, separation scoring and colour naming are
   permanently in the free tier ([ADR-0027](0027-monetisation-tiers.md)).

## Consequences

**Good.** The feature serves the user it is named for. Separation becomes a first-class,
tested product property rather than a visual check somebody might run. The engine can
*propose* better alternatives because it understands why the original was poor. A
regression in accessibility is caught by a gate, not by a user complaint.

**Bad.** Every recommendation costs three additional simulations (protan, deutan, tritan)
plus separation arithmetic. Measured, this is small against the candidate-generation cost,
but it is not free. Two model families is more code than one, more golden data, and more
to keep correct.

**Neutral.** The UI still offers simulation preview — it just is not the primary purpose
of the subsystem.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **CVD as a UI display filter** | The industry norm, cheap, and visually satisfying in a demo. Helps designers check work; does not help a CVD user choose trousers, which is the actual requirement (NFR-10) |
| **Post-filter recommendations by separation** | Simpler to add. Produces unexplained gaps in the ranking, and the ranking never learns to prefer separable pairs — the same poor candidate is generated every time |
| **One model family only** | Less code and less golden data. Dichromat-only models mishandle anomalous trichromacy, which is the majority of CVD; a severity slider needs Machado |
| **A published CVD library** | Would save implementation. Same objections as [ADR-0004](0004-own-the-colour-engine-culori-as-test-oracle.md): platform identity, WASM portability, zero runtime dependencies in the engine |

## Revisit when

- A better-validated CVD model is published — the model layer is pluggable behind the
  separation score for exactly this reason.
- User research shows the separation score does not predict real-world discriminability,
  in which case the score's definition is the thing to change, not its location.
