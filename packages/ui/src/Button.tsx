/**
 * A button, drawn as the mockups draw it, with every state a pressable can be in rendering
 * differently.
 *
 * ## What changed in F-087, and what deliberately did not
 *
 * The behaviour now comes from `heroui-native` ([ADR-0062](../../../docs/adr/0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md)).
 * **The public API did not change** — `label`, `variant`, `disabled`, `loading` — so no screen
 * had to be touched, which is the property that makes the engine swappable at all.
 *
 * ## Colour comes through `style`, never `className`
 *
 * This is the rule, and it is not a stylistic preference. Uniwind resolves `className` in its
 * **Metro** plugin; jest never runs Metro; so a colour routed through a class is **absent from
 * the rendered tree** and the contrast gate measures an empty set while printing a pass
 * [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]].
 *
 * `className` stays correct for everything a gate does not read. Nothing here needs it yet.
 *
 * ## `feedbackVariant="scale"` is a correctness setting
 *
 * HeroUI's default is `scale-highlight`, and the highlight **animates `backgroundColor`**.
 * `motion.animatable` is `opacity` and `transform`, because the intermediate frames of a
 * colour transition are plausible colours the engine never produced — for a product whose
 * claim is "this is what colour that is", that is a correctness defect rather than a polish
 * one. `scale` is a transform, so the press feedback survives; the colour cross-fade does not.
 *
 * ## Why `loading` is a state and not a spinner someone remembers to add
 *
 * A control that is busy but looks identical to one that is ready invites a second tap. The
 * half that matters is `accessibilityState.busy`, which is what a screen reader announces —
 * and HeroUI sets only `disabled`, so the flag is supplied here. Both come from one prop, so
 * they cannot disagree.
 *
 * ## The forms board 00 draws (F-232)
 *
 * - **Primary:** a pill in `accent` with its label in `accent.foreground`, body at 500
 *   (`00.buttons.primary`).
 * - **Secondary:** an outline in `border.strong` with **no fill**, and its label in body at 400.
 *   The edge is decorative, because the label identifies the control (ADR-0111, E-151).
 * - **Icon-only, on a plate (ADR-0115):** the glyph on a `surface.2` plate, square (`sm`) or round.
 *   `13`'s locks draw an outlined plate instead. The plate is the pressable. A glyph with no plate
 *   is `IconButton`.
 *
 * Each screen draws its own height and corner, and a screen beats the board on its own surface
 * (P3), so both are props: a surface passes its element's `dp`. The defaults are computed from the
 * inventories, and `button-forms.test` recomputes them.
 *
 * ## Tap target (ADR-0114)
 *
 * The button is drawn at its drawn size and reaches the platform's target (44 iOS, 48 Android)
 * through its hit area (R9-MOCKUP-FIDELITY §4 E3). Its width is never raised: the floor is its own
 * height, the narrowest a pill can be drawn, and the horizontal slop grows THAT to the target, so a
 * button drawn narrower than the target (`12.save` is 47 dp, `05.finder` 44) keeps the width drawn.
 * The conformance suite adds the declared size and the `hitSlop` back together. That is declared,
 * not measured, because a JS render tree has no Yoga pass (ADR-0055).
 *
 * ## Nothing clips the focus ring
 *
 * HeroUI's root styles `overflow: hidden` (`pressable-feedback.css`, through className, which jest
 * never sees). The ring is drawn OUTSIDE the box, so the root says `overflow: 'visible'` in `style`,
 * which is what reaches the device; `button-forms.test` holds it.
 *
 * ## The accessibility is the button's own (F-232)
 *
 * Its name is `label` and its state is `disabled` and `loading`. The props that could rename it,
 * change its role or contradict its state are refused by type and removed at render
 * (`ownedAccessibility.ts`). The caller's props are spread FIRST, so nothing a caller passes can
 * land after the role, name and state set here. F-228's review found the old order let them.
 */

import { Button as HeroButton } from 'heroui-native';
import type { PressableProps } from 'react-native';
import { nativeRadius, nativeSpacing, nativeType } from '@irodora/design-tokens';
import { Glyph, glyphSpectrum, type GlyphName } from './Glyph.js';
import { hitArea } from './hitArea.js';
import type { Script } from './layout.js';
import {
  withoutOwnedAccessibility,
  type OwnedAccessibility,
  type RefuseOwnedAccessibility,
} from './ownedAccessibility.js';
import { FocusRing } from './selection.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

/**
 * The labelled forms the mockups draw. `plain` and `tonal` are the chrome's (F-234): a back label or
 * a text action (`plain`: no fill, no edge), and a filled button in a surface level (`tonal`: 10,
 * 19, 20, 03's *hold*).
 */
export type ButtonVariant = 'primary' | 'secondary' | 'plain' | 'tonal';

/** Which side of its label a glyph sits: an arrow trails, every other glyph leads (F-234). */
export type GlyphSide = 'leading' | 'trailing';

/** The glyphs the mockups draw after a label: the arrows. Every other glyph is drawn before it. */
const TRAILING_GLYPHS: readonly GlyphName[] = ['arrow-right'];

/** The side a glyph is drawn on when a caller does not say, as the chrome draws it. */
export function glyphSide(glyph: GlyphName): GlyphSide {
  return TRAILING_GLYPHS.includes(glyph) ? 'trailing' : 'leading';
}

/** The corners the mockups draw on buttons: 00's pill, and the screens' `sm`, `md` and `lg`. */
export type ButtonRadius = 'sm' | 'md' | 'lg' | 'pill';

/**
 * A labelled button's default drawn height, in dp: the median of every labelled pill button drawn
 * on a screen with a scale, snapped to half a dp (31.75 → 32). Recomputed by `button-forms.test`.
 */
export const BUTTON_HEIGHT = 32;

/**
 * An icon-only plate's default size, in dp. No screen draws 00's plates, so it is 00's own ratio:
 * the median plate height over the primary pill's in the same column (0.943) times
 * {@link BUTTON_HEIGHT}, snapped to half a dp. Recomputed by `button-forms.test`.
 */
export const ICON_PLATE = 30;

/**
 * A glyph's `size` as a share of its plate: the median over 00's three camera plates of the
 * camera's drawn width, divided by the 18 of 24 grid units it spans, over the plate. Recomputed by
 * `button-forms.test` from their `raw.glyphPx`.
 *
 * Measured on 00's plates only. It also sizes the glyph in a badge (`03`, `24`) and on `13`'s lock,
 * none of whose glyphs were measured: those screens' features should read their own and pass a
 * size where it differs.
 */
export const GLYPH_IN_PLATE = 0.65;

/**
 * `hitSlop` is the button's own (ADR-0114): it is what makes the drawn size reach the target, and a
 * caller that shrank it would take the target away.
 */
type Shared = Omit<
  PressableProps,
  'style' | 'children' | 'disabled' | 'hitSlop' | OwnedAccessibility
> &
  RefuseOwnedAccessibility & {
    readonly disabled?: boolean;
    readonly loading?: boolean;
    /**
     * Focused by an external keyboard or Switch Control, drawn as a `ring` outside the box
     * (E-151). A distinct state from pressed: focus is where the cursor is.
     */
    readonly focused?: boolean;
  };

type LabelledBase = Shared & {
  /** The visible label. Also the accessible name — one string, so they cannot diverge. */
  readonly label: string;
  /** The drawn height in dp: the element's own `dp.h`. Defaults to {@link BUTTON_HEIGHT}. */
  readonly height?: number;
  /** The drawn corner. Board 00 draws a pill, which is the default. */
  readonly radius?: ButtonRadius;
  /**
   * The script the label is written in.
   *
   * Latin by default, matching `Text`. It matters because ADR-0057 §6 bundles a Japanese
   * subset — Latin keeps the platform font because Latin has no tofu failure mode, and the
   * script that CAN fail silently is the one that gets the bundled face. Leading differs too.
   */
  readonly script?: Script;
  /**
   * A glyph beside the label (F-234): `03`'s *wear* ends in an arrow, its *add* starts with a plus;
   * back labels start with a back glyph. Decorative: the label is the name.
   */
  readonly glyph?: GlyphName;
  /** Which side the glyph is on. Defaults to {@link glyphSide}: an arrow trails, others lead. */
  readonly glyphAt?: GlyphSide;
  /**
   * The glyph's size in dp. Defaults to the label's type size, a convention rather than a reading:
   * only `03`'s two button glyphs are measured, and a surface passes its own where it differs.
   */
  readonly glyphSize?: number;
  /**
   * The accessible name, where the visible word is not the whole of what the control does: a back
   * control drawn as *Atlas* is announced *Back to Atlas* (F-234's review). It must contain the
   * visible label — WCAG 2.5.3, so a person who speaks the word they see still reaches it — and a
   * name that does not is refused at render. Without it the label is the name.
   */
  readonly name?: string;
  readonly icon?: never;
  readonly plate?: never;
  readonly shape?: never;
  readonly size?: never;
};

type PrimaryProps = LabelledBase & {
  readonly variant?: 'primary';
  readonly edge?: never;
  readonly level?: never;
  readonly ink?: never;
};
type SecondaryProps = LabelledBase & {
  readonly variant: 'secondary';
  /** The outline: board 00's `border.strong` (the default), or the screens' `border.subtle`. */
  readonly edge?: 'border' | 'border.strong';
  readonly level?: never;
  readonly ink?: never;
};
type PlainProps = LabelledBase & {
  readonly variant: 'plain';
  /** The label's ink: `foreground`, or `foreground.2` where the chrome draws it secondary. */
  readonly ink?: 'foreground' | 'foreground.2';
  readonly edge?: never;
  readonly level?: never;
};
type TonalProps = LabelledBase & {
  readonly variant: 'tonal';
  /** The surface level it is filled with: `level2` (20, 03's *hold*) or `level3` (19). */
  readonly level: 2 | 3;
  readonly edge?: never;
  readonly ink?: never;
};

type LabelledProps = PrimaryProps | SecondaryProps | PlainProps | TonalProps;

type IconOnlyProps = Shared & {
  /** The glyph, by the name its inventory binds. */
  readonly icon: GlyphName;
  /**
   * What the control does, for a screen reader: "Lock this slot", not "Lock icon". It is the ONLY
   * name, and nothing is shown, so it is required.
   */
  readonly label: string;
  /** 00's filled `surface.2` plate (the default), or `13`'s outline in `border`. */
  readonly plate?: 'filled' | 'outlined';
  /** 00's first row is square (`sm`); its second row is round. */
  readonly shape?: 'square' | 'circle';
  /** The plate's drawn size in dp: the element's own `dp`. Defaults to {@link ICON_PLATE}. */
  readonly size?: number;
  readonly variant?: never;
  readonly height?: never;
  readonly radius?: never;
  readonly script?: never;
  readonly name?: never;
};

export type ButtonProps = LabelledProps | IconOnlyProps;

export function Button(props: ButtonProps): React.JSX.Element {
  return props.icon === undefined ? <LabelledButton {...props} /> : <IconOnlyButton {...props} />;
}

/** What a labelled form paints: its fill, its edge, and its label's ink and weight. */
interface LabelledPaint {
  readonly background: string;
  readonly edge: string | undefined;
  readonly ink: 'accent.foreground' | 'foreground' | 'foreground.2';
  readonly weight: 400 | 500;
  /** Whether the label sits inside a padded shape, or is the whole control (a plain label). */
  readonly padded: boolean;
}

/** The four props that choose a labelled form's paint. */
interface PaintProps {
  readonly variant: ButtonVariant;
  readonly edge: 'border' | 'border.strong' | undefined;
  readonly level: 2 | 3 | undefined;
  readonly ink: 'foreground' | 'foreground.2' | undefined;
}

function labelledPaint(
  props: PaintProps,
  colors: ReturnType<typeof useTheme>['colors'],
): LabelledPaint {
  switch (props.variant) {
    case 'secondary':
      // Board 00's outline is `border.strong`; the screens' chrome draws `border.subtle` (`border`).
      return {
        background: 'transparent',
        edge: colors[props.edge ?? 'border.strong'],
        ink: 'foreground',
        weight: 400,
        padded: true,
      };
    case 'plain':
      // A back label or a text action: the words and their glyph, and nothing drawn around them.
      return {
        background: 'transparent',
        edge: undefined,
        ink: props.ink ?? 'foreground',
        weight: 400,
        padded: false,
      };
    case 'tonal':
      // Filled in a surface level; `foreground` on `surface.2` and `surface.3` are both declared.
      return {
        background: colors[props.level === 2 ? 'surface.2' : 'surface.3'],
        edge: undefined,
        ink: 'foreground',
        weight: 400,
        padded: true,
      };
    case 'primary':
      return {
        background: colors.accent,
        edge: undefined,
        ink: 'accent.foreground',
        weight: 500,
        padded: true,
      };
  }
}

function LabelledButton(props: LabelledProps): React.JSX.Element {
  const {
    label,
    variant = 'primary',
    height = BUTTON_HEIGHT,
    radius = 'pill',
    disabled = false,
    loading = false,
    focused = false,
    script = 'latin',
    glyph,
    glyphAt,
    glyphSize,
    name,
    edge,
    level,
    ink,
    ...rest
  } = props;
  const { colors } = useTheme();
  if (name !== undefined && !name.toLocaleLowerCase().includes(label.toLocaleLowerCase()))
    throw new TypeError(
      `Button: the name "${name}" does not contain the visible label "${label}" (WCAG 2.5.3)`,
    );
  const inert = disabled || loading;
  const paint = labelledPaint({ variant, edge, level, ink }, colors);
  const side = glyph === undefined ? undefined : (glyphAt ?? glyphSide(glyph));
  const glyphNode =
    glyph === undefined ? null : (
      <Glyph
        name={glyph}
        color={colors[paint.ink]}
        size={glyphSize ?? nativeType[script].body.fontSize}
      />
    );

  return (
    <HeroButton
      // FIRST, and without the owned props, so nothing a caller passes lands after the three below.
      {...withoutOwnedAccessibility(rest)}
      // HeroUI defaults this to 'button' already; stated because the accessible name below
      // only means anything alongside a role, and a default is a thing that can change.
      accessibilityRole="button"
      accessibilityLabel={name ?? label}
      // Both flags, from the same two props. HeroUI sets `disabled` and nothing else, so a
      // visually-busy control would be silent to a screen reader without this.
      accessibilityState={{ disabled: inert, busy: loading }}
      isDisabled={inert}
      // Scale is a transform. The default, `scale-highlight`, cross-fades a background colour
      // — see the note above; verify-motion.mjs rejects a component that allows it.
      feedbackVariant="scale"
      // The drawn height, and the rest of the target in the hit area (ADR-0114). The width floor is
      // the height (a circle, the narrowest pill), and the slop grows that to the target, so no
      // drawn width is raised.
      hitSlop={hitArea(height, height)}
      style={{
        height,
        minWidth: height,
        // The focus ring is drawn outside the box; HeroUI's root would clip it (see the header).
        overflow: 'visible',
        borderRadius: nativeRadius[radius],
        ...(paint.padded ? { paddingHorizontal: nativeSpacing.md } : {}),
        flexDirection: 'row',
        ...(glyph === undefined ? {} : { gap: nativeSpacing.xs }),
        justifyContent: 'center',
        alignItems: 'center',
        /*
         * Every drawn pairing is DECLARED in the manifest: `accent.foreground` on `accent`;
         * `foreground` on `surface.2` and `surface.3` (tonal); and `foreground` or `foreground.2` on
         * whatever surface an outline or a plain label sits on. The secondary has NO FILL: board 00
         * draws an outline and nothing inside it (F-232).
         */
        backgroundColor: paint.background,
        borderWidth: paint.edge === undefined ? 0 : 1,
        ...(paint.edge === undefined ? {} : { borderColor: paint.edge }),
        // Every declared state renders DIFFERENTLY. A component that returns the same tree for
        // default and disabled has defined the state in name only, and the conformance suite
        // rejects exactly that. Press feedback is HeroUI's scale, which the tree shows as a
        // transform rather than as a style branch.
        opacity: inert ? 0.5 : 1,
      }}
    >
      {side === 'leading' ? glyphNode : null}
      {/*
        THE LABEL GOES THROUGH `Text` (F-232), where it was HeroUI's own label: so it takes the
        type scale, the bundled face for Japanese (F-152), Dynamic Type, and the weight board 00
        draws — body at 500 on the primary, 400 on the others.
      */}
      <Text size="body" weight={paint.weight} color={paint.ink} script={script} numberOfLines={1}>
        {loading ? `${label}…` : label}
      </Text>
      {side === 'trailing' ? glyphNode : null}
      <FocusRing visible={focused} radius={nativeRadius[radius]} />
    </HeroButton>
  );
}

function IconOnlyButton({
  icon,
  label,
  plate = 'filled',
  shape = 'square',
  size = ICON_PLATE,
  disabled = false,
  loading = false,
  focused = false,
  ...rest
}: IconOnlyProps): React.JSX.Element {
  const { colors } = useTheme();
  const inert = disabled || loading;
  const radius = shape === 'circle' ? nativeRadius.pill : nativeRadius.sm;
  return (
    <HeroButton
      // FIRST, and without the owned props (`ownedAccessibility.ts`).
      {...withoutOwnedAccessibility(rest)}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inert, busy: loading }}
      isDisabled={inert}
      isIconOnly
      feedbackVariant="scale"
      // The plate is the pressable (ADR-0115), drawn at its size; the target is in the hit area.
      hitSlop={hitArea(size, size)}
      style={{
        width: size,
        height: size,
        // The focus ring is drawn outside the plate; HeroUI's root would clip it.
        overflow: 'visible',
        borderRadius: radius,
        justifyContent: 'center',
        alignItems: 'center',
        // `foreground` on `surface.2`, and on the surface beneath an outline: both declared.
        backgroundColor: plate === 'filled' ? colors['surface.2'] : 'transparent',
        borderWidth: plate === 'outlined' ? 1 : 0,
        ...(plate === 'outlined' ? { borderColor: colors.border } : {}),
        opacity: inert ? 0.5 : 1,
      }}
    >
      <Glyph
        name={icon}
        color={colors.foreground}
        size={size * GLYPH_IN_PLATE}
        // 00's wheel and palette are drawn in their hues (ADR-0110); every other glyph in one ink.
        spectrum={glyphSpectrum(icon, colors)}
      />
      <FocusRing visible={focused} radius={radius} />
    </HeroButton>
  );
}
