# State

What is true right now. **Authoritative** — a session reads these files rather than
recalling, because recollection is not current and files are.

| File | Is |
|---|---|
| [`feature_list.json`](feature_list.json) | Scope. What exists, what is claimed, what is next |
| [`progress.md`](progress.md) | History. What happened, what was verified, **what was not** |
| [`effects.json`](effects.json) | Consequences. If A changes, B must change too |
| [`schemas/`](schemas/) | The committed schemas both JSON files are validated against |

All four are committed. A harness whose state lives only on one machine is not a harness.

## The rules the `state` gate enforces

**Scope**

- `wip_limit: 1`. One feature `in_progress`, globally.
- Every `blockedBy` is `done` before a feature may be `in_progress` or `done`.
- An `in_progress` feature has a plan file.
- Every feature's requirements exist in the PRD, and every PRD requirement is claimed.

**Effects**

- Every `E-###` has a memory note, and every note is referenced by a link.
- Every referenced path exists on disk, or is explicitly marked `"exists": false`.
- **Every `critical` link names a guard**, or names the feature that will add one.

**Consistency**

- The ADR index matches the ADR files, both directions.
- `gates.json` mirrors the CI workflow.
- Every `IRODORA_*` variable read by config is documented in `.env.example`.
- No scoped harness relaxes a golden rule.
- Every relative link in every governed document resolves.

## Writing to these files

**`feature_list.json`** — claim with `/next-feature`; close per
[definition-of-done](../protocols/definition-of-done.md). Do not edit acceptance criteria to
match what was built; if they were wrong, say so.

**`progress.md`** — append, newest first. Always record which gates ran **and which did
not**.

**`effects.json`** — via [effect-trace](../skills/effect-trace/SKILL.md), together with the
memory note. Never one without the other.

## The reason these are files and not a conversation

A session ends and takes its context with it. A file does not.

Everything here exists so that a fresh agent — or a person, or the same agent with no
memory of yesterday — can reach working context from the repository alone, in under three
minutes.
