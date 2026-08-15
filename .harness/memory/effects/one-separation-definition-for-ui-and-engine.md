---
kind: effect
id: E-005
title: One separation definition, shared by the UI, the recommendation engine and our own tokens
severity: critical
guard: gate:cvd
confidence: 0.94
created: 2026-08-13
scope: [packages/cvd-engine, packages/recommendation, apps/web, docs/design]
links: [[deltae00-is-the-ranking-authority]], [[cvd-is-scoring-not-rendering]]
---

# One separation definition

**`separationScore` is read by three consumers, and they must never diverge.**

| Consumer | Uses it for |
|---|---|
| The recommendation engine | The CVD factor in every outfit score (FR-35) |
| The web UI | The separation indicator and the CVD preview |
| The design system | `cvdPairs` in the token manifest — our own interface's check |

## Why one definition

If a second appears, the two will disagree, and **nobody will notice which surface is
wrong**. The failure is specific and bad: a recommendation claims an accessibility property
that the interface does not actually deliver, and both halves individually look correct.

## What the score includes, and why it matters here

Post-simulation ΔE00 **and** the post-simulation lightness difference.

Lightness is not optional. Two colours a dichromat cannot separate by hue may be perfectly
separable by value — and telling someone their outfit fails when it does not is its own
accessibility failure. A "simplification" that drops the lightness term would make the score
stricter and wronger.

## What must happen on a change

1. Re-run the `cvd` gate: recommendations must still maintain minimum separation.
2. Check `cvdPairs` in
   [`design-system.manifest.json`](../../../docs/design/design-system.manifest.json) —
   success and error must remain separable at severity 1.0.
3. Check the UI's separation indicator: its thresholds are expressed in this score's units.
4. If the score's *scale* changes, every stored recommendation's CVD factor is now on a
   different scale — that is a reproducibility-envelope concern, not just a UI one.

## Never

Reimplement separation in the UI "just for the preview". That is exactly how the second
definition appears.

## As of F-008: the definition exists, and is guarded at one end

`separationScore` is real (`packages/cvd-engine/src/separation.ts`) and **gate 10 is active**,
so this link's `from` ref resolves for the first time.

**The consumers do not exist yet.** F-030 is the recommendation scoring, F-032 the CVD outfit
mode, F-003 the design system's own `cvdPairs` check. Until they land the guard protects the
source end only — the same shape as [[srgb-xyz-is-the-root-of-every-derived-value]] and
[[deltae00-is-the-ranking-authority]], and worth stating rather than letting "critical link,
guarded" imply more cover than exists.

**The specific failure to watch for** is a second definition appearing in `apps/web` because
the UI wanted a slightly different number — a threshold, a rounding, a display scale. That is
how two definitions start, and neither author thinks they are creating one.

One thing F-008 added that this note did not anticipate: the score's **lightness term binds for
only about 9% of pairs**, because ΔE00 already contains the lightness difference. A change that
made it bind for none would still pass most of gate 10, so the binding frequency is asserted
explicitly. **A component of a score that never changes the answer is a second definition of
the same thing wearing a different name** — the same hazard this note is about, hiding inside
one function rather than across two.
