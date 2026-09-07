/**
 * The form controls (F-156) — `Switch`, `Select`, `Slider`, `Accordion`.
 *
 * ## Why these four are wrapped when eleven others were refused
 *
 * [`heroui-wrappers.md`](../../../.harness/rules/frontend/heroui-wrappers.md): *"Wrap HeroUI
 * when there is BEHAVIOUR to inherit. Do not wrap it for provenance."* F-143 measured sixteen
 * candidates against that and shipped two. These four pass it on the merits — a checked state a
 * screen reader must hear, list keyboard handling and focus return, a drag with an announced
 * value, an expanded state and managed focus. All of it tedious, easy to get subtly wrong, and
 * invisible to a sighted developer with a mouse.
 *
 * ## Four decisions made once, here, rather than four times
 *
 * **1. The wrapper owns the accessible name.** F-143's finding, and it recurs on every one of
 * these: HeroUI wraps whatever you hand it in a bare pressable and puts no name on it. React
 * Native has no `htmlFor`, so a switch sitting beside a perfectly good `<Text>` is an unnamed
 * toggle to anyone not looking at the screen. Each control here takes a `label: string` and
 * puts it on the pressable itself.
 *
 * **2. Colour reaches these through `style`, never `className`.** Uniwind resolves `className`
 * in Metro, jest never runs Metro, and a colour routed through a class is absent from the tree
 * the contrast gate reads [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]].
 *
 * **3. Every theme-decided background layer is refused.** `Switch.Background`, `Slider.Track`'s
 * background and `Select.Content` all render a layer *"decided by the active library theme"*,
 * and one of the theme's choices is a blur. A blur tints what it surrounds, which is the
 * simultaneous-contrast hazard `swatch.well` exists to prevent.
 *
 * **4. Controlled only.** A value that lives inside the component cannot be driven by a
 * conformance subject, and that is what makes every state of these checkable at all.
 *
 * ## The colour animation is off, and this is the one that is product-specific
 *
 * HeroUI's `Switch` interpolates its track `backgroundColor` over 175 ms by default. For most
 * products that is a nicety. Here the intermediate frames are **plausible colours the engine
 * never produced**, which is why `motion.animatable` is `opacity` and `transform` and nothing
 * else. `animation={{ state: 'disabled' }}` gives the instant value instead of the transition —
 * the switch still changes colour, it just does not travel through colours on the way.
 *
 * `scripts/verify-motion.mjs` learned this prop in the same feature: its table named
 * `highlightAnimation` and `rippleAnimation`, and a third way in was a third way in
 * [[a-table-driven-check-is-only-as-complete-as-its-table]].
 */

import { useState } from 'react';
import { View } from 'react-native';
import {
  Accordion as HeroAccordion,
  Select as HeroSelect,
  Slider as HeroSlider,
  Switch as HeroSwitch,
} from 'heroui-native';
import { nativeRadius, nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
import { overlayKeyframes } from './motion.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';
import type { Script } from './layout.js';

/**
 * The switch track, sized so the TARGET is the target.
 *
 * WCAG 2.2 asks for 44 on the thing a finger lands on, and HeroUI's default track is 32 tall.
 * Raising the track rather than adding `hitSlop` is deliberate: the conformance rule reads
 * `minWidth`/`minHeight` off the rendered node because a JS render tree has no Yoga pass
 * (ADR-0055), so a hit area declared any other way is invisible to it — and, more to the point,
 * invisible to a reviewer.
 */
const SWITCH_WIDTH = 68;
const SWITCH_THUMB = 34;
/** Centres a 34px thumb in a 44px track. HeroUI's `left` is the offset from the near edge. */
const SWITCH_THUMB_INSET = (nativeTapTarget - SWITCH_THUMB) / 2;

export interface SwitchProps {
  /**
   * What this switch turns on, in the caller's language.
   *
   * Drawn beside the control **and** used as its accessible name. One string, so the two cannot
   * diverge — the same arrangement `Chip` and `Button` use, and for the same reason.
   */
  readonly label: string;
  /** A second line under the label. Never the only place a consequence is stated. */
  readonly description?: string;
  readonly checked: boolean;
  readonly onCheckedChange: (checked: boolean) => void;
  /**
   * Focused by an external keyboard or Switch Control.
   *
   * Distinct from `checked`: focus is where the cursor is, checked is what it is set to, and a
   * control rendering them identically has one of them in name only.
   */
  readonly focused?: boolean;
  readonly disabled?: boolean;
  /** The thing behind this switch is still settling. Announced busy, not only dimmed. */
  readonly loading?: boolean;
  readonly script?: Script;
  readonly testID?: string;
}

/**
 * A two-state toggle.
 *
 * ## It is never on by colour alone
 *
 * Golden rule 13, and a switch is the control most often built as a coloured track and nothing
 * else. Three channels here: the **thumb's position**, which is spatial and survives any
 * deficiency; `accessibilityState.checked`, which a screen reader announces; and the track
 * colour, which is the one a person who cannot separate the two tones does not need.
 *
 * ## Nothing in this product uses one yet, and that is recorded rather than papered over
 *
 * *"No wrapper without a consumer"* — and after looking, **this product has no user-facing
 * boolean.** The message catalogue holds no on/off copy, the wardrobe schema has no boolean
 * column, and twice a feature reached the place a toggle would go and chose labelled
 * alternatives with the reason written down: the Lens (*"two chips rather than a button that
 * toggles: a toggle says what it will do next"*) and the profile bands (*"discrete rather than
 * a slider"*).
 *
 * A colour product's settings are *which one*, not *whether*. So this is registered in the
 * conformance registry — which ADR-0054 and gate 8 accept as a consumer — and the absence is
 * stated here rather than closed by inventing a preference to justify a control.
 */
export function Switch({
  label,
  description,
  checked,
  onCheckedChange,
  focused = false,
  disabled = false,
  loading = false,
  script = 'latin',
  testID,
}: SwitchProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;

  // `inverse` pairs with `inverse.foreground`; `surface.3` pairs with `foreground`. Both are
  // declared in the manifest, which is what makes the thumb-on-track choice below not free.
  const track = checked ? colors.inverse : colors['surface.3'];
  const thumb = checked ? colors['inverse.foreground'] : colors['surface.1'];

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpacing.md }}>
      {/*
        THE VISIBLE LABEL IS NOT AN ACCESSIBILITY ELEMENT, and the switch carries the name.

        Without this a screen reader reads the word, then reaches the switch and reads the word
        again with the state attached. Hiding the drawn copy leaves exactly one announcement,
        which is the switch's — role, name and checked state together.

        Both props, because they are the two platforms' spellings of the same thing.
      */}
      <View
        style={{ flex: 1, gap: nativeSpacing.xs }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Text size="body" color="foreground" script={script}>
          {label}
        </Text>
        {description === undefined ? null : (
          <Text size="xs" color="foreground.2" script={script}>
            {description}
          </Text>
        )}
      </View>
      <HeroSwitch
        testID={testID}
        isSelected={checked}
        onSelectedChange={onCheckedChange}
        isDisabled={inert}
        accessibilityLabel={label}
        /*
          `checked` AND `busy` AND `disabled`, stated rather than inherited. HeroUI's primitive
          sets `role="switch"` and `accessibilityState.checked` itself and then spreads
          `...props` after them — so this replaces its object wholesale, and `busy` would be
          lost if it were left to the library.
        */
        accessibilityState={{ checked, disabled: inert, busy: loading }}
        /*
          THE COLOUR TRANSITION, OFF. See the header: the intermediate frames of a colour
          interpolation are colours the engine never produced. `state: 'disabled'` makes
          HeroUI return the value instead of a `withTiming` toward it.
        */
        animation={{ state: 'disabled' }}
        // `null` removes the theme-decided layer. One of the theme's choices is a blur.
        background={null}
        style={{
          minWidth: nativeTapTarget,
          minHeight: nativeTapTarget,
          width: SWITCH_WIDTH,
          height: nativeTapTarget,
          borderRadius: nativeRadius.pill,
          justifyContent: 'center',
          backgroundColor: track,
          // A ring, not a fill: focus has to be visible on a switch that is already on, and a
          // changed fill would be indistinguishable from being on.
          borderWidth: focused ? 2 : 0,
          ...(focused ? { borderColor: colors.ring } : {}),
          opacity: inert ? 0.5 : 1,
        }}
      >
        <HeroSwitch.Thumb
          animation={{ left: { value: SWITCH_THUMB_INSET } }}
          style={{
            width: SWITCH_THUMB,
            height: SWITCH_THUMB,
            borderRadius: nativeRadius.pill,
            backgroundColor: thumb,
          }}
        />
      </HeroSwitch>
    </View>
  );
}

export interface SelectOption {
  readonly value: string;
  readonly label: string;
  /** A second line under the option. Where a choice needs a reason, not a restatement. */
  readonly description?: string;
  /** Offered and unavailable — a disabled option explains itself; an absent one cannot. */
  readonly disabled?: boolean;
}

export interface SelectProps {
  /**
   * What is being chosen. Drawn above the trigger and used as the trigger's accessible name,
   * so *"Theme, Fuka"* is announced rather than *"Fuka"*.
   */
  readonly label: string;
  readonly options: readonly SelectOption[];
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** What the scrim announces. Caller-supplied: `@irodora/ui` owns no copy (ADR-0056). */
  readonly closeLabel: string;
  /** Shown on the trigger when `value` matches no option. */
  readonly placeholder?: string;
  readonly focused?: boolean;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly script?: Script;
  /** Controlled open state. Omit to let the component own it; the registry forces it open. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly testID?: string;
}

/**
 * A list of options, opened from a control that shows the current one.
 *
 * ## `options` is a list, not children
 *
 * The compound form is `Root → Trigger → Value → Portal → Overlay → Content → Item →
 * ItemLabel → ItemIndicator`, which is nine things a screen can get wrong and at least two of
 * the mistakes are silent. `Select.Item` additionally takes `value` **and** `label` as separate
 * required props, so a caller can render one string and select another.
 *
 * A list closes both: the label a person reads and the value the app stores travel together,
 * and the panel cannot disagree with the trigger about what is in it.
 *
 * ## The trigger and the scrim are named here
 *
 * The same finding as `Popover`'s, one component along: HeroUI renders both as bare pressables
 * with no role and no name, so to anyone not using a pointer the scrim is an unnamed
 * full-screen tap target and the trigger announces nothing.
 */
export function Select({
  label,
  options,
  value,
  onValueChange,
  closeLabel,
  placeholder,
  focused = false,
  disabled = false,
  loading = false,
  script = 'latin',
  open,
  onOpenChange,
  testID,
}: SelectProps): React.JSX.Element {
  const { colors } = useTheme();
  const [internal, setInternal] = useState(false);
  const inert = disabled || loading;
  /*
    A DISABLED SELECT IS NOT AN OPEN ONE, and this is stated rather than left to the caller.

    The conformance suite is what asked the question: rendering the subject `open` and
    `disabled` together put a live list and a full-screen scrim behind a control that refuses
    to be used, and reported the scrim as *"disabled but does not say so"*. There is no honest
    answer to "what does a disabled dropdown's list announce" — a control that cannot be
    operated has no list.
  */
  const isOpen = (open ?? internal) && !inert;
  const chosen = options.find((o) => o.value === value);
  const shown = chosen?.label ?? placeholder ?? '';

  const setOpen = (next: boolean): void => {
    if (open === undefined) setInternal(next);
    onOpenChange?.(next);
  };

  return (
    <View style={{ gap: nativeSpacing.xs }}>
      <Text size="label" color="foreground.2" script={script}>
        {label}
      </Text>
      <HeroSelect
        presentation="dialog"
        isOpen={isOpen}
        onOpenChange={setOpen}
        isDisabled={inert}
        value={{ value, label: shown }}
        onValueChange={(next) => {
          /*
            HeroUI's value is an option object, an ARRAY in multiple mode, or `undefined` — its
            own `SelectOption` type includes it. This wrapper is single-select, so anything
            else is a shape it did not ask for and must not guess about: a cleared selection
            arriving as `onValueChange('')` would be this component inventing a value.
          */
          if (!Array.isArray(next) && next !== undefined) onValueChange(next.value);
        }}
      >
        <HeroSelect.Trigger
          testID={testID}
          variant="unstyled"
          accessibilityRole="button"
          // The FIELD and the VALUE. "Theme" alone does not say what is chosen; "Fuka" alone
          // does not say what it is. A screen reader gets one string, so it carries both.
          accessibilityLabel={`${label}: ${shown}`}
          accessibilityState={{ expanded: isOpen, disabled: inert, busy: loading }}
          style={{
            minWidth: nativeTapTarget,
            minHeight: nativeTapTarget,
            justifyContent: 'center',
            paddingHorizontal: nativeSpacing.md,
            borderRadius: nativeRadius.sm,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? colors.ring : colors['border.strong'],
            backgroundColor: colors['surface.2'],
            opacity: inert ? 0.5 : 1,
          }}
        >
          <Text
            size="body"
            color={chosen === undefined ? 'foreground.2' : 'foreground'}
            script={script}
          >
            {loading ? `${shown}…` : shown}
          </Text>
        </HeroSelect.Trigger>
        <HeroSelect.Portal>
          <HeroSelect.Overlay
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            /*
              THE TARGET IS DECLARED even though the scrim covers the screen. A JS render tree
              has no Yoga pass (ADR-0055), so "it is obviously bigger than 44" is a fact no
              check here can establish — and `Popover`'s scrim has the same shape and was never
              asked, because its portal does not mount under jest (E-097).
            */
            style={{
              minWidth: nativeTapTarget,
              minHeight: nativeTapTarget,
              backgroundColor: colors.backdrop,
            }}
          />
          <HeroSelect.Content
            /*
              `dialog`, NOT `popover`, and this was decided by probing rather than by taste.

              **An anchored presentation's panel never mounts under jest.** HeroUI's Select
              portal returns `null` until `triggerPosition` is set, and that is filled by a
              `measure()` callback the native layer fires — react-test-renderer has no native
              layer, so the callback never comes. A `popover` Select rendered with `isOpen` in
              a conformance subject produces a trigger and nothing else, and every rule about
              the list passes over an empty tree. (`Popover` itself has the same guard; see
              E-097.)

              **And the ground would not be ours.** The bottom-sheet form offers only
              `contentContainerClassName` for its panel, and F-158 established what happens
              then: HeroUI paints `rgba(0, 0, 0, 0.75)` from its own theme, and a colour nobody
              in this repository chose ends up behind a list.

              `dialog` mounts without a measured trigger and takes `styles.content` as a real
              `ViewStyle`, so the panel's ground is a token the contrast gate can read. A modal
              list is also the better phone pattern for a small closed set; an anchored dropdown
              is a desktop idiom.
            */
            presentation="dialog"
            // Our timing, not HeroUI's 200/150 (F-144). An overlay moving at a different speed
            // from the screen behind it is the specific thing that reads as assembled.
            animation={overlayKeyframes}
            styles={{
              content: {
                backgroundColor: colors['surface.2'],
                borderRadius: nativeRadius.lg,
                borderWidth: 1,
                borderColor: colors['border.strong'],
                padding: nativeSpacing.xs,
                gap: nativeSpacing.xs,
              },
            }}
          >
            {options.map((option) => (
              <HeroSelect.Item
                key={option.value}
                value={option.value}
                label={option.label}
                disabled={option.disabled === true}
                accessibilityRole="button"
                // The tick is in the NAME as well as the state, because a highlight a screen
                // reader cannot read is not a second channel (golden rule 13).
                accessibilityLabel={option.value === value ? `${option.label} ✓` : option.label}
                accessibilityState={{
                  selected: option.value === value,
                  disabled: option.disabled === true,
                }}
                style={{
                  minWidth: nativeTapTarget,
                  minHeight: nativeTapTarget,
                  justifyContent: 'center',
                  paddingHorizontal: nativeSpacing.md,
                  gap: nativeSpacing.xs,
                  /*
                    `radius.xs` — THE STEP THE LEDGER WAS WAITING FOR. It has been declared
                    unreached since F-017 with the reason *"some steps have not met their
                    surface yet"*, and this is the surface: a row nested inside a panel that
                    already has `radius.lg`, where the same corner would read as a bubble.
                  */
                  borderRadius: nativeRadius.xs,
                  /*
                    `surface.1` FOR THE CHOSEN ROW, not `surface.3`, and the manifest decided
                    it. `surface.3` pairs with `foreground` and with nothing else, so an option
                    carrying a description — `foreground.2` — drew a pair gate 9 has no opinion
                    about, and the suite reported `pair-undeclared`. `surface.1` is declared
                    against all three foregrounds.
                  */
                  backgroundColor: option.value === value ? colors['surface.1'] : 'transparent',
                  opacity: option.disabled === true ? 0.5 : 1,
                }}
              >
                <Text size="body" color="foreground" script={script}>
                  {option.value === value ? `${option.label} ✓` : option.label}
                </Text>
                {option.description === undefined ? null : (
                  <Text size="xs" color="foreground.2" script={script}>
                    {option.description}
                  </Text>
                )}
              </HeroSelect.Item>
            ))}
          </HeroSelect.Content>
        </HeroSelect.Portal>
      </HeroSelect>
    </View>
  );
}

export interface SliderProps {
  /** What is being set. The thumb's accessible name, and drawn above the track. */
  readonly label: string;
  readonly value: number;
  readonly onValueChange: (value: number) => void;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /**
   * The current value, already formatted by the caller.
   *
   * **A string, and required, and this is the one that would be silently wrong.** React
   * Native's bridge takes `accessibilityValue.min/max/now` as integers, so HeroUI normalises
   * every slider to a 0–100 percentage and puts the readable value in `text`. Left to the
   * default, a severity of 0.35 announces as *"35"* — a number whose units are not percent and
   * whose quantity is not 35.
   *
   * The caller formats it because the caller owns the units and the catalogue; `@irodora/ui`
   * owns neither (ADR-0056).
   */
  readonly valueLabel: string;
  readonly focused?: boolean;
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly script?: Script;
  readonly testID?: string;
}

/** How tall the track is drawn. Below this a thumb has nowhere to sit and the bar reads as a rule. */
const TRACK_HEIGHT = 10;
/** The visible thumb. The TARGET around it is `nativeTapTarget`; see the note at the thumb. */
const THUMB_DISC = 24;

/**
 * A draggable value on a bounded interval.
 *
 * ## The value is shown, always
 *
 * A slider whose position is the only readout is a control you can move but cannot set. The
 * number is drawn beside the label and announced through `accessibilityValue.text`, so the two
 * channels agree and neither is the colour of the fill.
 *
 * ## Single thumb only
 *
 * HeroUI supports a range. This does not, because the one place this product wanted a range —
 * the lightness band on Profile Setup — chose four labelled bands instead, with the reason
 * recorded: *"a two-thumbed range control is the kind of thing that works on a design and not
 * under a thumb."* A second thumb can be added the day something asks for one.
 */
export function Slider({
  label,
  value,
  onValueChange,
  min = 0,
  max = 1,
  step = 0.05,
  valueLabel,
  focused = false,
  disabled = false,
  loading = false,
  script = 'latin',
  testID,
}: SliderProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;

  return (
    <View style={{ gap: nativeSpacing.sm, opacity: inert ? 0.5 : 1 }}>
      <View
        style={{ flexDirection: 'row', justifyContent: 'space-between', gap: nativeSpacing.sm }}
      >
        <Text size="label" color="foreground.2" script={script}>
          {label}
        </Text>
        {/*
          `numeric` is the tabular face: a value under a moving thumb must not reflow.

          `selectable` because this repository's rule is that a figure you can read is a figure
          you can copy — `screens.test.tsx` asserts it over every tabular node on Compare, and
          it caught this one the first time the slider rendered there.
        */}
        <Text size="label" color="foreground" numeric selectable>
          {valueLabel}
        </Text>
      </View>
      <HeroSlider
        value={value}
        minValue={min}
        maxValue={max}
        step={step}
        isDisabled={inert}
        onChange={(next) => {
          // Single-thumb only; an array is the range mode this wrapper does not offer.
          if (typeof next === 'number') onValueChange(next);
        }}
      >
        <HeroSlider.Track
          // `null` removes the theme-decided layer, for the reason in the header.
          background={null}
          style={{
            height: TRACK_HEIGHT,
            borderRadius: nativeRadius.pill,
            backgroundColor: colors['surface.3'],
          }}
        >
          <HeroSlider.Fill
            style={{ backgroundColor: colors.inverse, borderRadius: nativeRadius.pill }}
          />
          <HeroSlider.Thumb
            testID={testID}
            index={0}
            /*
              ONE ELEMENT, not a group. A thumb is a single thing a person grabs, and without
              this the platform walks into it and announces the disc inside.

              It is also what makes the thumb visible to `pressableNodes` on any harness that
              has not learned about `accessibilityValue` — the two together are belt and
              braces, and the widened detector is the one that catches the NEXT slider.
            */
            accessible
            accessibilityLabel={label}
            /*
              `text` IS THE ANNOUNCEMENT. `now` is a percentage HeroUI computed because the
              bridge cannot carry a fraction; the caller's formatted string is the quantity a
              person actually set. Both are declared, and the readable one is not left to a
              default.
            */
            accessibilityValue={{
              min: 0,
              max: 100,
              now: percentOf(value, min, max),
              text: valueLabel,
            }}
            accessibilityState={{ disabled: inert, busy: loading }}
            /*
              THE TARGET IS 44 AND THE DISC IS 24, which is not the same statement twice.

              WCAG 2.2 asks for 44 on the thing a finger lands on; a 44px disc on a 10px track
              is a ball on a wire. So the thumb node — the one `pressableNodes` reads and the
              one the platform hit-tests — is a transparent 44 square, and what a person sees
              is the disc centred in it.
            */
            style={{
              minWidth: nativeTapTarget,
              minHeight: nativeTapTarget,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
            }}
          >
            <View
              style={{
                width: THUMB_DISC,
                height: THUMB_DISC,
                borderRadius: nativeRadius.pill,
                backgroundColor: colors['surface.1'],
                borderWidth: focused ? 2 : 1,
                borderColor: focused ? colors.ring : colors['border.strong'],
              }}
            />
          </HeroSlider.Thumb>
        </HeroSlider.Track>
      </HeroSlider>
    </View>
  );
}

/**
 * Where the thumb sits, as whole percent.
 *
 * Exported because the announcement depends on it and a test should be able to ask, rather
 * than re-deriving the arithmetic and agreeing with itself.
 */
export function percentOf(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || max <= min) return 0;
  const clamped = value < min ? min : value > max ? max : value;
  return Math.round(((clamped - min) / (max - min)) * 100);
}

/**
 * The expand/collapse indicator, drawn here rather than taken from HeroUI.
 *
 * **`Accordion.Indicator` paints a hard-coded `#000000` chevron**, and the conformance suite
 * reported it as a `colour-literal` in both themes on the first run. In the dark theme that is
 * a black glyph on a near-black surface: not a token drift, a chevron nobody can see.
 *
 * Two bars, the way `Icon` draws its glyphs — no SVG, no asset, and no icon font, which
 * ADR-0057 rules out because a missing glyph fails as tofu rather than as an error.
 *
 * **The two states are different SHAPES, not a rotation.** A pointer down and a pointer up are
 * distinguishable without animation, without colour, and in a screenshot — and the rotation
 * HeroUI animates is a transform on a glyph whose colour was the problem in the first place.
 */
function Chevron({
  open,
  color,
}: {
  readonly open: boolean;
  readonly color: string;
}): React.JSX.Element {
  const size = 14;
  const bar = (rotate: string, left: number): React.JSX.Element => (
    <View
      style={{
        position: 'absolute',
        left,
        top: size * 0.45,
        width: size * 0.62,
        height: 2,
        borderRadius: 1,
        backgroundColor: color,
        transform: [{ rotate }],
      }}
    />
  );
  return (
    <View style={{ width: size, height: size }}>
      {bar(open ? '-30deg' : '30deg', 0)}
      {bar(open ? '30deg' : '-30deg', size * 0.38)}
    </View>
  );
}

export interface AccordionItem {
  readonly value: string;
  readonly title: string;
  readonly children: React.ReactNode;
}

export interface AccordionProps {
  readonly items: readonly AccordionItem[];
  /** Which items are expanded. Controlled, for the reason at the top of this file. */
  readonly expanded: readonly string[];
  readonly onExpandedChange: (expanded: readonly string[]) => void;
  readonly disabled?: boolean;
  /** The sections' contents are still arriving. Announced busy, not only dimmed. */
  readonly loading?: boolean;
  readonly script?: Script;
  readonly testID?: string;
}

/**
 * Sections that fold away.
 *
 * ## The separator is the first decorative hairline in this product
 *
 * `border` has been declared unreached since F-017: *"every component that draws a line reaches
 * for `border.strong` instead — the boundary of an OUTLINED control, where WCAG 1.4.11 applies
 * directly and 3:1 is not optional. A DECORATIVE hairline is a different thing — a rule between
 * rows that separates without bounding, and this product has had no row list to put one
 * between."* Three rules between four sections is that list.
 *
 * It is translucent, and it carries **no** information: the expanded state is on the trigger,
 * announced, and drawn as a rotation. A person who cannot see an 8%-alpha line has lost
 * nothing, which is the test a decorative element has to pass.
 *
 * ## `selectionMode="multiple"`
 *
 * Single mode closes one section to open another, which on a reference page means the act of
 * looking something up hides what you were reading. These are not tabs; `Tabs` is, and it is
 * one file over.
 */
export function Accordion({
  items,
  expanded,
  onExpandedChange,
  disabled = false,
  loading = false,
  script = 'latin',
  testID,
}: AccordionProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;

  return (
    <HeroAccordion
      testID={testID}
      selectionMode="multiple"
      isDisabled={inert}
      value={[...expanded]}
      onValueChange={(next: string | readonly string[] | undefined) => {
        onExpandedChange(typeof next === 'string' ? [next] : (next ?? []));
      }}
      styles={{
        container: { gap: nativeSpacing.xs },
        // `border`, and only here. See the note above on why this is not `border.strong`.
        separator: { height: 1, backgroundColor: colors.border },
      }}
    >
      {items.map((item) => {
        const isOpen = expanded.includes(item.value);
        return (
          <HeroAccordion.Item key={item.value} value={item.value}>
            <HeroAccordion.Trigger
              accessibilityRole="button"
              accessibilityLabel={item.title}
              // `expanded` is what a screen reader announces; the indicator's rotation is what
              // a person sees. Neither is a colour.
              accessibilityState={{ expanded: isOpen, disabled: inert, busy: loading }}
              style={{
                minWidth: nativeTapTarget,
                minHeight: nativeTapTarget,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: nativeSpacing.sm,
                paddingVertical: nativeSpacing.sm,
                opacity: inert ? 0.5 : 1,
              }}
            >
              <Text size="body" color="foreground" script={script} heading>
                {item.title}
              </Text>
              <Chevron open={isOpen} color={colors['foreground.2']} />
            </HeroAccordion.Trigger>
            <HeroAccordion.Content>
              <View style={{ paddingBottom: nativeSpacing.md, gap: nativeSpacing.xs }}>
                {item.children}
              </View>
            </HeroAccordion.Content>
          </HeroAccordion.Item>
        );
      })}
    </HeroAccordion>
  );
}
