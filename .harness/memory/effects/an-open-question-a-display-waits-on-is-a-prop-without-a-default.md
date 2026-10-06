# E-170 — An open question a display waits on is a prop without a default

**Link:** the answers still owed — the green the proximity verdict takes (F-245's mint, C10), the
radar's ink (OQ-24, F-260) and its axes (OQ-25, F-260), the metric figure's step (OQ-13) →
`ProximityHeadline.ink`, `Radar.ink` and `axes`, `MetricTile`'s figure step
**Guard:** the `@ts-expect-error` cases that refuse an ink outside the neutrals (`charts.test`), and
`c10-exceptions.test` when a token is minted **Severity:** medium **Feature:** F-235

---

## Why B changes when A does

A display built before its question is answered must not answer it by default. So each such prop is
required and typed to what exists today: the headline's and the radar's ink take `foreground` or
`foreground.2`, and a caller passes one. When F-245 mints the verdict green, or F-260 answers OQ-24,
the type widens by one token and the caller passes it — the component does not change shape, and
`c10-exceptions.test` moves the element from an exception to a token group.

The metric tile's figure is **not** a prop: it is the recorded `title` (R9 §2's snap), and `22` draws
it at 45–47 dp, which is OQ-13's. If OQ-13 adds a step, that is a code change to the tile's one
`size` — and until then the drawn "large figure" is a visible gap, within §2's snap.

Three questions F-235 met were decided there, on the person's delegation, and are no longer
props: the delta bars' scale and ink (OQ-50) and their notation (OQ-51), in ADR-0119; the page dots'
second channel and small dot (OQ-52), in ADR-0120.

Related: [[chroma-a-mockup-draws-before-a-token-exists-is-declared-by-element]], [[oq-47s-answer-is-data-not-code]]
