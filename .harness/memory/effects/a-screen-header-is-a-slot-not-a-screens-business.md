# A screen header is a slot, not a screen's business

**Effect:** [E-140](../../state/effects.json) · **Feature:** F-241 · **Date:** 2026-09-21

Mockup `23` draws the profile's avatar **left of the title, on the same line**. The obvious place
to build that is the profile screen — and it is the wrong one, because the title is not the
profile screen's. `Screen` renders it, for every screen in the product.

So `Screen` gained an optional `lead` slot and the avatar goes in it. The alternative that looks
cheaper — putting the picture above the first card, where a screen can place it without touching
a shared component — is reordering what a mockup draws, which rule 14 refuses. **F-239's review
had caught the same instinct a week earlier**, in the form of a dropped section number, so this
is the second time in two features that "somewhere near enough" was the tempting answer.

## What makes an additive slot on a shared component safe

It is absent by default, so a screen that passes nothing renders the tree it rendered before —
which is the property that let a change reaching all 73 conformance subjects land in one commit.
The guard is the sweep rather than the profile screen's own test, because the blast radius is
every screen and the thing that could break is a header, not a feature.

The one design decision inside the slot is which side gives way: `flexShrink: 1` is on the words
and not on the picture. A long title at 200% text scale has somewhere to go; an avatar squeezed
to a sliver is a picture nobody can see.

## What the slot does NOT make true, and the comment that claimed it did

The first version of this said the arrangement "is what `23` draws". It is not — `23` **centres**
the title and its Japanese subtitle in the frame, with a share control at the right edge, while
this renders `[avatar][gap][left-aligned words]`. What the slot gets right is the *side*. The
rest of that header is `F-260`'s rebuild, which is blocked on OQ-33/OQ-34.

F-241's review caught the overclaim. It is the ordinary failure of a feature that builds one
element of a mockup before the screen around it: **the element is faithful and the arrangement is
inherited**, and a comment that says "this is what the mockup draws" quietly promises the second.

## The lesson

**When a mockup draws element A beside element B, the owner of the change is whoever owns B.**
Build it where B lives, take the slot, and say which parts of the surrounding arrangement are
still the old screen's — because the next reader will otherwise take your comment as evidence
that the header has been rebuilt.

[[a-setting-that-changes-what-text-means]]
