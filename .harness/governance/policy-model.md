# Policy Model

What kind of thing each artefact is, and what it takes to change it. Without this, everyone
invents their own hierarchy and the strongest-sounding document wins.

---

## The hierarchy

```
Golden rules            AGENTS.md §1        Changing one requires an ADR and a human decision
      ▲
ADRs                    docs/adr/           Superseded by a new ADR, never edited away
      ▲
Rules                   .harness/rules/     Changed deliberately; an ADR if a golden rule is touched
      ▲
Protocols               .harness/protocols/ Changed deliberately; recorded in progress.md
      ▲
Skills                  .harness/skills/    Improved freely; the skill-observer captures why
      ▲
Plans                   .harness/plans/     Per feature; revised as understanding improves
```

**Higher wins.** A skill that contradicts a rule is a broken skill. A rule that contradicts
a golden rule is a broken rule.

---

## The types

| Type | Answers | Binding? | To change |
|---|---|---|---|
| **Golden rule** | What is never done here | Absolutely | ADR + human decision |
| **ADR** | Why we chose this | Historically | A new ADR that supersedes it |
| **Rule** | What any solution must satisfy | Yes | Deliberately; ADR if it touches a golden rule |
| **Protocol** | What happens at this moment | Yes | Deliberately; recorded |
| **Skill** | How to do this task | Guidance | Freely, with the reason captured |
| **Plan** | How this feature will be built | Per feature | Revise as you learn |
| **Memory** | What happened, what we learned | Reference | Append; supersede when wrong |
| **State** | What is true right now | Authoritative | Continuously, by the loop |

---

## Scope precedence

Global applies everywhere. Scoped harnesses (`apps/*/AGENTS.md`,
`packages/color-core/AGENTS.md`, `content/AGENTS.md`) **extend** it.

**More specific wins on conflict — but nothing may relax a golden rule.** The `state` gate
scans scoped rules for weakening language against the golden-rule list, so a scoped
"exception to golden rule 4" fails the build.

A scope may be **stricter**. `packages/color-core` is, deliberately.

---

## What needs an ADR

- Any deviation from a documented default.
- Choosing between technologies.
- Anything that constrains future work.
- **Changing a golden dataset value** — that is a claim about physical reality.
- Changing a verification gate or a committed threshold.
- Anything a reasonable engineer might otherwise re-litigate in six months.

## What does not

- Implementation detail inside an established pattern.
- Something already decided by an existing ADR.
- A reversible choice with no downstream constraint.

**When unsure, write it.** A short ADR costs twenty minutes. Re-deriving a decision from
scratch, differently, costs a week and produces two conventions.

---

## Changing a gate or a threshold

The most sensitive change in this repository, because it alters what "verified" means.

1. An ADR: what is changing, why, what stops being caught.
2. Recorded in `progress.md`.
3. **Never as a side effect** of making a failing build pass. That inverts the entire
   purpose of the mechanism.

> A missed budget is a tracked work item, never an edited threshold.

---

## When two documents conflict

1. Check the hierarchy — higher wins.
2. Same level? **The more specific scope wins.**
3. Still ambiguous? That is a defect in the policy model. Resolve it, record the
   resolution, and fix whichever document was wrong.

Do not silently pick one. The next person will pick the other.
