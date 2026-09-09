# A check that only speaks in CI is a check four features walk past

**Date:** 2026-09-09 · **Found in:** F-216

`plant-proof.mjs` went red in CI:

```
BAD every proof that writes into the tree uses the journal:
    verify-dead-exports · verify-layout-primitives-proof
    verify-reachability · verify-surface-not-card-proof
```

Four scripts, added by four different features — F-179, F-183, F-203, F-210 — over two days.
Each of those features reported a green local run, and each was **telling the truth**.

## Why

`scripts/` holds six proofs. Five of them ride inside the `lint` chain. `plant-proof.mjs` was the
one that did not: it had a CI step of its own and no local command anywhere.

```
in the lint chain   gate-mirror · e2e-flows · blocked-reason · layout-primitives · surface-not-card
CI only             plant-proof                                        ← the anomaly
```

So the check has been red since 2026-09-08 and nothing an author ran ever said so.

**Four authors in a row is not four careless authors.** It is a check that cannot be heard from
where the work happens, and the fourth author was me — twice, since F-210 added a violator and
F-215 edited one without noticing.

## The two fixes are not the same fix

**The declarations** are the fix for the *symptom*. All four write only into
`mkdtempSync(tmpdir())` and remove it; the journal has nothing to protect, and three other
scripts were already declared for exactly that reason.

**Running it locally** is the fix for the *cause*. Without it, the next temp-dir proof does this
again — and the list is maintained by hand precisely because the rule over-collects on purpose.

## What I deliberately did not do

Make the regex smarter. Its own docblock records the trade: *"Being wrong in that direction costs
an entry in the list below, with a reason; being wrong in the other costs the guarantee."* An
auto-detector inferring "this one only uses `tmpdir`" is the guess that costs the guarantee, and
weakening a recorded decision to make my own commit green is the wrong trade.

## The general shape

When the same omission recurs across unrelated features, stop reading it as a run of mistakes.
Ask **where the check speaks**, and whether that is anywhere the author is listening. A gate is
only as good as the shortest loop that carries its verdict back.

And the specific audit worth repeating: *does every proof in this repository run somewhere a
person will see it before pushing?*

[[a-pipe-hides-the-exit-code-that-decides-the-commit]]
