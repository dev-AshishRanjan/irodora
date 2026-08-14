# ADR-0037 — The design token package waits for the colour engine, and R0 closes incomplete

## Status

Accepted

## Date

2026-08-14

## Context

F-003 (`@irodora/design-tokens`) sits in R0 and declared one blocker: F-001. Reading its
acceptance list against what exists showed that two of its five criteria cannot be met
without R1:

| Criterion | Requires | Owner |
|---|---|---|
| the contrast gate checks every `pairsWith` combination in both themes | WCAG 2.x contrast ratio, APCA Lc | **F-007**, R1 |
| `cvdPairs` are asserted distinguishable at severity 1.0 | Brettel-Vienot / Machado simulation, separation scoring | **F-008**, R1 |

The remaining three — compiling the manifest to four targets, the status↔icon pairing, the
chroma ceiling — need no colour maths at all. The manifest declares OKLCh chroma directly,
so the ceiling is a comparison, not a computation.

Two facts make this a decision rather than a scheduling detail.

**The gate cannot ship as a stub.** `design-system.manifest.json` carries
`status: "approved"` and `gate.contrast.blockingWhenStatus: "approved"`. Gate 9 is blocking
from the moment it activates. A gate named `contrast` that does not check contrast, wired
into CI as a required step, is worse than no gate — it reports a property nobody is
checking, which is the exact failure [`verification.md`](../../.harness/protocols/verification.md)
and [[a-gate-that-errors-is-failing-open]] describe.

**Implementing the maths anywhere else is a defect by definition.** `AGENTS.md` §7 and
[`plan-feature`](../../.harness/skills/plan-feature/SKILL.md) both state that a second
implementation of anything in `packages/color-*` is a defect. A contrast routine written
into a gate script, or into `@irodora/design-tokens`, is that second implementation — and
it is the *first* one, so F-007 would later be written against a shipped duplicate rather
than a clean slate.

## Decision

**F-003 gains `F-007` and `F-008` as blockers, and stays in R0.**

The consequence is stated rather than hidden: **R0 closes with F-003 outstanding.** F-002,
F-004 and F-005 complete; F-003 lands during R1, after the engine features it depends on.

Three things follow.

1. **The ordering rule now does the right thing on its own.** `next-feature` selects the
   lowest-id feature with every `blockedBy` done. With the true blockers recorded, F-003
   simply stops being eligible until it can be verified. No special case, no note for
   someone to remember.
2. **F-003 is not moved to R1.** Its deliverable is foundational and its release membership
   describes what it is, not when it happens. Moving it would make the release list say the
   token pipeline is an engine concern, which is the wrong lesson to leave behind.
3. **Nothing is lost by waiting.** No R0 feature depends on F-003. Its only dependent is
   F-017 (web foundation), which is R1 and independently blocked by F-016.

## Consequences

**Good.** The dependency graph now matches reality, so it can be trusted. The contrast gate
will activate able to do its whole job on its first run. F-007 gets to implement WCAG
contrast and APCA once, in the package that owns them, with the golden data its own
acceptance requires — rather than reconciling with a duplicate written under deadline for a
different feature.

**Bad.** "R0 complete" no longer means "every R0 feature done", which is a footgun for
anyone reading the release list as a checklist. The token package — a genuinely useful thing
to have early, and a real input to design iteration — arrives later than the roadmap implied.
And the design system's values, though approved, will sit unverified against WCAG for longer
than is comfortable, on the strength of the design review alone.

**Neutral.** The three criteria needing no maths could have shipped separately. They were
not split out, because a token package whose contrast gate is inert invites exactly one
behaviour: treating the tokens as verified because "the gate passes".

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Split F-003: pipeline and structural checks now, contrast and CVD later** | Ships a required CI step named `contrast` that checks no contrast. The name is what future readers trust, and it would be wrong for however long the split lasts |
| **Seed `packages/color-difference` with the WCAG primitive inside F-003** | Tempting, because WCAG 2.x contrast is small and fully specified. But it breaks `wip_limit: 1`, pre-does part of F-007 without F-007's golden-data discipline, and still cannot answer the CVD criterion — so F-003 would remain incomplete anyway |
| **Move F-003 into R1** | Cleaner-looking release list. Misrepresents the feature: the token pipeline is R0 work whose *verification* depends on R1, and the release field should say what something is |
| **Relax the manifest to `placeholder` so the gate is report-only** | Would make F-003 completable today. It is weakening a constraint so a command succeeds — the anti-pattern the harness exists to prevent — and the manifest is genuinely approved, so it would also be false |

## Revisit when

- F-008 completes, at which point F-003 becomes eligible and this ADR is history rather than
  guidance.
- Any other R0 feature turns out to depend on F-003 — that would change the cost of waiting
  and is worth re-deciding rather than absorbing.
