# ADR-0030 — The effect graph is committed, and every link must name its guard

## Status

Accepted

## Date

2026-08-13

## Context

The recurring failure in agent-assisted development is not writing bad code. It is fixing
one place and breaking three others, because the causal links between parts of a system
live in someone's head and that someone is not in this session.

This codebase has unusually strong examples. Changing `srgbToXyz` invalidates every
precomputed Lab and OKLCh value in the corpus — thousands of rows, no compiler error, no
failing test unless one exists specifically for it. Changing the `Color` type touches every
surface. Changing a wire schema requires regenerating OpenAPI, the SDK, and every consumer.

The usual answer is documentation: a wiki page listing what depends on what. It rots within
a quarter, because nothing forces it to stay true.

A better answer is a machine-readable graph the build validates. But even that has a
weakness worth naming: **a recorded dependency that nothing checks is still just a note.**
It tells a careful reader what to be careful about. It does nothing for the careless one,
which is the case that matters.

## Decision

**Two linked, committed representations — and every link must name the automated check that
catches its violation.**

### `.harness/state/effects.json` — the machine graph

```jsonc
{
  "id": "E-001",
  "from": { "kind": "symbol", "ref": "packages/color-spaces/src/xyz.ts#srgbToXyz" },
  "to": [
    { "kind": "test",     "ref": "packages/color-spaces/golden/srgb-xyz.golden.json" },
    { "kind": "package",  "ref": "@irodora/color-difference" },
    { "kind": "artifact", "ref": "content/colors" }
  ],
  "scope":    ["packages/color-spaces", "packages/color-difference", "content"],
  "severity": "critical",
  "guard":    "gate:color-golden",
  "memory":   "memory/effects/srgb-xyz-is-the-root-of-every-derived-value.md",
  "rationale": "Every derived space and every precomputed corpus value is downstream of this transform; a change silently invalidates the corpus.",
  "confidence": 0.98,
  "origin": "manual",
  "status": "active"
}
```

### `.harness/memory/effects/*.md` — the narrative

One note per link: why B must change when A does, what broke historically, how to check.
Linked in both directions, cross-referenced to lessons and decisions with `[[wikilinks]]`.

### The rules the `state` gate enforces

1. **Every `E-###` has a memory note; every memory note is referenced by a link.** Neither
   representation can drift from the other.
2. **Every `to` reference resolves to something that exists on disk.** A link pointing at a
   deleted file is rot, and rot is caught rather than accumulated.
3. **`guard` is required.** It names a gate, a test file, or a lint rule.
4. **A `critical` link with `guard: "none"` fails the gate.** This is the decision's
   sharpest edge: the graph becomes a **standing backlog of the automated checks we still
   owe**, rather than a list of things to remember.
5. **`scope` lists the packages and services involved**, so cross-service consequences can
   be queried.
6. **The effect-link protocol runs before any feature closes**
   ([`.harness/protocols/effect-link.md`](../../.harness/protocols/effect-link.md)). A
   known break is fixed now or recorded as a feature. It is never left unrecorded.

## Consequences

**Good.** Causal knowledge lives in the repository rather than in a session that has ended.
The `guard` requirement converts documentation into a work list — you cannot record a
critical dependency and walk away from it. Path validation means the graph cannot silently
rot. A new agent asking "what does this change affect?" gets an answer from files.

**Bad.** Real maintenance burden: every shared-contract change means updating two artefacts.
The graph will be incomplete — it captures what we have thought about, and the dangerous
dependencies are the ones nobody has thought about yet. `confidence` invites false
precision; it is a coarse signal, not a probability. And there is a temptation to downgrade
a link's severity to avoid owing a guard, which is exactly the erosion review must watch
for.

**Neutral.** The graph is authored, not derived. Static analysis could generate some links
later, which is what `origin: "static" | "manual" | "learned"` is for.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Documentation prose** | Zero tooling, easy to write. Rots, because nothing forces it to stay true, and provides no help to the person who did not read it |
| **Rely on tests alone** | Tests are the real guard, and this decision makes that explicit. But tests do not tell you *what else to look at* before you start — and the gaps in test coverage are invisible without a map of what should be covered |
| **Generate the graph from static analysis** | No maintenance burden, always current. Cannot see the links that matter most here — `srgbToXyz` has no import edge to `content/colors/*.json`, yet that is the most consequential dependency in the system |
| **Machine graph only, no narrative** | Less to maintain. `confidence: 0.98` does not tell the next person *why*, and the why is what lets them judge whether the link still holds after a redesign |

## Revisit when

- The graph exceeds what is maintainable by hand, at which point static analysis
  supplements it — augmenting `origin: "static"` links, never replacing the manual ones.
- A pattern of `severity` downgrades appears in review, which would mean the guard
  requirement is being routed around rather than met.
