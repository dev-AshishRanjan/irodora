# Plan: F-032 — CVD outfit mode

| | |
|---|---|
| **Feature** | F-032 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-35 (and FR-5, which it derives from) — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-26 |

---

## Intent

When two colours in a set are hard to tell apart, say so — and propose a swap, **with the
improvement measured**. Not a simulation filter: a flag, an alternative, and a number.

## Approach

### Scoring, not rendering — and the lesson is explicit about why

[[cvd-is-scoring-not-rendering]]:

> *Someone with deuteranomaly choosing trousers does not want to see what their outfit looks
> like **to someone else**. They want to know whether the outfit works … and if not, what to
> wear instead.*

So there is no simulation preview anywhere in this feature. The module finds the worst pair,
searches the corpus for a replacement that raises separation, and reports **the before, the
after, and the percentage-point improvement** — all from `separationScore`, which is FR-5's one
definition (E-005).

### The surface, and the deviation I am making deliberately

FR-35 calls it *outfit* mode, and **there is no outfit surface**: the outfit builder is F-033
and it is R4. Building this against nothing would be
[[a-tested-module-nobody-wired-up-passes-every-test-it-has]] for the third time in this release.

**Palette Studio is a set of colours the person assembled by hand**, which is exactly the input
this check takes, and it is on screen today. So the flag lands there. The computation is
identical when an outfit surface exists; what changes is who supplies the set.

This is a deviation from the criterion's wording and it is recorded as one — in the feature
notes and in `progress.md` — rather than quietly reinterpreted.

### The copy is a criterion, and it is the interesting one

> *Reads as an observation about the outfit, not as a diagnosis of the user.*

**"These two are hard to tell apart"**, never *"you may not be able to distinguish these"*. The
product does not know anything about the reader's vision and must not imply that it does — the
same discipline as NFR-22, arriving from a different direction.

That is checkable: a test asserts the copy contains no second-person vision language, with a
decoy proving the check can fire.

### The envelope

FR-35: *reproducible from the stored envelope*. The result carries a
`ReproducibilityEnvelope` — engine, corpus, rules — and a test recomputes the same improvement
from it. **Nothing stores one yet**, so "stored" is owed to whatever first persists a
recommendation; what this feature owes is that the number *can* be reproduced, and that is
gated.

**Reused:** `@irodora/cvd-engine` (`separationScore`, `separationDetail`), the app's corpus
accessor, `PaletteStudio`, both catalogues, `@irodora/color-core`'s envelope.
**New:** `src/outfit/cvd.ts`, a panel in the Studio, copy, tests.

## Files to touch

```
apps/mobile/src/outfit/cvd.ts        — NEW. Worst pair, alternative, improvement, envelope
apps/mobile/src/screens/PaletteStudio.tsx — the flag and the proposal
apps/mobile/src/i18n/en.ts · ja.ts   — copy, in both, within the bundled font subset
apps/mobile/test/cvd-mode.test.ts    — NEW
apps/mobile/test/screens.test.tsx    — the Studio branch that shows a flag
docs/adr/…                            — only if the surface deviation needs one
```

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| A second app-side consumer of `separationScore` | **E-005** — the one definition now also decides what the Studio flags | `gate:cvd` + the new tests |
| New message keys | both catalogues; new kanji would break the bundled face | **E-016** `gate:typecheck`; **E-017** `gate:content` |
| A new Studio branch | contrast and a11y in both themes; and **F-069** — a status colour may not sit beside a colour sample without a `swatch.well` | **E-007**, `gate:contrast`, `gate:a11y`, and `checkStatusAdjacency` which already runs over every screen |

## Test plan

- **Criterion 1:** a palette containing a known-hard pair is flagged; one of well-separated
  colours is not — both directions, so "flags things" is distinguishable from "always flags".
- The proposed alternative **raises** separation, and the improvement equals `after - before`
  computed independently.
- **Criterion 2:** the same envelope and the same two colours recompute the same improvement.
- **Criterion 3, with a decoy:** the copy contains no second-person vision language; the decoy
  asserts the check rejects a sentence that does.
- **Screen:** the flag renders, in both themes, with no status colour beside a sample.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test && pnpm build
pnpm test:cvd && pnpm test:a11y && pnpm test:contrast && pnpm test:content
```

`e2e` is in this feature's list and **cannot run** — gate 7 is pending, F-091 is blocked on the
environment. **Known red and pre-existing:** `test` on `color-difference` and `color-spaces`.

## Risks and open questions

- **Criterion 4 — "permanently available in the free tier" — describes a world that no longer
  exists.** [ADR-0051](../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)
  removed the server, the account and the billing provider; the PRD says there is no team tier
  and OQ-2 is void. There are no tiers, so there is nothing to gate this behind and nothing to
  check. It will be recorded as **not applicable, with the reason**, rather than ticked — the
  same treatment ADR-0011's "no deployment" got in F-029.
- **The surface is Palette Studio, not an outfit.** Stated above; recorded in the notes.
- **`e2e` cannot run**, so nothing proves the flag is reachable by a real gesture.

## Out of scope

A simulation preview of any kind · the outfit builder (F-033) · storing a recommendation or its
envelope · changing `separationScore` · per-user CVD configuration, which would be exactly the
diagnosis criterion 3 forbids.
