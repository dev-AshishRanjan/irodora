# Commit Policy

Rules: [`../rules/common/git.md`](../rules/common/git.md).

---

## The cadence

**Commit at every verified increment.** Not at the end of a session, not when the feature
is complete — whenever the build is green and a logical unit is done.

A commit is a point you can return to. Long gaps between commits mean long stretches of
work with nothing to return to.

---

## Two hard rules

### Never commit red

The gates that apply to what you changed are green, and the evidence is recorded, before
you commit.

A red commit on `main` blocks everyone, and a red commit on a branch is a landmine for
whoever bisects through it later.

### Never push without being asked

Committing is local bookkeeping. **Pushing is publication** — it triggers CI, notifies
people, and may deploy.

The agent commits. The human decides when it goes out.

---

## What a commit contains

**One logical change.** If the subject needs "and", it is two commits.

Never mixed: a refactor with a behaviour change · formatting with logic · two features · a
dependency bump with anything else.

A reviewer who cannot see the change inside the noise will approve the noise. That is not a
reviewer failure; it is a commit failure.

---

## Message

```
<type>(<scope>): <subject>

<body — WHY>

Refs: F-0NN
```

The body explains **why**. The diff shows what. In six months the why is the only part
anyone needs and the only part that is gone.

For a colour engine change, the body says what golden data was checked:

```
fix(color-difference): correct the Rt sign in CIEDE2000

Pairs 17, 23 and 31 of the Sharma-Wu-Dalal set bracket the ±180° hue
discontinuity and were failing by ~0.4 ΔE. The rotation term's sign was
inverted for hue differences above 180°.

Golden set unchanged — the reference values were correct; we were not.

Refs: F-007
```

That last line matters. It says explicitly that we did not "fix" the test.

---

## Never in a commit

A secret · a generated artefact that is gitignored · a commented-out block · a debug
statement · a `TODO` without a tracked feature · a `.env`.

`gitleaks` runs on every push. **A finding rotates the secret**; it does not earn an
allowlist entry.

---

## Always in a commit

`.harness/` **in full** — state, memory, plans. It is the system of record, and a harness
whose state is not committed is a harness that only exists on one machine.

Also: `docs/` including ADRs · `.claude/` except `settings.local.json` · `content/` ·
lockfiles · the generated `openapi.json`, so contract diffs are visible in review.

---

## Reverting

`git revert`. Never a force-push over shared history.

A revert is a fact in the history. A rewrite is a fact removed from it, and the person
debugging next month needs the fact.
