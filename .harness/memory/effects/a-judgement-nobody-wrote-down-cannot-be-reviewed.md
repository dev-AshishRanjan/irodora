# A judgement nobody wrote down cannot be reviewed

**Effect:** [E-120](../../state/effects.json) · `packages/ui/src/Card.tsx` →
24 screens · `scripts/verify-surface-not-card.mjs` · **medium**

## What happened

`Card` was built in F-184 because `<Surface level="1">` **was** the card vocabulary — one tint,
one radius, one padding, dozens of times, with a heading stacked inside it. F-210 converted the
sites that were cards.

The feature's own notes said *"nine surfaces … the sites are known"* and named four. Classifying
by reading the tree found **47 sites, 24 of them cards**. The figure written down from memory was
wrong by a factor of two and a half, which is the argument for the classifier rather than an
argument against the note.

## The 23 that stay, and why that needed a mechanism

A camera preview, a pressable target, an empty state, a bar. Each is genuinely not a card, and
each of those judgements is invisible ten minutes after it is made. Six months from now,
*"deliberately a Surface"* and *"nobody got to this one"* look identical — and the second is what
flattened the vocabulary in the first place.

So the reason is recorded **at the site**, and a scanner in `lint` refuses a `<Surface>` without
one, refuses a marker that is a shrug, and refuses a marker whose element has gone.

## Where the marker had to live, and why the accident was lucky

A JSX comment child is what anybody would write:

```jsx
{/* surface-not-card: … */}
<Surface …>
```

Eight of these sites sit directly inside a parenthesised ternary branch, where a comment and an
element are **two expressions**, and it does not parse. The form that works everywhere is a
comment *inside the opening tag* — which is also the form the grammar binds to the element
rather than proximity binding it. **The position that had to work turned out to be the position
that was correct.**

## Criterion 3, and the mistake in the first version of it

*"The padding each site rendered before is what it renders after, asserted against the tree."*

"Before" only exists in git, so it was captured first: every `padding` in every rendered subject,
committed, then the conversion. A fixture written afterwards agrees with whatever the edit did.

The first pin compared the **multiset** and fired immediately — correctly, and about the wrong
thing. A `Card` draws a header box *and* a body box where a `Surface` drew one, so the number of
padded boxes necessarily grows. What the criterion asks about is the **value**. The pin now
asserts the distinct set is identical and no value occurs less often, and a decoy asserts at
least one subject gained boxes — so it cannot pass on a branch where nothing was converted.

## The part that can go wrong quietly

**Rhythm.** 24 cards went from one padded box with a `Stack` gap to a header box, a hairline and
a body box. The insets are equal and the screens are not the same, and nothing here renders a
layout [[a-test-tree-has-no-height]]. That is an attestation, not a claim.

**And ten sites are double-padded**, found on the way: `<Surface level="1">` wrapping a `<View
style={{ padding: nativeSpacing.md }}>` renders 24pt where it reads as 12. Not fixed here —
recorded as a feature, because folding an unverifiable spacing change into an unverifiable
conversion is the stacking F-210 was split out of F-203 to avoid.

## The general shape

When a refactor turns on a judgement — *is this one of those?* — the judgement is the artefact,
not the refactor. Write it where the code is, and let a check insist it exists. A list of
conversions is finished work; a recorded reason is reviewable work.

Related: [[a-proof-that-names-a-file-rots-when-the-file-is-not-the-only-one]],
[[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]]
