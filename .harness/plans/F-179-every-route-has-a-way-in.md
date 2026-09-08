# Plan: F-179 — Every route has a way in, and a gate says so

| | |
|---|---|
| **Feature** | F-179 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-26, FR-71 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` |
| **Author** | Claude Opus 5 |
| **Date** | 2026-09-08 |

---

## Intent

Reported as *"I don't see settings, and options to choose themes in app. Are you sure you have
added all pages, and links."* The answer is no, and it is worse than the question assumes:
**eight built screens have routes and nothing anywhere navigates to them.**

```
/atlas/compare  /atlas/find  /atlas/palettes  /profile/preferences
/profile/measure  /profile/export  /wardrobe/outfit  /wardrobe/shopping
```

Each is a finished screen with a conformance subject, a11y coverage and tests. A person holding
the phone cannot reach any of them.

Done: a gate fails the build on a route no interaction reaches, and it names those eight on a run
against the tree as it stands. The wiring is F-181 and F-182; **the gate lands first, so the
wiring is checked rather than asserted.**

## Approach

**Reused:** `routePatterns()` and `targets()` from
[`verify-route-targets.mjs`](../../scripts/verify-route-targets.mjs), both already exported.
This gate is the **converse** of that one — it asks *does every route have a target* where the
other asks *does every target have a route* — so it must read the same route model or the two
will disagree about what a route is. Importing rather than re-deriving is the whole point
[[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]].

**New:** `scripts/verify-reachability.mjs`, and a declaration file for the exceptions.

### What "reachable" means here, and the limit stated up front

A route is reachable when it is a **tab**, or something navigates to it from a file that is
itself reachable. That is a graph walk, and the honest description of the edges is:

> a route's outgoing edges are every navigation target found in its own route file **and in the
> `apps/mobile` modules that file imports, transitively**.

A screen imported by two routes contributes its targets to both. That **over-approximates**
reachability — a route can be called reachable when only one of two importers can really get
there — and over-approximating means the gate fails *less* often than the truth. That is failing
open, it is the wrong direction, and it is chosen anyway because the alternative is a
per-component call-graph this repository has no reason to build. **The limit is printed on every
run**, the way `verify-contrast` prints what it does not check.

Transitivity is not optional here: `/atlas/palettes` is navigated to **only** from
`/profile/export`, which is itself an orphan. A gate that asked merely "does anything link to
this" would pass `palettes` and report seven orphans instead of eight. The data in front of us
is exactly the case that distinguishes the two rules.

### Exceptions expire

Same shape as `unreached-tokens.json` and for the same reason (ADR-0088): an entry names the
feature that will reach the route and **fails once that feature has made it reachable**, so a
dead exception is caught rather than accumulating. F-181 and F-182 are the two that will close
today's eight.

**Increments:**

1. The route graph and the walk, with `--prove`.
2. The declaration file carrying today's eight, each naming its closing feature.
3. Activation: added to `gates.json` and to CI, mirrored (gate 15 checks that mirror).

## Files to touch

```
scripts/verify-reachability.mjs             — new
.harness/verification/unreachable-routes.json — new; today's eight, each with closedBy
.harness/verification/gates.json            — the gate activates
.github/workflows/ci.yml                    — mirrored, or gate 15 fails
docs/REQUIREMENTS-COVERAGE.md               — NFR-26 gains its gate
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| a new blocking gate | every future route | its own `--prove`, and gate 15's mirror check |
| `gates.json` changes | `.github/workflows/ci.yml` | `verify-gate-mirror` — which is why the workflow is edited in the same commit |

No effect id. The effect graph tracks shared contracts between packages; a gate is a check, and
adding one to `gates.json` is already guarded by the mirror.

## Test plan

- **`--prove`, with decoys in both directions.** A route reachable only through a chain must
  pass; the same route with the chain cut must fail; a tab must always pass; a route named in
  the declaration file must pass while it is declared and **fail once it becomes reachable**.
- **Against the real tree:** the run reports exactly the eight named above, and no others. That
  number is written into the declaration file, so a ninth appearing is a change somebody has to
  make deliberately.
- **The mirror:** `verify-gate-mirror` must pass with the new gate in both files, and must fail
  if it is removed from one — which its own proof already covers.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-reachability.mjs && node scripts/verify-reachability.mjs --prove
node scripts/verify-gate-mirror.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

No colour gate applies: this feature paints nothing.

## Risks and open questions

- **Over-approximation is failing open**, and it is the deliberate choice. Recorded here and
  printed by the gate rather than left for somebody to discover.
- **The import walk is text-based**, like every other scanner here. It follows relative imports
  within `apps/mobile` and does not resolve aliases or dynamic imports — so the Lens's
  `React.lazy(() => import('./CameraLens'))` needs handling, and it is the one dynamic import in
  the app.
- **A gate that fails on day one is a gate somebody switches off.** It ships with the eight
  declared, so the build is green, and the declarations expire feature by feature. The
  alternative — activate it red — would make F-181 and F-182 hostage to it.

## Out of scope

Wiring any of the eight (F-180, F-181, F-182), and dead package exports (F-183), which is the
same requirement pointed at a different artefact.
