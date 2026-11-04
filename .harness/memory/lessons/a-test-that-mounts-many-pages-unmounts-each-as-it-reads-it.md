---
kind: lesson
title: A test that mounts many pages unmounts each as it reads it
created: 2026-11-04
feature: F-252
severity: low
scope: [apps/mobile]
links: [[a-red-gate-at-step-nine-hides-every-gate-after-it]]
---

# A test that mounts many pages unmounts each as it reads it

`goes-with-states.test`'s sample-content check renders 19 in eight states for each language and
theme, reading every word and name. Each `render` stays mounted until `@testing-library/react-native`'s
`afterEach` cleanup, which unmounts them all at once under jest's default 5 s hook timeout. Alone the
suite took 10 s and passed; under the CI mirror's parallel load the hook timed out, failing two cases
of a gate that Tier 1 and the first Tier 2 had passed.

## What to do

- **A test that renders many pages unmounts each once it has read it** (`tree.unmount()`), so the
  cleanup hook has nothing left to do.
- **A case that renders whole pages states its own timeout**: the rendering is the time, not the check.
- A failure in a hook under load is F-350's class, but a test that piles its own work into the hook is
  this test's to fix.
