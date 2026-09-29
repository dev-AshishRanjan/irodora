# E-161 — Text on a sample is measured, whatever chose its ink

**Link:** `sampleInk` / `sampleEdge` → the conformance rules `sample-ink` and `colour-literal` →
gates 8 and 9 **Guard:** `sample-ink.test.tsx`; the Text-on-a-sample, Swatch, Strip and
FabricSwatch subjects **Severity:** medium **Feature:** F-233

---

## Why B changes when A does

`pair-undeclared` skips a pair whose ground is not a token, and text on a colour sample is exactly
that. So text on a sample went unmeasured until F-233 added `sample-ink`: the text's colour against
the declared sample it sits on, at 4.5:1, whatever chose it.

A moved ink or line is no token by construction. `colour-literal` exempts it BY VALUE, derived from
the declared samples through `sampleInk` and `sampleEdge`: the same polarity as `sampleValues`,
never a blanket pass. Change either function and the exempt set moves with it.

## How to check

The rule's three cases, each with its decoy: silent for `on={sample}`; a token ink failing on
`#87795D` reported in every palette; an undeclared ground left to `colour-literal`.

Related: [[a-colour-drawn-against-a-sample-moves-per-sample]], [[two-thorough-checks-and-neither-looked-at-a-pair]].
