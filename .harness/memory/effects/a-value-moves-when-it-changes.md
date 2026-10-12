# E-200 — A value moves when it changes

**Link:** `motion.tsx#useValueMotion` → `ProgressBar`, `ArcFill` (the ring and the dial), the
launch's line
**Guard:** `motion.test`, `progress-bar.test`, `progress-ring.test`, `charts.test`, `launch.test`
(at rest on mount, with the grown-from-0 decoy; between then there; only the allowed keys; the
figure already final mid-move; reduced lands, mid-session too) **Severity:** medium **Feature:** F-266

---

## Why B changes when A does

Every reading drawn as a length moves through one hook (ADR-0133 §3): it mounts at its value — a
reading grown from 0 on every visit would draw values nobody computed — and moves to each new one
over a step with `inOut`. A printed figure is replaced at once and never counted. Change the hook's
easing, its default step or its reduced-motion behaviour and every one of them changes with it.

## Reading it in a test

`animatedStyleOf` and `animatedPropsOf` read what a worklet returned, alone. Reanimated's
`getAnimatedStyle` merges the static style underneath, which would let a worklet that returned
nothing pass as the static token. Advance time a frame per `act()`: one `act()` over a whole step
holds a state change until its end.
