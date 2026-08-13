---
name: write-adr
description: Record an architectural decision so it is not re-litigated in six months — with its real downsides and the alternatives taken seriously.
---

# Skill: write-adr

Policy: [`adr-policy.md`](../../governance/adr-policy.md) ·
Template: [`0000-template.md`](../../../docs/adr/0000-template.md).

## When

Any deviation from a documented default · a choice between technologies · anything that
constrains future work · **changing a golden dataset value** · changing a gate, threshold or
rule · closing an `OQ-*` · anything a reasonable engineer might re-litigate later.

**When unsure, write it.** Twenty minutes now against a week of re-derivation later — and
the re-derivation usually reaches a different answer, so now there are two conventions.

## Steps

1. **Next number**, never reused. Kebab-case filename.
2. **Title the decision, not the topic.**
   `0013-postgres-drizzle-single-system-of-record.md`, not `0013-database-choice.md`.
   Someone scanning the index should learn what was decided without opening anything.
3. **Context** — what *forced* this. The constraint, the pressure, the failure. Include the
   numbers.
   > A context that could have been written before encountering the problem is not a
   > context.
4. **Decision** — stated so someone could implement it without reading the rest.
5. **Consequences** — Good, **Bad**, Neutral.
   > An ADR with no downsides is describing a preference. Every real decision costs
   > something, and the next person needs to know what.
6. **Alternatives** — say what each would have been **good at**, *then* why that was not
   enough. The first half is what makes the second half credible.
7. **Revisit when** — an observable condition. "When CI exceeds 15 minutes", not "if
   circumstances change".
8. **Add the index row** in [`docs/adr/README.md`](../../../docs/adr/README.md). The
   `state` gate checks it.
9. **Link it** from whatever it governs.

## Quality

| Weak | Useful |
|---|---|
| "We chose Postgres because it's reliable" | The specific requirements it satisfies, and what a second store would have cost |
| "Consequences: better performance" | What it costs — and something is always costed |
| "Alternatives: MongoDB (not suitable)" | What Mongo is genuinely good at, and why that did not apply here |
| "Revisit if needed" | The threshold that would trigger a rethink |

## Superseding

**Never edit an accepted ADR to change its decision.** Write a new one; update the old
one's status to `Superseded by ADR-NNNN` with a link.

The old record stays. It explains why the code looked the way it did — which is exactly
what someone reading old code needs.

## Needs a human

An ADR that changes a golden rule, a gate, a threshold, or a golden dataset value needs a
**human decision**, not just a written record
([`tool-access.md`](../../governance/tool-access.md)).
