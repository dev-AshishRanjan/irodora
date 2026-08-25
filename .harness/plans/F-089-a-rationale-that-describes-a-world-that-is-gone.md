# Plan: F-089 — Gate 0 catches an effect rationale that describes a world that no longer exists

| | |
|---|---|
| **Feature** | F-089 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-24 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | root |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-25 |

---

## Intent

An effect rationale is where the honest admissions live — *"guard: none"*, *"not yet blocking"*,
*"detected against intent rather than enforced"*. When the promise behind one is kept and the
sentence is not updated, **the record becomes a lie in the direction that matters**: it tells a
reader a verification does not exist, and the reader it misleads is one deciding whether to skip
it.

**Done, to a reader of the graph:** a rationale claiming its guard is absent, while that guard
is wired and running, fails gate 0 by link id and by phrase.

## Approach

### The evidence is a week old and there is more of it than the feature was filed with

F-089 was filed from E-017, whose rationale said the guard was *"built and proven but NOT YET
BLOCKING"* for three features after F-076 wired it.

**F-094, yesterday, produced a second instance and a sharper one.** E-007's memory note said
*"the four outputs … the emit tests byte-compare, so a skipped regenerate is loud."* Both halves
were nearly true — and the gap between *four* and *five* was the entire defect, surviving because
the sentence **sounded like coverage**. The uncompared fifth was `apps/mobile/global.css`, the
app's own stylesheet.

That second case is why the check reads **memory notes as well as rationales**: E-007's link was
fine; its note was not.

### The hard part is the inverse, and it decides the design

A word-matcher that flags every *"not yet"* would be deleted within a release, and it would
deserve to be. So the check never fires on a phrase alone. It fires on a **disagreement**:

```
the rationale claims the guard is absent   AND   the guard is actually wired
```

**Wired** is computed from the repository, not from prose:

- `gate:<id>` → `gates.json` has that id with `status: "active"`
- `script:<file>` → that filename appears in some root `package.json` script

A link whose `guard` is literally `none` is **skipped entirely**. That is the honest case the
graph exists to carry — E-009 has said so since F-001 and must keep saying so.

### Narration is not a claim, and this repository is full of narration

Rationales here routinely tell the story of a defect: *"it was red for two features"*, *"was
compared by nothing"*, *"the first draft used round numbers"*. Those are past-tense and true, and
a check that flagged them would be the word-matcher above.

So the phrase list is **present-tense assertions about the guard's current state** only, and the
list is small enough to read. The check will be **run against the real graph before it is
trusted**, and anything it flags will be looked at rather than silenced.

> **Corrected during the work.** This paragraph first said: *"if it fires on legitimate
> narration, the phrase is wrong and gets removed, not marked."*
>
> The first run disproved that. It fired on E-017's rationale and note — which had **already
> been corrected** and now *quote* the old claim in order to show how a note rots. That is
> narration, and the phrase it quotes is `not yet blocking`: the canonical instance of the
> defect and the last phrase that should be deleted from the list.
>
> So the marker is the right instrument here, and this is its first legitimate use — which is
> also the acceptance criterion asking for *"a rationale that describes a past state on
> purpose"*. The policy is now: **fire, read it, and choose** — fix the prose when it is a
> claim, mark it when it is a quotation, and remove the phrase only when it cannot tell the two
> apart at all.

### The escape hatch is `retired-ok`'s shape, deliberately

A visible, reasoned marker in the text itself — `past-state-ok: <reason>` — because a rationale
may describe a past state **on purpose**, and an exemption a reviewer can see beats one in a
config file nobody opens. Same mechanism, same polarity, and the same reason it is a marker
rather than an id list.

**Reused:** `verify-state.mjs`'s check idiom and its `fail()` reporting · the
`retired-surface.json` config shape · the `--prove` habit from `verify-cache-scope.mjs`.

**New:** `.harness/verification/discharged-claims.json` · one check in `verify-state.mjs`.

### Increments

1. The config and the check; run it against the real graph and read what it says.
2. Whatever it legitimately finds — fix the rationale, not the check.
3. The proof: plant a discharged claim, watch gate 0 name the link and the phrase, restore.
4. Record.

## Files to touch

```
.harness/verification/discharged-claims.json  — NEW: the phrases and the marker
scripts/verify-state.mjs                      — NEW check: stale-rationale
.harness/state/effects.json                   — any rationale the check legitimately catches
.harness/memory/effects/*.md                  — likewise
```

## Anticipated effects

| Change | Propagates to | Guard |
|---|---|---|
| **A new gate-0 check** | every effect rationale and memory note | itself, proven by a planted claim |
| **The config file** | `verify-state.mjs` | gate 0 fails if it is missing or declares no phrases — the same "a vocabulary check with no vocabulary" failure `retired-surface` already guards against |

No new effect link: this adds a check over existing state rather than a new relationship.

## Test plan

- **Against the real graph first.** Anything it flags is read and judged before the check is
  trusted. A check whose first run is green over 24 links has told me nothing about whether it
  can fire.
- **The proof:** plant *"not yet blocking"* into a rationale whose guard IS wired, and assert
  gate 0 reports it **by link id and by phrase**. Restore, and assert green either side.
- **The inverse, which is the acceptance criterion that matters:** E-009's rationale honestly
  says its guard is `none`. It must stay green, and that is asserted rather than observed.
- **The marker:** the same planted claim with `past-state-ok:` appended must pass.
- **Failing closed:** a missing or empty config fails, rather than passing over everything.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-state.mjs --prove-stale-rationale
npx eslint scripts && npx prettier --check .
```

Only gate 0 applies: no source outside `scripts/` changes, and the feature's own verification
list says `state`.

## Risks and open questions

- **False positives on narration** are the whole risk. Mitigated by running it before trusting
  it, by keeping the phrase list present-tense, and by fixing prose rather than adding markers
  when it fires.
- **`test:` and `lint:` guards are not resolved to reality.** Only `gate:` and `script:` are
  computed. A link guarded solely by a test path is skipped rather than guessed at — stated on
  every run, in the same shape as the other honest limits gate 0 prints.
- No `OQ-*` blocks this feature.

## Out of scope

Checking feature notes, `progress.md`, ADRs or code comments — this is about the **effect
graph**, whose rationales are the ones that tell a reader whether a verification exists ·
verifying that a guard actually *works*, which is every other gate's job · F-092's shape (a
generated value with no consumer), which is a different question about a different artefact.
