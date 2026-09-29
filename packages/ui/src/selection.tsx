/**
 * Selection, as one treatment — the thing this product had three of.
 *
 * ## What was wrong, measured rather than described
 *
 * | | fill | edge | mark | announced |
 * |---|---|---|---|---|
 * | `Swatch` | — | 2 px `border.strong` | `✓ ` in the caption | yes |
 * | `Chip` | `inverse` | — | ` ✓` in the caption | yes |
 * | `Tabs` | `surface.1` | — | — | yes |
 *
 * Three components, three answers to the same question. Reported as *"when we select a color,
 * it's not highlighted as active or marked … follow one single pattern everywhere"*, which is
 * two defects: the pattern is not one, and the one on the sample is not visible.
 *
 * ## Four decisions, none of them styling
 *
 * **1. The edge is always drawn, and is transparent when it means nothing.** `Swatch` and `Chip`
 * both wrote `borderWidth: selected ? 2 : 0`, which does not change a colour — it changes a
 * BOX. Selecting a swatch moved it, and moved everything after it in the row. A state that
 * reflows the page is not a state.
 *
 * **2. Focus takes the edge; selection keeps the fill and the mark.** These are different
 * states and both have to be visible at once. `Swatch` wrote
 * `borderColor: focused ? colors.ring : colors['border.strong']` on ONE border, so a selected
 * swatch that was focused showed only focus — selection vanished at the moment somebody
 * navigating by keyboard or Switch Control needed it most. Splitting the channels fixes it:
 * whatever the edge is saying, the fill and the mark still say *chosen*.
 *
 * **3. The mark is a drawn glyph in its own badge, not a character in the label.** A `✓` in the
 * accessible name is a fine ANNOUNCEMENT and a poor PICTURE: it inherits the caption's size and
 * colour, so on a 48 px sample it is a 13 px grey tick under the thing it describes, and on a
 * chip it changes the label's width. The badge is `icon.check` — the same drawn glyph the status
 * system uses, so it has no tofu failure mode and stays distinguishable in greyscale
 * (ADR-0054). **The caption tick is kept**; this joins it rather than replacing it.
 *
 * **4. Navigation is not selection.** A tab is *where you are*; a chip is *what you chose*. A
 * tick on a tab would claim the second, so {@link currentTone} draws the fill and the edge and
 * no mark. Same tokens, so the colour language is one thing — the MARK is the part that means
 * "I picked this".
 *
 * ## Why this is data plus one small component, and not a wrapper
 *
 * A `<Selectable>` wrapping its children would own the outer view — which is the view carrying
 * `accessibilityRole`, `accessibilityState` and the 44 px target. Every component here already
 * has a `Pressable` root for exactly those reasons, and nesting a second pressable-shaped view
 * inside one is how a control ends up announced twice. So the treatment is returned as style,
 * the component draws it on the root it already has, and the ONE source of truth is this file.
 */

import { View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { nativeRadius, nativeSpacing } from '@irodora/design-tokens';
import { Icon } from './Icon.js';
import { useTheme, type ThemeColors } from './theme.js';

/**
 * The width of the state edge, in device-independent pixels.
 *
 * **Reserved whether or not it is coloured.** That is the whole of decision 1 above: the number
 * is the same in every state, so the box never changes size. A caller that wants no edge gets a
 * transparent one, not a thinner one.
 */
export const SELECTION_EDGE = 2;

/** The size of the tick badge. Large enough to read on a 48 px sample, small enough not to own it. */
export const SELECTION_MARK = 18;

export interface SelectionState {
  /** Chosen. Persists until the person chooses otherwise. */
  readonly selected: boolean;
  /** Where the cursor is. Transient, and NOT the same question as `selected`. */
  readonly focused: boolean;
}

/**
 * What a selectable root paints.
 *
 * `background` is `undefined` when the component should keep its own — returning a colour there
 * would make this file decide the resting appearance of every chooser, which it has no business
 * doing. It only speaks when the state is on.
 */
export interface SelectionTone {
  /** The ground, or `undefined` to keep the caller's own. */
  readonly background: string | undefined;
  /** Always {@link SELECTION_EDGE}. Present in the type so a call site cannot write its own. */
  readonly borderWidth: number;
  /** `accent`, `ring`, or transparent — never absent. */
  readonly borderColor: string;
  /** Whether {@link SelectionMark} should be drawn. `currentTone` never sets this. */
  readonly mark: boolean;
}

/**
 * The treatment for a **chooser** — something a person picks from a set.
 *
 * Swatch, chip, and the card and list row when they arrive (F-184, F-186). Three visual channels
 * plus the announced state, and the two that survive a focus ring are the fill and the mark.
 */
export function selectionTone(state: SelectionState, colors: ThemeColors): SelectionTone {
  return {
    background: state.selected ? colors['accent.muted'] : undefined,
    borderWidth: SELECTION_EDGE,
    /*
     * FOCUS WINS THE EDGE, and selection loses nothing by it — the fill and the mark below are
     * untouched. The order matters: a focus ring that a selected item swallowed would make the
     * keyboard cursor invisible exactly where a person is working.
     */
    borderColor: state.focused ? colors.ring : state.selected ? colors.accent : 'transparent',
    mark: state.selected,
  };
}

/**
 * The treatment for **navigation** — the tab you are on, not the item you chose.
 *
 * Identical to {@link selectionTone} except that it never marks. See decision 4 above: the tick
 * asserts a choice, and being on a screen is not one.
 */
export function currentTone(state: SelectionState, colors: ThemeColors): SelectionTone {
  return { ...selectionTone(state, colors), mark: false };
}

/**
 * The tone as a ready `ViewStyle`, for the common case.
 *
 * Kept separate from {@link selectionTone} because `background: undefined` and "no
 * `backgroundColor` key" are different things under `exactOptionalPropertyTypes`, and a
 * component that spreads the tone directly would paint `undefined` over its own ground.
 */
export function selectionStyle(tone: SelectionTone): ViewStyle {
  return {
    borderWidth: tone.borderWidth,
    borderColor: tone.borderColor,
    ...(tone.background === undefined ? {} : { backgroundColor: tone.background }),
  };
}

export interface SelectionMarkProps {
  /** Draw nothing when this is false, so a call site can render it unconditionally. */
  readonly visible: boolean;
  readonly size?: number;
  readonly testID?: string;
}

/**
 * The tick badge.
 *
 * **Absolutely positioned, so it costs no layout.** It sits on the corner of whatever it marks,
 * which means a component adopting this does not have to find room for it — and a mark that
 * changed a row's height would reintroduce decision 1's problem one level up.
 *
 * **Decorative to a screen reader.** The selection is already announced twice: in the accessible
 * name, where the caption tick still lives, and in `accessibilityState.selected`. A third
 * announcement on the badge would make every selected item say "selected" three times, which is
 * the failure mode the `Icon` docblock already names for status glyphs.
 */
export function SelectionMark({
  visible,
  size = SELECTION_MARK,
  testID,
}: SelectionMarkProps): React.JSX.Element | null {
  const { colors } = useTheme();
  if (!visible) return null;
  return (
    <View
      testID={testID}
      // Not `accessible`, and no label — see the docblock. The badge is the picture; the name
      // and the state are the words.
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: nativeSpacing.xs,
        right: nativeSpacing.xs,
        width: size,
        height: size,
        borderRadius: nativeRadius.pill,
        alignItems: 'center',
        justifyContent: 'center',
        /*
         * `accent` GROUND WITH `accent.foreground` ON IT, which is the pairing the manifest
         * declares — not `accent` on `accent.muted`, which is declared too but is the
         * LOW-contrast one of the pair (11.90:1 dark, 7.97:1 light against 14.99 and 9.37).
         * The badge is 18 px and it is the whole visual channel, so it takes the stronger one.
         */
        backgroundColor: colors.accent,
      }}
    >
      <Icon token="icon.check" color="accent.foreground" size={size - nativeSpacing.xs} />
    </View>
  );
}

/** The focus ring's width, in dp: the same as the chooser's state edge. */
export const FOCUS_RING = SELECTION_EDGE;

/** How far outside the drawn box the ring sits, so it never covers the control's own edge. */
export const FOCUS_RING_GAP = 1;

export interface FocusRingProps {
  /** Draw nothing when this is false, so a call site can render it unconditionally. */
  readonly visible: boolean;
  /** The drawn box's corner radius in dp. The ring follows it, grown by its own offset. */
  readonly radius: number;
  readonly testID?: string;
}

/**
 * Focus on a control drawn at its mockup's size (F-232, E-151): a `ring` OUTSIDE the box.
 *
 * A chooser reserves its state edge (decision 1 above) because its resting edge is transparent.
 * A control the mockups draw WITH an edge, or with none, cannot reserve one without changing what
 * is drawn: board 00's secondary pill is outlined 1 px, and a reserved 2 dp edge would redraw it.
 * So focus is an overlay that sits just outside the box and costs no layout, in `ring`, the token
 * that exists for exactly this (ADR-0111). Decorative to a screen reader: focus is where the cursor
 * is, and the platform already says so.
 */
export function FocusRing({ visible, radius, testID }: FocusRingProps): React.JSX.Element | null {
  const { colors } = useTheme();
  if (!visible) return null;
  const offset = FOCUS_RING + FOCUS_RING_GAP;
  return (
    <View
      testID={testID}
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -offset,
        right: -offset,
        bottom: -offset,
        left: -offset,
        borderRadius: radius >= nativeRadius.pill ? nativeRadius.pill : radius + offset,
        borderWidth: FOCUS_RING,
        borderColor: colors.ring,
      }}
    />
  );
}

/**
 * The leading dot's diameter, in dp: the median of the selection dots the inventories record on
 * `12`, `15` and `17` (13 px and 11 px at 2 px/dp). Recomputed by `pill-selection.test`.
 */
export const SELECTION_DOT = 6.5;

/** A selected pill's fill: `15` and `02` draw `surface.2`, `12` draws `surface.3`, `17` `accent`. */
export type PillFill = 'surface.2' | 'surface.3' | 'accent';

/** What a pill paints, resolved against a theme. */
export interface PillTone {
  readonly background: string;
  /** The edge, always 1 dp wide so the outline never shifts: `border` at rest, the fill when chosen. */
  readonly borderColor: string;
  /** The label's and the dot's ink, as a text token. */
  readonly ink: 'foreground' | 'accent.foreground';
  readonly dot: boolean;
}

/**
 * The treatment for a **pill** (F-232): the chips and segments the screens draw, where board 00's
 * chooser treatment does not appear.
 *
 * At rest it is an outline in `border` with nothing inside. Chosen, it is FILLED, and a dot leads
 * its label. That is how `12`, `15` and `17` draw a choice: a fill and a mark, never a tick or a
 * corner badge. `15` also draws its chosen pill with a `foreground` edge. The ✓ stays in the
 * accessible name, where it is words rather than a picture.
 */
export function pillTone(
  selected: boolean,
  fill: PillFill,
  edge: boolean,
  colors: ThemeColors,
): PillTone {
  if (!selected)
    return { background: 'transparent', borderColor: colors.border, ink: 'foreground', dot: false };
  return {
    background: colors[fill],
    borderColor: edge ? colors.foreground : colors[fill],
    ink: fill === 'accent' ? 'accent.foreground' : 'foreground',
    dot: true,
  };
}

export interface SelectionDotProps {
  /** Draw nothing when this is false, so a call site can render it unconditionally. */
  readonly visible: boolean;
  /** The dot's ink, resolved: the label's. */
  readonly color: string;
  readonly size?: number;
  readonly testID?: string;
}

/**
 * The mark a pill draws when it is chosen: a filled dot before its label (`12`, `15`, `17`).
 * Decorative to a screen reader, like {@link SelectionMark}: the name and the state are the words.
 */
export function SelectionDot({
  visible,
  color,
  size = SELECTION_DOT,
  testID,
}: SelectionDotProps): React.JSX.Element | null {
  if (!visible) return null;
  return (
    <View
      testID={testID}
      pointerEvents="none"
      style={{ width: size, height: size, borderRadius: nativeRadius.pill, backgroundColor: color }}
    />
  );
}
