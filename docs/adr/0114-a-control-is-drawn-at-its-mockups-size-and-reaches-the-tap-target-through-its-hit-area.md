# ADR-0114 — A control is drawn at its mockup's size, and reaches the tap target through its hit area

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-28 |
| **Feature** | F-232 (delivers F-285's rule) |
| **Amends** | [ADR-0055](0055-the-a11y-gate-renders-under-jest-expo-and-proves-the-tree-not-the-pixels.md): the `tap-target` rule reads `hitSlop` as well as the declared minimum |

---

## Context

R9-MOCKUP-FIDELITY §4 E3 says tap targets meet **44 dp (iOS) and 48 dp (Android) through the hit
area, not the drawn size**, so a control stays the size its mockup draws.

The shipped controls did the opposite, and the reason was the gate:
- Under ADR-0055, the `tap-target` rule read `minWidth` and `minHeight` off the rendered node,
  because a JS render tree has no Yoga pass and so no measured size.
- A `hitSlop` was therefore invisible to the rule, and to a reviewer reading it.
- So every control was raised to 44 × 44 in its drawn style. The switch became a 68 × 44 track,
  where `15` draws 34.5 × 18 dp (F-285, measured in F-232 increment 1).

Two further gaps:
- **The manifest held one target, 44**, and nothing represented Android's 48.
- **Nobody knew whether HeroUI's `Button` forwards `hitSlop`.** If it did not, a hit area would need
  a second, transparent pressable around every control.

## Decision

1. **The manifest gains `size.tapTargetAndroid: 48`** beside `tapTarget: 44`.
   - The parser refuses an Android value below the iOS one.
   - It is emitted as `nativeTapTargetAndroid`.
2. **`hitArea(width, height)`** in `@irodora/ui` returns the `hitSlop` that grows a drawn box to the
   running platform's target (`platformTapTarget()`: 48 on Android, 44 elsewhere).
   - The slop is split evenly on each side, so the target stays centred on the drawing.
   - It is never negative.
3. **A control sets its drawn size in `style` and passes `hitArea(…)` as `hitSlop`.** It does not
   raise its drawn size to the target. **The hit area is the control's own:** its props refuse
   `hitSlop`, because a caller that shrank it would take the target away.
4. **The `tap-target` rule adds them back together.**
   - `tapTargetReach` takes the larger of `width` and `minWidth` (and of `height` and `minHeight`)
     and adds the slop on each side.
   - The control passes when both axes reach the platform's target.
   - An axis whose size nobody declared reaches nothing.
   - This is still **declared, not measured**, exactly as ADR-0055 says, and the finding prints what
     was reached.
   - A control that still declares a 44 × 44 minimum still passes. The change is additive.
5. **`hitSlop` is read off the host view.** RN's `Pressable` hands it to its `View`, and
   `hit-area.test` proves that HeroUI's `Button` forwards it that far. No second pressable is needed.

## Consequences

**Good.**
- A control can be drawn at the size its mockup draws without the a11y gate going red, and the gate
  can still see the target.
- Android gets its own target. It had been held to Apple's 44.
- The finding says how far a control reached (for example "34.5 × 18 of the 44 dp target"), where
  before it said only that no minimum was declared.

**Bad.**
- **Hit areas can overlap on a dense row.**
  - `12`'s chips sit at a 26 dp pitch, and 48 dp targets around them overlap.
  - React Native resolves a tap in the overlap by z-order, and this rule cannot see an overlap: it
    judges one control at a time.
  - This is a device attestation, not something a gate can close.
- **The width floor is the drawn height, not the target** (F-232's review). A labelled control is
  never widened: its `minWidth` is its own height, the narrowest a pill can be drawn, and the
  horizontal slop grows that to the target. So `05`'s 34 dp "All" and `12`'s 47 dp Save keep the
  width drawn.
- **Under jest the rule checks iOS's 44.** The React Native preset renders as iOS. Android's 48 is
  checked by `hit-area.test`, which switches `Platform.OS`, not by rendering every subject twice.
- **A hit area cannot reach past its parent's bounds** (F-232's review). React Native does not
  extend a touch area outside the parent view, so where a container is drawn smaller than the
  target — a 30.5 dp segmented row, the Switch's own label row, `15`'s rows at a 29.5 dp pitch — the
  effective target is the container, while the rule reports 44. The rule judges one control at a
  time and cannot see it. F-305 fixes it per container, and it is an outstanding device attestation
  on F-232's criterion 4.
- **It stays declared, not measured.** A control whose laid-out size falls below its declared size
  (for example a flex child that shrinks) passes here. That is ADR-0055's boundary, unchanged.

## Alternatives considered

- **Keep raising the drawn size.** Rejected. It contradicts §4 E3 and golden rule 14 on every
  control, which is the reason F-285 exists.
- **A transparent hit layer around each control.** Rejected, because the probe showed it is not
  needed. It would also give every control two views to keep in step.
- **Measure the laid-out size by running Yoga in tests.** Rejected, as ADR-0055 rejected it: there
  is no layout engine in the JS render tree, and a device run is where layout is measured.
