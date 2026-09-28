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
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { hitArea } from './hitArea.js';
import { overlayKeyframes } from './motion.js';
import { FocusRing } from './selection.js';
import { Text } from './Text.js';
import { useTheme, type ThemeColors } from './theme.js';
import type { Script } from './layout.js';

/**
 * The switch track, at the size `15` draws it (F-232, F-285): 69 × 36 px at 2 px/dp. It was
 * 68 × 44, raised so the drawn size WAS the target, because the tap-target rule could not see a hit
 * area. Since ADR-0114 the rule adds the `hitSlop` back, so the track is drawn as drawn and the rest
 * of the target is in the hit area. Recomputed from the inventory by `switch.test`.
 */
export const SWITCH_TRACK = { width: 34.5, height: 18 } as const;
/**
 * The thumb: 28.3 px across on `15` (14.15 dp), snapped to half a dp, inset from the track's
 * edges by what is left over. Recomputed from the inventory by `switch.test`.
 */
export const SWITCH_THUMB = 14;
/**
 * The dot `15` draws in the gutter, at the size it draws it (F-239).
 *
 * `15.engine.tabular.state` and its two siblings are 10 × 11 px on a 2× render — **5 dp**, which
 * is off the 4-point grid and is what the image measures. Rounding it to 4 or 8 would be the kind
 * of tidying rule 14 forbids, and `SWITCH_WIDTH` above is already a measured number rather than a
 * spacing step.
 */
const SWITCH_MARKER = 5;
/** Centres the thumb in the track. HeroUI's `left` is the offset from the near edge. */
const SWITCH_THUMB_INSET = (SWITCH_TRACK.height - SWITCH_THUMB) / 2;

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
  /**
   * Draw `15`'s dot in the gutter beside the track, **when this switch is on** (F-239).
   *
   * ## What the mockup draws, and what it does not
   *
   * `15` draws a 5 dp `text.tertiary` dot to the left of each of its three switch tracks, and
   * draws all three switches **on**. Board `00` draws a switch on and a switch off, and neither
   * carries one. So the mockups show the dot in exactly one state — on — and show nothing at all
   * about what happens to it when a switch is turned off.
   *
   * Two readings survive that: the dot is decoration on every row, or it marks the on state the
   * way `15.themes.sumi.selected` marks the chosen tile — also an unbound dot, also drawn on
   * exactly the one tile that is selected.
   *
   * **Which of the two is right is OQ-41, and a person answers it.** F-239's review was right that
   * the first draft's argument here was empty: it claimed drawn-when-on is correct under both
   * readings *"because it differs from a static dot only in a state no mockup draws"* — which is
   * true of a static dot as well, by definition, and so supports neither. The two readings fail
   * symmetrically in the off state, and choosing between them is a preference about a drawing.
   *
   * What is rendered until that is answered is the second reading, on evidence rather than on a
   * symmetry: `15` is the only mockup that draws this dot, it draws it on three switches that are
   * all on, and the one other unbound dot in the same image marks the selected theme tile. Nothing
   * drawn is left out either way. **F-262 carries the question**, because it is the feature that
   * rebuilds this screen against `15` and draws its off state for the first time.
   *
   * It is decoration in the accessibility tree regardless: the switch already announces
   * `checked`, and a dot that announced it again would be the state said twice.
   */
  readonly marker?: boolean;
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
 * ## It had no consumer for eleven features, and `15` is the one that gave it three
 *
 * *"No wrapper without a consumer"* — and F-156 could find none. **This product had no
 * user-facing boolean**: the message catalogue held no on/off copy, the wardrobe schema has no
 * boolean column, and twice a feature reached the place a toggle would go and chose labelled
 * alternatives with the reason written down — the Lens (*"two chips rather than a button that
 * toggles: a toggle says what it will do next"*) and the profile bands (*"discrete rather than a
 * slider"*). A colour product's settings are *which one*, not *whether*. So this shipped
 * registered in the conformance registry, which ADR-0054 and gate 8 accept as a consumer, with
 * the absence stated rather than closed by inventing a preference to justify a control.
 *
 * **F-239 is the consumer**, and it did not invent the preference either: `15` draws three
 * switches under its engine section, and rule 14 makes a drawn control a control that exists.
 * The registry entry stays — it is still the only place the disabled, focused and loading states
 * are rendered — but it is no longer the only place this component is used at all.
 */
export function Switch({
  label,
  description,
  checked,
  onCheckedChange,
  focused = false,
  disabled = false,
  loading = false,
  marker = false,
  script = 'latin',
  testID,
}: SwitchProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;

  /*
   * AS THE MOCKUPS DRAW IT (F-232). On, `15` draws a white track under a thumb in its card's
   * `surface.1`. `00` draws its on-thumb nearer `border`, and the screen beats the board on its own
   * surface (P3). Off, which only `00` draws, is a `surface.3` track under a white thumb. The thumb's
   * position still says which, whatever the colours (golden rule 13).
   *
   * THE WHITE IS `inverse`, not `accent`, though the two share a value: the README's
   * `action.primary` has two jobs, and a drawn role with two jobs is two tokens (ADR-0111). Where
   * text sits on it (a primary pill, a chosen segment) it is `accent`, paired with its foreground;
   * where nothing does (a track, a thumb) it is a surface of the other polarity, which is `inverse`.
   */
  const track = checked ? colors.inverse : colors['surface.3'];
  const thumb = checked ? colors['surface.1'] : colors.inverse;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: nativeSpacing.sm }}>
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
          <Text size="caption" color="foreground.2" script={script}>
            {description}
          </Text>
        )}
      </View>
      {/*
        THE GUTTER DOT, AND IT IS NEVER THE PLACE THE STATE LIVES. The thumb's position and
        `accessibilityState.checked` both already say on; this is a third channel, drawn because
        `15` draws it. `accessible={false}` rather than a hidden wrapper: an empty `View` is not
        an accessibility element in React Native, and saying so out loud keeps it from becoming
        one if a prop is ever spread onto it.
      */}
      {marker && checked ? (
        <View
          accessible={false}
          style={{
            width: SWITCH_MARKER,
            height: SWITCH_MARKER,
            borderRadius: nativeRadius.pill,
            // The dot sits on 15's CARD, so it is the card tertiary (F-225: tertiary text has a
            // ground value and a card value, and the inventory draws this one on level 1).
            backgroundColor: colors['foreground.3.card'],
            opacity: inert ? 0.5 : 1,
          }}
        />
      ) : null}
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
        // The drawn track; the rest of the target is in the hit area (ADR-0114).
        hitSlop={hitArea(SWITCH_TRACK.width, SWITCH_TRACK.height)}
        style={{
          width: SWITCH_TRACK.width,
          height: SWITCH_TRACK.height,
          borderRadius: nativeRadius.pill,
          justifyContent: 'center',
          backgroundColor: track,
          opacity: inert ? 0.5 : 1,
        }}
      >
        {/*
          FOCUS IS A RING OUTSIDE THE TRACK (E-151), not a border on it: a border would draw inside
          the drawn size, and focus has to be visible on a switch that is already on.
        */}
        <FocusRing visible={focused} radius={nativeRadius.pill} />
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
      <Text size="caption" color="foreground.2" script={script}>
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
            paddingHorizontal: nativeSpacing.sm,
            borderRadius: nativeRadius.md,
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
                  paddingHorizontal: nativeSpacing.sm,
                  gap: nativeSpacing.xs,
                  /*
                    `radius.xs` — THE STEP THE LEDGER WAS WAITING FOR. It has been declared
                    unreached since F-017 with the reason *"some steps have not met their
                    surface yet"*, and this is the surface: a row nested inside a panel that
                    already has `radius.lg`, where the same corner would read as a bubble.
                  */
                  borderRadius: nativeRadius.sm,
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
                  <Text size="caption" color="foreground.2" script={script}>
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

/** The end labels `23` draws under a readout: the two poles, and a note between them. */
export interface SliderEnds {
  readonly low: string;
  readonly high: string;
  /** `23`'s confidence note, centred between the poles. */
  readonly note?: string;
}

interface SliderShared {
  /** What is being set, or shown. The accessible name, and drawn above the track. */
  readonly label: string;
  readonly value: number;
  readonly min?: number;
  readonly max?: number;
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
  readonly disabled?: boolean;
  readonly loading?: boolean;
  readonly script?: Script;
  readonly testID?: string;
  /** The track's drawn thickness in dp: the element's own. Defaults to {@link SLIDER_TRACK}. */
  readonly trackHeight?: number;
  /** The thumb's drawn diameter in dp: the element's own. Defaults to {@link SLIDER_THUMB}. */
  readonly thumbSize?: number;
}

interface InteractiveSliderProps extends SliderShared {
  readonly readout?: false;
  readonly onValueChange: (value: number) => void;
  readonly step?: number;
  readonly focused?: boolean;
  readonly gradient?: never;
  readonly halo?: never;
  readonly ends?: never;
}

/**
 * A value SHOWN on a track, not set (F-232): `17`'s live readings and `23`'s finished profile.
 * Nothing on it moves under a finger, so it is not adjustable and not a control.
 */
interface ReadoutSliderProps extends SliderShared {
  readonly readout: true;
  readonly onValueChange?: never;
  readonly step?: never;
  readonly focused?: never;
  /**
   * The track painted as a gradient through these tokens, evenly spaced (`23`), in place of a fill.
   * Tokens, never literals: the colour-literal rule reads every stop (`tree.ts`). `23`'s own stops
   * are F-260's to mint.
   */
  readonly gradient?: readonly (keyof ThemeColors)[];
  /** `17` rings its marker in the card it sits on, so the marker separates from the fill. */
  readonly halo?: 'surface.1';
  readonly ends?: SliderEnds;
}

export type SliderProps = InteractiveSliderProps | ReadoutSliderProps;

/**
 * The track's thickness, in dp: `09`'s, the only interactive slider a screen draws (P3). 6.1–6.7 px
 * at 2 px/dp, the median snapped to half a dp. Recomputed by `slider.test`.
 */
export const SLIDER_TRACK = 3.5;
/**
 * The thumb's diameter, in dp: `09`'s, 27.4–27.5 px, snapped to half a dp. It is drawn at this
 * size, and the target is in its hit area (ADR-0114). Recomputed by `slider.test`.
 */
export const SLIDER_THUMB = 14;

/** The halo `17` draws round its marker, in dp: a ring of the card between marker and fill. */
const SLIDER_HALO = 2;

/**
 * A value on a bounded interval: set with a thumb, or shown with a marker.
 *
 * ## The value is shown, always
 *
 * A slider whose position is the only readout is a control you can move but cannot set. The
 * number is drawn beside the label and announced through `accessibilityValue.text`, so the two
 * channels agree and neither is the colour of the fill.
 *
 * ## As the mockups draw it (F-232)
 *
 * A thin track, white (`inverse`: a surface, see `Switch`) up to the value and `surface.3` past it,
 * under a white thumb with
 * **no edge**: the thumb is identified by its fill, so the `border.strong` edge it used to rest in
 * (1.85:1 on Sumi, F-225's review) is gone rather than moved. Each screen draws its own thickness
 * and thumb, which it passes: `09` 3.5 and 14, `17` 2 and 7.5 with a halo, `23` 6.5 and 16.5 on a
 * gradient.
 *
 * ## Single thumb only
 *
 * HeroUI supports a range. This does not, because the one place this product wanted a range —
 * the lightness band on Profile Setup — chose four labelled bands instead, with the reason
 * recorded: *"a two-thumbed range control is the kind of thing that works on a design and not
 * under a thumb."* A second thumb can be added the day something asks for one.
 */
export function Slider(props: SliderProps): React.JSX.Element {
  return props.readout === true ? <ReadoutSlider {...props} /> : <InteractiveSlider {...props} />;
}

/** The label and the value, drawn above the track. */
function SliderHeader({
  label,
  valueLabel,
  script,
}: {
  readonly label: string;
  readonly valueLabel: string;
  readonly script: Script;
}): React.JSX.Element {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: nativeSpacing.sm }}>
      <Text size="caption" color="foreground.2" script={script}>
        {label}
      </Text>
      {/*
        `numeric` DECLARES that the readout carries figures, and `15`'s tabular switch decides
        whether they are set tabular (F-239). `selectable` because a figure you can read is a
        figure you can copy — `screens.test.tsx` asserts it over every tabular node on Compare.
      */}
      <Text size="caption" color="foreground" numeric selectable>
        {valueLabel}
      </Text>
    </View>
  );
}

function InteractiveSlider({
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
  trackHeight = SLIDER_TRACK,
  thumbSize = SLIDER_THUMB,
}: InteractiveSliderProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;

  return (
    <View style={{ gap: nativeSpacing.sm, opacity: inert ? 0.5 : 1 }}>
      <SliderHeader label={label} valueLabel={valueLabel} script={script} />
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
            height: trackHeight,
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
              this the platform walks into it and announces what is inside.
            */
            accessible
            accessibilityLabel={label}
            /*
              `text` IS THE ANNOUNCEMENT. `now` is a percentage HeroUI computed because the
              bridge cannot carry a fraction; the caller's formatted string is the quantity a
              person actually set.
            */
            accessibilityValue={{
              min: 0,
              max: 100,
              now: percentOf(value, min, max),
              text: valueLabel,
            }}
            accessibilityState={{ disabled: inert, busy: loading }}
            // Drawn at its size; the target is in the hit area (ADR-0114), not a transparent 44.
            hitSlop={hitArea(thumbSize, thumbSize)}
            style={{
              width: thumbSize,
              height: thumbSize,
              borderRadius: nativeRadius.pill,
              backgroundColor: colors.inverse,
            }}
          >
            <FocusRing visible={focused} radius={nativeRadius.pill} />
          </HeroSlider.Thumb>
        </HeroSlider.Track>
      </HeroSlider>
    </View>
  );
}

function ReadoutSlider({
  label,
  value,
  min = 0,
  max = 1,
  valueLabel,
  disabled = false,
  loading = false,
  script = 'latin',
  testID,
  trackHeight = SLIDER_TRACK,
  thumbSize = SLIDER_THUMB,
  gradient,
  halo,
  ends,
}: ReadoutSliderProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;
  const at = `${String(percentOf(value, min, max))}%` as `${number}%`;
  const ring = halo === undefined ? 0 : SLIDER_HALO;
  const marker = thumbSize + 2 * ring;

  return (
    <View
      testID={testID}
      /*
        ONE ANNOUNCEMENT, and not a control: a readout is read, not set, so it carries no
        `accessibilityValue` (which is what marks a thing a person adjusts) and no adjustable role.
        Its name says what it is and what it reads.
      */
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${valueLabel}`}
      accessibilityState={{ disabled: inert, busy: loading }}
      style={{ gap: nativeSpacing.sm, opacity: inert ? 0.5 : 1 }}
    >
      <SliderHeader label={label} valueLabel={valueLabel} script={script} />
      <View style={{ height: Math.max(marker, trackHeight), justifyContent: 'center' }}>
        <View
          style={{
            height: trackHeight,
            borderRadius: nativeRadius.pill,
            overflow: 'hidden',
            backgroundColor: gradient === undefined ? colors['surface.3'] : 'transparent',
          }}
        >
          {gradient === undefined ? (
            <View
              style={{
                width: at,
                height: trackHeight,
                borderRadius: nativeRadius.pill,
                backgroundColor: colors.inverse,
              }}
            />
          ) : (
            <Svg width="100%" height={trackHeight} fill="none">
              <Defs>
                <LinearGradient id="track" x1="0" y1="0" x2="1" y2="0">
                  {gradient.map((token, i) => (
                    <Stop
                      key={token}
                      offset={gradient.length === 1 ? 0 : i / (gradient.length - 1)}
                      stopColor={colors[token]}
                    />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect width="100%" height={trackHeight} fill="url(#track)" />
            </Svg>
          )}
        </View>
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: at,
            marginLeft: -marker / 2,
            width: marker,
            height: marker,
            borderRadius: nativeRadius.pill,
            backgroundColor: colors.inverse,
            borderWidth: ring,
            ...(halo === undefined ? {} : { borderColor: colors[halo] }),
          }}
        />
      </View>
      {ends === undefined ? null : (
        <View
          style={{ flexDirection: 'row', justifyContent: 'space-between', gap: nativeSpacing.sm }}
        >
          <Text size="body" color="foreground.2" script={script}>
            {ends.low}
          </Text>
          {ends.note === undefined ? null : (
            <Text size="caption" color="foreground.2" script={script}>
              {ends.note}
            </Text>
          )}
          <Text size="body" color="foreground.2" script={script}>
            {ends.high}
          </Text>
        </View>
      )}
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
              <View style={{ paddingBottom: nativeSpacing.sm, gap: nativeSpacing.xs }}>
                {item.children}
              </View>
            </HeroAccordion.Content>
          </HeroAccordion.Item>
        );
      })}
    </HeroAccordion>
  );
}
