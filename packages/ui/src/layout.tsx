/**
 * The layout primitives — where a screen states its rhythm.
 *
 * ## The defect these exist to make unbuildable
 *
 * The manifest specifies an editorial product: a type scale from 72px to 10px, and a spacing
 * scale whose top four steps are 28, 40, 56 and 96 with the stated argument that 間 (*ma*) is a
 * design element and the larger steps carry more of the layout than a dense UI would give them.
 *
 * The application rendered none of it. `display.1` and `display.2` were used **zero** times —
 * every screen opened at `title`, 22px — and `xl2`..`xl5` were used **zero** times, with the
 * largest step any screen reached being `xl` (20), twice. Meanwhile 147 padding, gap and margin
 * values were written as numeric literals. `verify-spacing-scale.mjs` confirms each of those
 * lands on the scale, so they were not *wrong*; they agreed with the manifest **by inspection
 * rather than by reference**, which is a different and more fragile thing. Nothing stopped the
 * next one drifting, and nothing connected the number 8 to the decision named `sm`.
 *
 * ## The mechanism is the prop type, not a convention
 *
 * Every spacing prop here takes a {@link SpacingStep} — a step *name*. There is no numeric
 * overload, deliberately:
 *
 * ```tsx
 * <Stack gap="lg">     // 16, because `lg` is 16 in the manifest
 * <Stack gap={16}>     // does not compile
 * ```
 *
 * A documented rule would rely on the next screen's author remembering, and this repository has
 * now watched a prose-reading check fail five separate times. So the careless version is a
 * compile error instead — the move ADR-0005 makes for provenance and F-139 makes for empty
 * states, applied to layout [[the-careless-version-should-not-compile]].
 *
 * **The step name is also the only thing that carries the design intent.** A bare `28` says a
 * number somebody chose; `gap="xl2"` says the step the manifest argues for, and when the
 * manifest revises that step the screen follows without being edited.
 *
 * ## What is deliberately NOT here
 *
 * **No `style` escape hatch.** Each primitive composes `View` and accepts its non-style props,
 * and that is all. A `style` passthrough would re-admit every literal these types exist to
 * refuse, and it would do it in the one place nobody greps.
 *
 * **No colour.** `Surface` owns elevation and `Text` owns foreground; a layout component that
 * also painted would give two components an opinion about the same pixel. These are transparent
 * and the ground shows through — except `Screen`, which owns the page ground because something
 * has to, and takes it from the theme rather than naming a colour.
 */

import { ScrollView, View, type ViewProps } from 'react-native';
import { nativeSpacing, type nativeType } from '@irodora/design-tokens';
import { useTheme } from './theme.js';
import { Text } from './Text.js';

/**
 * A step of the spacing scale, by name.
 *
 * Derived from the emitted token rather than written out, so removing or renaming a step is a
 * compile error at every call site that wanted it — which is what ADR-0074 bought when the
 * scale stopped being a positional array, and it would be given straight back by a hand-copied
 * union that agreed with the manifest on the day it was typed.
 */
export type SpacingStep = keyof typeof nativeSpacing;

/**
 * Which script the text is set in. A PROP, threaded from the caller, never a hook.
 *
 * `Text` already works this way and the reason generalises: the locale lives in the app’s
 * message catalogue, and a UI package that reached for it would either depend on the app or
 * guess. Guessing is how F-017 shipped a screen that decided its own theme and became
 * uncheckable in the other one.
 */
export type Script = keyof typeof nativeType;

/** Cross-axis alignment. The RN values, narrowed to the four that mean something here. */
export type Align = 'start' | 'center' | 'end' | 'stretch';
/** Main-axis distribution for a {@link Row}. */
export type Justify = 'start' | 'center' | 'end' | 'between';

const ALIGN = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
} as const;

const JUSTIFY = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  between: 'space-between',
} as const;

/** Props every flow primitive shares. `ViewProps` minus the escape hatch. */
type FlowProps = Omit<ViewProps, 'style'> & {
  readonly gap?: SpacingStep;
  readonly align?: Align;
};

export type StackProps = FlowProps;

/**
 * Vertical flow.
 *
 * The default gap is `md` (12) rather than nothing, because a `Stack` with no gap is a `View`
 * and would be reached for by anyone who wanted one — which quietly makes the primitive
 * optional again. A caller who genuinely wants children touching says `gap="xs"` or nests a
 * `View`, and both of those are visible in review.
 */
export function Stack({ gap = 'md', align, children, ...rest }: StackProps): React.JSX.Element {
  return (
    <View
      {...rest}
      style={{
        flexDirection: 'column',
        gap: nativeSpacing[gap],
        ...(align === undefined ? {} : { alignItems: ALIGN[align] }),
      }}
    >
      {children}
    </View>
  );
}

export type RowProps = FlowProps & {
  readonly justify?: Justify;
  readonly wrap?: boolean;
};

/**
 * Horizontal flow.
 *
 * `align` defaults to `center`, which is the correct default for the case this replaces almost
 * everywhere in the product: a swatch beside its label. Top-aligning those is the thing that
 * looks like nobody looked.
 */
export function Row({
  gap = 'md',
  align = 'center',
  justify,
  wrap = false,
  children,
  ...rest
}: RowProps): React.JSX.Element {
  return (
    <View
      {...rest}
      style={{
        flexDirection: 'row',
        gap: nativeSpacing[gap],
        alignItems: ALIGN[align],
        ...(justify === undefined ? {} : { justifyContent: JUSTIFY[justify] }),
        ...(wrap ? { flexWrap: 'wrap' } : {}),
      }}
    >
      {children}
    </View>
  );
}

export type SectionProps = Omit<ViewProps, 'style'> & {
  /**
   * The section's heading. Rendered at `title` with `heading` set, so a screen reader can
   * navigate by it — ACCESSIBILITY.md A11, and the defect F-088 found when headings announced
   * as ordinary text.
   */
  readonly title?: string;
  /**
   * The small uppercase label above the title.
   *
   * **Only where it names a real category.** The visual-taste skill's rule is that a structural
   * device must carry information; an eyebrow reading "SECTION" is decoration wearing the
   * clothes of structure, and it is one of the listed AI-design clichés.
   */
  readonly eyebrow?: string;
  readonly gap?: SpacingStep;
  /** Threaded to the heading text. See {@link Script}. */
  readonly script?: Script;
};

/**
 * An editorial block: an optional eyebrow, an optional heading, and content.
 *
 * The eyebrow uses the `label` step — 10px, uppercase, 0.16em tracking — which is the bottom of
 * the type scale and exists for exactly this. Setting it against a `title` is where the scale's
 * contrast becomes visible, and contrast between the largest and smallest thing on a page is
 * what the calm is made of.
 */
export function Section({
  title,
  eyebrow,
  gap = 'lg',
  script = 'latin',
  children,
  ...rest
}: SectionProps): React.JSX.Element {
  return (
    <View {...rest} style={{ flexDirection: 'column', gap: nativeSpacing[gap] }}>
      {eyebrow === undefined && title === undefined ? null : (
        <View style={{ flexDirection: 'column', gap: nativeSpacing.xs }}>
          {eyebrow === undefined ? null : (
            <Text size="label" color="foreground.2" script={script}>
              {eyebrow}
            </Text>
          )}
          {title === undefined ? null : (
            <Text size="title" color="foreground" script={script} heading>
              {title}
            </Text>
          )}
        </View>
      )}
      {children}
    </View>
  );
}

export type ScreenProps = Omit<ViewProps, 'style'> & {
  /**
   * The screen's title, rendered at `display.2` — 34px.
   *
   * **This is the criterion the feature turns on.** Every screen in the product opened at
   * `title` (22px), so the scale it actually rendered was 22-to-10 while the manifest specified
   * 72-to-10. A screen title is the one element on a page that is unambiguously the largest
   * thing on it, so it is where the display tier belongs, and putting it here rather than
   * asking seventeen screens to remember is what makes it hold.
   */
  readonly title?: string;
  /** Above the title, same rule as {@link SectionProps.eyebrow}: only a real category. */
  readonly eyebrow?: string;
  /**
   * Whether the page scrolls. **Defaults to true**, and the default is load-bearing: F-104
   * found a fixed `View` whose last two controls could not be tapped at all, and nothing could
   * have caught it — a react-test-renderer tree has no viewport, so "rendered" and "reachable"
   * are the same thing there and different things on a phone.
   *
   * A screen that genuinely owns its own viewport — the Lens, which is a camera — passes
   * `scroll={false}` and says so at the call site.
   */
  readonly scroll?: boolean;
  /** Page inset. `xl2` (28) is the editorial default; a dense surface may take less. */
  readonly padding?: SpacingStep;
  /** Rhythm between top-level blocks. `xl3` (40) is the editorial default. */
  readonly gap?: SpacingStep;
  /** Threaded to the title and eyebrow. See {@link Script}. */
  readonly script?: Script;
};

/**
 * The page root, and the thing seventeen screens were each writing by hand.
 *
 * Every screen in the product opened with some variant of
 *
 * ```tsx
 * <ScrollView style={{ flex: 1, backgroundColor: colors.background }}
 *             contentContainerStyle={{ padding: 20, gap: 16 }}>
 * ```
 *
 * — four literals and a theme read, repeated seventeen times with three different paddings and
 * four different gaps between them. That is not a screen deciding its rhythm; it is seventeen
 * screens each deciding it once and never comparing notes.
 *
 * **The padding and gap go on `contentContainerStyle`, never on `style`.** F-104 again: putting
 * them on the scroller pads the *scroller* rather than its content, which clips the last child
 * by exactly the bottom padding — the same bug one step smaller and far harder to see.
 */
export function Screen({
  title,
  eyebrow,
  scroll = true,
  padding = 'xl2',
  gap = 'xl3',
  script = 'latin',
  children,
  ...rest
}: ScreenProps): React.JSX.Element {
  const { colors } = useTheme();

  const header =
    eyebrow === undefined && title === undefined ? null : (
      <View style={{ flexDirection: 'column', gap: nativeSpacing.sm }}>
        {eyebrow === undefined ? null : (
          <Text size="label" color="foreground.2" script={script}>
            {eyebrow}
          </Text>
        )}
        {title === undefined ? null : (
          <Text size="display.2" color="foreground" script={script} heading>
            {title}
          </Text>
        )}
      </View>
    );

  const content = (
    <>
      {header}
      {children}
    </>
  );

  const inset = { padding: nativeSpacing[padding], gap: nativeSpacing[gap] } as const;

  if (!scroll)
    return (
      <View
        {...rest}
        style={{
          flex: 1,
          backgroundColor: colors.background,
          flexDirection: 'column',
          ...inset,
        }}
      >
        {content}
      </View>
    );

  return (
    <ScrollView
      {...rest}
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ flexDirection: 'column', ...inset }}
    >
      {content}
    </ScrollView>
  );
}
