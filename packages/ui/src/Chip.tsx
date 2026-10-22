/**
 * A selectable chip: a pill a person chooses, drawn as the screens draw it (F-232).
 *
 * ## Why this is a component rather than a `Pressable` on the Atlas
 *
 * It was a `Pressable` on the Atlas first, and the conformance suite caught it: a control built
 * inside a screen is checked by **nothing**. `packages/ui`'s run covers this registry, the
 * app's run covers screens as `static` subjects, and an interactive control living in a screen
 * file falls between them — it has focus, active, disabled and loading states that no suite
 * ever asks it to render differently.
 *
 * ADR-0054 already says every component is either consumed by a real screen or registered, and
 * `a11y-scope.mjs` computes the closure. What it cannot see is a control that was never a
 * component in the first place. So the rule that matters is the converse: **an interactive
 * control belongs in the library, and a screen stays `static`.**
 *
 * ## What it draws: the pill treatment
 *
 * At rest it is an outline in `border` with nothing inside. Chosen, it is FILLED and a dot leads its
 * label (`pillTone`, `SelectionDot`). That is how `12`, `15` and `17` draw a choice, and none of
 * them draws a tick or a corner badge, so neither is drawn here any more. The fill is the screen's:
 * `surface.2` by default (`15` and `02`), `surface.3` on `12`, and `accent` on `17`, where the ink
 * turns to `accent.foreground`. `15` also edges its chosen pill in `foreground`.
 *
 * It is drawn at its drawn height and reaches the target through its hit area (ADR-0114). Focus is
 * a `ring` outside the box (E-151).
 *
 * ## Selection is never colour alone
 *
 * Golden rule 13, in three channels:
 * - the dot, which is a shape;
 * - the tick in the accessible NAME, so a screen reader announces the selection with the label;
 * - `accessibilityState.selected`, for assistive technology that reads state separately.
 *
 * None can be overridden by a caller: the props that could rename the chip, change its role or
 * contradict its selection are refused by type and removed at render (`ownedAccessibility.ts`), and
 * the caller's props are spread before the chip's own (F-232).
 *
 * ## The badge: a chip nobody presses (F-232)
 *
 * `form="badge"` draws the static chips the screens draw beside a reading:
 * - the provenance chip, with a glyph (`03`, `24`);
 * - the count pill, set in figures (`01`, `05`);
 * - the ΔE00 badge, plain (`21`) or tinted by its row's sample (`24`), where the ink is chosen by
 *   `inkOnSample` (C8).
 *
 * It is explicit, never inferred from a missing `onPress`, so a chip that is only sometimes
 * pressable stays a control. A badge is read, not pressed: it is one text element with no role.
 *
 * ## The filter chip (`05`)
 *
 * `05`'s family chips rest FILLED (`ground`), lead with the family's colour as a dot (`dot`, a
 * provenanced sample), and set the kanji after the romaji in the bundled gothic (`kanji`).
 */

import { Pressable, View, type PressableProps } from 'react-native';
import { nativeFaces, nativeRadius, nativeSpacing } from '@irodora/design-tokens';
import { Glyph, glyphSpectrum, type GlyphName } from './Glyph.js';
import { hitArea } from './hitArea.js';
import { inkOnSample, type Sample } from './inkOnSample.js';
import type { Script } from './layout.js';
import {
  withoutOwnedAccessibility,
  type OwnedAccessibility,
  type RefuseOwnedAccessibility,
} from './ownedAccessibility.js';
import { FocusRing, pillTone, SelectionDot, type PillFill } from './selection.js';
import { GLYPH_IN_PLATE } from './Button.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

/**
 * A chip's default drawn height, in dp: the median of every interactive pill chip drawn on a screen
 * with a scale (31 of them), snapped to half a dp. Recomputed by `pill-selection.test`.
 */
export const CHIP_HEIGHT = 21.5;

/**
 * A badge's default drawn height, in dp: the median of every static chip drawn on a screen with a
 * scale (38 of them), snapped to half a dp. Recomputed by `badges.test`.
 */
export const BADGE_HEIGHT = 21;

/** `05`'s family colour dot, in dp: 12 px at 2 px/dp. Recomputed by `badges.test`. */
export const SAMPLE_DOT = 6;

type ChipControlProps = Omit<
  PressableProps,
  'style' | 'children' | 'disabled' | 'hitSlop' | OwnedAccessibility
> &
  RefuseOwnedAccessibility & {
    /** The visible label. Also the accessible name, so the two cannot diverge. */
    readonly label: string;
    readonly selected?: boolean;
    /**
     * Focused by an external keyboard or Switch Control.
     *
     * A distinct state from `selected`: focus is where the cursor is, selection is what was
     * chosen, and a control that renders them identically has one of them in name only.
     */
    readonly focused?: boolean;
    readonly disabled?: boolean;
    /** The result behind this chip is still being computed. Announced as busy, not only dimmed. */
    readonly loading?: boolean;
    /**
     * The script the label is written in.
     *
     * Latin by default, matching `Text`. It matters because ADR-0057 §6 bundles a Japanese
     * subset — Latin keeps the platform font because Latin has no tofu failure mode, and the
     * script that CAN fail silently is the one that gets the bundled face. Leading differs too.
     */
    readonly script?: Script;
    /** The drawn height in dp: the element's own `dp.h`. Defaults to {@link CHIP_HEIGHT}. */
    readonly height?: number;
    /** The drawn corner: a pill, or `17`'s `sm`. */
    readonly radius?: 'sm' | 'pill';
    /** The chosen chip's fill, as its screen draws it. */
    readonly selectedFill?: PillFill;
    /** `15` edges its chosen chip in `foreground` as well as filling it. */
    readonly selectedEdge?: boolean;
    /** A control is the default; only a badge says so (`form="badge"`). */
    readonly form?: never;
    /** `05`: the chip rests filled, where the other screens' chips rest as an outline. */
    readonly ground?: 'surface.1';
    /** `05`: the family's colour, drawn as a dot before the label. A sample, so it is provenanced. */
    readonly dot?: Sample;
    /** `05`: the family's kanji, set after the label in the bundled gothic. Part of the name. */
    readonly kanji?: string;
    /** The label's step: `label` by default; `05` draws its chips' words at `caption` (F-246). */
    readonly size?: 'label' | 'caption';
  };

/** A chip nobody presses: a badge beside a reading (F-232). */
type ChipBadgeProps = ChipBadgeBase & BadgeFace;

interface ChipBadgeBase {
  readonly form: 'badge';
  /** The visible text. Also the accessible name, unless {@link name} says it in full. */
  readonly label: string;
  /**
   * The accessible name, where the text abbreviates: a ΔE00 badge prints `ΔE00: 2.14` and says the
   * metric's space too (FR-61, F-235).
   */
  readonly name?: string;
  /** A glyph before the text: `03`'s conditions, `24`'s capture source. */
  readonly icon?: GlyphName;
  /**
   * Filled in `surface.2` (`05`, `12`, `21`, `24`), or `surface.3` (`27`'s steps, F-236). Without
   * it the badge is an outline in `border`.
   */
  readonly fill?: 'surface.2' | 'surface.3';
  /** `21` draws its badge filled AND outlined. */
  readonly edge?: boolean;
  /** `24`: tinted by its row's sample. The text takes the ink `inkOnSample` chooses. */
  readonly tint?: Sample;
  readonly radius?: 'sm' | 'pill';
  /** The drawn height in dp: the element's own `dp.h`. Defaults to {@link BADGE_HEIGHT}. */
  readonly height?: number;
  /**
   * The words may wrap (F-247): the drawn height becomes a minimum and the badge no wider than the
   * row it sits in. `06`'s *Family • Era • Season* pill holds more than one line on a narrow phone
   * or in Japanese, and a line that does not fit wraps; it is never clipped (R9 §4 E3). Without it the
   * badge is one line at its drawn height, as every other badge is drawn.
   */
  readonly wrap?: true;
  readonly script?: Script;
  readonly testID?: string;
}

/**
 * The badge's face: the platform sans at its step, or the mono `27` sets its pipeline's steps in
 * (ADR-0130), which exists at one step and sets its figures equal-width already — so a mono badge
 * takes no `size` and no `numeric`.
 */
type BadgeFace =
  | {
      readonly mono?: false;
      /** The text's step: `label`, or `17`'s step pill's `caption` (F-235). */
      readonly size?: 'label' | 'caption';
      /** The text carries figures (a count, a ΔE00), so it is set in the numeric setting. */
      readonly numeric?: boolean;
    }
  | { readonly mono: true; readonly size?: never; readonly numeric?: never };

/** The step the mono is drawn at (ADR-0130): the manifest's one. */
const MONO_STEP = nativeFaces.mono.steps[0];

export type ChipProps = ChipControlProps | ChipBadgeProps;

/**
 * The accessible name, assembled here so no call site can forget the selection channel.
 *
 * Exported so the conformance suite can assert its shape rather than re-deriving it.
 */
export function chipAccessibleName(label: string, selected: boolean): string {
  return selected ? `${label} ✓` : label;
}

export function Chip(props: ChipProps): React.JSX.Element {
  return props.form === 'badge' ? <Badge {...props} /> : <ChipControl {...props} />;
}

function Badge(props: ChipBadgeProps): React.JSX.Element {
  const {
    label,
    name,
    icon,
    fill,
    edge = false,
    tint,
    radius = 'pill',
    height = BADGE_HEIGHT,
    wrap,
    script = 'latin',
    testID,
  } = props;
  const { colors, source, paint } = useTheme();
  // On a sample the ink is chosen against the sample (C8); otherwise it is the surface's own. Chosen
  // on the declared palette and sample, then painted (F-240, ADR-0131 §3).
  const ink = tint === undefined ? 'foreground' : inkOnSample(tint.hex, source).ink;
  const outlined = edge || (fill === undefined && tint === undefined);
  const lines = wrap === true ? {} : { numberOfLines: 1 };
  const words =
    props.mono === true ? (
      <Text face="mono" size={MONO_STEP} color={ink} script={script} {...lines}>
        {label}
      </Text>
    ) : (
      <Text
        size={props.size ?? 'label'}
        color={ink}
        script={script}
        numeric={props.numeric ?? false}
        {...lines}
      >
        {label}
      </Text>
    );
  return (
    <View
      testID={testID}
      // Read, not pressed: one element, announced as the text it is and never as a control.
      accessible
      accessibilityRole="text"
      accessibilityLabel={name ?? label}
      style={{
        ...(wrap === true ? { minHeight: height, maxWidth: '100%' as const } : { height }),
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: nativeSpacing.xs,
        paddingHorizontal: nativeSpacing.sm,
        borderRadius: nativeRadius[radius],
        backgroundColor:
          tint !== undefined ? paint(tint.hex) : fill !== undefined ? colors[fill] : 'transparent',
        borderWidth: outlined ? 1 : 0,
        ...(outlined ? { borderColor: colors.border } : {}),
      }}
    >
      {icon === undefined ? null : (
        <Glyph
          name={icon}
          color={colors[ink]}
          size={height * GLYPH_IN_PLATE}
          spectrum={glyphSpectrum(icon, colors)}
        />
      )}
      {/* With `wrap`, the words take the room left beside the glyph and wrap within it. */}
      {wrap === true ? <View style={{ flexShrink: 1 }}>{words}</View> : words}
    </View>
  );
}

function ChipControl({
  label,
  selected = false,
  focused = false,
  disabled = false,
  loading = false,
  script = 'latin',
  height = CHIP_HEIGHT,
  radius = 'pill',
  selectedFill = 'surface.2',
  selectedEdge = false,
  ground,
  dot,
  kanji,
  size = 'label',
  ...rest
}: ChipControlProps): React.JSX.Element {
  const { colors, paint } = useTheme();
  const inert = disabled || loading;
  const tone = pillTone(selected, selectedFill, selectedEdge, colors);

  return (
    <Pressable
      // FIRST, and without the owned props, so nothing a caller passes lands after the chip's own.
      {...withoutOwnedAccessibility(rest)}
      accessibilityRole="button"
      accessibilityLabel={chipAccessibleName(
        kanji === undefined ? label : `${label} ${kanji}`,
        selected,
      )}
      // `selected` twice on purpose: in the name for a reader that announces only the label,
      // and in the state for one that reads state separately.
      accessibilityState={{ selected, disabled: inert, busy: loading }}
      disabled={inert}
      // The drawn height, and the rest of the target in the hit area (ADR-0114). The width floor is
      // the height (a circle, the narrowest pill) and the slop grows that to the target, so a short
      // label keeps the width drawn: `05`'s "All" is 34 dp.
      hitSlop={hitArea(height, height)}
      style={{
        height,
        minWidth: height,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: nativeSpacing.xs,
        paddingHorizontal: nativeSpacing.sm,
        borderRadius: nativeRadius[radius],
        backgroundColor: !selected && ground !== undefined ? colors[ground] : tone.background,
        // One edge width in every state, so choosing a chip never shifts its outline. Choosing it
        // does WIDEN it, by the leading dot and its gap: the dot is drawn, as 12, 15 and 17 draw it.
        borderWidth: 1,
        borderColor: tone.borderColor,
        // Every declared state renders differently. A control returning the same tree for
        // default and disabled has defined the state in name only.
        opacity: inert ? 0.5 : 1,
      }}
    >
      <SelectionDot visible={tone.dot} color={colors[tone.ink]} />
      {dot === undefined ? null : (
        <View
          // The family's colour, as data: decorative to a screen reader, named in the label. Named by
          // the chip's own id where it has one, so a sweep can find the dot as itself (F-246).
          {...(typeof rest.testID === 'string' ? { testID: `${rest.testID}.dot` } : {})}
          pointerEvents="none"
          style={{
            width: SAMPLE_DOT,
            height: SAMPLE_DOT,
            borderRadius: nativeRadius.pill,
            backgroundColor: paint(dot.hex),
          }}
        />
      )}
      <View style={{ flexDirection: 'row', gap: nativeSpacing.xs }}>
        <Text size={size} color={tone.ink} script={script} numberOfLines={1}>
          {loading ? `${label}…` : label}
        </Text>
        {kanji === undefined ? null : (
          <Text size={size} color={tone.ink} script="japanese" numberOfLines={1}>
            {kanji}
          </Text>
        )}
      </View>
      <FocusRing visible={focused} radius={nativeRadius[radius]} />
    </Pressable>
  );
}
