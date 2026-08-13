# Command: handoff

Write the handoff for whoever picks this up next — a different session, a different agent,
or you with no memory of this one.

## Procedure

1. **Run [`checkpoint`](checkpoint.md)** first. A handoff from an unverified state is a
   handoff of an unknown state.

2. **Append to [`progress.md`](../state/progress.md):**

```markdown
## Handoff — YYYY-MM-DD

**Feature:** F-0NN — <title>

**Done:**
- <complete, with evidence>

**In flight:**
- <half-finished, and exactly how far>

**Next action:**
<one concrete step — not a list of options>

**Gates:**
- Ran: state ✓ · typecheck ✓ · test ✓ (142 passed)
- NOT run: e2e, color-golden
- Failing: <none | which, and why>

**Decisions made:**
- <what, and the reasoning>

**Blocked on:**
<a question, a decision, a dependency — or "nothing">

**Watch out:**
<anything surprising; anything that will bite the next session>
```

## The four lines that matter

**"NOT run"** — the one thing a fresh session cannot reconstruct.

**"Next action" as a single step** — "convert `lab.ts` to the new signature, matching
`xyz.ts:42`, then run `pnpm --filter @irodora/color-spaces test`", not "continue the
refactor". A list of options makes the next session re-decide what you already decided.

**"Decisions made"** — compaction destroys reasoning and keeps code. Without this, the next
session re-derives, differently, and now there are two conventions.

**"Watch out"** — the surprises. "The golden test for near-black fails with the pure power
function — the sRGB cutoff is real." That sentence saves an afternoon.

## Do not write

A narrative of the session · anything derivable from the code · speculation · optimism.
"Almost done, just needs a quick test" is how a half-finished feature gets marked `done` by
someone who trusted you.
