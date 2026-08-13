# Command: color-audit

Audit a colour engine or corpus change for correctness, accessibility and honesty.

## Procedure

### 1. Correctness

```bash
pnpm test:golden      # against published reference data
pnpm test             # unit + property
```

- [ ] Golden datasets updated, **or explicitly confirmed unchanged**. Changed → ADR.
- [ ] Property tests: round-trip · symmetry · monotonicity · bounds · hue wrap ·
      idempotence.
- [ ] Oracle cross-validation against `culori` and `colorjs.io`.
- [ ] **Cross-platform identity** — Node, browser, React Native, bitwise identical.

> If a golden test fails after your change, the default assumption is that you broke the
> engine.

### 2. Constraints

- [ ] No runtime dependency added to `packages/color-*`.
- [ ] No `node:*`, no DOM global, no `process`.
- [ ] `float64` throughout; no approximated transcendentals.
- [ ] Averaging happens in **linear light**.
- [ ] Hue interpolation takes the short arc.

### 3. Accessibility

```bash
pnpm test:cvd
```

[`cvd-audit`](../skills/cvd-audit/SKILL.md). Does anything depend on distinguishing colours
whose separation this change affects?

### 4. Content

```bash
pnpm test:content
```

- [ ] Every entry has complete provenance.
- [ ] Classification correct; our own curation labelled as ours.
- [ ] Derived values computed by the engine, not typed.
- [ ] Author and reviewer are different identities.

### 5. Effects

Did a conversion change? Then **every precomputed corpus value is invalid**
([E-001](../state/effects.json)). Rebuild the corpus.

Run [`effects`](effects.md).

### 6. Honesty

[`measurement-claims`](../skills/measurement-claims/SKILL.md). Check copy, comments and
variable names. No "exact", no "measures" for an estimated source, no number without a row
in the colour-lab results.

## Reporting

```
Engine:     <what changed>
Golden:     <unchanged | updated, with the ADR>
Property:   ✓  Oracles: ✓  Cross-platform: ✓
CVD:        <separation impact>
Corpus:     <rebuild needed? done?>
Claims:     <any language change required>
Effects:    <links updated>
```
