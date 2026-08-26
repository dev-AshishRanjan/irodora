# ADR-0076 — A near-neutral has no temperature, and `scoreColor` now agrees

## Status

**Accepted.**

## Date

2026-08-26

## Context

`hueBias(h, poles)` answers *"how warm is this hue?"* on a circle. It knows nothing about
chroma, so it answers with equal confidence for a vivid red and for a grey whose hue angle is a
rounding artefact of two tiny `a` and `b` components.

F-031 found the consequence by accident — `versatility` ranked the corpus's most saturated red
as its **most versatile** colour — introduced `temperatureOf`, which scales the bias linearly by
chroma against the published lexicon's own 0.039 boundary for "grey", and wired it into
`harmony` and `pairingCoherence`, **where the defect had been demonstrated to produce a wrong
answer**. It filed the rest as F-101 rather than changing `scoreColor` on the strength of an
argument, and said why: *"changing scoreColor moves EVERY personal-compatibility score in a
shipped, tested engine, and it is not obviously wrong there — 'this near-neutral garment is
warm' may be a defensible thing to tell somebody whose profile leans warm. THAT IS A PRODUCT
QUESTION."*

This ADR answers the product question. It is answered with measurements taken **before** any
change, so nothing here is an artefact of the change it argues for.

### How much of the corpus this is about

**45 of the 120 published entries — 37.5% — sit below `NEUTRAL_CHROMA`.** This is not an edge
case in a corpus built around subdued, weathered colour, and it will not be one in a wardrobe.

### The pair that settles it

Two entries, both essentially achromatic, both near-white, 0.027 apart in lightness:

| | L | C | h | `hueBias` | `temperatureOf` |
|---|---:|---:|---:|---:|---:|
| `usu-gami` — Thin Paper | 0.962 | 0.006 | 92° | **+0.644** | +0.099 |
| `usu-shimo` — Thin Frost | 0.935 | 0.005 | 246° | **−0.933** | −0.120 |

A person looking at these two sees two off-whites. `hueBias` calls one of them strongly warm and
the other strongly cool.

Taken to the score, with a sharper pair at the same chroma (`sekkai-kabe` — Lime Wall, C = 0.009
— against Thin Frost):

| profile | Lime Wall | Thin Frost | gap |
|---|---:|---:|---:|
| strongly warm | **97** | **64** | 33 |
| strongly cool | 69 | 92 | 23 |

**A 33-point gap, out of 100, between two pale greys.** Nothing a person can see justifies it.
That is not a defensible thing to tell somebody; it is the product being confidently wrong about
a third of its own corpus.

## Decision

**Every place a colour of *arbitrary* chroma is judged for warmth uses `temperatureOf`.** Three
call sites remained; all three move:

1. **`scoreColor`'s temperature fit.** The subject is any garment.
2. **`alternativesFor`'s `warmer` and `cooler` axes.** FR-38's *"like that, but warmer"* — and
   offering a grey as the warmer alternative is the same defect wearing a different hat.
3. **`apps/mobile/src/profile/photo.ts`.** Already a single call after F-099 deleted the app's
   second copy of the rule.

`hueBias` stays exported and stays the pure hue question. It is correct when the chroma is
already known to be meaningful, and `temperatureOf` is built on it.

### What this does to the numbers, stated rather than discovered later

Measured across the whole corpus against a strongly warm profile: **45 of 120 entries move**,
mean |Δfit| **0.055**, largest **0.407** (`usu-shimo`). Every score containing a near-neutral
changes. That is the intended effect and the reason it needed an ADR rather than a commit.

### What a near-neutral now scores

`temperatureOf` ramps to zero as chroma does, so a true grey lands at bias 0, and its temperature
fit becomes `1 − |0 − profileBias| / 2`. A person with a strong warm bias gets 0.6 on that axis
for a grey; a person with no temperature preference gets 1.0.

**That gradient is a claim, and it is the claim we mean:** somebody whose colouring genuinely
wants warmth near the face is *less* well served by grey than somebody who is neutral. It is not
a strong claim, and the linear ramp is not a measurement — `NEUTRAL_CHROMA`'s own comment says a
curve would be a claim about how quickly a grey becomes a colour that nobody has measured.

## Consequences

**Good.** Two colours a person cannot tell apart no longer receive opposite recommendations. The
warm/cool rule now means one thing across the engine, the app and the corpus tooling. E-034 is
resolved, and gate 0's guardless-link warning goes with it.

**Bad.** Every stored recommendation containing a near-neutral would score differently under a
rebuild. Nothing stores one yet — no screen scores a colour — so the blast radius is empty
*today*, which is exactly why now. It will not be empty later.

**Also bad, and worth naming.** The 0.039 boundary and the linear ramp are both conventions
borrowed from the lexicon rather than measured. They are better than a rule that ignores chroma
entirely, and they are not evidence about anything.

**Neutral.** `hueBias` now has exactly one non-test caller inside the package — `temperatureOf`
itself. It stays exported because it is the honest primitive and because a caller that has
already established chroma should not have to re-derive it.

## Alternatives considered

**Keep `hueBias` in `scoreColor`.** The position F-031 left open: a near-neutral garment does
have a temperature, and telling a warm-leaning person that Lime Wall suits them is fine.
Rejected on the pair above. The problem is not the verdict for any one grey; it is that the
verdict is **opposite** for two greys nobody can distinguish, and it is driven by an angle
computed from two components near zero.

**Abstain: let the temperature factor drop out below `NEUTRAL_CHROMA`,** renormalising the other
three weights the way a zero-confidence factor already does. Genuinely attractive — it says "this
axis has nothing to say about a grey", which is arguably truer than any fit.

Rejected for two reasons. It asserts that a grey suits *everyone equally* on temperature, which
is **also** a claim, and a stronger one than the gradient above. And the mechanism would have to
run through `raw[factor]`, which is profile confidence — so the reported `confidence`, documented
as *"the weighted mean of the confidences that applied… because this describes the PROFILE"*,
would start varying with the **colour**. That is a number quietly meaning something else, which
is worse than a fit that is merely approximate.

**Make the ramp a curve, or move the boundary.** Both are tuning a constant nobody has measured,
and ADR-0031's habit applies: the day this can change is the day somebody measures where a grey
stops being grey.
