# Engineering Rules

Applies everywhere.

---

## Production-grade means

**No toy code. No proof-of-concept. No "we'll fix it later".** If it ships, it is
production. If it should not ship, it should not be merged.

Concretely, every unit of code is:

- **Typed** — no `any`, no unchecked cast, no lying to the compiler.
- **Tested** — the behaviour is asserted, not merely executed.
- **Handled** — every error path is a decision, not an omission.
- **Bounded** — every loop, buffer, query and external call has a limit.
- **Observable** — a failure produces something a person can act on.

---

## Reuse before you write

**Search first.** The utility probably exists. In `packages/` especially — a second
implementation of anything in `color-*` is a defect by definition, because two
implementations of the same maths will eventually disagree and nobody will notice which is
right.

When you do write something new, put it where it belongs: shared logic in a package, not
copied into two apps.

---

## Small, verifiable increments

Keep the build green **between** increments, not only at the end. A green build is a place
you can return to; a red one is not.

**No unrelated refactors.** Notice, note, move on. "While I'm here" turns a three-file
change into a thirty-file review nobody can assess, and it hides the actual change inside
noise.

---

## Boundaries are real

- Package boundaries are lint-enforced. Import the entry point, never an internal path.
- Module boundaries are package boundaries, enforced by `lint`. Cross-package access goes
  through a declared interface.
- **`packages/color-*` may not import a platform API.** No `node:*`, no DOM, no `process`.
  This is what makes NFR-3 achievable.
- Dependency direction is one-way. Apps depend on packages. **No package imports an app.**

---

## Errors

```ts
// No.
catch (e) { console.log(e); return null; }

// Yes.
catch (error) {
  logger.error({ error, colorSlug }, 'corpus lookup failed');
  throw new CorpusLookupError(`No entry for "${slug}"`, { cause: error });
}
```

- **Never swallow.** Handle it, or let it propagate with context.
- **Never return `null` for an error condition** that the caller cannot distinguish from a
  legitimate empty result.
- **Fail closed** on anything security- or correctness-relevant. A missing tenant context
  raises; it does not return every row.
- **Message an audience.** Say what failed, why it matters, and what to do next.

---

## Configuration

- All configuration through the validated schema in `@irodora/config`. No stray
  `process.env` reads.
- **Fail fast at boot** on missing required configuration. A service that starts and then
  fails on the first request is worse than one that refuses to start.
- Every new `IRODORA_*` variable goes in `.env.example`. The `state` gate checks it.
- No secret in code, in a comment, in a test fixture, or in a log.

---

## Dependencies

Adding one is a decision with a cost. Before you do:

- Is it in the workspace already?
- Can this be twenty lines we own?
- Licence — permissive is fine; copyleft is not (see [`../../../NOTICE.md`](../../../NOTICE.md)).
- Maintenance, size, transitive footprint, install scripts.

**`packages/color-*` take no runtime dependencies at all.** That is not a guideline.

---

## Performance

- **Measure before optimising.** Then measure after.
- Budgets are absolute and committed ([PRD NFR-4](../../../docs/PRD.md#6-non-functional-requirements)).
- No allocation in an inner loop in the engine. Typed arrays, precomputed matrices.
- **Never optimise before the behaviour is verified.** Optimising unverified code moves the
  boundary between what is known-correct and what is not, in the wrong direction.

---

## Comments

Explain **why**, never **what**. The code says what.

```ts
// No.
// Convert to linear RGB
const linear = toLinear(srgb);

// Yes.
// Averaging must happen in linear light: averaging non-linear sRGB is the
// single most common colour bug there is, and it always reads too dark.
const linear = toLinear(srgb);
```

A comment that restates the code is a maintenance liability — it goes stale, and then it
lies.
