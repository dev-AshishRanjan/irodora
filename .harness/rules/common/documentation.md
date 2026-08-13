# Documentation Rules

---

## Where knowledge lives

| Kind | Home |
|---|---|
| What the product does | [`docs/PRD.md`](../../../docs/PRD.md) |
| How the system works | [`docs/architecture/`](../../../docs/architecture/) |
| **Why** a decision was made | [`docs/adr/`](../../../docs/adr/) |
| How to do a task here | [`.harness/skills/`](../../skills/) |
| What must be true | [`.harness/rules/`](../) |
| What happened, and what we learned | [`.harness/memory/`](../../memory/) |
| Current state | [`.harness/state/`](../../state/) |
| How to run it | [`docs/operations/`](../../../docs/operations/) |

**Put it in one place.** The same fact in two documents becomes two facts, and one of them
becomes wrong.

---

## Explain why, not what

```ts
// No — restates the code, and goes stale.
// Loop through the colours
for (const color of colors) { … }

// Yes — says what the code cannot.
// Sample on a JITTERED grid: a regular grid aliases against woven texture
// and produces a reading biased toward the weave rather than the dye.
```

A comment that restates the code is a maintenance liability. It ages into a lie.

---

## Documents are read under pressure

Someone reading a runbook is usually mid-incident. Someone reading a rule is usually mid-task.

- **Front-load the answer.** The important thing is in the first paragraph, not the
  conclusion.
- **Say the constraint before the rationale.** They can read the rationale if they doubt
  the constraint.
- **Tables for anything comparative.**
- **Concrete over abstract.** A real command beats a description of a command.
- **No filler.** "It is important to note that" carries no information.

---

## ADRs

Per [`../../governance/adr-policy.md`](../../governance/adr-policy.md).

- **Title the decision, not the topic.** "Postgres is the single system of record", not
  "Database choice".
- **Fill in the Bad consequences.** An ADR with no downsides is describing a preference.
  Every real decision costs something, and the next person needs to know what.
- **An alternative dismissed in one line was not seriously considered.** Say what it would
  have been good at, then why that was not enough.
- **`Revisit when` is an observable condition**, not "if circumstances change".

---

## Links

- Relative links between repository documents. The `state` gate checks they resolve.
- Link to the ADR rather than restating its reasoning.
- When a claim depends on a decision, link the decision. A reader who disagrees should be
  able to find the argument.

---

## Keep it current, or delete it

**Stale documentation is worse than none.** Missing documentation makes a reader look at
the code. Wrong documentation makes them confidently do the wrong thing.

When a change makes a document wrong: fix it in the same change. If it is no longer needed,
delete it — git remembers.

If you find something stale and cannot fix it now, **say so in the document** with a date.
An acknowledged gap is recoverable; a silent one is not.

---

## Claims language applies to documentation

[ADR-0031](../../../docs/adr/0031-measurement-claims-policy.md) covers docs, comments and
commit messages, not only UI copy.

Do not write "exact", "100% accurate", "perfect match" or "AI-powered" in a document any
more than in a button label. And do not write that a gate passed if you did not run it.
