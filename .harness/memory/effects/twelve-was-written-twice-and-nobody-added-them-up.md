# Twelve was written twice, and nobody added them up

**Effect:** [E-122](../../state/effects.json) · `packages/ui/src/Surface.tsx` →
ten screens · `scripts/verify-spacing-scale.mjs` · **medium**

## What happened

```jsx
<Surface level="1">                              ← md = 12, from the default
  <View style={{ padding: nativeSpacing.md,      ← md = 12, again
                 gap: nativeSpacing.sm }}>
```

`Surface` **always** applies its own padding and defaults it to `md`. Ten sites added one inside
it, so each rendered a **24pt inset while reading, at every call site, as 12**.

**24 is written nowhere.** Each file says `md`; the total is a sum nobody performed. That is why
the spacing gate could not see it — every value involved is a legal step of the scale, and the
defect is the *nesting*.

## The value chosen, and on what evidence

`md`. Two independent places already name it — the `Surface` default and the inner `View` — and
24 is not an inset any other surface in the application uses. The reading with the most evidence
is that one of them was meant to be the whole inset and neither author knew about the other.

Choosing 24 deliberately would need somebody to look at ten screens. So does choosing 12, and
**nobody has**: that is an attestation on the feature rather than a claim in this note.

## The fix is a primitive, not a smaller number

```jsx
<View style={{ padding: nativeSpacing.md, gap: nativeSpacing.sm }}>   →   <Stack gap="sm">
```

The inset comes from the `Surface`; the flow comes from `Stack`. A raw `View` with hand-written
spacing disappears at the same time, which is F-203's direction.

## The rule that stops it coming back, and the case that keeps it usable

A `Surface` or `Card` whose **first child declares its own padding** is refused, in the spacing
scanner because it is a spacing rule. Watched refusing.

And watched **accepting** a `Surface` whose first child is a `Stack` — without that case the rule
would be "no box inside a Surface", which is a rule against nesting rather than against double
padding. A check that fires on the fix is a check that gets exempted.

## The pin fired, and that is the pin working

`screen-insets.json` refuses any inset value occurring less often than it did. Removing ten
padded boxes does exactly that, so it went red — and the fixture was **re-captured as part of
this feature, with the numbers recorded**, rather than quietly regenerated to make a test green.
The decoy that proved F-210's conversion had happened could no longer be true after a re-capture,
so it was replaced by one asking the question that is still live: *can this comparison fail at
all?*

## The part that can go wrong quietly

Ten screens are 12pt tighter and nobody has seen them. If 24 was deliberate this is a regression
— and the evidence for that reading is one number written nowhere against two written twice.

## The general shape

A defect can be composed entirely of correct parts. Every value here was on the scale, every
component was used as documented, and the sum was wrong. Checks that validate values will never
see it; the question that finds it is *"what does this actually render?"* — which is why the
inset was captured from the tree rather than reasoned about.

Related: [[a-judgement-nobody-wrote-down-cannot-be-reviewed]],
[[a-heredoc-can-turn-an-escape-into-an-invisible-control-character]]
