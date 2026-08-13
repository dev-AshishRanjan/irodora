# Governance

What requires a decision, whose decision it is, and what it takes to change.

| Document | Covers |
|---|---|
| [policy-model](policy-model.md) | The hierarchy of artefacts and what it takes to change each |
| [adr-policy](adr-policy.md) | When an ADR is required, and what makes one good |
| [commit-policy](commit-policy.md) | Commit cadence, message form, what never goes in |
| [secrets-policy](secrets-policy.md) | Where secrets live, rotation, and what to do on a leak |
| [tool-access](tool-access.md) | What an agent may do freely, what needs asking, what never |
| [content-licensing](content-licensing.md) | Corpus provenance and licensing enforcement |
| [measurement-claims](measurement-claims.md) | What we are allowed to claim about accuracy |
| [release-checklist](release-checklist.md) | The human gate before production |

## The three decisions an agent may not make alone

1. **Changing a golden rule.** ADR plus a human decision.
2. **Changing a gate, a threshold, or a golden dataset value.** These change what
   "verified" and "correct" mean.
3. **Deciding that an accuracy claim is justified.** That judgement is kept out of the loop
   that has an incentive to make it.

## The one action with no legitimate agent use

**Disabling a gate to make a build pass.**

Every other mistake is visible: broken code fails, a bad commit gets reviewed, a wrong
decision gets found. A disabled gate is invisible and permanent — it removes the mechanism
that would have caught the next ten problems, and nothing about the codebase looks
different afterwards.
