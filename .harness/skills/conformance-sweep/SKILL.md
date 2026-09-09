---
name: conformance-sweep
description: Run the design-system conformance sweep and leave evidence — every screen, both themes, both languages, motion and reduced, with the parts that are cited rather than repeated.
---

# conformance-sweep

**Produce evidence that the design system holds.** Not an assertion in a commit message — an
artefact somebody can read.

---

## What runs, and where it lives

The sweep is a `describe` block at the foot of
[`apps/mobile/test/screens.test.tsx`](../../../apps/mobile/test/screens.test.tsx), in the file
that owns the subject registry.

```bash
pnpm --filter @irodora/mobile test -- screens.test
```

It writes [`.harness/verification/conformance-sweep.json`](../../verification/conformance-sweep.json),
which is **committed**. An artefact regenerated and discarded on every run is a build step, not
a record.

### Why it is not its own file

A separate file has to import `SCREENS`, and **importing a test file executes it** — the first
draft ran 209 tests as a side effect of asking how many subjects there were. Extracting a
1400-line registry and its fixtures to fix a filename is a large mechanical change to the file
every screen guarantee runs through. If you are tempted to split it, that is the reason not to.

---

## The eight conditions

```
{light, dark} × {en, ja} × {motion, reduced}
```

Both switches must be **the ones the app reads**:

| condition | driven through | not through |
|---|---|---|
| locale | the `mockLanguageTag` the `useMessages` mock resolves | a prop |
| reduced motion | `AccessibilityInfo.isReduceMotionEnabled` | reanimated's `useReducedMotion` |

`useMotion` reads `AccessibilityInfo` deliberately, and F-144's docblock says why: *"reduced
motion is asserted rather than described, so the mechanism has to be one a test can turn on and
off."* A sweep that drove a flag it invented would be checking a condition that does not exist on
a device.

---

## What is CITED, not repeated

Two things belong to other gates, and running them again here would be a second answer to one
question — the failure [E-005](../../state/effects.json) exists to prevent.

| | owned by | what it does |
|---|---|---|
| **CVD** | gate 9, `pnpm test:contrast` | every declared pairing through WCAG, APCA and **eleven** severities, in all eight palettes |
| **token reach** | `scripts/verify-token-reach.mjs` | both directions — a token nothing reads, and an exemption something does read |

**If the next sweep re-simulates CVD per subject, it has made the product worse**, because there
will then be two definitions of separation and they will disagree eventually.

---

## Two rules for the artefact

**A verdict without a count is not evidence.** *"No findings"* and *"nothing ran"* produce the
same word. Record how many subjects, under how many conditions — and assert those numbers
against the registry rather than typing them, or the file becomes evidence about a smaller sweep
than the one that ran.

**Say what it cannot see.** The sweep measures structure, naming, tap targets, token resolution
and selection treatment. It cannot see a layout that is cramped or unbalanced — and **every
"unprofessional" report in this project has been about something that was green here at the
time.** That sentence belongs in the artefact, not just in this skill.

---

## Findings are features, never prose

Anything the sweep surfaces that is not fixed in the same feature goes into
[`feature_list.json`](../../state/feature_list.json) with acceptance criteria. A finding written
up as a paragraph is a finding nobody will act on
[[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
