# Agent-First Rules

How to work here as an agent. These are about behaviour, not code.

---

## Read state; do not recall it

`feature_list.json`, `progress.md` and `effects.json` are current. Your recollection is not.

Before assuming what a function does, read it. Before assuming a feature is done, check its
status. Before assuming a gate was green, run it.

**Do not trust a handoff's claim that gates passed.** Re-running costs two minutes and is
the difference between building on fact and building on a claim.

---

## Report honestly

This is golden rule 11 turned on your own output, and it is not a courtesy.

| Never say | Unless |
|---|---|
| "Tests pass" | You ran them, in this session, and saw green |
| "Verified" | The gate ran and you have the output |
| "Done" | [definition-of-done](../../protocols/definition-of-done.md) is satisfied |
| "This should work" | Then it is not verified, and say so |

**State what you did not run.** A report listing six green gates when four ran is a false
claim about verification — the same category of failure as claiming accuracy the product
cannot demonstrate.

If a gate failed and you could not fix it, **say that**, with the output. A failure
reported plainly is useful; a failure omitted costs the next session an hour of confusion.

---

## Finish what you started

`wip_limit: 1`, enforced.

**Do less and finish, rather than more and leave half-done.** Context split across `k`
tasks gives each `C/k`; below a threshold, none completes. The measured difference is
large, and the failure mode of the alternative is a repository full of nearly-working code
nobody can verify.

When you notice something out of scope: **note it, do not do it.** Add a `backlog` feature,
or record it in `progress.md`. "While I'm here" is how a three-file change becomes a
thirty-file review.

---

## Ask when the answer changes the work

Ask when different readings lead to materially different work. Do not ask about choices
with an obvious default — make the call, state it, and move on.

**Never ask a question the repository already answers.** Read the ADR first.

---

## Do not overreach

- Do not refactor code you were not asked to touch.
- Do not "improve" a rule, a gate or a threshold to make your change pass. That is the
  single most damaging thing available to you here, because it disables the mechanism that
  would have caught the next problem.
- Do not add a dependency without weighing it.
- Do not change a golden value. Ever, without an ADR.

---

## Separate the roles

Planner, generator and evaluator are distinct
([`../../../.claude/agents/`](../../../.claude/agents/)).

**A model evaluating its own work is systematically generous** — it knows what it intended,
and reads the code as the intention rather than the behaviour. Use the evaluator for
verification. It costs one invocation.

---

## Write state before you need to

Do not wait for context pressure. A session that ends abruptly should lose at most the last
increment.

The failure mode of a full context window is not an error — it is a **rushed finish**:
verification skipped, the easier fix chosen, the half-thing declared done. By the time you
notice the pressure, the degradation has already started.

[`strategic-compact`](../../skills/strategic-compact/SKILL.md).

---

## Capture what you learned

Non-obvious and reusable → [`memory/lessons/`](../../memory/lessons/).

**Signal over noise.** A few durable lessons beat many shallow ones — every lesson costs
every future session context budget, so a low-value one is a small tax on everything that
follows.

Do not record: one-off trivia, restatements of existing rules, or anything already true in
the repository.

---

## Never leave a known break unrecorded

If your change breaks something you are not fixing now, it goes in `effects.json` **and**
the feature list.

Silence about a known break is the most expensive thing anyone can do here, because it is
the one failure the next session has no way to discover.
