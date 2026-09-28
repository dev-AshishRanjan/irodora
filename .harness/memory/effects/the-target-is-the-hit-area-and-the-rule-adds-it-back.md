# E-156 — The target is the hit area, and the rule adds it back

**Link:** `packages/ui/src/hitArea.ts` → every control · the `tap-target` rule · gate 8
**Guard:** `hit-area.test.tsx` and every control form registered as a conformance subject
**Severity:** critical **Feature:** F-232 (ADR-0114)

---

## Why B changes when A does

A control is drawn at the size its mockup draws. It reaches 44 dp (iOS) or 48 dp (Android)
through `hitSlop = hitArea(width, height)`, the slop that grows the drawn box to the target. The
chain has three parts:
- the manifest's `tapTarget` and `tapTargetAndroid`;
- `hitArea` and `platformTapTarget`;
- every control that passes the result, and `tapTargetReach` in the conformance rule, which adds
  the drawn size and the slop back together.

Change any link and a control can fall short with every gate green. That happens if the target
changes and a control does not follow, or if the rule stops reading `hitSlop` off the host view.

## What broke historically

F-285 is why the rule learned `hitSlop`. The rule used to read only `minWidth` and `minHeight`,
because a JS render tree has no Yoga pass (ADR-0055), so a hit area was invisible to it. The switch
was therefore raised to 68 × 44 to satisfy the gate, where `15` draws 34.5 × 18. The fix was never
the number: it was making the rule see where the target actually lives.

## How to check

- **The rule, end to end:** `hit-area.test` runs it on a 34.5 × 18 dp pressable with and without
  its slop, with three decoys: no slop, too little, enough.
- **Both platforms:** Android is checked by switching `Platform.OS`. The React Native preset renders
  as iOS, so the conformance run itself checks 44.
- **Forwarding:** HeroUI's Button, Switch, Slider thumb and radio item all forward `hitSlop` to the
  host view. The tests prove it for each rather than assume it.
- **Ownership:** a control's hit area is its own, and `hitSlop` is refused by type on Button,
  IconButton and Chip. A caller that shrank it would take the target away.

## What it cannot see

Overlap. `12`'s chips sit at a 26 dp pitch, so their 44–48 dp targets overlap, and React Native
resolves a tap in the overlap by z-order. The rule judges one control at a time, so this is a
device attestation.

Related: [[a-component-styled-by-a-bundler-plugin-is-invisible-to-the-gate-that-reads-it]],
[[a-controls-default-size-is-a-median-of-the-drawings]].
