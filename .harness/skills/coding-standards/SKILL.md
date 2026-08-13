---
name: coding-standards
description: The habits that make code here production-grade — before writing, while writing, before finishing.
---

# Skill: coding-standards

Rules: [`engineering.md`](../../rules/common/engineering.md) ·
[`typescript.md`](../../rules/typescript/typescript.md).

## Before writing

**Search.** The utility probably exists. In `packages/` especially — a second
implementation of anything in `color-*` is a defect by definition, because two
implementations of the same maths will eventually disagree and nobody will notice which is
right.

**Read the neighbours.** Match the surrounding code's naming, comment density and idiom.
Code that reads as foreign in its file costs every future reader a moment of "why is this
different?"

**Know your boundaries.** Which package, which module, what it may import. Reaching across
a boundary fails lint — check before you build a design around it.

## While writing

**Types that make illegal states unrepresentable.**

```ts
// No — every consumer must remember to check, and one will not.
interface Result { value?: Color; error?: string }

// Yes — the check is structural.
type Result = { ok: true; value: Color } | { ok: false; error: MeasurementError };
```

**Parse, do not cast.** `as` is a claim the compiler cannot check. Use a schema.

**Handle every error path.** Never swallow. Never return `null` for a failure the caller
cannot distinguish from an empty result. Fail closed on anything security- or
correctness-relevant.

**Bound everything.** Every loop, buffer, query and external call has a limit and a timeout.

**Name precisely — especially in this domain.** `chroma` is not `saturation`. `lightness`
is not `brightness`. `estimated` is not `measured`. A misnamed variable propagates into a
field name, then into a response, then into UI copy, then into a claim we cannot support.

**Comment the why.** The code says what. A comment restating the code ages into a lie.

## Before finishing

- Would a reviewer understand this without asking?
- Does every error path do something a person can act on?
- Are the tests asserting behaviour, or just executing code?
- **Break it deliberately — does a test go red?**
- Did you touch a shared contract? Then [`effect-trace`](../effect-trace/SKILL.md).
- Any dead code, stray `TODO`, or commented block left?

## The specific things that get a change rejected here

| | |
|---|---|
| A colour literal outside the token layer | Lint-enforced |
| A hard-coded user-facing string | Lint-enforced |
| A platform API in `packages/color-*` | Breaks NFR-3 |
| A runtime dependency in `packages/color-*` | Breaks NFR-3 and WASM portability |
| An adjusted golden value | Requires an ADR |
| A meaning carried only by colour | Fails the contrast gate |
| An accuracy claim without a measurement | Fails the claims lint |
| A weakened gate or threshold | The one action with no legitimate use |

## Two habits worth more than the rest

**Reuse before you write.** Most of what feels novel already exists two directories away.

**Verify before you claim.** Run the gate. Then say what you ran, and what you did not.
