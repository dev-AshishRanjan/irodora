# F-144 — Motion exists, and it may never move a colour

**Status:** in_progress · **Release:** R6 · **Blocked by:** F-143 (done)

---

## The problem, stated exactly

The manifest has defined motion since F-003 — three durations, two easings, an allow-list of
`opacity` and `transform`, a forbidden list. `scripts/verify-motion.mjs` has guarded it since
F-143. **It currently guards an empty set.** The token ledger says so plainly:

> Nothing in the product animates. There is no `Animated`, no `withTiming` and no transition
> anywhere in the reader zone.

An app with zero motion reads as unfinished however correct its colours are. After the type
scale, this is the largest single contributor to the reported feeling of low effort — a screen
that replaces another screen instantly, a dialog that pops into existence, a list that appears
fully formed. Every one of those is a frame the eye cannot follow, and the reading is "cheap"
rather than "fast".

**The constraint is real and it stays.** The intermediate frames of a colour cross-fade are
plausible colours that never existed, so a user reads a value the engine never produced. For a
product whose entire claim is _this is what colour that is_, that is a correctness defect.

---

## Decision 1 — Reanimated is the engine. Not RN `Animated`.

Probed rather than assumed:

- `heroui-native@1.0.8` declares `react-native-reanimated: ^4.1.1` as a **required** peer —
  `peerDependenciesMeta` marks `@gorhom/bottom-sheet`, `expo-blur` and `react-native-screens`
  optional, and reanimated is not among them. `packages/ui` declares heroui-native as a peer.
  **Reanimated is therefore already unavoidable in every tree that renders our UI package.**
  Choosing it costs no new dependency.
- `apps/mobile` already depends on `react-native-reanimated@4.5.3`, and `metro.config.js`
  already wraps the config with `wrapWithReanimatedMetroConfig`.
- Both jest configs already resolve the real reanimated through
  `react-native-worklets/jest/resolver.js`, and `packages/ui/jest.config.mjs` records **why it
  is not mocked**: the mock omits `useReducedMotion`, which HeroUI calls on first render. So the
  animation code under test is the animation code that ships.
- HeroUI's Dialog and Popover take `animation={{ entering, exiting }}` where both are reanimated
  `Keyframe`s. **There is no other way to give an overlay our durations.** RN `Animated` cannot
  reach that prop at all.

Picking `Animated` would put two animation engines in one app and would leave criterion 4's
overlays unreachable. Reanimated is not the ambitious choice here; it is the only one.

## Decision 2 — reduced motion reads `AccessibilityInfo`, not reanimated's hook

Reanimated ships `useReducedMotion()`. It initialises from module state at import and is
correspondingly hard to toggle inside a test.

Criterion 2 says **"asserted rather than described"**, so the mechanism has to be one a test can
drive. `AccessibilityInfo.isReduceMotionEnabled()` plus the `reduceMotionChanged` event is the
platform API that reanimated itself reads, and it is fully mockable. Using it directly is what
makes the criterion checkable rather than claimed.

Reanimated's own `reduceMotion: ReduceMotion.System` is set on every animation as well. That is
defence in depth; the **asserted** mechanism is our hook returning zero.

---

## What gets built

### 1. `packages/ui/src/motion.tsx` — the typed API

```ts
export type DurationStep = keyof typeof nativeMotion.durations; // 'micro' | 'local' | 'view'
export type EasingName = keyof typeof nativeMotion.easing; // 'out' | 'inOut'

export function useMotion(): {
  readonly reduced: boolean;
  readonly duration: (step: DurationStep) => number; // every step is 0 when reduced
  readonly timing: (step: DurationStep, easing?: EasingName) => WithTimingConfig;
};

export function Appear(props: {
  readonly children: ReactNode;
  readonly index?: number; // stagger position; the delay is derived, never passed
  readonly testID?: string;
}): JSX.Element;

export const overlayKeyframes: {
  readonly entering: Keyframe;
  readonly exiting: Keyframe;
};
```

There is **no `style` prop and no `property` prop** on `Appear`, for the same reason `Screen` has
no `style`: the allow-list cannot be enforced at a call site that can pass anything. What it
animates is `opacity` and `translateY`, decided here, and a caller cannot widen it.

The stagger delay is derived from `index × micro/2` and capped, so a 120-row list does not end
with a two-minute entrance. Beyond the cap, entries appear together — which is correct, because
by then they are off-screen anyway.

### 2. Gate extensions — `scripts/verify-motion.mjs`

The existing scan reads `<Animated.X style={{…}}>` literals. **Reanimated does not write style
literals**; it writes `useAnimatedStyle(() => ({ opacity: … }))`. Introducing the engine without
extending the scan would open exactly the blind spot the gate exists to close.

| #   | Check                                                                    | Criterion |
| --- | ------------------------------------------------------------------------ | --------- |
| C   | keys of a `useAnimatedStyle` / `Keyframe` body ⊆ `motion.animatable`      | 3         |
| D   | a numeric literal `duration:` inside an animation config                  | 1         |
| E   | `entering` / `exiting` / `layout` / `sharedTransitionTag` on a `<Swatch>` | 3         |

**E is criterion 3's second half stated mechanically.** "A transition that crosses a swatch
colour" is a shared-element or layout transition on a sample: reanimated interpolates between two
swatches and every intermediate frame is a colour the engine never produced. That is the
manifest's _"cross-fade between samples"_, and it is a prop, not a style key, so nothing existing
sees it.

Every check gets `--prove` cases in **both** directions. A decoy that must pass matters as much as
one that must fail: a check that rejected every mention of `duration` would ban the typed API it
exists to enforce, and would be switched off within a week.

### 3. The four sites (criterion 4)

| Site                                                    | What it gets                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------------ |
| **Navigation** — `app/_layout.tsx`, `app/(tabs)/_layout.tsx` | `animation` + `animationDuration: durations.view` on the stack |
| **Overlays** — `overlay.tsx` Dialog, Popover            | `animation={overlayKeyframes}`, replacing HeroUI's 200/150ms defaults |
| **List entrances** — `Atlas.tsx`                        | `Appear` around the cell, staggered by list index                  |
| **Sheets**                                              | **Nothing. See below.**                                            |

---

## The part of criterion 4 this feature does not close

**There is no bottom sheet in the product.** `grep` finds `BottomSheet` only in
`packages/ui/src/overlay.tsx`'s prose and `apps/mobile/src/lens/viewfinder.tsx`. F-158 is the
feature that builds one.

So "sheets use it" cannot be satisfied here, and building a sheet to satisfy a checkbox would be
scope creep into a feature that already exists in the list. **F-144 ships the API and three of the
four sites; F-158 consumes it.** This is recorded as an explicit gap rather than being quietly
counted as done — and it is the reason the criterion is attested rather than asserted.

---

## Risks, and what each one would look like

**Reanimated under jest is the real risk.** It is not mocked, and an animation that schedules
frames can leave a test asserting an intermediate state, or leak a timer past the test. The
mitigation is that `Appear`'s assertions are about **the end state and the reduced-motion state**,
both of which are deterministic — never about frame 3. If the suite turns flaky the signal is
immediate, and the fallback is `ReduceMotion.Always` in the test environment, which is a real
behaviour rather than a mock.

**`animationDuration` is native-stack and platform-conditional.** react-navigation honours it for
some animation types and not others, and never on the web. This is a case where passing the token
is right and _claiming_ the frame timing would not be — the progress entry will say which half is
verified.

**The double-blind on E.** Check E reads source, and a `Swatch` rendered through a variable or a
`renderItem` indirection is invisible to it. Every scan in this gate already prints what it cannot
see on every run; E joins that line rather than pretending to completeness.

---

## Definition of done for this feature

- [ ] `motion.tsx` exports the typed API; no literal duration anywhere in `packages/ui` or `apps/mobile`
- [ ] Reduced motion collapses all three durations to 0, **asserted** by driving `AccessibilityInfo`
- [ ] verify-motion gains C, D and E, each with passing **and** failing `--prove` decoys
- [ ] Navigation, overlays and list entrances use the API; the sheet gap is recorded, not hidden
- [ ] `packages/ui` declares the reanimated peer it now uses
- [ ] Conformance subjects cover `Appear` in both motion states
- [ ] Gates 0–4, 6, 8, 9 green; motion gate green and proven
- [ ] Effects traced; `progress.md` says which half of the navigation claim is verified
