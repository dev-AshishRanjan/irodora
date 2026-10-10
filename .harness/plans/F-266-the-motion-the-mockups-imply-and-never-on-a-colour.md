# Plan: F-266 — The motion the mockups imply, and never on a colour

| | |
|---|---|
| **Feature** | F-266 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8 (through [`ACCESSIBILITY.md`](../../docs/design/ACCESSIBILITY.md) A6: *"Reduced motion fully honoured; every duration collapses to 0"*), FR-69 (the applied identity: `14`'s splash) — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `@irodora/ui` · `@irodora/design-tokens` (one manifest field and its emitter) · `scripts/verify-motion.mjs`. No `packages/color-*` file and no `content/` file is touched. No dependency is added. |
| **Author** | The planner subagent, adopted by the implementing session (see *Amendments on adoption*) |
| **Date** | 2026-10-10 |

---

## Intent

Today the launch's ambience is static. The sheet settles on a spring that sits on no step of the
scale. The coverage dial and the working ring jump to a new value. Only the Atlas staggers its rows,
and it re-enters every row that scrolls into view. After this feature:

- every motion the drawings imply runs on the motion system's own steps and easings, and ends
  exactly on the drawn rest state;
- nothing animates a colour, a figure or a tint, and that holds in our source and in what our
  dependencies do on our behalf;
- with the phone's reduced-motion setting on, each motion is simply at its end state. It is not a
  faster version of itself.

**Done, for a person:**

- The splash's glow lights up as the mark arrives, the silk wave rises into place, and the line is
  full as the app appears.
- A reading's sheet settles rather than bounces.
- A dial's arc moves to a new share while its figure already says it.
- Lists arrive once, in reading order, and never again while you scroll.
- With Reduce Motion on, none of it moves.

## Approach

### Readings chosen (decided here, recorded in ADR-0133 under R9 §11's delegation of 2026-10-05)

The mockups are still images, so every reading below is a decision. Each is closed by **ADR-0133**,
*"Motion is the change a drawn binding defines, and a length may move where a colour may not"*
(`docs/adr/0133-motion-is-the-change-a-drawn-binding-defines-and-a-length-may-move-where-a-colour-may-not.md`).
The ADR quotes the delegation and names the alternatives. Golden rules 11 to 14 bind every row.

| # | ambiguity | reading chosen | why | alternatives (in the ADR) |
|---|---|---|---|---|
| **D1** | What "imply" means | **A still image implies motion only where it draws one of three things.** (a) An element bound to a value that changes over time. (b) An affordance whose use is movement. (c) A sequence of like records that arrives. The motion built is the change that binding or affordance already defines. **Every motion ends on the drawn rest state.** Applied (see the next table): `14.splash.glow`, `14.splash.wave`, `14.splash.progress` (`engine:launch.progress`); `03.sheet.handle`, `04.sheet.handle`; `11.coverage.ring` (`engine:coverage`); `27.lens-working.progress` (`engine:lens.progress`). **List surfaces** are the routes whose governing mockup's main content is a vertical sequence of numbered records: `05.card-1…4`, `09.results.result-1…4`, `10.palette-1…2`, `11.grid.garment-1…6`, `19.rows.row-1…5`, `21.results.row-1…5`, `24.rows.row-1…4`. `14`'s caption *"Animated Launch Splash Screen"* is a §2 board annotation: it names the state and specifies nothing. | Rule 14 forbids inventing what a person sees. The only motion that invents nothing at rest is a transition between states the product already draws. | Motion wherever a platform would add it (invents). The five named elements with no list rule (fails "list surfaces"). Counting `01`/`25`'s wardrobe strip, `22`'s three garments or `03`'s three matches as lists: Home's sections already arrive in order through `Appear index` (F-188), and the others are parts of a surface that arrives as one. |
| **D2** | The launch's ambience (F-231's note: glow opacity and scale, the wave's transform, the line's `scaleX`) | **The glow is hidden while the mark travels, then blooms on arrival** over `LAUNCH_HOLD` (`view`) with `out`: opacity 0 → 1, scale `GLOW_BLOOM_FROM` → 1, where `GLOW_BLOOM_FROM = LAUNCH_GLOW.grid / LAUNCH_GLOW.canvas`. The bloom therefore starts at the mark's own grid and grows out of its cuts (ADR-0122 §3). Its tint never moves. **The wave rises by `RISE` (`nativeSpacing.sm`) into its drawn place**, on the same `arrive` value the mark rises on (`view`, `out`). **The line reaches `launchProgress(step)` as the sequence reaches each step**, and moves between steps over that segment (`view`, `inOut`). | ADR-0127 §5: the glow is the mark's ink, blurred. Shown before the mark arrives (today's build fades it in with the composition), it lights an empty place. A lateral drift would expose the drawing's end: `silk-wave` spans exactly the screen width, and two copies would double the overlay's largest SVG, a cost F-268 would carry. The overlay lasts three `view` steps (about 780 ms), so a loop has no period and would be decoration (`rules/frontend/motion.md`, *Restraint*); nothing lasts the five seconds WCAG 2.2.2 is about. ADR-0127 §6 says *"0.5 on arrival, 1 as it leaves"*. A line that started moving only once a step was reached would read 0 at arrival and still be filling as the overlay left. | ADR-0127 §3's "drift" (superseded by this reading, with a pointer added to 0127). A breathing glow. The glow tied to the composition's fade. The line tweening to `launchProgress(phase)` (one step late). |
| **D3** | How a value moves | **A value moves when it changes, never when it mounts.** One hook, `useValueMotion(value, step = 'view')`: it mounts at `value` and moves to each new value over `step` with `inOut`. It is zero under reduced motion. `ProgressBar`, `ProgressRing` and `CoverageDial` all use it. **A printed figure is replaced, never counted** (`rules/frontend/motion.md`, F-189). The dial's figure and every `accessibilityValue` change at once, and the arc arrives within one `view` step. | `inOut` is *"for a value in motion"* (`motion.tsx`). A mount that grew from 0 would draw values nobody computed on every visit. The figure rule is standing. | Grow on mount. Count the figure (refused by the rule). `local` (too short for a 276° sweep). |
| **D4** | The ring's and the dial's arc length against `motion.animatable` | **The manifest gains `motion.animatableLength: ["strokeDashoffset"]`. `animatable` stays `opacity, transform` and `forbidden` is unchanged.** The admission covers animated props only, and only for a stroke whose length is the reading. The fill is one subpath from the arc's start (12 o'clock for the ring, the dial's 222°), with `strokeDasharray [L, L]` and `strokeDashoffset = L·(1 − v)`. At 0 the fill's `opacity` is 0, because a zero-length dash with round caps paints a dot; F-236's test already names that dot as the decoy. | `motion.md` lists *"a bar whose length is the quantity"* among what may move. `animatable` exists to keep colour still. `forbidden`'s width, height, top and left exist because they relayout the tree every frame. A dash offset is a paint of one SVG node: no Yoga pass and no colour. **It is not compositor-only** (the SVG view re-rasterises two paths a frame), and that is stated for F-268. A progress value's intermediate frames are lengths, which F-231 already accepted for the line. | (a) **Transforms of masked half-arcs:** four or five layers (two half rings, two clips, a rotating cap), seams where the clips meet, and a rest state that is no longer one stroked path. That is a fidelity risk at rest, not only during motion. (b) **Animate `d`:** the worklet must call a path builder; `verify-worklet-reach` does not scan `packages/ui`, and jest has one runtime (E-050). (c) **No animation:** fails criterion 1. |
| **D5** | The working ring on today's Lens | **Its value is 0 for the card's whole life** (ADR-0128 D4: only acquisition takes visible time), so its fill motion is not seen there. **No indeterminate spin is added:** an arc that moves while the value does not is a value nobody computed. `27.lens-working.glow` and `.mark` stay still: they are not named, and a looping glow is decoration. | D1, and ADR-0128 D4. | A spinner (contradicts D4). A breathing glow. |
| **D6** | The sheet's detents | **`animationConfigs = timing(SHEET_MOTION.step, SHEET_MOTION.easing)`, with `SHEET_MOTION = { step: 'view', easing: 'out' }`. F-177's `SHEET_SPRING` is retired.** | The motion skill's table puts a sheet at `view`. A detent is where the sheet comes to rest, which is what `out` decelerates into. gorhom 5.2.14's `animate()` sends any config holding `duration` or `easing` to `withTiming`, so a duration-based spring cannot reach it, and a physics spring has no step on the scale. HeroUI merges `reduceMotion` into the config it passes on. **Costs, stated:** a flick's velocity is not carried into the settle (`motion.md` allows springs for drags; the criterion does not). Exits are not faster than entrances, because gorhom applies one `animationConfigs` to opening, snapping and closing. | Keep the spring (fails criterion 1). `local`. Separate exit configs (gorhom takes per-call configs only for imperative calls, which HeroUI does not expose for close). |
| **D7** | Staggered arrival on a virtualised list | **A list arrives once.** `Arrival` is a scope around a list. Rows that mount within `ARRIVAL.window` stagger exactly as `Appear` does today; the window is `STAGGER_CAP × STAGGER_STEP + durations.local` (540 ms), opened by the first row's mount. Rows that mount after it (scrolled in, re-mounted by windowing, refiltered or re-keyed) are present at once. Rows at index ≥ `ARRIVAL.limit` (20) never animate. | Read in `Atlas.tsx` and `motion.tsx`: today every row scrolled into the Atlas waits 360 ms and fades, and a row FlatList unmounts outside `windowSize` re-enters on return. `motion.md`: *"No animation on a list of more than ~20 items"*. Opening at the first row means a list whose data arrives late still arrives. | Stagger by mount order (impure in render). FlashList (not a dependency). No cap. |
| **D8** | Reduced motion | Every new motion reads `useMotion` (driven by `AccessibilityInfo`, asserted, including a mid-session change) and passes `ReduceMotion.System`. **It lands on its end state; it does not run faster.** The launch keeps F-231's two cuts, with the glow and wave at rest and the line at `launchProgress('arrived')`. | A6; F-144's "asserted rather than described". | — |
| **D9** | Enforcing "never a colour" | (a) **`verify-motion`** learns `useAnimatedProps` (allowlist `animatable ∪ animatableLength`). It refuses a worklet body it cannot read (a block body, a function reference or a top-level spread), refuses `interpolateColor`, and refuses `Animated` imported from `react-native`. Its plants go through the plant journal. (b) **Every new motion's test reads the keys its worklet actually returned** (`jestAnimatedStyle` / `jestAnimatedProps`) and the inks mid-motion. (c) **Dependency internals** are audited, and the audit is pinned to the audited version by a test. | The script reads our source only. Jest exposes exactly what a worklet returns, so the old comment in `motion.test.tsx`, *"What no test can see at all: whether an animated style animates a COLOUR"*, is half wrong and is corrected. | A global rendered rule over both registries. Rejected: HeroUI's worklets return constant colours, so a key-based rule reports pins as animations, and a time-sampled rule cannot see a state-driven transition. |
| **D10** | HeroUI's `Switch` (**conditional on increment 1's probe**) | Read in heroui-native 1.0.8 `switch.animation.ts`: both worklets return `backgroundColor`. The root's is constant per state under our `state: 'disabled'`. **The thumb's is a `withTiming`, because `'disabled'` does not reach compound parts**: only `'disable-all'` sets the `AnimationSettings` context the thumb reads. Reanimated's documentation says *"Animated styles take precedence over React Native's static styles"*, so on a device both paint HeroUI's theme colours over our `track` and `thumb` tokens. **If the probe confirms the interpolation, criterion 2 is false today and F-266 closes it** with `animation={{ state: 'disable-all' }}` on the root. The thumb then jumps; no mockup draws a slide. **The paint override is not motion. It is recorded as F-332 and not fixed here.** | Criterion 2 says *"Nothing"*. | Pin both worklets to our tokens through HeroUI's `backgroundColor.value`. That keeps the slide and fixes the paint, but `verify-motion` would have to tell a pin from an interpolation, which weakens a proven check. Offered to F-332. |

### What each named surface does (D1 applied)

| surface | drawn (inventory) | built | tokens | property |
|---|---|---|---|---|
| splash glow | `14.splash.glow` (`app:LaunchGlow`, alpha 0.602) | hidden during the rise; blooms over the hold from the mark's grid | `LAUNCH_HOLD` = `view`, `out` | opacity + `scale` on a wrapper; the Image's `tintColor` static |
| splash wave | `14.splash.wave` (`silk-wave`) | rises `RISE` → 0 with the mark | the rise (`view`, `out`) through `arrive` | `translateY` |
| splash line | `14.splash.progress` (`engine:launch.progress`) | equals `launchProgress(step)` at each step; moves over each segment | `view` per segment, `inOut` | `scaleX` from the leading edge |
| sheet | `03.sheet` + `03.sheet.handle`, `04.sheet` + `04.sheet.handle` | open, snap and close settle on one step | `view`, `out` | gorhom's position (a transform) |
| coverage dial | `11.coverage.ring` (`engine:coverage`); `11.coverage.figure` replaced | arc length moves to the new share | `view`, `inOut` | `strokeDashoffset` (D4), `opacity` at 0 |
| working ring | `27.lens-working.progress` (`engine:lens.progress`); `.glow` and `.mark` still | as the dial; on today's Lens the value is 0 throughout (D5) | `view`, `inOut` | `strokeDashoffset`, `opacity` |
| lists | `05`, `09`, `10`, `11`, `19`, `21`, `24` (records above) | stagger once per list (D7) | `STAGGER_STEP` (micro / 2), `STAGGER_CAP` 6, `local`, `out`, `RISE` | opacity + `translateY` |

### Reused

- **`packages/ui/src/motion.tsx`:** `useMotion` (`timing`, `duration`, `reduced`), `Appear`,
  `STAGGER_STEP`, `STAGGER_CAP`, `RISE`, `durations`. The tokens `nativeMotion` and `nativeSpacing`
  from `@irodora/design-tokens`.
- **`ProgressBar` and `PROGRESS_TRACK`** (F-231); **`ProgressRing`, `STATE_RING` and
  `WorkingState`** (F-236); **`CoverageDial`, `dialArc`, `DIAL_RADIUS`, `DIAL_STROKE` and
  `DIAL_SWEEP`** (F-235); **`Sheet`** (F-234).
- **The Card and Swatch precedent** of a module-scope `Animated.createAnimatedComponent`.
- **From `launch.tsx`:** `launchProgress`, `LAUNCH_HOLD`, `LAUNCH_GLOW` and the one-run sequence
  effect (F-231's review, B1).
- **`lens/pipeline.ts`:** `pipelineProgress` and `CAPTURE_STEPS`, unchanged.
- **`verify-motion.mjs`:** its `stripComments`, `topLevelKeys`, the manifest-derived allowlist and
  `--prove`. **`scripts/plant.mjs`:** `guardPlants`.
- **`@irodora/ui/testing`:** `flattenStyle`. **Reanimated's `getAnimatedStyle`.** Both conformance
  registries.
- **`motion.test.tsx`'s harness pattern:** fake timers, `jest.advanceTimersByTime`, a spied
  `AccessibilityInfo` with captured `reduceMotionChanged` listeners.
- **`screens.test`'s** `fakeBrowseStore` and `fakeStore` shapes, copied minimally where
  `list-arrival.test` needs a store. Its file-local fixtures are not exported.

### New

- **`packages/ui/src/motion.tsx`:**
  - `useValueMotion(value, step?)`, returning a `SharedValue<number>`;
  - `Arrival`, with `ARRIVAL = { window, limit }` and its context;
  - `Appear` reads the scope; `RISE` is exported.
- **`packages/ui/src/ArcFill.tsx`** (new): the animated fill shared by the ring and the dial. It
  draws `AnimatedPath` (module scope) with `d = sweepPath(...)` and `strokeDasharray [L, L]`, and its
  `useAnimatedProps` returns `{ strokeDashoffset, opacity }` and nothing else. Arithmetic only in
  the worklet.
- **`CoverageDial.tsx`** gains `sweepPath(cx, cy, r, from, sweep)` (one subpath, split at 180°,
  valid to 360° inclusive) and `sweepLength(r, sweep)`.
- **`ProgressBar`:** an `Animated.View` fill and an optional `step: DurationStep`.
- **`overlay.tsx`:** `SHEET_MOTION` replaces `SHEET_SPRING`.
- **`apps/mobile/src/launch.tsx`:** `LAUNCH_RISE = 'view'`, `launchLine(phase, started, reduced)`,
  `GLOW_BLOOM_FROM`, and test ids `launch.glow.bloom` and `launch.wave`.
- **The manifest:** `motion.animatableLength`, emitted as `nativeMotion.animatableLength`.
- **`@irodora/ui/testing`:** `animatedStyleOf(node)` and `animatedPropsOf(node)`. The second reads
  `props.jestAnimatedProps?.value` on the composite element; for SVG, the host node does not carry
  it.
- **`verify-motion.mjs`:** `animatedPropsKeys`, `unreadableWorklets`, `colourInterpolation`,
  `legacyAnimated`, and their plants.
- **Tests:**
  - `packages/ui/test/motion-dependencies.test.tsx`;
  - `apps/mobile/test/list-arrival.test.tsx`, with its `LIST_SURFACES` registry;
  - a conformance subject, `Arrival (a list arriving)`.
- **ADR-0133** and its README row.

### Increments (each green, one commit each; Tier 1 per [ADR-0132](../../docs/adr/0132-verification-is-tiered-scoped-checks-per-increment-the-full-gate-set-once-per-feature.md))

0. **Claim and plan.** F-266 `in_progress`, this plan written, the `plan` field set. *Extra gate:*
   `state`.

1. **Probe, read, decide.** Throwaway probes go in the scratchpad or in uncommitted test files that
   are deleted before the commit. **No source changes.**
   - (i) **Animated SVG props under jest.** An animated react-native-svg `Path` with
     `useAnimatedProps`: on which element `jestAnimatedProps` lands, whether advancing fake timers
     moves it, and whether the mapper walk stays safe. Its inputs must be a shared value and numbers
     only (E-069).
   - (ii) **The sheet's config.** gorhom's node receives `animationConfigs` through HeroUI's merge.
   - (iii) **The dependency audit.** Read every HeroUI animation hook that `@irodora/ui` renders:
     `PressableFeedback` (Button, IconButton), `RadioGroup` (ChoiceGroup), Switch root and thumb,
     `Skeleton`, `Toast`, the overlay and content hooks behind Popover, Dialog and BottomSheet, and
     `Tabs`. For the Switch: **supply the root's layout width first** (jest has no layout, and the
     thumb takes its unmounted branch until it has one), toggle, advance one frame, and read every
     node's animated `backgroundColor`.
   - (iv) **Read before quoting.** Read, before the ADR quotes them: reanimated's `useAnimatedStyle`
     page (precedence), WCAG 2.2 SC 2.2.2 and 2.3.3, Apple HIG *Motion*, Material 3 *Easing and
     duration*, and gorhom's `animate.ts`.

   Then write ADR-0133 (D1 to D10, D10 resolved by the probe) and its README row, and add a pointer
   from ADR-0127 §3 and §6. *Extra gates:* `state` if `.harness/` is touched (plan amendments).

2. **The manifest admits a length, and the gate learns to read it.**
   - The manifest gains `motion.animatableLength` and a sentence in `_note`. `emit/react-native.ts`
     emits it, and `generated/native.ts` is regenerated.
   - `typography.test.ts`: `animatable` is still exactly `['opacity', 'transform']` (the decoy that
     nothing widened it), and `animatableLength` is exactly `['strokeDashoffset']`.
   - **`verify-motion.mjs`:**
     - scans `useAnimatedProps(() => ({…}))` bodies against `animatable ∪ animatableLength`, while
       styles stay on `animatable` alone;
     - reports a `useAnimatedStyle(` or `useAnimatedProps(` call it cannot read (a block body, a
       reference, a top-level spread) as a finding, never a skip;
     - reports `interpolateColor` and an `Animated` import from `react-native`;
     - refuses to run if the built tokens lack `animatableLength`, never falling back to a list typed
       beside the manifest;
     - prints its new limits on every run;
     - its `--prove` gains every plant listed under *Test plan*, each paired with a passing decoy.
   - **Its plants go through `guardPlants`** (they are written into
     `packages/ui/src/__motion_probe__.tsx`, inside the tree). `plant-proof.mjs`'s
     `NO_JOURNAL_NEEDED` entry is removed: its reason, *"plants into a temporary file under the OS
     temp directory"*, is false, and this increment adds ten in-tree plants.

   *Extra gates:* `node scripts/verify-motion.mjs --prove`; `pnpm test:contrast` (it runs
   `generate-design-tokens --check`).

3. **No dependency animates a colour.**
   - `motion-dependencies.test.tsx`:
     - `AUDITED_HEROUI = '1.0.8'`, read from heroui-native's `package.json`, so an upgrade fails
       until it is re-audited;
     - for the Switch, the toggle-after-layout test.
   - **If increment 1 confirmed the thumb's interpolation:** `controls.tsx`'s `HeroSwitch` takes
     `animation={{ state: 'disable-all' }}`, and `verify-motion --prove` gains that shape as a
     passing case.
   - **If not:** the test still lands as the guard, and D10 records the negative.

   *Extra gate:* `verify-motion --prove`.

4. **The line moves between its steps.**
   - `useValueMotion`.
   - `ProgressBar`: an `Animated.View` fill, static parts in a style array (never a `{{…}}`
     literal, which `verify-motion` reads as animated), `transformOrigin: 'left'`, and a `step` prop.
   - `launch.tsx`: `LAUNCH_RISE`; the rise and its timer read it; `launchLine`; and
     `<ProgressBar value={launchLine(...)} step={phase === 'native' ? LAUNCH_RISE : LAUNCH_HOLD} />`.
   - `progress-bar.test` and `launch.test`. The line's readers move from `props.style`, which is the
     mount value, to `getAnimatedStyle`.
   - *Together, because `Launch` is `ProgressBar`'s only caller and its tests read the fill.*

   *Extra gates:* none. The root lint runs `verify-motion`, `verify-worklet-reach` and
   `verify-worklet-defaults`.

5. **The launch's ambience.** The glow's bloom wrapper on its own shared value, started by the
   arrival timer inside the existing one-run effect and set to 1 on the reduced path. The wave's
   `Animated.View` wrapper. `launch.test`. *Extra gates:* none (lint runs
   `generate-brand-assets --check` and `verify-app-glyphs`).

6. **An arc's length moves.** `ArcFill`, `sweepPath` and `sweepLength`. `ProgressRing` and
   `CoverageDial` render their fill through it, mounted always (opacity 0 at value 0) so that a
   change from 0 can move. `progress-ring.test` and `charts.test` are rewritten to the dash and use
   fake timers. *Extra gates:*
   - `verify-motion --prove` (its baseline-clean step now scans a real `useAnimatedProps`);
   - `node scripts/a11y-scope.mjs` (`ArcFill` must be reached).

7. **The sheet settles on the scale.** `SHEET_MOTION`, plus `sheet.test`, which reads only the node:
   no time advance. *Extra gates:* none.

8. **A list arrives once.** `Arrival`, `ARRIVAL` and `Appear`'s scope read. The `motion.test` cases.
   The registry subject `Arrival (a list arriving)`. Nothing in the app uses it yet. *Extra gate:*
   `node scripts/a11y-scope.mjs`.

9. **Every list surface arrives.** Each list gets `Arrival` around it and `Appear index` (row test
   ids) on its records:
   - `Atlas.tsx` (FlatList);
   - `Finder.tsx` (results);
   - `Wardrobe.tsx` (SectionList rows, with a global row index from section offsets);
   - `Combinations.tsx` (19, 24 and `atlas/with/reading`);
   - `Contemporary.tsx` (21);
   - `PaletteStudio.tsx` (the palettes list).

   `list-arrival.test.tsx` is added. Any `screens.test` reader that walks rows learns the wrapper; no
   assertion changes meaning. *Extra gates:* none (the app's Tier 1 tests include `screens.test`).

10. **Close-out.**
    - **Effects:** E-197 to E-200, with their notes; updates to E-067, E-068, E-113, E-166, E-181,
      E-182 and E-190, with a section in each note.
    - **Documents:**
      - R9 §8: rows `14` and `27` get ✓ (ADR-0133);
      - `DESIGN-SYSTEM.md`: a *Motion (F-266)* subsection;
      - `.harness/rules/frontend/motion.md` and `skills/motion/SKILL.md`: the length channel, *a value
        moves when it changes*, and *a list arrives once*;
      - the headers of `ProgressBar`, `ProgressRing`, `CoverageDial` and `launch.tsx`;
      - `motion.test`'s corrected docblock.
    - **F-332** if D10 applies.
    - Attestations, downstream notes, `progress.md` and lessons.
    - **Tier 2**, then the evaluator **once**.

## Mockup fidelity

- **Governing mockups:**
  - `14`, which governs the splash (P2), with C17 (`25`'s palette when light);
  - `03` and `04`, the sheet's forms;
  - `11` and `27`, the dial and the ring at `27`'s scale;
  - `05`, `09`, `10`, `11`, `19`, `21` and `24` for the list surfaces, under the C16 reading that
    `24` also governs `atlas/with/reading/[id]`.

  `26` adds nothing: no motion depends on locale.
- **Inventory elements this builds:** in each table above, in order:
  - `14.splash.glow`, `14.splash.wave` and `14.splash.progress`;
  - `03.sheet`, `03.sheet.handle`, `04.sheet` and `04.sheet.handle`;
  - `11.coverage.ring`, and `11.coverage.figure` (replaced, not moved);
  - `27.lens-working.progress`, with `.glow` and `.mark` still;
  - the record ids of the seven list surfaces.
- **Bindings:**
  - `engine:launch.progress`, which is still `launchProgress` (0, 0.5, 1 at each step) and is now
    interpolated (R9 §8: *"F-266 interpolates"*);
  - `engine:coverage`;
  - `engine:lens.progress` (`pipelineProgress`).

  No printed figure changes what it binds to, and none is ever drawn mid-count. No mockup value
  reaches the build: `14`'s ~80 % line, `11`'s 249° and `27`'s 218° remain sample content (E1).
- **Departures:** **none in §4 or §6.** Every motion ends on the drawn rest state, and no mockup
  draws an intermediate frame. If increment 1 finds an element whose rest state a motion would
  change, **stop: it is an open question, not a plan item.**

## Files to touch

```
docs/adr/0133-motion-is-the-change-a-drawn-binding-defines-and-a-length-may-move-where-a-colour-may-not.md (new), docs/adr/README.md
docs/adr/0127-*.md                      — a pointer from §3's "drift" and §6 to ADR-0133
docs/design/design-system.manifest.json — motion.animatableLength, motion._note
docs/design/R9-MOCKUP-FIDELITY.md       — §8 rows 14 and 27 ✓
docs/design/DESIGN-SYSTEM.md            — "Motion (F-266)"
.harness/rules/frontend/motion.md, .harness/skills/motion/SKILL.md
packages/design-tokens/src/emit/react-native.ts, src/generated/native.ts (regenerated), test/typography.test.ts
scripts/verify-motion.mjs, scripts/plant-proof.mjs (one NO_JOURNAL_NEEDED entry removed)
packages/ui/src/motion.tsx, ArcFill.tsx (new), ProgressBar.tsx, ProgressRing.tsx, CoverageDial.tsx, overlay.tsx, index.ts
packages/ui/src/controls.tsx            — only if D10 applies
packages/ui/src/testing/tree.ts, testing/index.ts — animatedStyleOf, animatedPropsOf
packages/ui/test/motion.test.tsx, progress-bar.test.tsx, progress-ring.test.tsx, charts.test.tsx, sheet.test.tsx,
  motion-dependencies.test.tsx (new), conformance.test.tsx (the Arrival subject)
apps/mobile/src/launch.tsx
apps/mobile/src/screens/Atlas.tsx, Finder.tsx, Wardrobe.tsx, Combinations.tsx, Contemporary.tsx, PaletteStudio.tsx
apps/mobile/test/launch.test.tsx, list-arrival.test.tsx (new); screens.test.tsx only where a row-walking reader must learn the wrapper
.harness/state/feature_list.json, effects.json, progress.md; .harness/memory/effects/*.md; .harness/memory/lessons/*.md
```

## Anticipated effects

| id | from → to | guard |
|---|---|---|
| **E-197** (high, new) | `design-system.manifest.json#motion.animatableLength` → the emitter, `generated/native.ts`, `verify-motion.mjs`, `ArcFill`, `ProgressRing`, `CoverageDial`; gates lint and contrast | `typography.test`: `animatable` is unchanged (decoy) and the length list is exact. `verify-motion --prove`: an animated `stroke`, `fill`, `strokeWidth` or `d` through `useAnimatedProps` is refused, and `strokeDashoffset` with `opacity` is allowed; `strokeDashoffset` inside a `useAnimatedStyle` is refused (the admission is props-only). `generate-design-tokens --check`. |
| **E-198** (high, new) | `package:heroui-native` (its animation hooks) → `controls.tsx#Switch`, every wrapper in `@irodora/ui`, `motion-dependencies.test` | The audited version is pinned, so an upgrade fails until it is re-audited. The Switch toggle after a supplied layout shows no intermediate colour one frame in. **Decoy:** the same Switch with `state: 'disabled'` alone shows the thumb's intermediate colour, which proves the test sees interpolation. |
| **E-199** (medium, new) | `motion.tsx#Arrival` → the six list screens, `list-arrival.test`, and F-246, F-250, F-251, F-252, F-254, F-255, F-259 | `motion.test`'s Arrival cases (stagger; a late row at rest, with the outside-scope decoy; the window edge; the limit; reduced; a theme change). `list-arrival.test`: one `Arrival` per surface, rows `Appear`-wrapped with indices 0…n−1, and the cited inventory ids exist. **Limit, stated:** a new list surface added without `Arrival` is not detected. |
| **E-200** (medium, new) | `motion.tsx#useValueMotion` → `ProgressBar`, `ArcFill`, `ProgressRing`, `CoverageDial`, `WorkingState`, `launch.tsx`, F-243, F-255 | The progress-bar, progress-ring and charts tests: at rest on mount (decoy: grown from 0); moves on change; only the allowed keys; the ink still mid-move; the figure already final mid-move; reduced lands at once, including mid-session. |
| **E-067** (update) | `motion.tsx` → `verify-motion`, gate motion | The new scans and their plants. Printed limits: dependency worklets (now E-198) and styles in test files. |
| **E-068** (update) | reduced motion, one setting, several mechanisms | `useMotion` is asserted for every new motion, including the Sheet's config. gorhom's own reduce-motion branch and HeroUI's read reanimated's module flag (always `false` under jest): device-only. |
| **E-113** (update) | `Appear` → `layout.tsx`, `Atlas.tsx` | `Appear` now reads an `Arrival` scope; outside one, behaviour is unchanged (the decoy). |
| **E-166** (update) | `overlay.tsx` → Lens, `sheet.test` | `animationConfigs` is read off gorhom's node: `view` duration, no spring keys, `reduceMotion: 'system'`, 0 under reduced. |
| **E-181 / E-182** (update) | `LaunchHost` / `ProgressBar` → `launch.tsx` | The bloom, rise and line cases; the line's readers now use `getAnimatedStyle`. |
| **E-190** (update) | `pipeline.ts` → `WorkingState`, F-266 | The ring moves only on a change; on the camera path it reads 0 throughout (D5). |

E-157 (inventory → constants) and E-169 (figures → `CoverageDial`) were read and are unchanged: no
constant moves, and the figure is still printed from `fraction`.

### Notes for downstream (written into each feature's notes at close-out)

- **F-243:** `WorkingState`'s ring moves only when its value changes. On the camera path it reads 0
  throughout. Never add a spinner (ADR-0133 D5).
- **F-244, F-245:** the sheet settles on `view` with `out` in both forms. `03`'s matches arrive with
  the sheet and are not staggered.
- **F-246, F-250, F-251, F-252, F-254, F-255, F-259:** the rebuilt list keeps `Arrival` around its
  records and `Appear index` on each, and keeps its entry in `list-arrival.test`'s `LIST_SURFACES`.
- **F-255** also: `CoverageDial` moves its arc on a coverage change and prints the figure at once.
  Whether the stagger is per tile or per row is the surface's choice.
- **F-262:** the Switch's thumb jumps rather than slides (if D10 applied). F-332 owns its paint on a
  device.
- **F-264:** in Washi the glow's bloom is a dark halo blooming (C17 ⇄). Compare it by eye.
- **F-265:** no motion depends on locale. Japanese copy changes row heights only.
- **F-267:** compare on a device:
  - the launch (bloom on arrival, wave rise, the line full before the app);
  - the sheet's settle, and a flick, now that the spring is gone;
  - the ring and the dial moving while the figure already says the value;
  - list arrival on a fast first fling and on scrolling back (no re-entry);
  - the Switch;
  - the whole app under the OS reduced-motion setting, toggled mid-session.
- **F-268:** measure:
  - cold start with the bloom and wave wrappers (two `Animated.View`s and one more shared value over
    F-231's ~780 ms);
  - frame time while an arc's dash moves (an SVG redraw per frame) on the slowest device;
  - first-screen arrival on the Atlas and the Wardrobe (at most 20 rows animate);
  - the sheet's settle.

## Test plan

- **Correctness against reality (recomputed from the record):** no golden dataset applies, because
  no colour value is computed or moved and no engine is touched. What is recomputed instead:
  - `GLOW_BLOOM_FROM` from `brand-assets.json`;
  - `L` from `STATE_RING` and `DIAL_*`;
  - `ARRIVAL.window` from `nativeMotion`, `STAGGER_STEP` and `STAGGER_CAP`;
  - the list registry's ids from `mockups/inventory/{05,09,10,11,19,21,24}.json`.
- **Consistency (properties):**
  - `launchLine` exhaustively over phase × started × reduced: at each step reached it equals
    `launchProgress`, and under reduced it equals `launchProgress(phase)`;
  - over 200 seeded values, `ArcFill` at rest gives `L·(1−v)` within 1e-9, with `opacity` =
    `v > 0 ? 1 : 0`;
  - the launch line is monotonic over 20 ms steps and never exceeds 1.
- **Interchangeability (conformance):** both registries keep their verdicts in every theme.
  `ProgressBar`, `ProgressRing` (via `WorkingState`), `CoverageDial` (11 and 11 ja), `Sheet`,
  `Switch` and the screens re-render. The new subject is `Arrival (a list arriving)`.
- **Does it work (e2e):** not runnable here (no device or JDK), and no journey is added.

**Unit tests, by file:**

- **`motion.test`:**
  - *useValueMotion:* mounts at rest (decoy: one grown from 0 reads less than `v` one frame in); one
    frame into a change it is strictly between the old and new values; lands exactly after `view`;
    under reduced it lands on the next frame (decoy: not reduced); a mid-session
    `reduceMotionChanged(true)` lands a running move.
  - *Arrival:*
    - row 0 is ahead of row 4 after `local`;
    - rows 6 and 8 are equal at every moment (the cap);
    - a row mounted after the window is present on its first frame. **Decoy:** the same late row
      outside any `Arrival` enters;
    - a row mounted one frame inside the window still enters;
    - row 19 enters and row 20 is present (the limit);
    - a re-mounted row (new key, after the window) does not re-enter;
    - under reduced, every row is present after one frame;
    - a theme change after the window moves nothing (F-240's note).
- **`progress-bar.test`:**
  - the scale is read through `animatedStyleOf`;
  - it moves over `view` with `inOut`;
  - the animated keys are exactly `['transform']` and the static `backgroundColor` stays
    `foreground` mid-move. **Decoy:** a fixture worklet in the test file returning
    `backgroundColor` is reported by the same reader;
  - reduced lands at once (with its decoy).
- **`progress-ring.test` and `charts.test`:**
  - the fill is `sweepPath` with `[L, L]`, and the offset at rest is `L·(1−v)`. Decoys: `11`'s
    249° is not drawn for 0.84; the stroke at full is the whole circle (offset 0);
  - no dot at 0 (decoy: 0.01 has `opacity` 1);
  - nothing moves with the value except the dash and its opacity (JSON compared without
    `strokeDashoffset`, `opacity`, `now`, `busy` and `jestAnimatedProps`);
  - a change moves the dash while the figure already shows the new value. **Decoy:** the offset is
    not yet at its end;
  - the animated keys are ⊆ `{strokeDashoffset, opacity}` and the `stroke` stays `foreground`
    mid-move;
  - reduced lands at once;
  - a palette or mode change repaints at once and moves nothing. **Decoy:** a value change does
    move.
- **`sheet.test`** (never advances time; E-069):
  - `animationConfigs.duration === nativeMotion.durations.view`;
  - `'damping'` and `'stiffness'` are absent;
  - `reduceMotion === 'system'`;
  - `SHEET_MOTION` is `{ step: 'view', easing: 'out' }`;
  - under reduced, the duration is 0;
  - **decoys:** gorhom's own 250 ms, and F-177's spring;
  - both forms carry it.
- **`launch.test`:**
  - one frame before arrival the line is already above 0.4. **Decoy:** the one-step-late reading
    would be at 0;
  - it is about 0.5 at arrival and about 1 at the hold's end;
  - it is full before `onDone`;
  - the glow's opacity is 0 at half the rise (decoy: a glow tied to the composition would read above
    0);
  - the bloom starts at `GLOW_BLOOM_FROM` and rests at opacity 1, scale 1;
  - the glow's animated keys are ⊆ `{opacity, transform}`, and its `tintColor` is still `foreground`
    mid-bloom;
  - the wave's `translateY` is `RISE`, then 0 at arrival;
  - **reduced** extends the existing case: glow (1, 1), wave 0 and line 0.5 after one frame.

**`list-arrival.test`:**

- **Structural**, with fake timers never advanced. Per surface: exactly one `Arrival` composite, and
  `Appear` composites under it with `index` 0…n−1 in render order. **Decoy:** a fixture list without
  `Arrival` is reported.
- Every cited inventory id exists.
- `Combinations` is rendered for both an entry and a garment subject.

**`motion-dependencies.test`:** as E-198.

**`verify-motion --prove` plants**, each with its passing decoy:

| plant | refused | allowed |
|---|---|---|
| `useAnimatedProps` | a `stroke`, `fill`, `strokeWidth` or `d` | `strokeDashoffset` with `opacity` |
| `useAnimatedStyle` | a `strokeDashoffset` key | — |
| an unreadable worklet | a block body, `useAnimatedStyle(styleFor)`, a top-level `...paint(p.value)` spread | the arrow-object form |
| `interpolateColor` | a call | the word inside a comment |
| the engine | `import { Animated } from 'react-native'` | the reanimated default import |
| the Switch | — | `animation={{ state: 'disable-all' }}` |

### How reanimated is tested here

Reanimated is **not mocked**: HeroUI calls `useReducedMotion`, which the mock omits
(`jest.config.mjs`). So:

- **fake timers** and `jest.advanceTimersByTime`, never the deprecated `advanceAnimationByTime`;
- **animated styles** are read with `getAnimatedStyle`; `props.style` is the mount value;
- **animated props** are read from `props.jestAnimatedProps.value` on the composite element that
  `createAnimatedComponent` renders, located by its `testID` prop in `UNSAFE_root`.
  react-native-svg's host does not carry it; increment 1 confirms which element does;
- **assertions** are on start, end and reduced states, plus **relational** mid-move frames (strictly
  between), never an exact frame N;
- **time is advanced** only in component tests whose worklets capture shared values and numbers.
  Conformance, sheet and screen tests never advance time, because the mapper walk reaches React
  Native's namespace (E-069). That is why `list-arrival.test` is structural;
- **reduced motion** is driven through `AccessibilityInfo.isReduceMotionEnabled` and the captured
  `reduceMotionChanged` listeners, with the promise flushed in `act`.

## Verification

```
# Tier 1 — every increment's commit (ADR-0132); commands and exit codes go in the Status table
pnpm format:check
pnpm typecheck
pnpm lint                                  # the ROOT chain: verify-motion, verify-worklet-reach/-defaults, generate-brand-assets --check, verify-app-glyphs, plant-proof, verify-mockups, …
pnpm turbo run test --filter='...[HEAD]'
# plus, only where the increment changes what they read:
node scripts/verify-state.mjs              # 0, 1, 10, and any increment that edits .harness/
node scripts/verify-motion.mjs --prove     # 2, 3, 6 — it is NOT in the lint chain
pnpm test:contrast                         # 2 (generate-design-tokens --check)
node scripts/a11y-scope.mjs                # 6, 8 (a new component must be reached)

# Tier 2 — once at Verify, and again on the final tree after the review's fixes
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:a11y && pnpm test:contrast && pnpm test:cvd
node scripts/verify-motion.mjs --prove
pnpm security                              # always-gate; record its exit (F-322 if still red; F-266 adds no dependency)
node scripts/verify-ci.mjs --all           # read with F-295 in mind
```

**Not run, and why:**

- `color-golden`: no engine change and no golden value;
- `content`: no catalogue key. If one is added, add `content` to F-266's verification in that
  increment;
- `e2e`, `artifact`: no device and no JDK here;
- `perf`: gate 12 measures the engine, not frames; F-268 owns it.

### Attestations (`blocks: release`, `outstanding`)

- **Criterion 1:** *"The splash wave, glow and progress (14), the sheet detents (03 04), the coverage
  dial and the working ring (11 27), and staggered arrival on list surfaces animate with the motion
  system’s durations and easings"*
  - **The tree is gated by** the tests above.
  - **What needs a device:**
    - 60 fps on the slowest supported device;
    - the dash on iOS and Android (start at 12 o'clock, round caps, no dot at 0, no gap at full);
    - the settle and a flick without the spring;
    - the bloom and rise in Sumi and Washi;
    - arrival on a fast first fling and on scrolling back.
- **Criterion 2:** *"Nothing animates a colour value, and every motion stops under reduced-motion"*
  - **Gated by:** `verify-motion` (including `--prove`), the animated-key assertions, the dependency
    test, and reduced motion asserted per motion, including mid-session.
  - **What needs a device:**
    - iOS *Reduce Motion* and Android *Remove animations*, toggled mid-session;
    - gorhom's and HeroUI's own reduced paths;
    - the Switch animating no colour.
- **This workstation has no JDK, Android SDK or Xcode.**

## Risks and open questions

**No `OQ-*` blocks this feature.** D1 to D10 close under the 2026-10-05 delegation in ADR-0133.

1. **R1, reanimated in jest:** the mapper walk (E-069). Time is advanced only where the inputs are
   shared values and numbers. If increment 1's probe shows `ArcFill`'s animated props trip it, its
   time-based cases move behind the same structural reading `list-arrival` uses, and the motion is
   proven on `useValueMotion` alone.
2. **R2, animated SVG props on Fabric** (Reanimated 4.5.3, react-native-svg 15.15.5, RN 0.86):
   device-only. **Platform dash details:** path length against `2πr` (sub-0.05 dp), caps,
   zero-length dots. Mitigated by one subpath from the start and opacity 0 at 0.
3. **R3, the sheet's feel without a spring** (D6): F-267 judges it. If a person rejects it, the
   criterion and the feel conflict, and that is a person's call.
4. **R4, D10 is probe-dependent.** The paint override (HeroUI's theme colours over our tokens on a
   device) is real by reanimated's own precedence rule, is not motion, and becomes F-332.
5. **R5, the perf budget:** the launch gains two animated wrappers and one shared value; an arc's
   dash redraws an SVG per frame; arrival animates up to 20 rows. Gate 12 cannot see any of it
   ([[a-performance-gate-cannot-measure-a-phone]]); F-268 measures.
6. **R6, `Appear` wrappers change trees** that `screens.test` readers walk (for example Finder's
   `inOrder` heights, and the Atlas's `listData`). The readers adapt; no assertion's meaning changes.
7. **R7, the six list screens are pre-R9** and will be rebuilt (F-246 to F-259). The registry and the
   notes carry the requirement; a new list surface without `Arrival` is not detected (E-199's stated
   limit).
8. **R8, a time-based window:** a list whose first row mounts after a long async load still arrives
   (the window opens at the first row). A list that streams rows for more than 540 ms shows the late
   rows at rest, by design.
9. **R9, worklet reach:** `verify-worklet-reach` scans `apps/mobile/src` only. Every new worklet in
   `packages/ui` is arithmetic on captured values with no calls, which E-050's failure mode needs.

### What this plan rests on

**Verified by reading (the planner's):**

- **Motion system and launch:** `motion.tsx` (`STAGGER_STEP` = micro/2, `STAGGER_CAP` 6, `RISE` =
  `nativeSpacing.sm`, `Appear`, `usePress`, `overlayKeyframes`); the manifest's `motion` block
  (`forbidden` includes width, height, top and left); `typography.test` pins `animatable`;
  `launch.tsx`'s sequence; `launch.test` reads the line from `props.style`.
- **`verify-motion`:** its scans, its `topLevelKeys`, and that `--prove` is not in `lint`; its plant
  path is in-tree, while `plant-proof`'s exemption says OS temp.
- **The components:** `ProgressBar`, `ProgressRing` (`Circle` at 1, `null` at 0) and `CoverageDial`
  (`dialArc`, the figure from `fraction`); `WorkingState`, and the Lens passing
  `pipelineProgress(CAPTURE_STEPS, 0)`; `Sheet` (`SHEET_SPRING` 28/260/1; `timing('micro')` under
  reduced).
- **The libraries:** HeroUI's `bottom-sheet-content` merging `reduceMotion`; gorhom's `animate.ts`
  routing `duration`/`easing` to `withTiming`, and `DEFAULT_ANIMATE_ON_MOUNT` true; HeroUI's
  `switch.animation.ts`, and `switch.tsx`'s `AnimationSettingsProvider`; reanimated's `jestUtils`
  (`jestAnimatedProps` forwarded to the wrapped component); reanimated's documentation on precedence.
- **The app:** the Atlas FlatList with `Appear index`, `initialNumToRender` 6 and `windowSize` 10;
  the Wardrobe SectionList, Finder, Combinations, Contemporary and PaletteStudio lists without
  `Appear`; `a11y-scope`'s closure rule.
- **Ids, rules and inventories:** the inventory ids quoted; E-196 is the last effect, ADR-0132 the
  last ADR, F-331 the last feature; `rules/frontend/motion.md` (figures never count; about 20 items;
  springs for drags) and the motion skill (a sheet is `view`).

**Assumed, and checked in increment 1 or on a device:** where `jestAnimatedProps` lands for an SVG
`Path`; that advancing time on `ArcFill` is mapper-safe; the thumb's interpolation once it has a
layout; that HeroUI's root type accepts `{ state: 'disable-all' }` (typecheck will say); dash
rendering and animated SVG props on device; the external sources' wording, which is read before
ADR-0133 quotes it.

**Read for this plan:** `AGENTS.md`, `mockups/AGENTS.md`, R9 §2–§12, TEMPLATE, ADR-0132, ADR-0127,
ADR-0128 (by reference), PRD NFR-4, NFR-7, NFR-8 and FR-69, ACCESSIBILITY A6, BRAND *Motion*,
DESIGN-SYSTEM; mockups `14`, `03`, `04`, `11`, `27`, and inventories `14`, `03`, `04`, `11`, `27`,
`05`, `09`, `10`, `19`, `21`, `24`; the source files above; `effects.json` (E-067, E-068, E-069,
E-113, E-157, E-166, E-169, E-178 to E-182, E-188, E-190, E-196), and the memory notes on the first
animated portal, worklet reach and the progress line.

## Out of scope

- **Motion on any surface not named:** Home's sections (F-188), Dialog and Popover (F-144), press
  responses (F-189), and screen transitions (the native stack, owned by the OS).
- **Kinds of motion not built:** a pulsing glow or mark in `27`; an indeterminate spinner; counting
  figures; a lateral wave drift; any loop.
- **Other features' work:** the Switch's paint on a device (F-332); rebuilding the list surfaces
  (F-242 onward); the docked sheet's placement (F-245; it inherits the settle); measuring performance
  (F-268).
- **Also not done:** changing any duration or easing value; haptics; RTL.

## Amendments on adoption (the implementing session)

1. **Adopted as written**, D1–D10 included, so the one review can contest them.
2. **Checked before adoption:** ADR-0133, E-197 to E-200 and F-332 are free; E-067, E-068, E-113,
   E-166, E-181, E-182 and E-190 exist with the `from` the plan names. `plant-proof.mjs` does exempt
   `verify-motion.mjs` with the reason *"plants into a temporary file under the OS temp
   directory"*. Removing that exemption is this feature's, because increment 2 adds in-tree plants
   to `verify-motion`. It does not overlap F-296, which is about `plant-proof` deleting a journal it
   did not write.
3. **A source an ADR quotes is read before the ADR quotes it** (increment 1). A claim only available
   second-hand is stated as such.
4. **D10 follows the probe.** If increment 1 does not see the thumb interpolate a colour, D10
   records the negative, nothing in `controls.tsx` changes, F-332 is not created for the paint, and
   the dependency test lands as the guard.
5. **One review, then fix or record** (AGENTS.md loop step 5); Tier 1 per increment and Tier 2 once
   per feature (ADR-0132).
6. **D10 widened by increment 1's probe; no F-332.**
   - **The probe confirmed the thumb's interpolation**, and found it also animates `start`, a layout
     property `forbidden` names as `left`.
   - **A second probe** gave HeroUI's root `state: 'disable-all'`, and the root and the thumb
     `backgroundColor.value` pairs. Both jumped: one frame after the toggle, each read its final
     colour and position. The colours read were the ones passed.
   - **So increment 3's Switch passes both:** `disable-all`, and our painted `track` and `thumb`
     tokens as the worklets' values.
     - Under reanimated's precedence, those constant colours are what paints on a device. That
       closes HeroUI's paint override on the element this feature already changes.
     - It keeps the colour-vision preview's reach to the Switch true (ADR-0131).
     - With every animation disabled, nothing distinguishes a pin from an interpolation. This was
       the plan's reason to defer the pin.
   - `motion-dependencies.test` reads the root's and the thumb's animated colours. They must be our
     tokens in both states, and one frame after the toggle neither the colour nor `start` may be
     between its two states.
     - **Decoy:** HeroUI's own Switch with only `state: 'disabled'` shows the intermediate thumb
       colour.
   - ADR-0133 §10 records this. F-332 is not created, and the notes for F-262 lose its mention.

## Status (implementing session)

| increment | commit | notes (Tier 1 commands and exit codes, per ADR-0132) |
|---|---|---|
| 0 | this commit | **Claim and plan.** F-266 `in_progress`; the planner's plan adopted with the amendments above; the `plan` field set. **Tier 1:** format, state. Nothing executable changed. |
| 1 | this commit | **Probe, read, decide.** The probes were throwaway jest files, deleted, with their results in ADR-0133's *Context*.
- **(i)** `jestAnimatedProps` lands on react-native-svg's `Path` composite, not on the `RNSVGPath` host, which keeps its mount value. A 0.2 → 0.8 change read `strokeDashoffset` 80, then 79.49 one frame in, then 20. Advancing time on an arithmetic worklet is safe.
- **(ii)** The sheet hands gorhom `{damping 28, stiffness 260, mass 1}`. gorhom's `animate.ts` routes a `duration` or `easing` to `withTiming`.
- **(iii)** HeroUI's Switch thumb interpolates `backgroundColor` (`rgba(187,187,187,0.50)` three frames in) and slides by animating `start`. The rest of HeroUI we render animates no colour. Amendment 6 records a second probe: `disable-all` with pinned values jumps and paints the values given.
- **(iv)** Read before quoting: reanimated's `useAnimatedStyle` page (precedence), WCAG 2.2 SC 2.2.2 and 2.3.3, Apple HIG *Motion*, Material 3 *Easing and duration* (read in the in-app browser; it says that system *"is no longer maintained"*), and gorhom's `animate.ts`.

**ADR-0133** (D1–D10, with D10 widened) and its README row; ADR-0127 §3 and §6 point to it. No source changed. **Tier 1:** format, state. |
| 2 | | |
| 3 | | |
| 4 | | |
| 5 | | |
| 6 | | |
| 7 | | |
| 8 | | |
| 9 | | |
| 10 | | |
| review | | |
