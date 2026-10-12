# ADR-0133 — Motion is the change a drawn binding defines, and a length may move where a colour may not

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-10 |
| **Feature** | F-266 |
| **Builds on** | F-144's motion system (`packages/ui/src/motion.tsx`, the manifest's `motion` block); [ADR-0127](0127-the-launch-is-14s-splash-continued-from-the-native-frame-in-the-phones-appearance.md) (the launch); [ADR-0128](0128-empty-working-refused-and-denied-are-27s-four-cards-read-at-the-boards-own-scale.md) (the working ring); [ADR-0131](0131-the-cvd-preview-is-machado-at-full-severity-on-every-token-and-sample-and-is-never-stored.md) (the preview is instantaneous) |
| **Applies** | R9-MOCKUP-FIDELITY §2, §4 E1, §8; golden rules 13 and 14; NFR-8 (ACCESSIBILITY A6); FR-69 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

---

## Context

F-266's criteria ask for the motion the mockups imply, on the motion system's durations and easings,
with nothing animating a colour and everything stopping under reduced motion. The mockups are still
images: no board draws a frame between two states. So every motion is a reading, and rule 14 forbids
inventing what a person sees.

Before this feature:

- the launch's ambience was static;
- the sheet settled on F-177's spring (damping 28, stiffness 260, mass 1), on no step of the scale;
- the coverage dial and the working ring jumped to a new value;
- only the Atlas staggered its rows, and it re-entered every row that scrolled into view.

The manifest's `motion.animatable` is `opacity` and `transform`. Its `forbidden` list names a swatch's
background, a cross-fade between samples, and `width`, `height`, `top` and `left`.

### What was measured (F-266 increment 1)

Jest probes, deleted after reading:

- **Animated SVG props are readable.** A react-native-svg `Path` behind `createAnimatedComponent`
  with `useAnimatedProps` carries `jestAnimatedProps` on the `Path` composite, not on the
  `RNSVGPath` host, which keeps its mount value. With fake timers, a change from 0.2 to 0.8 read
  `strokeDashoffset` 80 at mount, 79.49 one frame in and 20 after 400 ms. Advancing time on an
  arithmetic worklet of a shared value is safe.
- **The sheet hands gorhom F-177's spring** (`animationConfigs` = `{damping: 28, stiffness: 260,
  mass: 1}`). gorhom 5.2.14's `animate()` sends any config with a `duration` or an `easing` to
  `withTiming`, and anything else to `withSpring`.
- **HeroUI's Switch animates a colour.** After the root was given a layout and the switch toggled,
  three frames in, the thumb's animated style read `backgroundColor: rgba(187, 187, 187, 0.50)` and
  `start: 15.95`, between its two states. `state: 'disabled'` on the root does not reach the thumb.
  The thumb also slides by animating `start`, a layout property `forbidden` names as `left`.
- **With `state: 'disable-all'` and our colours given as the worklets' values,** the root and the
  thumb both jump. One frame after the toggle, each reads its final colour and the thumb its final
  `start`, and the colours are the ones passed.
- **The rest of HeroUI that `@irodora/ui` renders animates no colour:** PressableFeedback, RadioGroup,
  Tabs, Toast, Skeleton, Select, Accordion, Slider, and the Dialog, Popover and BottomSheet content
  hooks. PressableFeedback paints a constant colour and animates its opacity, and our buttons turn
  that highlight off (`feedbackVariant="scale"`).

### What was read

- **Reanimated, `useAnimatedStyle`:** *"Animated styles take precedence over React Native's static
  styles."* A colour HeroUI returns from a worklet therefore paints over the token our component
  sets statically. In jest, HeroUI's theme variables do not resolve, so this is invisible there.
- **WCAG 2.2:**
  - SC 2.2.2 (Pause, Stop, Hide) applies to motion that starts by itself and *"lasts more than
    five seconds"*.
  - SC 2.3.3 (Animation from Interactions, AAA) asks that *"Motion animation triggered by
    interaction can be disabled"*.
- **Apple HIG, *Motion*:** *"Don't add motion for the sake of adding motion,"* and *"Make motion
  optional."*
- **Material 3, *Easing and duration*:**
  - an entering element decelerates;
  - exits *"use shorter durations"*;
  - durations scale with the area a transition covers.

  The page also says this easing-and-duration system *"is no longer maintained"*, and that M3
  Expressive moved its components to springs.
- **gorhom `utilities/animate.ts`:** as above.

## Decisions

### 1. A still image implies motion only where it draws one of three things (D1)

1. An element bound to a value that changes over time.
2. An affordance whose use is movement.
3. A sequence of like records that arrives.

The motion built is the change that binding or affordance already defines, and **every motion ends
on the drawn rest state.** Applied:

- the splash: `14.splash.glow`, `14.splash.wave` and `14.splash.progress` (`engine:launch.progress`);
- the sheet: `03.sheet.handle` and `04.sheet.handle`;
- the coverage dial: `11.coverage.ring` (`engine:coverage`);
- the working ring: `27.lens-working.progress` (`engine:lens.progress`);
- **the list surfaces:** the routes whose governing mockup's main content is a vertical sequence of
  numbered records: `05`, `09`, `10`, `11`, `19`, `21` and `24`.

`14`'s caption *"Animated Launch Splash Screen"* is a board annotation (R9 §2). It names the state
and specifies nothing.

### 2. The launch's ambience follows the mark (D2)

- **The glow** is hidden while the mark travels and blooms on its arrival, over `LAUNCH_HOLD`
  (`view`) with `out`: opacity 0 → 1, and scale `LAUNCH_GLOW.grid / LAUNCH_GLOW.canvas` → 1. It
  grows out of the mark's own grid, because it is the mark's ink, blurred (ADR-0127 §5). Its tint
  never moves.
- **The wave** rises by `RISE` (`nativeSpacing.sm`) into its drawn place, on the value the mark
  rises on (`view`, `out`).
- **The line** reaches `launchProgress(step)` as the sequence reaches each step, moving over each
  segment (`view`, `inOut`). It is 0.5 at arrival and full as the overlay leaves, as ADR-0127 §6
  says.
- **No loop and no lateral drift.** The overlay lasts about 780 ms, far below SC 2.2.2's five
  seconds, so a loop would have no period and would be decoration (HIG). A drift would expose the
  wave drawing's end. **This supersedes ADR-0127 §3's "the wave's drift".**

### 3. A value moves when it changes, never when it mounts (D3)

`useValueMotion(value, step = 'view')` mounts at `value` and moves to each new value over `step`
with `inOut`. Under reduced motion it moves in zero time. A mount that grew from 0 would draw values
nobody computed on every visit. **A printed figure is replaced, never counted:** the dial's figure and
every `accessibilityValue` change at once, and the arc arrives within one step.

### 4. A length may move where a colour may not (D4)

The manifest gains **`motion.animatableLength: ["strokeDashoffset"]`.** `animatable` stays `opacity`
and `transform`, and `forbidden` is unchanged. The admission is for animated **props** only, and only
for a stroke whose length is the reading: the ring and the dial draw their fill as one subpath from
the arc's start, with `strokeDasharray [L, L]` and `strokeDashoffset = L·(1 − v)`. At 0 the fill's
opacity is 0, because a zero-length dash with round caps paints a dot.

- **Why a length is admissible:**
  - `animatable` exists to keep colour still, and a dash offset is a length. Its intermediate
    frames are lengths, as F-231 already accepted for the progress line's `scaleX`.
  - `forbidden`'s `width`, `height`, `top` and `left` exist because they lay the tree out again every
    frame, and a dash offset re-paints one SVG node with no layout pass.
- **Stated for F-268:** it is not compositor-only, because the SVG view re-rasterises its paths each
  frame.

### 5. The working ring shows no motion it has no value for (D5)

On today's Lens the ring's value is 0 for the card's whole life (ADR-0128 D4), so its fill never
moves there. No indeterminate spin is added, because an arc that moves while the value does not is
a value nobody computed. `27.lens-working.glow` and `.mark` stay still.

### 6. The sheet settles on the scale (D6)

`animationConfigs` is `timing('view', 'out')` (`SHEET_MOTION`), and F-177's spring is retired. A
detent is where the sheet comes to rest, which `out` decelerates into. The motion skill puts a sheet
at `view`.

**Costs, stated:**

- A flick's velocity is no longer carried into the settle.
- Exits are not shorter than entrances, against Material 3's guidance, because gorhom applies one
  config to opening, snapping and closing.
- Exits are not eased in, either: the sheet leaves on `out`, against `rules/frontend/motion.md`'s
  "ease-in for exiting", for the same reason. The rule and the motion skill point here.
- Material 3 itself now prefers springs. The criterion asks for the motion system's durations and
  easings, and a physics spring has no step on the scale.

F-267 judges the feel on a device. If a person rejects it, the criterion and the feel conflict, and
that is a person's call.

### 7. A list arrives once (D7)

`Arrival` is a scope around a list. Rows that mount within its window stagger as `Appear` does:
`STAGGER_STEP` is micro / 2 and `STAGGER_CAP` is 6, rising by `RISE` over `local` with `out`. The
window is `STAGGER_CAP × STAGGER_STEP + durations.local`, 540 ms, and the first row's mount opens
it.

Some rows are present at once:

- rows that mount after the window: scrolled in, re-mounted by virtualisation, refiltered or
  re-keyed;
- rows at an index of 20 or more.

**How the rule's ~20 items is read** (F-266's review, S2). `rules/frontend/motion.md` said "no
animation on a list of more than ~20 items". The rule exists for frame time and restraint, and a
long list — the Atlas holds hundreds of entries — that animates its first rows and draws the rest at
rest serves both. So at most 20 rows of ANY list animate: the first 20, and of those only the ones
the first frames draw, which the stagger's cap of 6 already brings together. The rule's bullet now
says this, rather than a list of more than 20 never animating.

**Read at mount, from a monotonic clock** (F-266's review, M5). `Appear` decides in a state
initialiser, which runs during render: it reads `performance.now()` and may write the scope's
opening time. That is the impurity the alternatives below reject for a stagger by mount ORDER, and
it is accepted here because what it reads is time, not position. StrictMode's second call reads the
same window and decides the same way. A render that concurrent React discards can open the window
early, by at most the discarded render's lead, which can only make a later row present rather than
make an early row re-enter.

### 8. Reduced motion lands every motion on its end state (D8)

Every new motion reads `useMotion`, which is driven by `AccessibilityInfo` and asserted, including a
change mid-session, and passes `ReduceMotion.System`. **It lands; it does not run faster.** This
honours ACCESSIBILITY A6 and SC 2.3.3.

### 9. "Never a colour" is enforced in our source, in our tests and in our dependencies (D9)

- **`verify-motion`:**
  - reads `useAnimatedProps` bodies against `animatable ∪ animatableLength`, while styles stay on
    `animatable` alone;
  - reports a worklet it cannot read (a block body, a function reference, a top-level spread)
    rather than skipping it;
  - refuses `interpolateColor`, and `Animated` imported from `react-native`;
  - journals its plants.
- **Every new motion's test** reads the keys its worklet returned, and the colours mid-motion.
- **The dependency audit** is a test pinned to the audited `heroui-native` version, so an upgrade
  fails until someone re-audits it.

### 10. The Switch jumps, and paints our tokens (D10)

`controls.tsx`'s `Switch` passes `state: 'disable-all'` to HeroUI's root, and gives the root and the
thumb our own colours as their `backgroundColor` values: the painted `track` and `thumb` tokens for
off and on. As a result:

- the thumb no longer interpolates a colour, and no longer animates `start`, a layout property
  `forbidden` names;
- the worklets' constant colours are now ours, so on a device the Switch paints our tokens instead
  of HeroUI's theme colours, and the colour-vision preview simulates them (ADR-0131).

The thumb jumps, and no mockup draws a slide. The thumb's position still says the state (rule 13).

**Why not keep the slide and pin only the colours:** the thumb would still animate `start`, and the
colour channel would rest on HeroUI never interpolating a pinned pair. With every animation
disabled, there is nothing to tell a pin from an interpolation.

## Consequences

**Good.**

- Every motion the drawings imply runs on the scale and ends on the drawn state, with nothing
  invented at rest.
- No colour moves: not in our source, not in our tests' reading of what each worklet returns, and
  not in the one dependency that did.
- On a device the Switch paints the tokens it declares, so the CVD preview reaches it.
- Reduced motion lands every motion, asserted per motion.
- A list arrives once, and scrolling back re-enters nothing.

**Bad.**

- **The sheet loses a flick's momentum**, and its exits are as long as its entrances (D6).
- **An arc's dash re-paints an SVG node each frame** (D4); F-268 measures it.
- **The Switch's thumb jumps.**
- **A new list surface added without `Arrival` is not detected.** The arrival registry in
  `apps/mobile/test/screens.test.tsx` and the downstream notes carry the requirement.
- **What jest cannot show:**
  - the dash on a device: where it starts, its caps, no dot at 0, no gap at full;
  - gorhom's and HeroUI's own reduced-motion branches, which read reanimated's module flag;
  - the feel of any of it.

  F-266's attestations carry these.

## Alternatives considered

- **Motion wherever a platform would add it.** It invents what a person sees (rule 14).
- **Glow and wave:** a breathing glow, or a glow fading with the composition (it would light an empty
  place); a lateral wave drift, which ADR-0127 had named (it exposes the drawing's end and doubles the
  overlay's largest SVG).
- **The line tweening to `launchProgress(phase)`.** It is a step late: 0 at arrival, and still
  filling as the overlay leaves.
- **A value growing from 0 on mount; a counted figure.** Both draw values nobody computed.
- **Arcs:**
  - transforms of masked half-arcs: four or five layers, seams, and a rest state that is no longer
    one stroked path;
  - animating `d`: the worklet would call a path builder;
  - no arc motion at all, which fails criterion 1.
- **Keeping the sheet's spring**, which fails criterion 1; **`local` for the sheet**, too short for
  the area it covers.
- **Staggering by mount order**, which would be impure in render; **no cap**.
- **For the Switch:** keeping the slide with pinned colours (above), or recording the paint override
  as a separate feature. That would have left a known defect with a one-prop fix on the element this
  decision already changes.

## Revisit when

- `heroui-native` is upgraded: the pinned audit test fails until it is re-audited.
- The manifest's motion system moves to springs (Material 3 Expressive), or a mockup draws a frame
  between two states.
- F-267 rejects the sheet's settle on a device, or F-268 measures an arc's redraw over budget.
