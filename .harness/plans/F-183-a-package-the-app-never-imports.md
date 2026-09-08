# Plan: F-183 — A workspace package nothing imports fails the build

| | |
|---|---|
| **Feature** | F-183 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-26, NFR-24 |
| **Service** | `root` |
| **Author** | Claude Opus 5 · **Date** 2026-09-08 |

---

## Intent

The same question as F-179, one layer down. That gate asked *is this screen reachable* and found
eight nobody could open. This asks it about packages and the answer is **two**:

| package | what is in it |
|---|---|
| `@irodora/color-harmony` | twelve harmony generators, gamut-mapped, golden-tested, gate 5 |
| `@irodora/contracts` | the Zod schemas that are the single source of runtime validation |

Both build. Both test. Both pass every gate they have. **Neither appears in a single `import`
anywhere in this repository.** A package like that passes every test it has, because the tests
check the package and nothing checks that anything calls it.

## Approach

**Reused:** the shape of `verify-reachability` — a scanner, a declaration file whose entries name
the feature that closes them, and a check in both directions.

### The subject is the import graph, and the first draft got that wrong

It started as *"a workspace dependency of `apps/mobile` that `apps/mobile` never imports"* and
reported `@irodora/color-harmony` as **not a dependency of the app at all** — true, and nonsense
as a message.

The real shape is worse than unused. **`packages/color-core` declares `@irodora/color-harmony`
and never imports it**, so the one dependency edge pointing at the harmony engine is a claim in a
manifest that no source backs. A manifest-based check would have counted that edge as a use.

A manifest says what a package is *allowed* to reach. Only an import says what it *does*.

### An application is an importer, never a subject

The first run against the real workspace reported `@irodora/mobile`. True — nothing imports an
app — and useless, which is exactly the finding that gets a check switched off. Apps are still
scanned as importers, because that is how most of this workspace becomes reachable at all;
whether an app's own screens are reachable is F-179's question, asked from the tab bar.

## Files to touch

```
scripts/verify-dead-exports.mjs                — new
.harness/verification/unused-packages.json     — the two, each naming its closing feature
package.json                                   — rides in the `lint` gate, beside its converse
```

## Test plan

`--prove`, over a synthetic workspace so the cases stay readable as the real one changes. Seven,
and three are decoys:

- an imported package is not reported; one imported only by **subpath** is not reported
- a package nothing imports **is** reported
- **decoy** — a mention in a comment is not a use
- **decoy** — a package importing its **own** name is still dead (the shape that would make every
  package look alive)
- **decoy** — an application is never a subject, however unimported

## Verification

`state · typecheck · lint · format · test · build`, plus the proof. No colour gate applies.

## Risks

- **Text analysis, like every scanner here.** A dynamic import assembled at runtime is invisible
  to it. That direction fails open, and it is the same trade `verify-app-imports` and
  `verify-motion` already make.
- **The two declarations are promises with dates on them**, F-194 and F-196. If either feature
  lands without consuming its package, the gate says so rather than the exemption surviving.

## Out of scope

Consuming either package — F-194 wires the harmony engine, F-196 the schemas. Removing the
manifest edge `color-core` declares and does not use: it is a real inconsistency, it is not this
feature's, and `verify-peer-deps` is the gate that owns manifests.
