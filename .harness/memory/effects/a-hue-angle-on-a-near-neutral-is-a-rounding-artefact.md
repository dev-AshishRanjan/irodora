---
kind: effect
title: A hue angle on a near-neutral is a rounding artefact, and the engine treated it as a claim
category: colour
confidence: 0.9
created: 2026-08-26
scope: [packages/recommendation, apps/mobile]
links: [[the-warm-cool-rule-is-written-twice-because-an-install-cannot-run]], [[a-word-in-the-lexicon-is-also-a-word-in-the-taxonomy]], [[deltae00-is-not-a-metric-and-cannot-be-indexed]]
---

# E-034 — `hueBias` calls a grey "fully warm", and a scoring component believed it

**`score.ts#hueBias` → `temperatureOf` · `scoreColor` · `apps/mobile/src/profile/photo.ts`**

## The measurement

Against the published corpus, with poles at 60° and 240°:

| entry | OKLCh C | hue | `hueBias` |
|---|---|---|---|
| `hai-suna` — a warm grey | **0.012** | 72° | **+0.867** |
| `fuyu-tsuchi` — a warm grey | 0.018 | 68° | +0.911 |
| `togi-ishi` — a cool grey | 0.009 | 250° | −0.889 |
| `mi-aka` — the corpus's most saturated red | **0.134** | 28° | **+0.644** |

**A grey at C = 0.012 reads as more strongly warm than a vivid red.** At that chroma the hue
angle is `atan2` over two tiny `a` and `b` components — a rounding artefact, not a property of
the colour. Treating it as a claim about warmth makes greys clash with things.

## How it surfaced, which is the part worth keeping

F-031's `versatility` component ranked **`mi-aka` as the most versatile colour in the corpus** —
73.3% against 61.7% for a warm grey. That is the opposite of what the word means.

It was visible **only because a test asserted the intuition rather than the formula**: *"a
neutral anchor beats a saturated one"*. A test written against what the code computes would have
passed, and the component would have shipped with a name that contradicted its output.

The first fix was wrong too, and worth recording: removing the lightness-separation term from
versatility (correct — that was `contrast`'s job, scored twice) made the gap *wider* in the
wrong direction, because what remained was temperature, and temperature was the broken part.
Two defects stacked, and fixing the visible one first made the measurement worse before it made
it better.

## Fixed where it was demonstrated, not everywhere

`temperatureOf` scales the bias by chroma, ramping to full at **0.039** — the *published* phrase
lexicon's own boundary for the term "grey", so the word denotes one thing across the product
[[a-word-in-the-lexicon-is-also-a-word-in-the-taxonomy]].

`harmony` and `pairingCoherence` read it. **`scoreColor`'s temperature fit and the app's
`biasFromHue` still call the raw `hueBias`** — the same defect, in two places where it has not
been shown to produce a wrong answer, and where changing it would move every score in a shipped
engine in the middle of a different feature.

`guard: none`, honestly, carried by **F-101**. A check asserting `temperatureOf` is used
everywhere would encode an answer nobody has decided yet: whether a near-neutral garment
*should* be scored as having a temperature at all is a product question, not a refactor.

## The generalisation

> Whenever a polar colour space's **angle** is used as evidence, ask what its **radius** is. At
> small radius the angle carries no information, and every function that reads it is reading
> noise with full confidence.

The same shape as [[deltae00-is-not-a-metric-and-cannot-be-indexed]]: a quantity that is
perfectly well defined and still cannot be used the way it looks like it can.

---

## Resolved by F-101 — and the number that made the decision easy

F-031 left this open deliberately: *"'this near-neutral garment is warm' may be a defensible
thing to tell somebody whose profile leans warm. THAT IS A PRODUCT QUESTION."* Right to leave it,
and the question turned out to have an answer with evidence behind it.

**45 of the 120 published entries sit below `NEUTRAL_CHROMA`** — 37.5% of the corpus. Not an
edge case in a corpus built around subdued, weathered colour, and it will not be one in a
wardrobe.

The pair that settled it, both off-whites, 0.027 apart in lightness:

| | C | h | `hueBias` |
|---|---:|---:|---:|
| `usu-gami` — Thin Paper | 0.006 | 92° | **+0.644** |
| `usu-shimo` — Thin Frost | 0.005 | 246° | **−0.933** |

Taken to a score with a sharper pair at the same chroma, a strongly warm profile rated Lime Wall
**97** and Thin Frost **64** — a 33-point gap out of 100 between two pale greys. The product was
not making a defensible claim; it was confidently wrong about a third of its own corpus.

**The app case was worse**, because the answer is written into a stored profile and biases
everything afterwards: two greys whose RGB differs by 0.004 produced +0.913 and −0.913.

## The alternative that was nearly right

Let the temperature factor **abstain** below `NEUTRAL_CHROMA`, renormalising the other three the
way a zero-confidence factor already does. It says "this axis has nothing to say about a grey",
which is arguably truer than any fit.

Rejected for a reason worth keeping: it asserts a grey suits **everyone equally**, which is also
a claim and a stronger one. And the mechanism would have run through `raw[factor]` — profile
confidence — so the reported `confidence`, documented as describing the PROFILE, would have
started varying with the COLOUR. A number quietly meaning something else is worse than a fit
that is merely approximate.

## What the change exposed on its way through

`alternativesFor`'s doc had always said an axis is *"never filled with a duplicate"*, and
**nothing implemented it**. The test asserting uniqueness passed because no pool had happened to
produce one. ADR-0076 produced one immediately: with a two-colour pool of off-whites the single
non-best candidate is genuinely cooler *and* lighter *and* higher-contrast, so three axes chose
it — three chips, one swatch.

Not mislabelled; every label was true. That is exactly why the code had to decide rather than the
data. A rule stated only in a comment is a rule that holds until the first input that tests it
[[an-effect-rationale-is-prose-in-a-state-file-and-nothing-executes-it]].
