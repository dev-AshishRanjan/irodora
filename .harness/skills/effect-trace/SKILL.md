---
name: effect-trace
description: Find and record what a change affects, so a fix here does not silently break there. Updates the effect graph and its memory notes.
---

# Skill: effect-trace

Implements the [effect-link protocol](../../protocols/effect-link.md).

The characteristic failure of agent-assisted development is **fixing one place and breaking
three others**, because the causal links live in a head that is not in this session.

## When

- Before closing any feature.
- Immediately after changing a shared contract: a port · an exported type · a package's
  public API · a database schema · an HTTP contract · a config schema · anything in
  `content/` · anything in `packages/color-*`.

## Steps

### 1. Name what changed

Specifically. `Color.provenance`, not "the colour type".

### 2. Look up existing links

Search [`effects.json`](../../state/effects.json) for links whose `from` matches. Each `to`
is a dependent you must review now.

### 3. Derive new links

| Change | Propagates to |
|---|---|
| A colour-space conversion | Golden data · every derived space · **every precomputed corpus value** |
| The `Color` type | Every package · every surface · the wire contract · database columns |
| A port interface | **All adapters** + the conformance suite |
| An exported type or API | Every importer + the generated SDK |
| An HTTP contract | OpenAPI + SDK + web + mobile + admin |
| A database schema | Migrations + repositories + queries + RLS policies |
| A config schema | `.env.example` + all three profiles + the ops docs |
| A design token | The contrast gate + both themes + all four token targets |
| A rule weight | Recommendation output + reproducibility envelopes |

### 4. Resolve every dependent

Fix it now, or record it as a `backlog` feature.

> **A known break is never left unrecorded.** It is the one failure the next session has no
> way to discover.

### 5. Update the graph

`effects.json`, per [the schema](../../state/schemas/effects.schema.json). Every field
matters, and two especially:

**`guard`** — the gate, test or lint rule that catches a violation. **A `critical` link with
`guard: "none"` fails the `state` gate.** If you genuinely cannot guard it today, file the
feature that adds the guard and reference it — do not downgrade the severity.

**`memory`** — the path to the narrative note.

### 6. Write the memory note

`../../memory/effects/<slug>.md`. Why B must change when A does, what broke historically,
how to check. Cross-link with `[[wikilinks]]`.

The JSON says *that* B depends on A. The note says *why*, which is what lets the next
person judge whether the link still holds after a redesign.

### 7. Validate

```bash
node scripts/verify-state.mjs
```

## The invariants already in the graph

- Change `srgbToXyz` ⇒ **every precomputed corpus value is invalid.** Rebuild the corpus.
  Guard: `gate:color-golden`.
- Change a port interface ⇒ every adapter **and** its conformance suite.
- Change the REST contract ⇒ regenerate OpenAPI **and** the SDK **and** update every
  consumer.
- Change a design token ⇒ re-run the contrast gate in **both** themes.

## Quality

- **Specific.** `packages/color-spaces/src/xyz.ts#srgbToXyz`, not "the colour code".
- **A rationale that says why.** "Because it depends on it" is not one.
- **Coarse confidence.** 0.9 vs 0.95 is invented precision.
- **Prune.** Set `status: "resolved"` when a refactor genuinely removes the dependency. A
  graph full of dead links is one nobody reads.
