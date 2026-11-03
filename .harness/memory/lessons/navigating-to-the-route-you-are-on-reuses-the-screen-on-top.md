---
kind: lesson
title: Navigating to the route you are on reuses the screen on top
created: 2026-11-03
feature: F-251
severity: high
scope: [apps/mobile]
links: [[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
---

# Navigating to the route you are on reuses the screen on top

16 is `/atlas/palettes` in its draft state, pushed over the catalogue. Its Back and *Create & Save*
called `router.navigate('/atlas/palettes')`. expo-router's stack answers a NAVIGATE to the route name
already on top by **reusing that screen** (`StackClient.js`: `if (action.payload.name ===
currentRoute.name) route = currentRoute`), so the builder turned into a second catalogue with the
first still beneath it. That first one had read the store once, at mount, so a palette just saved was
missing from it — and system Back from the new one landed there, not on the Atlas.

Every test passed: the route's tests are string matches on its source, and a screen test cannot run a
navigator. The evaluator found it by reading the router's source.

## What to do

- **A state of a route pushed over that route goes back to it** (`router.back()`, or `replace` when
  nothing is beneath — a deep link). `dismissTo` does not help: the same rule matches the screen on
  top first.
- **A screen that lists what another screen writes reads again on focus** (`useFocusEffect` in the
  route, a `revision` prop in the screen), as Home and the colour page already do.
- Hold it with a decoy in the route test: the stale `navigate` must be absent.
