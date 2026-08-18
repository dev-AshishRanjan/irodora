# ADR-0049 — Warm and cool are a stated convention, anchored to the corpus taxonomy

## Status

Accepted

## Date

2026-08-18

## Context

FR-6 lists `warm/cool` among the harmonies the engine must generate. Every other generator in
that list is derivable: a triad is 120°, a complement is 180°, monochromatic varies lightness.
**Warm and cool are not.** There is no angle in OKLCh where warmth begins.

The received convention puts warm around orange-red and cool around blue-cyan, but the boundary
is a cultural and editorial judgement, and published sources disagree about where it falls —
particularly for greens and magentas, which sit near both boundaries and get sorted differently
depending on who is sorting.

The decision is forced because **the corpus already commits to an answer**.
`taxonomy.temperature` is a required field on every entry, valued `warm | cool | neutral`, and
F-012 will classify each colour by it. If the harmony engine picked its own anchors, the product
would contradict itself: a colour the corpus labels warm could land on the cool side of a
`warm-cool` harmony generated from it.

## Decision

**`WARM_HUE = 55` and `COOL_HUE = 245`, in OKLCh degrees, as named exported constants — and they
are the same convention `taxonomy.temperature` uses.**

1. **They are a convention, not a measurement**, and the code says so. No study produced them;
   they are the centres of the received warm (orange-red) and cool (blue-cyan) regions.
2. **They are anchors, not a boundary.** `warm-cool` returns the source alongside a warm and a
   cool relative of it. The engine never has to answer "is this colour warm", which is the
   harder question and the one where sources disagree most.
3. **The corpus taxonomy is the authority on classification.** When an entry's temperature and a
   generated harmony seem to disagree, the entry is right — it was classified by a person with a
   source, and these constants are a rendering convenience.
4. **Named and exported**, so a consumer can show the anchor rather than reverse-engineering it,
   and so changing one is a visible act.

## Consequences

**Good.** `warm-cool` is generated from a stated convention that matches what the corpus says,
so the product does not contradict itself. The convention is inspectable rather than buried in a
switch, and it is honest about being editorial.

**Bad — and it is the real cost.** **Two numbers cannot express a convention that genuinely
varies by culture.** The warm/cool split in Japanese colour tradition is not identical to the
Western one, and this product's whole subject is Japanese colour. A single pair of anchors will
be wrong for some entries, and the mitigation — deferring to `taxonomy.temperature` — only works
for colours that *are* corpus entries. For an arbitrary scanned colour there is nothing to defer
to, and the anchors are all there is.

**Bad, second.** They are uncalibrated and will stay that way until there is a reason to move
them, which means the first person to disagree has no evidence to argue against — only a
different judgement. That is a genuinely unsatisfying place to leave a user-facing behaviour,
and it is recorded rather than dressed up.

**Neutral.** Where these belong eventually is versioned content alongside the rule weights
(F-029, E-009), so a change is a corpus version rather than a deploy. Not moved now: no consumer
exists, and a convention tuned before anything renders it is fitted to nothing.

**Neutral.** Nothing here decides how a surface *labels* warm and cool. F-022 owns that copy,
and the claims lint (F-025) owns what it may assert.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Derive warmth from the colour itself** — e.g. treat hue distance from 55° as a warmth score | Attractive because it needs no constants. It still needs an anchor to measure distance *from*, so it does not avoid the decision — it hides it, and then dresses a judgement up as a computation |
| **Take the split from `taxonomy.temperature` alone, with no anchors** | The most faithful option, and it is what happens for corpus entries. It cannot answer for an arbitrary scanned colour, which is the Lens's entire job |
| **Two boundaries rather than two anchors** (warm is 0°–120°, cool is 180°–300°) | More expressive, and it lets the engine classify. Rejected because classification is exactly where sources disagree — greens and magentas land differently for different authorities, and committing to a boundary makes a claim we cannot source |
| **Put the constants in `content/rules/` now (F-029)** | Where they end up. Premature: a convention nobody has rendered cannot be evaluated |
| **Omit `warm-cool` and record it as unimplementable** | Honest, and wrong: FR-6 lists it, and a stated convention is a legitimate answer to a question that has no geometric one. Refusing would be treating "not derivable" as "not deliverable" |
