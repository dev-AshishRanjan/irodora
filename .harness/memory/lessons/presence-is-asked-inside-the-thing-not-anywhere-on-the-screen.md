# Presence is asked inside the thing, not anywhere on the screen

**Date:** 2026-10-13 · **Found in:** F-221's review (B1)

## What happened

F-221's inventory sweep asked whether each element of an enrolled surface was drawn by counting its
component, glyph or illustration on the rendered screen. The review removed elements one at a time
and watched the sweep stay green on four of them:

- the visible launch mark was missing, but the lockup's own mark, withheld at `opacity: 0`, was
  still in the tree;
- 27's two step chips were missing, but the Lens screen's mode chips are the same component;
- the working card's glow was missing, but its locator was the whole card's component.

A presence check that counts anywhere is satisfied by any look-alike. It reported "drawn" for things
that were not.

## The rule

1. **Count inside the thing's own root.** A surface names its root, and every locator is answered
   within it.
2. **Leave out what a static `opacity: 0` hides.** An opacity an animation drives is where a motion
   starts at mount, not the drawing. In a jest tree those nodes carry `jestAnimatedStyle`, which tells
   the two apart. Without that distinction the launch's whole composition read as undrawn.
3. **Where the record names a container, find the part by its own id.** A component that wraps the
   element is evidence of the wrapper, not of the element.
4. **One removal decoy per kind of locator.** A presence check proven only on its `testID` path
   proved nothing about its component, glyph, illustration or text paths. Each was green over a
   missing element until it had its own decoy.

## How to apply

Any check of the form "is X there": ask where X belongs before asking whether it is there. Then
remove X, and only X, and watch the check name exactly it.

Links: [[a-decoy-that-is-not-broken-proves-nothing]] · [[a-check-must-report-its-scope-not-only-its-verdict]]
