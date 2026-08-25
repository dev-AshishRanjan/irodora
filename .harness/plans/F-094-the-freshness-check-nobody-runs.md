# Plan: F-094 — The token generator has a `--check` nobody runs

| | |
|---|---|
| **Feature** | F-094 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | root · `@irodora/design-tokens` |
| **Author** | Claude Code (Opus 5) |
| **Date** | 2026-08-25 |

---

## Intent

`scripts/generate-design-tokens.mjs --check` exists, says in its own header that *"a generator
whose output is never compared is a generator nobody is checking"*, is called **"the freshness
check"** in two feature plans — and is invoked by no root script, no gate and no CI step.

**Done, to a reviewer:** editing the design-system manifest without regenerating fails a gate,
instead of leaving five committed artefacts describing the old values while every test agrees
with them.

## Approach

### What is actually at risk

The generator writes **five** targets and they are all committed source:

```
packages/design-tokens/generated/tokens.css
packages/design-tokens/generated/tokens.tailwind.css
packages/design-tokens/src/generated/tokens.ts
packages/design-tokens/src/generated/native.ts
apps/mobile/global.css
```

`--check` also compares the manifest's own derived `srgb` fields, which the generator rewrites
in place.

### Corrected during the work: four of the five were already covered

The plan's first draft said all five artefacts were unguarded. **That was wrong**, and measuring
it rather than asserting it is what caught it: `packages/design-tokens/test/emit.test.ts` already
byte-compares **four** of them — `tokens.css`, `tokens.tailwind.css`, `tokens.ts` and
`native.ts` — and carries its own `checks all four targets` assertion. A manifest edited without
regenerating fails `gate:test` today.

**`apps/mobile/global.css` is byte-compared by nothing.** Measured, not inferred: hand-editing a
hex in it leaves all **172** design-tokens tests green, and only the new `--check` reports it.

That artefact is [E-019](../state/effects.json)'s own subject — the app's stylesheet, a generated
file Uniwind evaluates in Metro — and E-019's guard names `heroui.test.ts` and `emitHeroui`
throwing, neither of which compares the committed file to what the manifest would emit now.

So the hole is **one artefact, and it is the one that ships**. Narrower than the plan claimed,
and worth closing precisely because it is the app's own stylesheet.

Wiring the check into gate 9 also moves the other four **earlier**, ahead of the suites that
would otherwise agree with stale values, and adds the manifest's derived `srgb` field.

### Where it belongs

Beside the checks that already do this job. `gate:content` runs
`generate-corpus-bundle.mjs --check`, `generate-font-subset.mjs --check` and, since F-021,
`generate-rules-bundle.mjs --check` — the same shape, for the same reason
[[generating-an-artefact-is-not-checking-it]].

This one belongs in **`gate:contrast`**, because the manifest is what that gate is about and
E-007 is the link it guards. `pnpm test:contrast` gains the `--check` ahead of the turbo run, so
a stale artefact fails before the suites that would have agreed with it.

Root script *names* do not change, so `gates.json` and the CI mirror are untouched.

### Watched failing, in both directions

The whole point is a check that fires. Two mutations, each restored:

1. **a token value edited in the manifest** without regenerating → stale artefacts;
2. **a generated file edited by hand** → the same check, from the other side.

And the baseline asserted green either side of both, because a check that is red for an
unrelated reason proves nothing about the mutation.

**Reused:** the existing `--check` mode — no new script. This feature is wiring plus proof.

### Increments

1. Wire `--check` into `test:contrast`; confirm green.
2. Watch it fail on a manifest edit and on a hand-edited artefact; restore.
3. Extend `verify-cache-scope.mjs`? **No** — see out of scope.
4. Record: the effect note for E-007 gains the destination that was missing, progress, close.

## Files to touch

```
package.json                              — test:contrast gains the --check
.harness/memory/effects/a-token-change-is-a-contrast-change-in-both-themes.md
                                          — E-007's unguarded half is now guarded
.harness/state/effects.json               — E-007's `to` gains the generated artefacts
```

## Anticipated effects

| Change | Propagates to | Guard |
|---|---|---|
| **`test:contrast` gains a step** | `gates.json` command · the CI mirror | `script:verify-gate-mirror.mjs` — existing. The script NAME is unchanged, so the mirror should stay green; if it does not, the mirror is right |
| **E-007 gains destinations** | the effect graph and its note | `gate:state` — pairing and path existence |

No source changes, so no new effect link: this closes a hole in an existing one rather than
creating a relationship.

## Test plan

- **The mutation proof is the test.** There is no unit to write: the deliverable is that a gate
  goes red, and the honest test of that is watching it.
- **Both directions**, because they fail differently: an edited manifest makes five artefacts
  stale at once, an edited artefact makes one.
- **Baseline green either side of each**, asserted rather than assumed.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-gate-mirror.mjs
node scripts/generate-design-tokens.mjs --check
node scripts/gate.mjs test:contrast
```

`test` is untouched by this feature and stays red repo-wide for the Node 22 reason F-093 made
visible and F-083 owns.

## Risks and open questions

- **The check may already be red.** It was green on 2026-08-25 when F-093 filed this, but any
  manifest edit since would surface here first. That is the feature working, not a defect in it.
- **`emitHeroui` throws rather than returning bad output**, so a manifest that cannot produce a
  valid stylesheet fails the check as an exception rather than as a staleness report. Correct,
  and worth knowing when reading a failure.
- No `OQ-*` blocks this feature.

## Out of scope

Teaching `verify-cache-scope.mjs` about generator inputs — the manifest is already in
`globalDependencies` since F-093, so the design-tokens tasks already invalidate on it · any
change to the generator itself · the other four `--check`s, which are already wired.
