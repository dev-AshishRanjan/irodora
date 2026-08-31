---
kind: effect
title: The warm/cool rule is written twice, and the reason is a toolchain, not a decision
category: contract
confidence: 0.9
created: 2026-08-26
scope: [packages/recommendation, apps/mobile]
links: [[sampling-lives-in-the-engine-not-the-platform]], [[the-capture-ceiling-is-now-a-profile-confidence]], [[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
---

# E-038 — two implementations of one colour rule, carried deliberately and visibly

**`packages/recommendation/src/score.ts#hueBias` → `apps/mobile/src/profile/photo.ts`**

## What is duplicated

How warm a hue is, as a signed value in [-1, +1] measured between two reference poles:

| | |
|---|---|
| `hueBias(hue, poles)` | the engine's, poles supplied by the **rule set** |
| `biasFromHue(hue)` | the app's, poles as module constants `60` and `240` |

Same maths, same constants, written two features apart (F-027, then F-028) by the same
reasoning. **Both pass their own tests.**

## Why this is the shape E-008 exists to prevent

[[sampling-lives-in-the-engine-not-the-platform]] states it exactly: a second implementation
makes the same input measure differently on two surfaces, and **no single-platform test can see
it**. The app's tests assert the app's answer; the package's tests assert the package's. Nothing
compares them, and nothing will, because there is no place both are in scope.

Here the drift has a predictable direction, which is worth writing down: the engine's poles are
a **rule-set field**, so they are content and F-029 will version them. The app's are literals.
The first time an editor moves the warm pole, the app will not move with it — and the profile a
person builds from a photograph will disagree with the score the engine gives them, with every
gate green.

## Why the guard is `none` rather than something that looks like one

The fix is one line — the app imports the engine — and **it cannot be written**:
`apps/mobile/node_modules/@irodora/` has no `recommendation` link, and `pnpm install` refuses on
this workstation (Node 22.16.0 against engines demanding 24.19.0).

Two guards were considered and rejected, both for the same reason:

- **A cross-package agreement test.** The app's file imports the corpus bundle, so a package
  test importing it would pull app dependencies across a layering boundary to check two numbers.
- **Scraping the constants out of the source.** It would compare two literals while the
  *algorithms* drifted — the half that actually matters — and would report green while doing it.

A check whose model is wrong is worse than an absent one, and the graph exists to carry the
checks we owe rather than the ones we can fake. `guard: none` is what gate 0 warns on, and the
warning is the point.

## What closes it

**F-099**, the day the app can depend on `@irodora/recommendation`. That is downstream of the
Node upgrade, like most things here.

---

## Resolved by F-099 — and the toolchain was not what unblocked it

This note's title says the reason was a toolchain rather than a decision, and the feature's own
entry said **"DO IT ON THE PINNED TOOLCHAIN"**. Neither turned out to be the thing that mattered.

The objection was that adding a workspace dependency here needs a hand-made junction in
`node_modules`, and that a junction is *"the workaround that hid a stale lockfile for four
features"*. True when it was written. **F-098 closed it**: gate 0 section 7b mirrors pnpm's own
rule and compares every manifest against `pnpm-lock.yaml` before install, on Node built-ins, on
a clean clone — precisely so somebody who cannot run pnpm can still be told the lockfile is
stale.

So the procedure is now four steps, and the second one is the point:

1. add `@irodora/recommendation` to `apps/mobile/package.json`
2. **watch gate 0 go red** — *"pnpm-lock.yaml does not resolve @irodora/recommendation@workspace:\*"*
3. hand-write the importer entry; watch it go green
4. `mklink /J` the junction

The hazard the note warned about is now the thing that is checked. **A blocker recorded against
a state of the world outlives that state**, and the entry that records it is not automatically
revisited when the world moves — this one sat as `backlog` through the whole of the feature that
removed its reason.

## What replaced the duplication

`biasFromHue`, its private `hueGap`, and the `WARM_HUE` / `COOL_HUE` literals are deleted. The
app calls `hueBias` from the engine, against `ruleSet().poles` — the published weight set,
reaching the app as a generated module with the **ledger's** digest beside it, exactly like the
phrase lexicon. Both halves were needed: the same function, and the same two reference hues.

The test that replaced the old one sweeps 180 degrees rather than checking three points. Three
points is what a second copy passes; it is what both copies passed for two features.

## What this did NOT fix

`hueBias` still reports a grey at C = 0.012 as more warm than the most saturated red in the
corpus — [[a-hue-angle-on-a-near-neutral-is-a-rounding-artefact]], and **F-101** owns it.
Deliberately not folded in: changing what the answer *is* in the same commit that changes where
it *comes from* leaves nobody able to say which one moved a number. There is now one place to
fix instead of two, which is the whole return on this feature.

## This link was E-032 until F-102

**If you found `E-032` in an old entry and it was about the warm/cool rule, this is the link.**

F-098 allocated `E-032` to the `pnpm-workspace.yaml` → lockfile link at 09:22:54 on
2026-08-26. F-028 allocated it a second time, to this link, at 09:46:43 — twenty-four minutes
later, on the same day, by two features that never saw each other's write. Nothing checked,
because an id is the graph's primary key and JSON Schema has no unique-by-property constraint.

The cost was not tidiness. Gate 0 warned *"E-032 (high) has no guard"* while one E-032 named a
proven guard and the other honestly named none — so the warning was right and wrong at once,
with no way to tell which link it meant. F-099 resolved this link **by `from.ref` rather than
by id**, because resolving by id would have been a coin toss.

The first allocation keeps the id; this link became **E-038**. Gate 0 now fails on a duplicate
effect id, and `scripts/verify-effect-id-proof.mjs` is what keeps that check honest.

`progress.md` and the plans in `.harness/plans/` were **not** rewritten. They are history, and
history said E-032. This paragraph is the mapping they point at.
