# ADR Policy

Records: [`../../docs/adr/`](../../docs/adr/) · Skill:
[`write-adr`](../skills/write-adr/SKILL.md).

---

## When

Write one for:

- Any deviation from a documented default.
- A choice between technologies.
- Anything that constrains future work.
- **Changing a golden dataset value** — a claim about physical reality.
- Changing a verification gate, a committed threshold, or a rule.
- Closing an open question (OQ-1 … OQ-5).
- Anything a reasonable engineer might re-litigate in six months.

Do not write one for implementation detail inside an established pattern, something an
existing ADR already decides, or a reversible choice with no downstream constraint.

**When unsure, write it.** Twenty minutes now against a week of re-derivation later, and
the re-derivation usually reaches a different answer.

---

## Form

[`0000-template.md`](../../docs/adr/0000-template.md). Sequential number, kebab-case title,
never renumbered.

### Title the decision, not the topic

```
No:  0013-database-choice.md
Yes: 0013-postgres-drizzle-single-system-of-record.md
```

Someone scanning the index should learn what was decided without opening anything.

### Fill in Bad consequences

**An ADR with no downsides is describing a preference, not a decision.**

Every real decision costs something. The next person needs to know what it cost, because
that is what tells them whether the trade still holds in their situation.

### Take the alternatives seriously

An alternative dismissed in one line was not considered. Say what it would have been good
at, *then* why that was not enough:

```
| Depend on culori at runtime | Fast, well-maintained, widely used, and would save
  real work. But it brings its own platform assumptions, and NFR-3 would become a
  promise about their cross-runtime behaviour that we cannot test. |
```

The first half is what makes the second half credible.

### `Revisit when` is an observable condition

```
No:  "if requirements change"
Yes: "when CI wall time exceeds 15 minutes on an incremental change"
```

---

## Status

`Proposed` → `Accepted` → `Superseded by ADR-NNNN` | `Deprecated`.

**Never edit an accepted ADR to change its decision.** Write a new one that supersedes it,
and update the old one's status with a link.

The superseded record stays. It explains why the code looked the way it did, which is
exactly what someone reading old code needs.

Typo fixes and added links are fine.

---

## The index

Every ADR has a row in [`../../docs/adr/README.md`](../../docs/adr/README.md).
**Machine-checked** — the `state` gate fails if a file has no row, or a row points at a
missing file.

---

## Open questions

Tracked in [PRD §10](../../docs/PRD.md#10-constraints-and-assumptions) and the ADR index.

**An open question blocks the feature that depends on it**, and closes as an ADR — not as a
conversation, not as a decision someone remembers making.

---

## Review

An ADR that changes a golden rule, a gate, a threshold, or a golden dataset value needs a
**human decision**, not just a written record.

Everything else can be authored by an agent and reviewed as part of the feature.
