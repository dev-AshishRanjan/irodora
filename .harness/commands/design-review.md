# Command: design-review

Review a design or an implemented surface.

## Procedure

Follow [`design-review`](../skills/design-review/SKILL.md). Review in order; a failure at
level 1 stops the review.

1. **Hard constraints** (C1–C12 in
   [`DESIGN-BRIEF.md`](../../docs/design/DESIGN-BRIEF.md)) — any violation is a blocker.
2. **Brand** — precise, honest, calm, editorial, accessible, unisex. And nothing from
   [`BRAND.md` §4](../../docs/design/BRAND.md#4-what-the-brand-is-not).
3. **Usability** — hierarchy, density, consistency, all states designed.
4. **The three flows** — A (60 seconds to first value), B (profile setup that feels like
   looking at fabric), C (CVD check that reads as an instrument, not a diagnosis).
5. **The test that matters** — put a real garment colour on screen inside this interface.
   Can you judge it accurately?

For an implemented surface, also run:

```bash
pnpm test:a11y && pnpm test:contrast && pnpm test:perf
```

## Reporting

**Lead with blockers**, then significant issues, then polish — and label which is which. A
review that mixes a contrast failure with a spacing preference gets both treated as
preferences.

**Be specific.** "The confidence badge sits below the hex value; it should precede it, so
the reading is framed before it is read" beats "confidence should be more prominent".

**Say what works.** A review that only lists problems gives no signal about what to
preserve, and the next iteration loses the good parts.
