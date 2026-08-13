# Protocol: Effect-link

**Trigger:** whenever a **shared contract** changes, and before closing any feature.

A shared contract is: a port interface · an exported type · a package's public API · a
database schema · an HTTP or wire contract · a config schema · anything in `content/` ·
anything in `packages/color-*`.

---

## Why

The characteristic failure of agent-assisted development is not writing bad code. It is
**fixing one place and breaking three others**, because the causal links live in someone's
head and that someone is not in this session.

This codebase has unusually sharp examples. Changing `srgbToXyz` invalidates every
precomputed Lab and OKLCh value in the corpus — thousands of rows, no compiler error, no
failing test unless one exists for exactly that.

---

## Procedure

### 1. Name what changed

The symbol, file, module or contract id. Be specific: `Color.provenance`, not "the colour
type".

### 2. Consult the existing graph

In [`../state/effects.json`](../state/effects.json), find every link whose `from` matches.
Each `to` is a dependent you must now review.

### 3. Derive new links

Standard propagation paths in this repository:

| Change | Propagates to |
|---|---|
| A colour-space conversion | Golden datasets · every derived space · **every precomputed corpus value** |
| The `Color` type | Every package · every surface · the wire contract · the database columns |
| A port interface | **All adapters** + the port's conformance suite |
| An exported type or API | Every importer + the generated SDK |
| An HTTP contract | OpenAPI + SDK + web + mobile + admin |
| A database schema | Migrations + repositories + affected queries + RLS policies |
| A config schema | `.env.example` + all three deployment profiles + the ops docs |
| A design token | The contrast gate + both themes + all four token targets |
| A rule weight | Recommendation output + reproducibility envelopes |
| A corpus entry | Search index + cached responses + the corpus version |

### 4. Resolve every dependent

**Fix it now** (preferred), or record it as a `backlog` feature with the link.

> **A known break is never left unrecorded.** That is the single most expensive thing
> anyone can do in this repository, because the next session has no way to discover it.

### 5. Update the graph

Add or adjust entries in `effects.json` per
[`../state/schemas/effects.schema.json`](../state/schemas/effects.schema.json):

```jsonc
{
  "id": "E-0NN",
  "from": { "kind": "symbol", "ref": "…" },
  "to":   [ { "kind": "…", "ref": "…" } ],
  "scope": ["packages/…"],
  "severity": "critical | high | medium | low",
  "guard": "gate:color-golden | test:path/to.test.ts | lint:rule-name | none",
  "memory": "memory/effects/<slug>.md",
  "rationale": "WHY B must change when A does.",
  "confidence": 0.0,
  "origin": "manual | static | learned",
  "status": "active | resolved"
}
```

### 6. Write the memory note

`../memory/effects/<slug>.md` — the narrative: why, what broke historically, how to check.
Cross-link with `[[wikilinks]]`.

The JSON says *that* B depends on A. The note says *why*, which is what lets the next
person judge whether the link still holds after a redesign.

### 7. Validate

```bash
node scripts/verify-state.mjs
```

---

## The guard rule

**Every link must name the automated check that catches its violation.**

```
guard: "gate:color-golden"          a verification gate
guard: "test:packages/…/x.test.ts"  a specific test
guard: "lint:no-restricted-imports" a lint rule
guard: "none"                       ← nothing catches this
```

**A `critical` link with `guard: "none"` fails the `state` gate.**

This is what makes the graph more than a wiki. A recorded dependency with no guard helps
the careful reader and does nothing for the careless one — and the careless one is the case
that matters. Requiring a guard turns the graph into a **standing backlog of the checks we
still owe**.

If you genuinely cannot guard a critical link today, the honest move is to file the feature
that adds the guard and reference it — not to downgrade the severity.

---

## Quality

- **Specific over vague.** `packages/color-spaces/src/xyz.ts#srgbToXyz` beats "the colour
  code".
- **A rationale that says why.** "Because it depends on it" is not a rationale. "Because
  every corpus row's Lab is computed by this function at build time, and nothing
  recomputes them on read" is.
- **Confidence is coarse.** 0.9 versus 0.95 is invented precision. Use it to distinguish
  "certain" from "probable".
- **Prune resolved links.** Set `status: "resolved"` when a refactor genuinely removes the
  dependency. A graph full of dead links is one nobody reads.
