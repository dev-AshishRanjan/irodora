# Contributing to Irodora

This is a proprietary repository. Contribution is limited to authorised maintainers and
the AI agents working under their direction.

## The one rule that matters

**Read [`AGENTS.md`](AGENTS.md) first, and follow it.** It is not a style guide — it is
the operating manual, and it is binding on humans and agents alike. Everything below is a
pointer into it.

## Before you touch code

1. **Claim exactly one feature** in [`.harness/state/feature_list.json`](.harness/state/feature_list.json).
   The WIP limit is 1 and it is enforced by the `state` gate, not by good intentions.
2. **Write the plan** in [`.harness/plans/`](.harness/plans/) from
   [`TEMPLATE.md`](.harness/plans/TEMPLATE.md). Plan before code is a gate condition, not
   a preference.
3. **Read the rules that apply** to what you are about to touch —
   [`.harness/rules/`](.harness/rules/), plus the scoped `AGENTS.md` in the app or package
   you are working in. More specific wins; nothing local may relax a golden rule.

## Before you call it done

Run the gates in order and stop at the first failure:

```bash
node scripts/verify-state.mjs   # gate 0 — always
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
```

Then satisfy [`definition-of-done`](.harness/protocols/definition-of-done.md) in full.
A feature is done when the gates are green **with evidence recorded**, effects are traced,
and the tree is clean. "It compiles" is not evidence. "I think it works" is not evidence.

## Effects

If you changed a shared contract — a port, an exported type, a package's public API, a
database schema, an HTTP contract, a config schema, or anything in `content/` — run the
[effect-link protocol](.harness/protocols/effect-link.md) before closing. Update
[`effects.json`](.harness/state/effects.json) and its paired memory note.

**A known break must never be left unrecorded.** Fix it now, or file it as a feature.

## Decisions

Any deviation from a documented default needs an ADR in [`docs/adr/`](docs/adr/) via the
[`write-adr`](.harness/skills/write-adr/SKILL.md) skill. Decisions live in files, not in
conversation history and not in commit messages.

## Colour changes are special

Anything touching [`packages/color-*`](packages/) or [`content/`](content/) carries extra
obligations — golden datasets, tolerance budgets, provenance fields, CVD regression. See
[`.harness/rules/color/color-science.md`](.harness/rules/color/color-science.md) and the
[`color-math`](.harness/skills/color-math/SKILL.md) and
[`corpus-entry`](.harness/skills/corpus-entry/SKILL.md) skills.

A change to the colour engine that ships without a golden-dataset update is a defect, even
if every test is green — because the tests are then agreeing with the change rather than
checking it.

## Commits

Conventional Commits. Verified increments only — never commit red. Never push without an
explicit request. See [`commit-policy`](.harness/governance/commit-policy.md).

## Code of conduct

Be precise, be honest about what you have and have not verified, and do not overstate
accuracy. That last one is a product value here, not just a social one.
See [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
