# ADR-0069 — A phrase is versioned rule content, and a hue term carries a chroma floor

## Status

Accepted

## Date

2026-08-25

## Context

FR-47 asks the Colour Finder to accept *"a natural phrase ("dark muted green"), Japanese name,
romaji, English name, or hex"*, and sets one acceptance criterion that is not obvious:

> a phrase query maps to a lightness/chroma/hue region **deterministically**

Determinism is the easy half to claim and the hard half to arrange. A tokeniser with a stemmer,
a synonym table, or a similarity threshold is not deterministic in any sense a person can
reason about — the answer changes when the library does. So the question this ADR answers is
**where the vocabulary lives, what a word is allowed to mean, and what stops the two definitions
of "dark" in this repository from drifting apart.**

There was a second problem, found by measuring rather than by thinking. The corpus records an
authored `taxonomy.lightnessBand` and `chromaBand` per entry — the Atlas filters on them — and
a lexicon that also defines "dark" would be a **second definition of one word**.

And a third, found the same way. `charcoal` in this corpus spans hue **58° to 268°**;
`off-white` spans 66° to 246°; `pink` spans 10° to 340°. Those are not hues. They are rounding
on colours with almost no chroma.

## Decision

### 1. The lexicon is versioned rule content, with its own ledger

```
content/rules/phrase-lexicon.2026.08.1.json   the lexicon, with provenance and a rationale per term
content/rules/index.json                      the rule ledger: label, published date, checksum
```

Two files, because **a record checked against a checksum it carries verifies itself** — the
separation ADR-0046 and ADR-0066 make for the corpus, for the same reason. The generated app
module carries the lexicon *text* and the *ledger's* digest as separate exports, and
`generate-rules-bundle.mjs --check` runs in gate 11 so a publish that forgets to regenerate
fails the build rather than shipping the old vocabulary.

This is [ADR-0011](0011-recommendation-rules-are-versioned-content.md)'s `rule_version`
(`id · label · published_at · immutable · checksum`) built for the first time — **for the
lexicon only**. F-029 extends it to weights; no weight semantics, normalisation or occasion
context is built here, and E-009 is untouched.

**Not part of the corpus bundle.** Adding a key to `VersionBundle` would change every recorded
digest, and published corpus versions are immutable — so a vocabulary change would require
minting a corpus version, which is an editorial act about colours, not about words.

### 2. A term may constrain more than one axis, and a hue term must constrain chroma

```jsonc
{ "term": "green",  "constrains": { "hue": {…}, "chroma": { "min": 0.039, … } } }
{ "term": "brown",  "constrains": { "hue": {…}, "chroma": {…}, "lightness": { "max": 0.55 } } }
```

**The schema refuses a hue term with no chroma floor.** Below the floor a hue is noise — the
corpus proves it above — so a hue-only term would answer *"green"* with greys, and nothing about
the file would look wrong to a reviewer.

Multi-axis terms also dispose of the trap in the word *brown*: brown is **not a hue**, it is
dark low-to-mid chroma orange. A lexicon that could not say that would have to omit the
commonest colour word in this corpus, or lie about it.

### 3. Boundaries sit in the measured gap, and a gate holds them there

The lexicon's `dark` and the corpus's `lightnessBand: dark` are one definition, not two:
**every authored band is asserted to fall inside the lexicon region of the same name**, over
every entry, on every run of gate 11. 175 agreements over 28 terms today.

The boundaries are therefore placed in the **measured gap** between adjacent authored bands —
0.395, 0.725, 0.039, 0.100 — rather than at round numbers.

That distinction is not pedantry, and the check is why it is known. The first draft used 0.40
and 0.04, and the agreement check found that **0.40 sits one millionth above the lowest entry an
editor filed as `mid`**: `do-ma` is at lightness `0.3999990449505662`. It would have been
excluded from every query for a medium colour, silently, forever.

`chromaBand: mid` has no term on purpose — *muted* deliberately straddles the low/mid boundary,
because a muted colour still has to have a hue — so the correspondence is partial and says so.

### 4. Routing: hex → phrase → name, and an unprefixed hex needs a digit

A phrase query requires **every part of the query** to be a known term; one unrecognised word
sends the whole query to name search. The lexicon is the entire vocabulary.

Matching **scans for terms rather than splitting on whitespace**, longest first. Japanese does
not put spaces between words, and a resolver that split on them would work in one language and
not the other.

**An unprefixed hex must contain a digit.** `beaded` is six characters, every one a hex digit —
`#BEADED` is a real colour, as are `decade` and `facade`. A rule that read any six hex characters
as a colour would answer an English word with a colour chart. `#` is how a person says they
meant the colour.

Every answer is **labelled on screen with the question it answered**, and a phrase answer shows
the region and the lexicon version behind it.

## Consequences

### Good

- *"dark muted green"* — the requirement's own example — resolves to a real region, and there
  is a test asserting exactly that phrase, because the first vocabulary draft made it resolve to
  a single point matching almost nothing.
- One definition of "dark" in the product, held by a check rather than by care.
- A phrase answer names its vocabulary version, so it can be reproduced after the lexicon moves
  — FR-10's habit applied to search.
- The lexicon's Japanese terms are now part of the font-coverage requirement, which immediately
  found two codepoints (淡, 鮮) that nothing else needed. A person typing 淡い would have seen a
  tofu box.

### Bad

- **The vocabulary is finite and silent about what it lacks.** A word not in the file does not
  exist, and the Finder answers by searching names instead. That is deterministic and it is not
  friendly; the screen says which question it answered, which is the mitigation rather than a
  fix.
- **`ffffff` without a hash searches names and finds nothing.** The cost of rule 4, asserted in
  a test so it is visible rather than discovered.
- **The boundaries are fitted to 120 entries.** They reproduce an editor's judgement rather than
  deriving from perception. The agreement check keeps them honest as entries are added — a new
  entry across a boundary fails the build and somebody decides — but the numbers carry no claim
  about human vision and must never be presented as if they did.
- **The Japanese terms are written and not reviewed** by a competent speaker. The same standing
  gap as the corpus (ADR-0060, OQ-5), declared in the file's own editorial notes.
- **`content/rules` now has two consumers with different needs** — this lexicon and, later,
  F-029's weights. The ledger format will have to carry both.

### Neutral

- The lexicon parse and digest happen once, memoised, at first query.

## Alternatives considered

**Map phrases to the authored taxonomy bands instead of to numeric regions.** Simpler, and it
would agree with the Atlas by construction. Rejected because the bands are **nullable** — an
entry with no band would be invisible to *"dark"* — and because FR-47 asks for a region, which
is a claim about the colour rather than about the filing.

**Put the lexicon in the corpus bundle.** Rejected: it would change every recorded digest and
force a corpus version mint for a change to vocabulary.

**Fuzzy matching, stemming or a synonym table.** Rejected against the word *deterministically*
in the acceptance criterion. A threshold is a number nobody can defend, and its answers change
when a dependency does.

**Rank phrase results.** Rejected: a region is a filter and the lexicon expresses no preference
within it. Ordering would be inventing one. Results come back in slug order, like the Atlas.

## Revisit when

- F-029 lands. The ledger and the `content/rules` conventions were built for one file and will
  meet weights, contexts and rationales that have to sum to 1.0.
- A Japanese reviewer joins (OQ-5). The ja terms are the part most likely to be wrong.
- The corpus grows past the seed. A boundary in a gap is a boundary in the gap **of 120
  entries**; the agreement check will say when that stops being true, and the answer then is a
  decision, not a wider range.
