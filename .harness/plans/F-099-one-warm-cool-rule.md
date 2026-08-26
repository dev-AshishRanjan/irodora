# Plan: F-099 — One warm/cool rule: the app imports the engine instead of repeating it

| | |
|---|---|
| **Feature** | F-099 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-29, NFR-3 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `scripts/` · `content/rules` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-26 |

---

## Intent

Delete the second copy of the warm/cool rule. `hueBias` (engine) and `biasFromHue` (app) compute
the same thing with the same constants, two features apart, and **both pass their own tests** —
which is exactly the failure E-008 exists to prevent.

## The blocker in the feature's own notes has been closed

F-099 says *"BLOCKED ON THE TOOLCHAIN… DO IT ON THE PINNED TOOLCHAIN"*, and the reason given is
that a hand-made junction *"is what F-098's own notes call the workaround that hid a stale
lockfile for four features"*.

**That was written about the pre-F-098 world.** F-098 shipped gate 0 section 7b, which mirrors
pnpm's own rule and compares every manifest against `pnpm-lock.yaml` **before install, on Node
built-ins, on a clean clone** — precisely so somebody who cannot run pnpm can still be told the
lockfile is stale. The hazard the note warns about is now the thing that is checked.

So the procedure is the one F-038 used for `tests/bench`, and it is verifiable here:

1. add the dependency to the manifest
2. **watch gate 0 go red** on the missing importer entry
3. hand-write the importer entry; watch gate 0 go green
4. `mklink /J` the junction (never `ln -s`, which silently *copies* on this shell)

What still cannot be verified here is that a real `pnpm install` reproduces the same tree. That
is true of every workspace dependency added this session and is said in the record rather than
glossed.

## Approach

### Criterion 2 is the one with work in it

*"The reference poles reach the app from the same rule set the engine scores with, not from a
literal."*

The poles live in `content/rules/weights.<version>.json` as `{ warm: 60, cool: 240 }` — the same
file `ruleSetFor` reads. The app has **no** weights bundle; it has a lexicon bundle, generated
by `scripts/generate-rules-bundle.mjs` with exactly the shape this needs:

> the **text** comes from the generated module and the **expected digest** comes from the
> ledger — two exports from two files, which is the only arrangement in which comparing them
> means anything (ADR-0046, ADR-0066)

So the generator emits a **second** module beside the lexicon, from the last `weights` row of
the same ledger, and the app parses it through the engine's own `parseWeightContent` — never a
hand-written reader. `apps/mobile/src/rules.ts` gets a `ruleSet()` alongside the existing
`lexicon()`, same digest check, same refusal to cache a value that failed it.

### Criterion 1 is then one import and three deletions

`hueBias(hue, poles)` replaces `biasFromHue(hue)`. `WARM_HUE`, `COOL_HUE` and the private
`hueGap` all go — and `hueGap` going matters as much as the bias function, because a circular-
distance helper is the thing somebody reaches for next time.

### What this feature is NOT

**It does not fix the near-neutral defect.** E-034 records that `hueBias` reports a grey at
C = 0.012 as *more warm* than the most saturated red in the corpus, and that `temperatureOf` is
the fix. **F-101 owns that**, and doing it here would mean changing what the photo path answers
in the same commit that changes where the answer comes from — two changes, one diff, and no way
to tell which moved a number.

After this feature the app calls the engine's `hueBias`, which is still the defective one. That
is a *smaller* problem than two copies of it: there is now one place to fix.

## Files to touch

```
apps/mobile/package.json                       — @irodora/recommendation
pnpm-lock.yaml                                 — the importer entry
apps/mobile/node_modules/@irodora/recommendation — the junction (untracked)
scripts/generate-rules-bundle.mjs              — emit the weights module too
apps/mobile/src/rules/generated/weights.ts     — NEW, generated, committed
apps/mobile/src/rules.ts                       — NEW. ruleSet(), digest-verified
apps/mobile/src/profile/photo.ts               — imports hueBias; three deletions
apps/mobile/test/profile.test.ts               — the equivalence assertion
.harness/state/effects.json                    — E-032 resolved
```

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| A new workspace dependency | the lockfile | **gate 0 section 7b** — watched failing first |
| A second generated rule module | `gate:content` | `generate-rules-bundle.mjs --check`, already in gate 11 |
| The poles become content | every photo estimate, on the next weights publish | `gate:test` — the equivalence assertion below |
| `biasFromHue` deleted | `test/profile.test.ts` | `typecheck` |

## Test plan

- **The app and the engine agree, over a swept hue circle.** Not three points — every degree,
  asserted equal to the engine's answer. Three points is what both copies already passed.
- **The poles come from the published file**, asserted by comparing `ruleSet().poles` against
  the content on disk rather than against `60` and `240` typed in a test.
- **A tampered weights module fails to load**, the same way the lexicon does.
- **`biasFromHue` no longer exists** — a `ts-expect-error` import, so the deletion cannot be
  quietly undone.

## Verification

```
node scripts/verify-state.mjs          # watched RED first, on the lockfile
node scripts/generate-rules-bundle.mjs --check
node scripts/verify-content.mjs
pnpm typecheck && pnpm lint && pnpm test
```

**NOT RUNNABLE HERE:** jest, in either zone (`@babel/runtime` and `react-native-worklets` are
missing from a partial install), so `test/profile.test.ts` is **written and not run**. CI runs
it. `tsc --noEmit` covers the type-level half, including the `ts-expect-error`.

## Risks and open questions

- **The equivalence test is the whole point and cannot run here.** A sweep over 360 degrees is
  the only assertion that would have caught the drift this feature exists to remove, and on this
  workstation it is source rather than evidence. Said plainly in the record.
- **E-032 is an ambiguous id.** Two links carry it — F-098's lockfile link and this one — which
  is the defect F-102 was filed for. This feature resolves the **hueBias** link, matched by its
  `from.ref` rather than by id, and F-102 still stands.
- **Bundling the weights ships a rule set the app does not otherwise use.** Nothing in the app
  scores a colour yet. Justified because the poles are what criterion 2 asks for and a partial
  bundle — poles without the weights they belong to — would be a third representation.

## Out of scope

The near-neutral fix (F-101) · using the rule set to score anything in the app · the E-032
renumber (F-102) · a second occasion.
