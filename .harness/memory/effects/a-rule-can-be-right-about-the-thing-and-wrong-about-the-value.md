# A rule can be right about the thing and wrong about the value

**Effect:** [E-077](../../state/effects.json) · the manifest → the loader, `Swatch`, two design
documents · **high**

## What happened

`radius.swatch: 0` was asserted in four places — the manifest, a **parse-time throw**, a
conformance test named *"is radius 0, at every size, forever"*, and two design documents, one
calling it **inviolable**.

The reporter asked for roundness and authorised the reversal. What made the reversal *possible*
rather than merely permitted is that **the stated reason was about area, not about zero**:

> corner radius removes sampled area from exactly the region the eye uses to judge a flat colour,
> **and the effect grows as the swatch shrinks**

That second clause names the quantity: radius **relative to size**. Which is a ratio. And a ratio
can be bounded.

```
a rounded square loses (4 − π)r²  →  fraction lost = 0.8584 · ratio²
```

| ratio | lost |
| --- | --- |
| 0.125 (shipped) | 1.34 % |
| 0.153 | 2.00 % (the ceiling) |
| 0.42 | 15 % |

## The document argued the other way with its own example

> at 24 px a 10 px radius eats a fifth of the shape

10/24 is a ratio of **0.42**. That is an argument against a *large* corner — and it was read for
five months as an argument against corners.

**The example was the evidence for the reversal, sitting inside the rule it was supporting.**

## What to carry forward

**Restate the guard; do not delete it.** The loader still refuses — on the quantity the original
reasoning actually named — and a decoy asserts it still *accepts* a ratio inside the ceiling, so
the reversal did not quietly become a different absolute rule. A reversal that removes the check
leaves nothing to stop the next person setting `0.5`.

**When a rule cites a reason, the reason is the thing to test the rule against.** "Never round a
swatch" and "never remove much sampled area" look identical while the only radius on offer is
zero. They stop being identical the moment somebody asks for 12px, and the second is the one that
was actually meant.

**Roundness was asked for; the keyline was not.** F-068 measured a single hairline at **1.00
against its own colour** — no edge at all. `swatch-edge.test.ts` is untouched and still passes,
because contrast is per-pixel and indifferent to geometry. A request to soften an interface is not
a request to give up an accessibility guarantee, and reading it as one would have been the easy
mistake.

Related: [[the-last-literal-is-what-keeps-a-scan-honest]],
[[an-unreached-token-is-unfinished-work]]
