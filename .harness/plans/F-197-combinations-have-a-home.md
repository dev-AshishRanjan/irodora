# Plan: F-197 — Combinations have a home, and Contemporary is renamed to what it answers

| | |
|---|---|
| **Feature** | F-197 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-73, FR-72, FR-71 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## Intent

F-194 gave the combinations screen **one** way in — a corpus colour — and said so:

> *This feature gives the engine one way in — a corpus colour — and F-197 adds the reading and
> the garment and settles the naming against `Contemporary`.*

This is that feature.

## Criterion 2 is already met, and the evidence is in the catalogue

> *"Contemporary equivalents keep their behaviour and are renamed to a phrase that says what they
> answer, in both languages."*

**F-155 already did this.** `contemporary.title` is *"What you could buy in this"* / *"いま手に入
る近い色"*, and every string in the block reads the same way. The file and the route are still
called `Contemporary` and `nearby`, and that is not what the criterion asks about — a route path
is not a phrase anybody is shown.

**So nothing is renamed here.** Verified rather than assumed: a test asserts the two titles are
distinct phrases in both languages, which is criterion 3's requirement anyway and which nothing
checks today.

## The real work is criterion 1, and a garment is the hard half

A **reading** already resolves to a nearest corpus entry — `CameraLens` hands `openContemporary`
a slug, and the Lens panel shows each nearest name **with its ΔE00** before offering any exit. A
combinations exit inherits that honesty for free: the person has already seen the difference.

A **garment** is different, and this is the design question of the feature.

A garment's colour is a `SavedColorRow` — a hex somebody captured or typed. It is **not** a
corpus slug. Two ways to bridge that, and one of them is wrong:

**Rejected — resolve the garment to its nearest corpus entry.** The Wardrobe's own docblock
forbids exactly the disclosure this would require:

> *Report a distance. A garment is **in** a group; printing "ΔE00 4.2 from ai-iro" beside a
> jumper would present a measurement as a property of the garment, which is FR-13's rule about
> naming a capture, one level along.*

So the honest version of that route needs a distance the screen may not print, and the dishonest
version silently answers about a different colour than the one asked about.

**Chosen — the combinations screen takes a COLOUR, not only a slug.** The harmony engine takes an
OKLCh; it never needed a corpus entry. A garment's own colour goes straight in, the relationships
are about **that** colour exactly, and there is no substitution and therefore no distance to
report.

The consequence is correct and is stated on the screen: **curated combinations do not apply to a
colour that is not in the corpus.** They are keyed by slug because an editor chose specific
published colours. A free colour gets the generated half and is told that is what it got.

## The subject becomes a union

```ts
type CombinationSubject =
  | { kind: 'entry';  slug: string }                       // a corpus colour: generated + curated
  | { kind: 'colour'; oklch: Oklch; label: string }        // anything else: generated only
```

`/atlas/with/[slug]` is unchanged. A garment reaches it through **`/wardrobe/with/[id]`**, which
reads the garment from the repository and passes its colour — the id stays the identifier and no
colour data goes in a URL, which is the convention every other device-reading route here follows.

## Criterion 3: the two are distinguishable

*"one says what this colour is sold as, the other says what goes with it"*

Both are reachable from a colour page and their labels already differ — *What you could buy in
this* against *What goes with this*. What is missing is anything **checking** that, so a future
edit could collapse them into near-synonyms and no gate would notice. A test asserts the two
titles differ in both languages, and a conformance subject renders a colour page showing both
affordances together.

## Files to touch

```
apps/mobile/src/screens/Combinations.tsx      — the subject union
apps/mobile/src/lens/exits.ts                 — the combinations door
apps/mobile/src/screens/Lens.tsx              — the offer, beside the contemporary one
apps/mobile/src/lens/CameraLens.tsx           — wire it
apps/mobile/src/screens/Wardrobe.tsx          — the way in from a garment
apps/mobile/app/(tabs)/wardrobe/with/[id].tsx — new route
apps/mobile/app/(tabs)/atlas/with/[slug].tsx  — unchanged shape, entry subject
apps/mobile/src/i18n/{en,ja}.ts               — the free-colour note
apps/mobile/test/lens-exits.test.ts           — the new door
apps/mobile/test/i18n.test.ts                 — the two titles are distinct phrases
apps/mobile/test/screens.test.tsx             — subjects for both subject kinds
```

## Test plan

- **The union, rendering nothing where possible:** an entry subject yields curated + generated; a
  colour subject yields generated only and says so. Asserted separately, so an implementation
  that dropped curated entirely would fail the first.
- **A decoy for the colour subject:** two different garment colours must produce different
  relationships, or "the garment's own colour goes in" is a claim nothing checked.
- **The exits table:** the new door resolves against the route tree, and `CameraLens` still
  contains exactly one `router.push` — the F-178 source rule.
- **The two titles differ**, in English and in Japanese.
- **Conformance:** both subject kinds, both themes.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · build`.

## Risks

- **A free colour has no name.** The label comes from the caller — a garment's name or its type —
  and where there is none the screen shows the hex rather than inventing a name, which is the
  rule `Combinations` already follows for generated companions.
- **Nobody has looked at the garment route.** Attested.

## Out of scope

CVD and profile weighting (F-198), and the hand-off onward (F-199).
