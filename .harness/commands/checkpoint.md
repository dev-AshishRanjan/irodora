# Command: checkpoint

Leave a clean, recoverable state.

## Procedure

1. **Verify**

```bash
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

Green — **including the tests that were passing before you started.**

2. **Record progress** in [`progress.md`](../state/progress.md):

```
## YYYY-MM-DD — F-0NN <title>

Done:       <complete, with evidence>
In flight:  <half-finished, and how far>
Gates:      <ran: … / NOT run: …>
Decisions:  <what, and why>
Next:       <the single next concrete action>
```

3. **Update state** — `feature_list.json` status; effects traced if a contract moved;
   lessons captured.

4. **Remove scaffolding** — debug logging, commented-out code, stray `TODO`, temporary
   files, unexplained suppressions.

5. **Git** — clean, or intentionally staged with the intent recorded. Commit verified
   increments. **Never push without being asked.**

6. **Confirm the start path** still works from a clean clone.

Full detail: [`clean-finish`](../skills/clean-finish/SKILL.md).

## If you cannot get clean

Mark it, precisely:

```
## Handoff — YYYY-MM-DD  ⚠ NOT CLEAN

State:     <what is mid-change>
Broken:    <what fails, and why that is expected>
Next:      <the exact next step>
Do NOT:    <what would make it worse>
```

**An honestly-described mess is recoverable. A silently-broken tree is not.**
