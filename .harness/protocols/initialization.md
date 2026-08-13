# Protocol: Initialization

**Trigger:** the start of every session, without exception.

Initialization is its own phase because it and implementation optimise for different
things. Mixed together, infrastructure gets shortchanged in favour of visible code, and the
session proceeds on assumptions it never checked.

---

## Procedure

### 1. Read the manual

[`../../AGENTS.md`](../../AGENTS.md). In full. Not "I remember this project" — you do not,
and the state has probably moved.

### 2. Read the state

| File | For |
|---|---|
| [`../state/progress.md`](../state/progress.md) | The last ~3 entries. What happened, what was verified, what was left |
| [`../state/feature_list.json`](../state/feature_list.json) | What is `in_progress`, and what is eligible next |
| The active feature's plan in [`../plans/`](../plans/) | The approach, and the anticipated effects |

### 3. Read what applies

- The scoped `AGENTS.md` for whatever you are about to touch.
- The [rules](../rules/) for that area.
- Relevant [memory](../memory/) — check [`index.md`](../memory/index.md) rather than
  reading everything.
- The ADRs the feature references.

### 4. Verify the starting state

```bash
node scripts/verify-state.mjs
git status
```

**Both must be clean before you change anything.**

- Gate 0 red on arrival → **fix that first.** Working from a broken state means you will
  not know later whether you caused something.
- An unexpectedly dirty tree → the previous session did not clock out properly. Resolve it
  before adding to it.

### 5. Confirm the environment (when code exists)

```bash
docker compose ps        # backing services healthy
pnpm install --frozen-lockfile
```

---

## The startup readiness test

All four must be true before feature work begins:

| | Can you… | Proof |
|---|---|---|
| **Start** | boot the project by a documented command | it boots |
| **Test** | run the test suite and see it pass | a passing run |
| **See progress** | state what is done and what is next | from files alone |
| **Pick up next** | name the next concrete action and how to verify it | from files alone |

**Any "no" is the first thing to fix**, ahead of whatever you were going to do. A session
that starts without these produces work nobody can verify.

---

## Output

Before touching source, be able to state — in one short paragraph:

```
Feature:      F-0NN — <title>
Requirements: FR-*, NFR-*
State:        <what is done, from progress.md>
Next action:  <the single next step>
Gates:        <which apply to this feature>
Risks:        <anything the plan flags>
```

If you cannot fill that in from files, initialization is not complete. Finish it.

---

## Why this is its own phase

A session that skips initialization will:

- re-decide something already decided, differently, without knowing;
- duplicate work already done;
- work against a plan that has since changed;
- start from a broken state and attribute the breakage to itself;
- miss the effect links that make its change safe.

The cost of initialization is a few minutes. The cost of skipping it is measured in
sessions.
