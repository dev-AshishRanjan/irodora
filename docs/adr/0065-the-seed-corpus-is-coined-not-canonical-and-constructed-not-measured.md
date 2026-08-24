# ADR-0065 — The seed corpus is coined, not canonical, and constructed, not measured

## Status

Accepted

## Date

2026-08-24

## Context

F-012 puts the first ~120 colours into `content/colors/`. Everything else about the corpus is
already decided — provenance is mandatory
([ADR-0007](0007-colour-corpus-provenance-and-licensing.md)), classification is displayed
(FR-23), identity is a roster id ([ADR-0047](0047-editorial-identity-is-a-roster-id-not-a-name.md)),
self-review is declared ([ADR-0060](0060-one-editor-and-self-review-is-declared-rather-than-assumed.md)),
and the published bundle is immutable ([ADR-0046](0046-published-corpus-is-an-immutable-generated-bundle.md)).

What was never decided is **what the seed entries actually are**, and the answer is forced by
two facts about where this project stands today:

1. **There is no colorimeter.** No dyed material has been measured under controlled
   illumination by anyone on this project.
2. **There is no cleared published source.** [§5 of the register](../content/licensing-and-provenance.md#5-source-register)
   is empty, ADR-0007 forbids ingesting third-party datasets, and no primary work has been
   licensed. Wada is inspiration, not ingestion, and *"Wada is public domain"* is not the same
   statement as *"this dataset is free to ingest."*

The schema already draws the conclusion. `sourceType: "editorial"` is the only honest value,
and `checkClassification` then permits only `japanese-inspired` or `editorial` — a positive
list, not merely "not historical", because `traditional` claims an established name in the
received canon and `modern-japanese` claims documented current practice, and neither is ours
to assert from our own judgement.

So the values are ours. **The open question is the names**, and it is not a small one, because
the name is the first thing a reader sees and it carries a claim of its own.

Consider an entry named 藍鼠 *ai-nezumi*, classified `japanese-inspired`, whose `xyz` we chose
ourselves. Every field is technically true. A reader who recognises the name will still
conclude that this is *the* traditional colour and that the value beside it is what that
colour is. The classification label sits three lines below the name and loses.

That is the ADR-0007 dishonesty pointed sideways: not *"we copied someone's data"* but *"we
attached our data to someone's name."* It requires no external action, which is exactly why it
is easier to commit.

## Decision

**The seed corpus is coined, not canonical, and constructed, not measured.** Four parts.

### 1. Japanese names are Irodora coinages

Every `name.kanji` / `name.kana` / `name.romaji` in the seed corpus is a compound **we made**,
built from ordinary Japanese colour and nature vocabulary and transparently descriptive of the
colour it names. No seed entry uses a name we believe to be an established traditional colour
name.

`provenance.editorialNotes` states it on **every entry**, in the record itself, not only here:
the name is a coinage and is not asserted to be a traditional colour name.

This is not a claim that the coinages are *good* Japanese. See the consequences.

### 2. Values are constructed in OKLCh and converted by the engine

Each colour is specified as an OKLCh triple chosen by editorial judgement and converted to
canonical D65 XYZ by `@irodora/color-spaces`. `provenance.derivation` carries **the triple and
the engine version**, so the record re-derives its own `xyz` without reference to any tool that
produced it.

OKLCh rather than sRGB because a set chosen for even perceptual spacing has to be *specified*
in a space where spacing means something — and because [ADR-0043](0043-the-oklch-field-is-authoritative-and-srgb-is-derived.md)
already made OKLCh the authoritative form on the other dataset in this repository.

### 3. `taxonomy.temperature` comes from ADR-0049's anchors, not a fresh opinion

[ADR-0049](0049-warm-and-cool-are-a-stated-convention.md) put `WARM_HUE = 55` and
`COOL_HUE = 245` in the harmony engine **specifically so the engine and this field could not
disagree**, and named that risk in its own context section. So the field is assigned from
those constants:

```
oklch.C < 0.012                                   → neutral
| Δh(WARM_HUE) − Δh(COOL_HUE) | < 15°             → neutral
otherwise                                          → the nearer anchor
```

The second rule is the load-bearing one. It marks the bisector — the greens and the magentas —
as `neutral` rather than forcing a side, because that is precisely the region ADR-0049 refused
to draw a boundary through on the ground that sources disagree there.

### 4. Bands are assigned from the same OKLCh the value was specified in

```
lightnessBand:  L < 0.40 → dark   · L < 0.72 → mid  · else light
chromaBand:     C < 0.04 → low    · C < 0.10 → mid  · else high
```

`lightnessBand` and `chromaBand` are authored taxonomy, not derived colour values — the
schema does not reject them the way it rejects `lab` and `hex`. Assigning them by a stated
rule rather than by eye means they cannot drift out of agreement with the colour they
describe, and FR-20 filters on them.

### And what the seed corpus therefore does *not* say

`taxonomy.era`, `taxonomy.material` and `editorial.historicalNote_en` are `null` with a reason
on **every** seed entry. We have no dyeing record, no dated source and no measured material.
A corpus with 120 nulls in those three columns is an honest corpus, and those columns are
exactly where a measurement or a cleared source lands the day one arrives — by superseding an
entry, never by editing one.

## Consequences

**Good.** The corpus can ship without any entry making a claim the project cannot support.
The classification, the names, the derivation and the empty history columns all say the same
thing, so a reader who checks any one of them gets the same answer — which is the property
that fails when only the classification field is honest. Every value is re-derivable from its
own record. The temperature field cannot contradict the harmony engine, which was a live
risk ADR-0049 wrote down and left for this feature. And the register stays empty of sources we
have not actually cleared, so its first row is one we can defend.

**Bad, and it should be said in plain words.**

- **The corpus is less interesting than a corpus of traditional colours would be.** 藍鼠 has a
  history; our coinage has a construction. The seed corpus is a well-provenanced set of
  colours, not a document of Japanese colour tradition, and the product's own brief promises
  the latter eventually. This is a starting position, not the destination.
- **We are coining Japanese names without a competent Japanese speaker.** This is the sharpest
  cost and it compounds ADR-0060's. A coinage can be awkward, can read as a mistake, or —
  worst — can **collide with a traditional colour name we do not know exists**, which would
  recreate the exact failure this ADR exists to prevent, silently. `reviewIndependence: "self"`
  labels the review as weak; it does not detect a collision. F-012 carries this as an attested
  criterion, reworded to name the collision risk specifically.
- **Nothing here is measured, and 120 records now say `sourceType: "editorial"` at once.** An
  outside reader auditing the corpus finds a single source behind every entry. That is
  truthful and it is also thin, and the register makes it obvious rather than hiding it across
  120 plausible-looking rows.
- **The two conventions are conventions.** The 15° bisector band and the band thresholds are
  defensible and are not derivable. A different editor would pick different numbers, and the
  values are in this document rather than in a comment so the disagreement is with a decision
  rather than with a magic number.

**Neutral.** No code changes. This ADR decides what is written into content, and the schema
that would reject a dishonest version of it already exists and already runs.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Use traditional names (藍鼠, 蘇芳, 苅安) with `japanese-inspired` classification** | The obvious move, and the corpus would immediately look like the product the brief describes. Rejected because the name outweighs the label: a reader who recognises 藍鼠 concludes the *value* is that colour's value. It attaches our data to someone else's name, which is ADR-0007's dishonesty pointed sideways |
| **Use traditional names and classify `traditional`** | What the names would honestly require. `checkClassification` forbids it from an `editorial` source, correctly — `traditional` demands multiple independent sources and we have none. To do this we would have to lie to our own gate |
| **Ship no corpus until a source is cleared or a colorimeter exists** | The strictest reading, and it is what has been happening. Rejected because it blocks R2 entirely on a purchase and a legal review, and because a truthful editorial corpus is a real product asset — provenance is the differentiator, and "our own curation, labelled as ours" is rank 5 in our own source hierarchy, not rank none |
| **English-only names, no Japanese at all** | Avoids the coinage risk completely. Rejected because `name.kanji`, `name.kana` and `name.romaji` are required fields, the product is bilingual from day one (ADR-0028), and a Japanese colour product whose colours have no Japanese names has a different problem than the one it avoided |
| **Machine-translate descriptive English names into Japanese** | Rejected by ADR-0028 already: colour names and cultural context are exactly where machine translation fails, and the errors are invisible to a reviewer who does not read Japanese. A coinage we constructed deliberately at least has a stated construction |
| **Specify values in sRGB hex, as most colour lists do** | Simpler to author and to eyeball. Rejected because a set chosen for even perceptual spacing cannot be specified in a space where spacing is not perceptual, and because `sourceHex` exists to record what a *source* printed — writing our own hex there would misuse the field that catches transcription errors |
| **Derive `temperature` from a fresh warm/cool boundary suited to the corpus** | Tempting, since the corpus is the thing being classified. Rejected because ADR-0049 chose anchors over a boundary precisely to avoid a sourceless claim, and a second convention here would put the engine and the data back into the disagreement that ADR was written to prevent |

## Revisit when

- **A Japanese editorial reviewer joins.** The coinages are the first thing they should read,
  and the collision question is the first thing to ask them. Some names will likely change,
  which means superseding entries — a new corpus version, not an edit.
- **A colorimeter or a cleared primary source arrives.** Measured entries supersede
  constructed ones and can then legitimately carry `historical` or `traditional`, an era and a
  material. The seed entries stay, because an old recommendation must still resolve (FR-10).
- **F-018 renders a seed entry** and it becomes possible to judge whether a reader actually
  reads the coinage note, rather than assuming they do.
- **The corpus is cited externally**, at which point "every entry cites one editorial source"
  is a fact an outside consumer will weigh, and their bar may be higher than ours.
