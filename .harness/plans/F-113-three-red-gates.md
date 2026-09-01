# Plan: F-113 — Three red gates from three of my own features

|                       |                                                          |
| --------------------- | -------------------------------------------------------- |
| **Feature**           | F-113 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements**      | NFR-20                                                    |
| **Service / package** | `root` — the harness, the app config, one proof script    |
| **Author**            | Claude Code (generator)                                   |
| **Date**              | 2026-09-01                                                |
| **Blockers**          | none                                                      |

---

## What happened

The user pushed this session's work. **CI went red, and so did the release lane.** Three
separate failures, all three introduced by features I closed as green.

| # | red gate | introduced by | why my run missed it |
| --- | --- | --- | --- |
| 1 | CI *Verification gates* | **F-103** | `verify:spacing:prove` is a CI step; I ran the check, never its proof |
| 2 | gate 11 `content` | **F-109** | new Japanese kanji outside the bundled font subset |
| 3 | gate 16 `artefact` | **F-043** | `expo-image-picker` adds `RECORD_AUDIO` by default |

**The common cause is not three unrelated slips.** It is that I chose which gates to run from
each feature's `verification` list plus a habitual set, and CI does not choose. Every one of
these was reachable from this workstation before the push.

## 1 — F-103 broke the proof of the check it fixed

F-103 turned `spacing.scale` from a positional array into a named record and updated
`verify-spacing-scale.mjs` to match — including a new fail-closed branch that **rejects the
array shape**. It did not update that script's own `--prove` path, which still did:

```js
perturbed.spacing.scale = perturbed.spacing.scale.filter((s) => s !== 20);
```

`TypeError: .filter is not a function`. The proof was written against a shape its own check no
longer accepts.

**Fixed by removing the step by VALUE rather than by key** — find whichever entry holds 20 and
delete it. A hard-coded `delete scale.xl` would turn into a silent no-op the day somebody
renames the step, which is the same class of fragility that caused this.

## 2 — F-109 added Japanese without regenerating the font subset

Seventeen message keys, twelve kanji the subset did not carry: 学 習 好 回 増 量 限 拠 状 態 操 元.

This is **the same failure F-043 had**, which F-108 fixed and F-045 turned into a tracing step —
and I did it again. `node scripts/generate-font-subset.mjs` is the fix and takes seconds; the
cost is entirely in not having run gate 11.

## 3 — F-043's picker brought a microphone permission

`expo-image-picker`'s config plugin:

```js
if (microphonePermission !== false)
  config = withPermissions(config, ['android.permission.RECORD_AUDIO']);
```

**Opt-out, not opt-in.** It is there for callers who capture video. `wardrobe/picker.ts` passes
`mediaTypes: ['images']` and nothing in this product records audio at all.

Gate 16 caught it on the first signed artefact and reported it exactly as designed: *"an
unexpected permission is a capability nobody reviewed."* The gate is right and the artefact was
wrong.

**Fixed at source, not by widening the expectation.** Adding `RECORD_AUDIO` to
`EXPECTED_PERMISSIONS` would have made the gate green and left a microphone permission on a
colour tool — the exact outcome the gate exists to prevent. Instead:

- `['expo-image-picker', { microphonePermission: false }]` in `plugins`, which is the real fix
  and the only way to pass the option; Expo autolinks the plugin whether or not it is listed.
- `android.permission.RECORD_AUDIO` in `blockedPermissions`, as the backstop, so the permission
  cannot return if the plugin options are dropped in a refactor.

## The habit, which is the part worth keeping

Running the gates a feature's `verification` list names, plus the ones I am used to, is a
**choice made by the person most invested in the answer being green**. Three features passed
that way and three of them were red in CI.

So this feature's fourth criterion is procedural: **every single-line `run:` command in
`ci.yml`, in order, before this closes.** Not a subset chosen by judgement.

## Files to touch

```
scripts/verify-spacing-scale.mjs          — the --prove mutation, for the record shape
apps/mobile/assets/fonts/…                — regenerated subset
apps/mobile/app.config.ts                 — the plugin option and the blocked permission
```

## Anticipated effects

| Change | Dependents | Guard |
| --- | --- | --- |
| The proof's mutation | `gate:a11y` (spacing proof runs there) | the proof itself |
| The font subset | every Japanese string in the app | `gate:content` |
| The permission set | the shipped artefact | `gate:artefact` (16), release lane only |

**A link is likely owed on the third.** A dependency's *config plugin* is a source of shipped
capabilities that no source file mentions — `app.config.ts` never names `RECORD_AUDIO` and
neither does any import. Decided at the trace.

## Test plan

- **The spacing proof passes**, and its tree is clean afterwards — it mutates the manifest and
  must restore it.
- **Gate 11 is green** and the regenerated subset is committed.
- **The prebuilt manifest carries `RECORD_AUDIO` with `tools:node="remove"`**, the same
  mechanism that already provably keeps `INTERNET` out of shipped APKs. This is the strongest
  evidence available here — the merge itself happens in Gradle, which needs a JDK this
  workstation does not have.
- **Every `run:` command in `ci.yml`** passes locally, reported as a list rather than a claim.

## Verification

```
node scripts/verify-state.mjs
every single-line run: command in .github/workflows/ci.yml, in order
```

Gate 16 **cannot run here** and is not claimed: it needs a built APK, which needs Gradle and a
JDK. `which java` finds nothing. The permission fix is verified as far as the prebuilt manifest,
and the release lane is what confirms it.

## Risks and open questions

- **The RECORD_AUDIO fix is verified one step short of the artefact.** Stated in the record
  rather than smoothed over: what is proven here is that the manifest asks for its removal, not
  that the merged APK lacks it.
- **A local CI sweep is not CI.** It runs on Windows, on Node 24, with hand-made workspace
  junctions instead of a real `pnpm install`. It closes the gap that caused these three; it does
  not close the platform gap.

## Out of scope

- **A check that reads the prebuilt manifest on every PR**, which would have caught the
  permission at F-043 rather than at the release lane. Worth having and filed, not built here.
- The Node 20 deprecation warnings in the workflow.
