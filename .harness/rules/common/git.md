# Git Rules

Policy: [`../../governance/commit-policy.md`](../../governance/commit-policy.md) ·
[ADR-0024](../../../docs/adr/0024-ci-cd-github-actions-trunk-based.md).

---

## Trunk-based

`main` is always releasable. Short-lived branches, small merges.

```
feat/F-006-color-spaces
fix/F-096-sync-tombstone-expiry
docs/adr-0032-billing-provider
```

Branch protection: required checks green · one review · linear history · no force-push.

---

## Commit verified increments only

**Never commit red.** A commit is a point someone can return to; a red one is not.

Before committing: the gates that apply to what you changed are green, and the evidence is
in `progress.md`.

**Never push without being asked.** Committing is local bookkeeping; pushing is
publication.

---

## Conventional Commits

```
<type>(<scope>): <subject>

<body — WHY, not what>

Refs: F-0NN
```

Types: `feat` · `fix` · `docs` · `refactor` · `test` · `chore` · `perf` · `build` · `ci`.

```
feat(color-spaces): implement sRGB ↔ XYZ with the linear-segment cutoff

The pure power function is visibly wrong below 0.04045, and dark colours
are half this corpus — indigo, sumi and charcoal. Golden set extended with
near-black values that fail against a pure-power implementation.

Refs: F-006
```

**The body explains why.** The diff shows what.

---

## Commit size

One logical change. A commit that needs "and" in its subject is two commits.

Never mix: a refactor with a behaviour change · a formatting sweep with logic · two
features · a dependency bump with anything else.

**A reviewer who cannot see the change inside the noise will approve the noise.**

---

## Never commit

- A secret. `gitleaks` is the check; your memory is not.
- A generated artefact that is gitignored — `node_modules`, `dist`, `ios/`, `android/`,
  terraform state.
- A commented-out block. Git remembers.
- A debug statement.
- A `TODO` with no tracked feature.
- A `.env`.

---

## Always commit

- `.harness/` **in full** — state, memory, plans. It is the system of record.
- `docs/`, including ADRs.
- `.claude/` except `settings.local.json`.
- `content/` schemas and entries.
- Lockfiles.
- The generated bundles — the corpus, the rules and the taxonomy modules under
  `apps/mobile/src/*/generated/`, the design tokens, and the Noto subset. A generated file that
  is committed is one a reviewer can diff; one that is built at install time is a change nobody
  sees. Every one of them has a `--check` mode that a gate runs.

---

## Golden data and content

`.gitattributes` marks `content/**/*.json` and `packages/**/golden/**` as `-merge`.

**A conflict there means two changes disagree about physical colour truth.** That must be
resolved by a person who understands both, never by an automatic merge strategy.

---

## History

Rebase to tidy your own unpushed branch. **Never rewrite shared history.**

Revert with `git revert`, not by force-pushing a rewritten branch. A revert is a fact in
the history; a rewrite is a fact removed from it.
