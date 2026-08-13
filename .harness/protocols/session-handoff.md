# Protocol: Session Handoff

**Trigger:** work continues in another session, with another agent, or with a human.

The receiving session has **no memory of this one**. Everything it needs is in files or it
is lost.

---

## The metric

**Rebuild cost** — how long a fresh session takes to reach a state where it can do useful
work.

A good harness compresses this from ~15 minutes of reconstruction to ~3 minutes of reading.
That difference compounds across every session for the life of the project.

---

## Write it into `progress.md`

```markdown
## Handoff — YYYY-MM-DD

**Feature:** F-0NN — <title>

**Done:**
- <what is genuinely complete, with evidence>

**In flight:**
- <what is half-finished, and exactly how far>

**Next action:**
<the single next concrete step — not a list of options>

**Gates:**
- Ran: state ✓ · typecheck ✓ · test ✓ (142 passed)
- NOT run: e2e, color-golden
- Failing: <none | which, and why>

**Decisions made:**
- <anything non-obvious, and the reasoning>

**Blocked on:**
<a question, a decision, a dependency — or "nothing">

**Watch out:**
<anything surprising discovered; anything that will bite the next session>
```

---

## The four lines that carry the most value

**"NOT run".** The one thing a fresh session cannot reconstruct, and the one most likely to
be assumed away. It is golden rule 11 applied to handoff: report what you did not verify.

**"Next action" as a single step.** Not "continue the refactor". *"Convert `lab.ts` to the
new signature, matching `xyz.ts:42`, then run `pnpm --filter @irodora/color-spaces test`."*
A list of options makes the next session re-decide what you already decided.

**"Decisions made".** Compaction destroys reasoning and keeps code. The next session sees
*what* you did and has no idea *why* — so it re-derives, differently, and now there are two
conventions.

**"Watch out".** The surprises. "The golden test for near-black fails if you use the pure
power function — the sRGB cutoff is real." That sentence saves an afternoon.

---

## What not to write

- **A narrative of the session.** Nobody needs the journey; they need the state.
- **Anything derivable from the code.** They can read the code. Write what the code does
  not say.
- **Speculation.** "Maybe we should also…" belongs in the feature list, not the handoff.
- **Optimism.** "Almost done, just needs a quick test" is how a half-finished feature gets
  marked `done` by someone who trusted you. Say what is actually true.

---

## Receiving a handoff

1. Run [initialization](initialization.md) in full — including verifying the starting
   state. **Do not trust the handoff's claim that gates were green.** Re-run them; it costs
   two minutes and it is the difference between building on fact and building on a claim.
2. Read the handoff, then the plan, then the code — in that order.
3. If the handoff is unclear or contradicts the state, **say so** rather than guessing.
4. If the handoff says `⚠ NOT CLEAN`, resolve that before adding to it.
