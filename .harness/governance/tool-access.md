# Tool Access

Least privilege for agents. Claude Code binding:
[`../../.claude/settings.json`](../../.claude/settings.json).

---

## Principle

An agent should be able to do the work without ceremony, and should not be able to do
damage without a human seeing it first.

The line is drawn at **irreversibility and reach**, not at "how risky it feels".

---

## Allowed without asking

Read anything in the repository · write anything in the repository (git is the undo) ·
run the gates · run tests, typecheck, lint, build · `docker compose` for local services ·
`git status`, `diff`, `log`, `add`, `commit` · read a URL for documentation.

## Requires an explicit request

| Action | Why |
|---|---|
| `git push` | Publication. Triggers CI, notifies people, may deploy |
| Any deploy | Reaches production |
| `pnpm publish` | Irreversible on a public registry |
| Installing a new dependency | A supply-chain decision |
| Editing a golden dataset value | A claim about physical reality — ADR first |
| Editing a gate or a threshold | Changes what "verified" means |
| Editing a golden rule | ADR + human decision |
| Anything touching real user data | Obvious |
| Anything that spends money | Obvious |

## Never

- Force-push shared history.
- `git commit --no-verify` or skip a hook.
- Disable a gate to make a build pass.
- Add a `gitleaks` allowlist entry for a real finding.
- Write a secret anywhere in the repository.
- Modify `.claude/settings.local.json` on someone's behalf.
- Delete `.harness/state/` or `.harness/memory/` content without an explicit instruction.

---

## Why "never disable a gate" is in the never list

It is the single most damaging action available to an agent here.

Every other mistake is visible: broken code fails, a bad commit gets reviewed, a wrong
decision gets found. A disabled gate is **invisible and permanent** — it removes the
mechanism that would have caught the next ten problems, and nothing about the codebase
looks different afterwards.

A gate that is genuinely wrong is changed deliberately, with an ADR
([`policy-model.md`](policy-model.md)).

---

## Destructive operations

Before any destructive action — deleting a file, dropping a table, `rm -rf`, resetting a
volume — **look at the target first.**

`docker compose down -v` drops every local volume, including the database. That is fine and
routine locally. It is not fine anywhere else, and the command is identical.

---

## Network

Reading documentation is fine. **Sending repository content to an external service is
publication** — it may be cached or indexed even if later deleted, and it requires an
explicit request.

---

## Subagents

| Agent | Access |
|---|---|
| **planner** | Read-only. It designs; it does not build |
| **generator** | Read and write source |
| **evaluator** | Read and run gates. **Cannot edit source** — a checker that can fix what it is checking is not independent |
| **color-scientist** | Read, plus golden-data review. Cannot change a golden value |
| **designer** | Read, plus design docs and tokens |
| **security-reviewer** | Read, plus threat-model docs |

The evaluator's write restriction is the whole point of the separation. A model that can
adjust the thing it is grading will, eventually, and the grade stops meaning anything.
