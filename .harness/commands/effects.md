# Command: effects

Trace what a change affects, and record it.

## Procedure

1. **Name what changed.** Specifically — `Color.provenance`, not "the colour type".

2. **Look up existing links** in [`effects.json`](../state/effects.json) whose `from`
   matches. Each `to` is a dependent to review now.

3. **Derive new links.** Standard propagation:

| Change | Reaches |
|---|---|
| A colour-space conversion | Golden data · derived spaces · **every precomputed corpus value** |
| The `Color` type | Every package · every surface · the wire contract · database columns |
| A port interface | **All adapters** + the conformance suite |
| An exported type or API | Every importer + the generated SDK |
| An HTTP contract | OpenAPI + SDK + web + mobile + admin |
| A database schema | Migrations + repositories + queries + RLS policies |
| A config schema | `.env.example` + all three profiles + ops docs |
| A design token | The contrast gate + both themes + all four token targets |
| A rule weight | Recommendation output + reproducibility envelopes |

4. **Resolve each dependent** — fix now, or record as a `backlog` feature. **A known break
   is never left unrecorded.**

5. **Update `effects.json`** with `guard` and `memory`. A `critical` link with
   `guard: "none"` fails the `state` gate.

6. **Write the memory note** in [`memory/effects/`](../memory/effects/) — why B must change
   when A does.

7. **Validate:** `node scripts/verify-state.mjs`

## Reporting

```
Changed:    packages/color-spaces/src/xyz.ts#srgbToXyz
Existing:   E-001 (corpus derived values), E-003 (golden datasets)
New:        E-0NN — <what and why>
Resolved:   corpus rebuilt · golden set re-run
Recorded:   F-0NN — add a guard for the derived-column consistency check
Guards:     all critical links guarded ✓
```
