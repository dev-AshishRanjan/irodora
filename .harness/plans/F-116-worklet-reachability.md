# Plan: F-116 — Every function a worklet reaches must say so itself

| | |
|---|---|
| **Feature** | F-116 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-20 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` — the check is a script, the subject is `apps/mobile/src` |
| **Author** | Claude Code (generator role, planning phase) |
| **Date** | 2026-09-01 |

---

## Intent

`sampleFrame` carried `'worklet'` and called `sampleStride`, which did not. **The Lens crashed on
its first frame**, and nothing in this repository could see it: jest has one runtime and no
worklet boundary, typecheck sees an ordinary call, lint sees an import that resolves, and the
directive changes no JS-thread behaviour, so every test passes identically either side of the
bug.

F-115 fixed the instance and left no guard. This is the guard.

Done: a check walks every function reachable from a `'worklet'` directive, across module
boundaries, and fails when one of them lacks it — watched failing on the exact defect.

## Why now, and why static

**The surface is three worklets, all in `src/lens`** — `onFrame` and `sampleFrame` in
`viewfinder.tsx`, `sampleStride` in `camera.ts`. That is exactly when to write the check, because
the cost of walking it by hand is about to stop being small.

This is a boundary the type system cannot express, which is the category
`verify-engine-purity.mjs` (no `node:*` in the engine) and `verify-app-imports.mjs` (Metro
resolution) already occupy. Those are the precedents, **including their habit of printing what
they cannot see.**

## Approach

**The TypeScript compiler API, not a regular expression.** `typescript@6.0.3` is already a
devDependency and resolves from `scripts/`. A regex over source could find `'worklet'` and it
could find `name(` — but it cannot tell a call from a property access, a local variable from an
imported function, or a shadowed name from the real one, and each of those is a way to be quietly
wrong about a security-shaped boundary. `verify-token-reach.mjs` strips comments character by
character precisely because a regex ate the rest of the line; the same lesson applies harder to a
call graph.

**The walk:**

1. Parse every `.ts`/`.tsx` under `apps/mobile/src` into a `SourceFile`.
2. **Roots** — every function-like node whose body's first statement is the `'worklet'`
   directive prologue.
3. From each root, walk **call expressions** in its body. For a callee that is a bare identifier:
   - resolve it in the file's own top-level declarations, or
   - resolve it through an `import … from './relative'` to a declaration in that file;
   - anything else — a library import, a global, a method call, a local parameter — is
     **out of reach and reported as such** rather than assumed safe.
4. A resolved callee must itself be a worklet root. If it is not, that is the finding.
5. Recurse, so a worklet three calls deep is covered — with a visited set, because the graph may
   cycle.

**Criterion 3 is a printed section, not a sentence in a header.** What source analysis cannot
follow:

- a function reached through a **variable** — `const f = cond ? a : b; f()`
- a **callback passed in** as a parameter and invoked
- a **dynamic property** — `handlers[kind]()`

The check counts and names every call it declined to resolve, on every run including a green one,
so a reader of a pass sees the size of the gap rather than inferring there is none.

## Files to touch

```
scripts/verify-worklet-reach.mjs   — NEW. The walk, the report, and --prove
package.json                       — verify:worklets and verify:worklets:prove
.github/workflows/ci.yml           — the step, in gate 2's neighbourhood
.harness/state/feature_list.json   — status, notes
.harness/state/progress.md         — the entry
```

## Anticipated effects

| Link | What this does to it | Guard |
|---|---|---|
| **E-050** *a worklet may only call worklets, and jest has one runtime* | This is the guard that link has never had. Its `guard` field and memory note both say so and must be updated — an effect whose rationale claims a gap that is now closed is the [[an-effect-rationale-is-prose-in-a-state-file-and-nothing-executes-it]] shape | the check itself, plus `gate:state` for the link's schema |
| **Gate 0's mirror** | A `ci.yml` step gate 0 does not know about fails `verify-gate-mirror.mjs` | **`gate:state`** |
| `apps/mobile/src/lens/*` | **No source changes.** The three worklets are already correct — F-115 fixed them. A check that required an edit to pass would be reporting its own scaffolding | the check, green on the tree as it stands |

**No new effect link.** E-050 already describes the relationship; what changes is that it gains a
guard, which is the thing its rationale currently says it does not have.

## Test plan

`--prove`, mutating parsed sources **in memory**, with the real tree asserted green either side:

- **The exact defect F-115 fixed**: remove `'worklet'` from `sampleStride` and assert the check
  names it *and* names the caller. This is criterion 1, and it is the case the feature exists for.
- **Criterion 2's own case**: the same removal is **cross-module** — `sampleStride` is in
  `camera.ts` and its caller is in `viewfinder.tsx` — so a same-file check would pass. Asserted
  by also planting a same-file removal (`sampleFrame`) and showing both fire; if only the
  same-file one fired, the import-following would be decoration.
- **The decoy**: `readCaptureSpace` is imported into `viewfinder.tsx` from the same module,
  carries no directive, and is called from `onSessionConfigSelected` **on the JS thread**. It
  must **not** be reported. A check that flagged every import of a worklet-adjacent module would
  fire here, and that is the false positive that gets a check switched off.
- **A root that calls nothing** and a file with no worklets at all: no findings, no crash.
- **The unresolvable count is asserted non-zero**, because a check reporting that it sees
  everything is the one claim it must not make.

## Verification

```
node scripts/verify-worklet-reach.mjs
node scripts/verify-worklet-reach.mjs --prove
node scripts/verify-gate-mirror.mjs
node scripts/verify-state.mjs
pnpm lint && pnpm format:check && pnpm test:a11y
```

**Will not run:** `e2e`, `color-golden`, `cvd`, `content`, `perf` — nothing here touches colour,
content or a journey. `test` and `build` run because the repository is one workspace.

## Risks and open questions

- **No `OQ-*`.**
- **A false positive would get this switched off**, which is why the decoy is a named case rather
  than a hope. The rule is *resolved-and-reachable*, never *imported from a file that has a
  worklet in it*.
- **`react-native-worklets`' own helpers are out of reach by design.** `scheduleOnRN` and
  `createSynchronizable` are library functions; the check reports them as unresolved rather than
  demanding a directive it cannot add to somebody else's package.
- **This proves the source says so, not that Babel emitted it.** F-121 established the transform
  is intact by running the real pipeline by hand; that remains evidence rather than a gate, and
  this check does not claim otherwise. It closes the half that can regress silently.

## Out of scope

- **Checking the emitted bundle for `__workletHash`.** That needs the Metro transform in CI and
  is a different, heavier check; F-121's manual run is the current evidence and this does not
  replace it.
- **Any other directive.** `'worklet'` is the one the crash was about.
- **Editing `src/lens`.** The three worklets are already correct.
