# Skills

How to do a particular task here. [Rules](../rules/) say what any solution must satisfy;
skills say how to get there.

## The loop

| Skill | For |
|---|---|
| [add-feature](add-feature/SKILL.md) | **The canonical procedure.** Everything else is a step inside it |
| [plan-feature](plan-feature/SKILL.md) | Write the plan before touching source |
| [verify-gate](verify-gate/SKILL.md) | Run the gates, capture evidence, report honestly |
| [effect-trace](effect-trace/SKILL.md) | Find and record what a change affects |
| [write-adr](write-adr/SKILL.md) | Record a decision so it is not re-litigated |
| [continuous-learning](continuous-learning/SKILL.md) | Capture a reusable lesson |
| [skill-observer](skill-observer/SKILL.md) | Improve the harness when it fails you |
| [strategic-compact](strategic-compact/SKILL.md) | Write state before context pressure |
| [clean-finish](clean-finish/SKILL.md) | End a session recoverably |

## Engineering

| Skill | For |
|---|---|
| [coding-standards](coding-standards/SKILL.md) | The habits that make code production-grade |
| [api-design](api-design/SKILL.md) | Add or change an endpoint |
| [db-migration](db-migration/SKILL.md) | Write a migration that can be rolled back |
| [security-review](security-review/SKILL.md) | Review a change for the failures that happen here |
| [perf-budget](perf-budget/SKILL.md) | Measure against absolute budgets |

## Colour — specific to this product

| Skill | For |
|---|---|
| [color-math](color-math/SKILL.md) | **Add or change colour science correctly** |
| [corpus-entry](corpus-entry/SKILL.md) | Add a colour or palette with provenance |
| [cvd-audit](cvd-audit/SKILL.md) | Verify a colour decision works for CVD users |
| [camera-lab](camera-lab/SKILL.md) | Measure real capture accuracy |
| [measurement-claims](measurement-claims/SKILL.md) | Check that a claim has a measurement behind it |

## Design and frontend

| Skill | For |
|---|---|
| [visual-taste](visual-taste/SKILL.md) | **Avoid generic AI-looking design.** Infer the register, audit before redesigning, pre-flight before shipping |
| [build-ui](build-ui/SKILL.md) | Build a surface that passes the gates, with the type and spacing craft |
| [design-review](design-review/SKILL.md) | Review a design or an implemented surface |
| [contrast-checker](contrast-checker/SKILL.md) | Check contrast properly |
| [i18n-copy](i18n-copy/SKILL.md) | Write copy that works in both locales |

---

## Writing a skill

Frontmatter with `name` and `description`, then the procedure.

**A skill is a procedure, not an essay.** Steps, in order, with the specific traps called
out. If it does not change what someone does, it belongs in a rule or a doc instead.

Keep it current. [`skill-observer`](skill-observer/SKILL.md) exists to catch the case where
a skill's steps no longer match reality — a stale skill is worse than a missing one, because
it is followed.

## Provenance

Several skills are adapted (MIT) from ECC (© Affaan Mustafa) — see
[`NOTICE.md`](../../NOTICE.md). Adapted files say so in their own header. Our principal
adaptation throughout: **memory is written to the repository**, never to a personal agent
store.
