# Plan: F-171 — The contrast gate reaches the states it has never checked

| | |
|---|---|
| **Feature** | F-171 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-9, NFR-19 |
| **Service / package** | `packages/ui` · `packages/design-tokens` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-09-06 |

> **Written after the audit, and the gate caught that.** Golden rule 3 is plan-before-code and
> this feature's own first acceptance criterion is *audit before anything is changed* — so the
> audit ran first, correctly, and then I started building the rule without coming back here.
> `verify-state` failed on a feature `in_progress` with no plan. The audit's findings are below
> as the input they are, rather than pretended to be a prediction.

---

## Intent

Reported: *"There is some color contrast issue in the app, in many places."* Gate 9 is green.
Those two facts together are the feature: whatever is being seen is outside what the gate
measures, and the answer is to widen the scope rather than to hunt pixels.

## What the audit found

Every rendered text pair, every component and all twenty-odd screens, both themes:

| | lowest measured | floor |
|---|---:|---:|
| large text | 3.35 — `foreground.3` on `background`, 34 px | 3.0 |
| normal text | 6.32 — `foreground.2` on `surface.2` | 4.5 |

**Nothing fails.** One pairing is *undeclared*: `foreground` on `swatch.well`, 546 occurrences,
measuring 13.06 and 15.28.

And that is the real finding. **Nothing had ever looked at a pair.** Gate 9's subject is the
manifest; the conformance suite's subject is one colour at a time. Gate 9's charter already calls
a used-but-undeclared pairing a failure — and nothing could detect *used*, because nothing read
what the components render.

## Approach

**Close the join, while it is green.** A check is cheap to add exactly once: before it has
anything to report.

**Reused:** the conformance registry and its `checkSubject` walk, `resolveColor`, the manifest's
`pairsWith`, and the emitter that already derives `TEXT_TOKENS` from `usage`.

**New:**

- `renderedPairs` in `testing/tree.ts` — walks a tree carrying the nearest painted ground down
  through it, and reports each text node as a (foreground, ground) pair. The ground descends
  through everything; the text style crosses only `Text`, which is the rule `resolveTextNodes`
  already encodes and the one a naive walk gets wrong in the safe-looking direction.
- `DECLARED_PAIRINGS`, emitted from the manifest, symmetric — a pairing is a fact about two
  colours rather than about an order, and the suite meets them the other way round from the way
  the manifest declares them.
- `pair-undeclared`, a conformance rule.

**Increments:**

1. `renderedPairs` + the audit, reported before anything is decided.
2. The emitted pairings.
3. The rule, with its decoys.
4. Declare the one real pairing in the manifest.

## Files to touch

```
packages/ui/src/testing/tree.ts            — renderedPairs
packages/ui/src/testing/conformance.ts     — the pair-undeclared rule
packages/ui/src/testing/index.ts           — the barrel
packages/design-tokens/src/emit/typescript.ts — DECLARED_PAIRINGS
docs/design/design-system.manifest.json    — swatch.well pairsWith foreground
.harness/verification/unreached-tokens.json — the emitted-to-constrain group
```

## Anticipated effects

- **A new emitted binding** ⇒ gate 8's token-reach check, which counts a component as the only
  reader. Guard: it fired immediately; the value joins `TEXT_TOKENS` under *emitted to constrain,
  not to paint*, which is the same kind for the same reason.
- **A new manifest pairing** ⇒ gate 9 now measures it, in both themes and across every CVD
  severity. Guard: gate 9 itself.
- **A rule that reports on every subject** ⇒ every screen and component. Guard: it was run
  against the whole registry before being made to fail, which is how the 546 was counted.

## Test plan

- **Three cases, and the middle one is the point.** A pair no `pairsWith` covers is reported; the
  same tree with a declared ground is **not**; and a pair whose ground is an arbitrary sample is
  passed over rather than guessed at. Without the second, the rule could be reporting every pair
  in the product and the first would still pass.

## Verification

```
node scripts/verify-state.mjs
pnpm verify:ci
```

## Risks and open questions

- **The report is not reproduced.** The audit cannot find what was reported, and the honest next
  step is a screenshot rather than changing colours until something looks different. That is
  recorded as the outstanding attestation.
- **`border` is 8 % alpha.** Its `uncheckedReason` is a correct reading of WCAG 1.4.11 and
  "WCAG does not require it" is not the same claim as "a person can see it". Not changed here —
  changing a token because it might be what somebody meant is the failure mode this feature was
  written to avoid.

## Out of scope

- Placeholders, text over sample colours, and non-text marks. Each is named in the memory note
  with why no pair-check can reach it; none is fixed by this feature.
