/**
 * Choose exactly one — announced as one choice rather than as a row of buttons.
 *
 * ## The defect, and it is not visual
 *
 * There are **twelve single-select rows** across the screens — the Atlas's five filters, the
 * Lens's mode, the wardrobe's, and ProfileSetup's four bands — and every one is a row of
 * `Chip`s. Each chip is a `button` carrying `accessibilityState.selected` and a tick in its
 * name, so a screen reader hears:
 *
 * > *"Warm, button, selected. Cool, button. Neutral, button."*
 *
 * Three unrelated buttons, one of which happens to be on. What it should hear is:
 *
 * > *"Temperature, radio group. Warm, radio button, selected, 1 of 3."*
 *
 * **The group, the count, and the position are all missing**, and none of them can be added to a
 * chip — they are properties of the SET, and a set of siblings is not a thing.
 *
 * ## So this wraps HeroUI, and the rule is satisfied by roles rather than by pixels
 *
 * [`heroui-wrappers.md`](../../../.harness/rules/frontend/heroui-wrappers.md) asks what
 * behaviour is inherited. Here it is `role="radiogroup"` and `role="radio"`, applied by
 * `RadioGroup` and its items — read out of its source rather than assumed, after F-185 found a
 * component that accepted a colour and painted black anyway.
 *
 * That is exactly the rule's *"tedious to get right, easy to get subtly wrong, and invisible to
 * a sighted developer with a mouse"*: the rows look correct today and say the wrong thing.
 *
 * ## The chips are not reused, and that is deliberate
 *
 * A `Chip` is a `Pressable`. Rendering one inside a `RadioGroup.Item` — which is also
 * pressable — nests two controls, and a screen reader announces both. So the item draws
 * {@link selectionTone} directly: **one treatment, one control, one announcement**. The chip
 * remains the right component for a row where any number may be on, which is a different
 * question and keeps its own component.
 *
 * ## Segmented, as the mockups draw it (F-232)
 *
 * `segmented` lays the options in one row inside a container, the way board 00 and the screens draw
 * a single choice:
 * - **00:** the chosen segment is a white (`accent`) pill inside a `border.strong` outline;
 *   `00.controls` also fills the container with `surface.2`.
 * - **Screens:** the outline is `border`, and the chosen segment is filled. On `02`, `07`, `10` and
 *   `12` a dot leads its label; only `24` (and board 00) marks it with the fill alone. F-232 first
 *   read `07` and `10` as fill-only; its review found their dots, now recorded.
 * - **Dividers:** `02` rules a line between two unchosen segments.
 *
 * Every part is the screen's, passed from its inventory; the defaults are computed from the
 * inventories (`segmented-choice.test`). The group still announces as a radio group, whatever it
 * looks like. Each segment is drawn at its height and reaches the target through its hit area
 * (ADR-0114), and focus is a `ring` outside the focused segment (E-151).
 *
 * ## `null` is a value here
 *
 * Every one of the twelve rows has an "All" that clears the filter, and it is not the absence of
 * a choice — it is the choice to impose none. HeroUI takes a string, so the sentinel is
 * translated at this boundary rather than at twelve call sites, each of which would have picked
 * its own.
 */

import { View } from 'react-native';
import { RadioGroup as HeroRadioGroup } from 'heroui-native';
import { nativeRadius, nativeSpacing, nativeTapTarget } from '@irodora/design-tokens';
import { CHIP_HEIGHT } from './Chip.js';
import { hitArea } from './hitArea.js';
import { usePress } from './motion.js';
import {
  FocusRing,
  pillTone,
  SelectionDot,
  selectionStyle,
  selectionTone,
  type PillFill,
} from './selection.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';
import type { Script } from './layout.js';

/**
 * The value that means "no constraint".
 *
 * A sentinel rather than an empty string, because an empty string is a value a caller could
 * legitimately have, and because a reader of the rendered tree should be able to tell the two
 * apart.
 */
const NONE = '\u0000none';

export interface Choice<V extends string> {
  readonly value: V;
  readonly label: string;
  readonly disabled?: boolean;
  /** The label carries a figure (a count beside a name), set in tabular digits (C9, F-226). */
  readonly numeric?: boolean;
}

/**
 * A segmented group's default drawn height, in dp: the median of the segmented groups the screens
 * draw (02 07 10 12 12 24), snapped to half a dp. Recomputed by `segmented-choice.test`.
 */
export const SEGMENTED_HEIGHT = 30.5;

/**
 * How far the chosen segment sits inside its container, in dp: the median over the same groups.
 * Recomputed by `segmented-choice.test`.
 */
export const SEGMENT_INSET = 2.5;

/** One row inside a container, as the mockups draw a single choice. Every part is the screen's. */
export interface Segmented {
  /** `dot` (02 07 10 12): the chosen segment is filled and a dot leads it. `fill` (00, 24): the fill alone. */
  readonly mark?: 'dot' | 'fill';
  /** The chosen segment's fill. 00 draws `accent`, and the ink turns to `accent.foreground`. */
  readonly selectedFill?: PillFill;
  /** The container's outline: the screens' `border`, 00's `border.strong`, or none (24). */
  readonly edge?: 'border' | 'border.strong' | 'none';
  /** The container's fill, where one is drawn (`00.controls`, 24). */
  readonly ground?: 'surface.2';
  readonly radius?: 'sm' | 'md' | 'lg' | 'pill';
  /** The container's drawn height in dp. Defaults to {@link SEGMENTED_HEIGHT}. */
  readonly height?: number;
  /** `02` rules a line between two unchosen segments. */
  readonly dividers?: boolean;
}

/**
 * `15`'s pills (F-240, ADR-0131 §6): each option a pill in a wrapping row — the chosen one filled in
 * `surface.2` with a `foreground` edge and a leading dot, the rest outlined in `border`. It is
 * F-232's choice pill (the one `Chip` draws for `12.form.*`, `15.cvd.*` and `17`'s options) as radio
 * items, so the row announces as ONE radio group rather than as unrelated buttons. No caption: the
 * screen places its own heading.
 */
export interface Pills {
  /** The drawn height in dp: the screen's own reading. Defaults to {@link CHIP_HEIGHT}. */
  readonly height?: number;
}

/** One layout or the other, never both: the type makes the choice a decision. */
export type ChoiceGroupProps<V extends string> = ChoiceGroupBaseProps<V> &
  (
    | {
        /** Lay the options out as one segmented row (F-232). Without it they wrap, as before. */
        readonly segmented?: Segmented;
        readonly pills?: never;
      }
    | {
        /** Lay the options out as `15`'s pills (F-240). */
        readonly pills: Pills;
        readonly segmented?: never;
      }
  );

interface ChoiceGroupBaseProps<V extends string> {
  /**
   * What is being chosen — the group's accessible name.
   *
   * **Required.** An unnamed radio group is announced as a group of radios about nothing, which
   * is strictly worse than the row of buttons this replaces: it adds a level of nesting and no
   * information.
   */
  readonly label: string;
  readonly options: readonly Choice<V>[];
  /** The chosen value, or `null` for the option that imposes no constraint. */
  readonly value: V | null;
  readonly onChange: (value: V | null) => void;
  /**
   * The label for the no-constraint option. Omit it and the group has no such option.
   *
   * Caller-supplied because `@irodora/ui` owns no copy (ADR-0056) — "All", "Any" and "No
   * preference" are three different sentences and the screen knows which it means.
   */
  readonly clearLabel?: string;
  /**
   * The whole group is unavailable — announced, not only dimmed.
   *
   * A real state: the Atlas's family row carries a count per option, and a count that has not
   * been computed yet is a group that should not be chosen from.
   */
  readonly disabled?: boolean;
  /**
   * The options are still being worked out. Announced as busy.
   *
   * Added because the conformance suite asked for it and the answer was yes — the same
   * conversation `Card` had one feature ago. A group that returned the same tree for
   * `loading` as for `default` would have the state in name only.
   */
  readonly loading?: boolean;
  readonly script?: Script;
  readonly testID?: string;
  /**
   * The option focused by an external keyboard or Switch Control, drawn as a `ring` (E-151).
   * `null` is the no-constraint option; leaving it out means nothing is focused.
   */
  readonly focused?: V | null | undefined;
}

/**
 * One option. Draws the shared selection treatment, and nothing else draws it here.
 *
 * Not a `Chip`: see the header. The chip's visual language is preserved — a pill, a ground, a
 * label — but the control is the radio item, so there is exactly one pressable and exactly one
 * announcement per option.
 */
function Option({
  value,
  label,
  disabled,
  chosen,
  focused,
  script,
  numeric = false,
}: {
  readonly value: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly chosen: boolean;
  readonly focused: boolean;
  readonly script: Script;
  readonly numeric?: boolean;
}): React.JSX.Element {
  const { colors } = useTheme();
  const tone = selectionTone({ selected: chosen, focused }, colors);
  // The press response (F-189). HeroUI's item is a plain Pressable and gives none of its own.
  const press = usePress();

  return (
    <HeroRadioGroup.Item
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      value={value}
      isDisabled={disabled}
      // Announced explicitly rather than inherited. HeroUI applies `role="radio"`; the SELECTED
      // state is what tells a reader which one, and stating it is what the conformance rule
      // holds every selectable component to.
      accessibilityLabel={label}
      accessibilityState={{ selected: chosen, disabled }}
      style={{
        minHeight: nativeTapTarget,
        minWidth: nativeTapTarget,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: nativeSpacing.sm,
        borderRadius: nativeRadius.md,
        backgroundColor: colors['surface.2'],
        ...selectionStyle(tone),
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <Text
        size="label"
        color={chosen ? 'foreground' : 'foreground.2'}
        script={script}
        numeric={numeric}
      >
        {label}
      </Text>
    </HeroRadioGroup.Item>
  );
}

/**
 * One segment of a segmented group (F-232). Like {@link Option}, it IS the radio item: one control,
 * one announcement. It draws the pill tone's fill when chosen, and a dot if the screen draws one.
 */
function Segment({
  value,
  label,
  disabled,
  chosen,
  focused,
  script,
  numeric = false,
  segmented,
}: {
  readonly value: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly chosen: boolean;
  readonly focused: boolean;
  readonly script: Script;
  readonly numeric?: boolean;
  readonly segmented: Segmented;
}): React.JSX.Element {
  const { colors } = useTheme();
  const press = usePress();
  const tone = pillTone(chosen, segmented.selectedFill ?? 'surface.2', false, colors);
  const height = (segmented.height ?? SEGMENTED_HEIGHT) - 2 * SEGMENT_INSET;
  const radius = segmentRadius(segmented.radius ?? 'pill');
  return (
    <HeroRadioGroup.Item
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      value={value}
      isDisabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ selected: chosen, disabled }}
      // Drawn at the segment's height; the rest of the target is in the hit area (ADR-0114). The
      // width floor is the height, so no drawn segment is widened.
      hitSlop={hitArea(height, height)}
      style={{
        flex: 1,
        height,
        minWidth: height,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: nativeSpacing.xs,
        paddingHorizontal: nativeSpacing.sm,
        borderRadius: radius,
        backgroundColor: chosen ? tone.background : 'transparent',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <SelectionDot
        visible={chosen && (segmented.mark ?? 'dot') === 'dot'}
        color={colors[tone.ink]}
      />
      <Text
        size="label"
        // The chosen label in the pill's ink; the rest in secondary, as 00 and the screens draw them.
        color={chosen ? tone.ink : 'foreground.2'}
        script={script}
        numeric={numeric}
        numberOfLines={1}
      >
        {label}
      </Text>
      <FocusRing visible={focused} radius={radius} />
    </HeroRadioGroup.Item>
  );
}

/**
 * One of `15`'s pills (F-240). Like {@link Option}, it IS the radio item: one control, one
 * announcement. Drawn as `Chip` draws F-232's choice pill — one edge width in every state, so
 * choosing a pill never shifts its outline; choosing it widens it by the leading dot.
 */
function Pill({
  value,
  label,
  disabled,
  chosen,
  focused,
  script,
  numeric = false,
  height,
}: {
  readonly value: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly chosen: boolean;
  readonly focused: boolean;
  readonly script: Script;
  readonly numeric?: boolean;
  readonly height: number;
}): React.JSX.Element {
  const { colors } = useTheme();
  const press = usePress();
  const tone = pillTone(chosen, 'surface.2', true, colors);
  return (
    <HeroRadioGroup.Item
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      value={value}
      isDisabled={disabled}
      accessibilityLabel={label}
      accessibilityState={{ selected: chosen, disabled }}
      // Drawn at the pill's height; the rest of the target is in the hit area (ADR-0114).
      hitSlop={hitArea(height, height)}
      style={{
        height,
        minWidth: height,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: nativeSpacing.xs,
        paddingHorizontal: nativeSpacing.sm,
        borderRadius: nativeRadius.pill,
        backgroundColor: tone.background,
        borderWidth: 1,
        borderColor: tone.borderColor,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <SelectionDot visible={tone.dot} color={colors[tone.ink]} />
      <Text size="label" color={tone.ink} script={script} numeric={numeric} numberOfLines={1}>
        {label}
      </Text>
      <FocusRing visible={focused} radius={nativeRadius.pill} />
    </HeroRadioGroup.Item>
  );
}

/** A segment's corner: the container's, less the inset it sits in, so the two curves are parallel. */
function segmentRadius(radius: NonNullable<Segmented['radius']>): number {
  return radius === 'pill' ? nativeRadius.pill : Math.max(0, nativeRadius[radius] - SEGMENT_INSET);
}

/** One option as the two layouts draw it. */
interface Entry {
  readonly value: string;
  readonly label: string;
  readonly disabled: boolean;
  readonly chosen: boolean;
  readonly focused: boolean;
  readonly numeric: boolean;
}

export function ChoiceGroup<V extends string>({
  label,
  options,
  value,
  onChange,
  clearLabel,
  disabled = false,
  loading = false,
  script = 'latin',
  testID,
  segmented,
  pills,
  focused,
}: ChoiceGroupProps<V>): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;
  const all: readonly Entry[] = [
    ...(clearLabel === undefined
      ? []
      : [
          {
            value: NONE,
            label: clearLabel,
            disabled: inert,
            chosen: value === null,
            focused: focused === null,
            numeric: false,
          },
        ]),
    ...options.map((o) => ({
      value: o.value,
      label: o.label,
      disabled: inert || (o.disabled ?? false),
      chosen: o.value === value,
      focused: focused !== undefined && focused === o.value,
      numeric: o.numeric ?? false,
    })),
  ];
  const onValueChange = (next: string): void => {
    // The sentinel is translated HERE, once, rather than at twelve call sites each
    // picking their own convention.
    onChange(next === NONE ? null : (next as V));
  };

  if (segmented !== undefined) {
    const height = segmented.height ?? SEGMENTED_HEIGHT;
    const edge = segmented.edge ?? 'border';
    const border = edge === 'none' ? 0 : 1;
    return (
      <View testID={testID}>
        {/*
          No caption: the mockups draw a segmented row without one, and the screen places its own
          label. The name is still the group's, announced below.
        */}
        <HeroRadioGroup
          value={value ?? NONE}
          onValueChange={onValueChange}
          accessibilityLabel={label}
          isDisabled={inert}
          accessibilityState={{ disabled: inert, busy: loading }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            height,
            padding: Math.max(0, SEGMENT_INSET - border),
            borderRadius: nativeRadius[segmented.radius ?? 'pill'],
            borderWidth: border,
            ...(edge === 'none' ? {} : { borderColor: colors[edge] }),
            backgroundColor:
              segmented.ground === undefined ? 'transparent' : colors[segmented.ground],
          }}
        >
          {all.map((o, i) => {
            const next = all[i + 1];
            const divide =
              segmented.dividers === true && next !== undefined && !o.chosen && !next.chosen;
            return [
              <Segment
                key={o.value}
                value={o.value}
                label={o.label}
                disabled={o.disabled}
                chosen={o.chosen}
                focused={o.focused}
                script={script}
                numeric={o.numeric}
                segmented={segmented}
              />,
              divide ? (
                <View
                  key={o.value + '|'}
                  pointerEvents="none"
                  style={{ width: 1, height: height / 2, backgroundColor: colors.border }}
                />
              ) : null,
            ];
          })}
        </HeroRadioGroup>
      </View>
    );
  }

  if (pills !== undefined) {
    const height = pills.height ?? CHIP_HEIGHT;
    return (
      <View testID={testID}>
        {/* No caption: `15` heads the row with its section's own heading. The name is the group's. */}
        <HeroRadioGroup
          value={value ?? NONE}
          onValueChange={onValueChange}
          accessibilityLabel={label}
          isDisabled={inert}
          accessibilityState={{ disabled: inert, busy: loading }}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: nativeSpacing.xs }}
        >
          {all.map((o) => (
            <Pill
              key={o.value}
              value={o.value}
              label={o.label}
              disabled={o.disabled}
              chosen={o.chosen}
              focused={o.focused}
              script={script}
              numeric={o.numeric}
              height={height}
            />
          ))}
        </HeroRadioGroup>
      </View>
    );
  }

  return (
    <View testID={testID}>
      <Text size="caption" color="foreground.2" script={script}>
        {label}
      </Text>
      <HeroRadioGroup
        value={value ?? NONE}
        onValueChange={onValueChange}
        // The group's own name. Without it a reader announces a group about nothing.
        accessibilityLabel={label}
        isDisabled={inert}
        // BOTH announced on the group rather than on each option: it is the GROUP that is
        // unavailable, and saying so four times is three repetitions of one fact.
        accessibilityState={{ disabled: inert, busy: loading }}
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: nativeSpacing.sm,
          marginTop: nativeSpacing.sm,
        }}
      >
        {all.map((o) => (
          <Option
            key={o.value}
            value={o.value}
            label={o.label}
            disabled={o.disabled}
            chosen={o.chosen}
            focused={o.focused}
            script={script}
            numeric={o.numeric}
          />
        ))}
      </HeroRadioGroup>
    </View>
  );
}
