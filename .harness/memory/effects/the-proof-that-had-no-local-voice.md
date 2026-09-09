# The proof that had no local voice

**Effect:** [E-124](../../state/effects.json) · `scripts/plant-proof.mjs` → `package.json` ·
the `lint` chain · **high**

## What happened

CI went red on a check that had been red for two days:

```
BAD every proof that writes into the tree uses the journal:
    verify-dead-exports · verify-layout-primitives-proof
    verify-reachability · verify-surface-not-card-proof
```

Four scripts, from four features — F-179, F-183, F-203, F-210 — and every one of those features
reported a green local run **truthfully**.

`scripts/` holds six proofs. Five ride inside the `lint` chain. `plant-proof.mjs` was the one
that did not: a CI step of its own, and no local command anywhere.

## Two defects, and they need different fixes

**The symptom** is four missing declarations. `plant-proof.mjs` asks the source whether anything
matching `writeFileSync|cpSync|copyFileSync|unlinkSync|rmSync` either journals or is declared
with a reason. All four write **only** into `mkdtempSync(join(tmpdir(), …))` and remove it, so
the journal has nothing to protect — the same reason `verify-motion`, `verify-app-imports` and
`verify-engine-purity` were already declared. Four entries, each naming the feature it came from.

**The cause** is that nothing local ran it. Without fixing that, the next temp-dir proof does
this again — and the list is hand-maintained *precisely because* the rule over-collects on
purpose. So the proof joins the lint chain beside the other five.

## What was deliberately not done

Make the regex cleverer. Its docblock records the trade in its own words: *"Being wrong in that
direction costs an entry in the list below, with a reason; being wrong in the other costs the
guarantee."* An auto-detector inferring *"this one only touches `tmpdir`"* is exactly the guess
that costs the guarantee — and weakening a recorded decision to turn my own commit green is the
wrong trade twice over.

## What guards it now

The four entries were **watched discriminating**: one was removed, the proof went red *and named
the file*, and the source was restored byte for byte and verified. Four entries added beside a
fix pass for two reasons that look identical.

The gate-mirror proof still reports 14 active gates mirrored, so running the script in both
places is not a conflict.

## The part that can go wrong quietly

**Nothing asserts that a sixth proof will not appear the same way.** This closes the one that had
no local voice; it does not check that every future proof has one. That is a real gap and it is
named rather than implied.

## The general shape

When the same omission recurs across unrelated features, stop reading it as a run of mistakes.
Ask **where the check speaks**, and whether that is anywhere the author is listening.

Related: [[a-check-that-only-speaks-in-ci-is-a-check-four-features-walk-past]],
[[a-gate-correct-on-one-operating-system-by-accident]]
