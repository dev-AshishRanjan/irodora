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

import { useContext } from 'react';
import { ScrollView, View, type ViewProps } from 'react-native';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { nativeSpacing, type nativeType } from '@irodora/design-tokens';
import { Appear } from './motion.js';
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

/**
 * Cross-axis alignment. The RN values, narrowed to the five that mean something here.
 *
 * `baseline` was added in **F-203**, and it was added because seven screens had already written
 * it by hand: a number beside its unit, or a value beside its label, sits on ONE line, and
 * `center` puts a 24px figure and an 11px unit on two different optical lines that read as a
 * mistake. Five uses across five files, every one an `alignItems: 'baseline'` on a raw `View`.
 *
 * **A workaround is what a missing value looks like from the outside.** The screens were not
 * being careless; the primitive could not say the thing they needed to say.
 */
export type Align = 'start' | 'center' | 'end' | 'stretch' | 'baseline';
/** Main-axis distribution for a {@link Row}. */
export type Justify = 'start' | 'center' | 'end' | 'between';

const ALIGN = {
  start: 'flex-start',
  center: 'center',
  end: 'flex-end',
  stretch: 'stretch',
  baseline: 'baseline',
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
  /**
   * Vertical inset only, as a step of the scale.
   *
   * Added in **F-203** for the same reason `baseline` was: three screens had written
   * `paddingVertical` by hand, because a row in a list needs breathing room above and below and
   * NOT at the ends, where the page inset already applies. `padding` covers all four sides and
   * a row using it sits inset from the page edge twice.
   *
   * Deliberately not a general `paddingX`/`paddingY` pair: the horizontal case has not come
   * up, and a value nothing produces is a value nothing consumes.
   */
  readonly padY?: SpacingStep;
  /**
   * Inset, as a step of the scale.
   *
   * Added in F-148 for **full bleed**. A page whose hero runs edge to edge cannot take its inset
   * from `Screen` — the inset is what stops it bleeding — so the page sets `Screen padding="xs"`
   * and pads the rest of its content here instead.
   *
   * Without this the only ways to get there were a negative margin (which needs the `style`
   * escape hatch these primitives exist to refuse) or wrapping the body in a `Surface`, which
   * paints elevation nobody asked for.
   */
  readonly padding?: SpacingStep;
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
export function Stack({
  gap = 'md',
  align,
  padding,
  padY,
  children,
  ...rest
}: StackProps): React.JSX.Element {
  return (
    <View
      {...rest}
      style={{
        flexDirection: 'column',
        gap: nativeSpacing[gap],
        ...(align === undefined ? {} : { alignItems: ALIGN[align] }),
        ...(padding === undefined ? {} : { padding: nativeSpacing[padding] }),
        ...(padY === undefined ? {} : { paddingVertical: nativeSpacing[padY] }),
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
  padding,
  padY,
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
        ...(padY === undefined ? {} : { paddingVertical: nativeSpacing[padY] }),
        ...(padding === undefined ? {} : { padding: nativeSpacing[padding] }),
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
  /**
   * Where this section sits in the screen's order, so it arrives in it (F-188).
   *
   * **Optional, and absent means "not part of a sequence."** A section that is the only one on
   * its screen has no order to arrive in, and giving it a delay would be a pause with nothing on
   * the other side of it.
   *
   * The delay is derived from this inside `Appear` and never passed as a duration — a caller
   * that could pass milliseconds could pass a number off the scale, and then the scale is
   * decorative.
   */
  readonly index?: number;
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
  index,
  script = 'latin',
  children,
  ...rest
}: SectionProps): React.JSX.Element {
  /*
   * A SECTION ARRIVES IN ITS PLACE IN THE ORDER (F-188).
   *
   * `index` is optional and absent means "not part of a sequence" — a section that is the only
   * one on its screen has no order to arrive in, and giving it a delay would be a pause with
   * nothing on the other side of it.
   *
   * The DELAY is derived from the index inside `Appear`, never passed: a caller that could pass
   * milliseconds could pass a number off the scale, and then the scale is decorative.
   */
  const body = (
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

  return index === undefined ? body : <Appear index={index}>{body}</Appear>;
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

  /*
   * EVERY SCREEN ENTERS (F-188), and this is the one line that made it true.
   *
   * The motion system has existed since F-144 — a scale, an easing, a reduced-motion
   * subscription and `Appear` — and `Appear` reached **one of seventeen screens**. The app was
   * reported as *"no animation and transistions … feels dead and uncreative"*, and it was: the
   * capability was built, gated, and applied once.
   *
   * Wrapping HERE rather than in seventeen files is not only cheaper. It is the difference
   * between a property of the product and a habit somebody has to remember — the eighteenth
   * screen gets it without knowing this decision was made, which is what a design system is
   * for.
   *
   * ONE `Appear`, NOT ONE PER CHILD. A screen whose every block arrived separately would take
   * as long to assemble as it takes to read, which is the shape that reads as slow rather than
   * as considered. `Section` staggers what is INSIDE it; the screen arrives as a screen.
   *
   * Under reduced motion `Appear` renders its children at rest with no delay, so this costs
   * nothing to somebody who asked for no motion.
   */
  const content = (
    <Appear>
      {header}
      {children}
    </Appear>
  );

  /*
   * THE DEVICE'S OWN INSETS — the only place in the app that reads them.
   *
   * Nothing consumed insets at all until F-159. It worked before F-145 because the root Stack
   * SHOWED A HEADER and react-navigation insets a header for you; `headerShown: false` was
   * right — a navigation bar above a tab bar is two headers for one page — and it removed the
   * only thing holding content off the status bar.
   *
   * NOT THE BOTTOM. Every screen in this app sits inside the tab navigator, which occupies the
   * bottom edge and takes that inset itself. Adding it here as well would count it twice, and
   * the gap under a phone's home indicator would be the size of two.
   *
   * ONE PLACE, and `verify-viewport.mjs` enforces that: a per-screen inset is a per-screen
   * decision, and the next screen forgets.
   *
   * ## The context, not `useSafeAreaInsets()`
   *
   * The hook THROWS when no provider is above it — *"No safe area value available"* — which is
   * the right behaviour for an app and the wrong behaviour for this component. A `Screen` is
   * rendered by the conformance suite, by three dozen screen tests and by the a11y gate, none of
   * which is an app and none of which has a navigator.
   *
   * Reading the context directly is what the hook does minus the throw, and the fallback is
   * ZERO INSETS — which is exactly what a device with no notch reports, so it is a real value
   * rather than a stand-in. The place where a missing provider genuinely IS a defect is the app
   * root, and `app/_layout.tsx` renders one explicitly rather than trusting expo-router to.
   */
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };

  /*
   * THE HARDWARE, AND IT IS A BOUNDARY RATHER THAN SPACING (F-167).
   *
   * F-159 added this to the token padding and put the sum on `contentContainerStyle`. That pads
   * the CONTENT INSIDE THE SCROLLER: the first screenful sits in the right place — which is why
   * it was accepted — and every pixel after it travels under the notch. Reported from a device
   * as *"the battery and all native data is coming as a patch over our UI"*.
   *
   * A `ScrollView` clips to its own frame. So the inset has to move the FRAME, which means it
   * belongs on an ancestor: content then cannot reach the status bar because there is nowhere
   * for it to go. It is not spacing and it never was — the product's rhythm is a design value
   * and this is the shape of the hardware, and merging them is what hid the difference.
   *
   * NOT `paddingTop` ON THE SCROLLVIEW'S OWN `style`, which is the tempting one-line version:
   * padding on a ScrollView style does not act as a viewport inset, which is the documented
   * trap that sends everybody to `contentContainerStyle` in the first place.
   *
   * NOT `SafeAreaView`, which calls `useSafeAreaInsets` internally and therefore throws in every
   * context this component is rendered in that is not an app.
   */
  const hardware = {
    paddingTop: insets.top,
    paddingLeft: insets.left,
    paddingRight: insets.right,
  } as const;

  /** The product's own rhythm, unchanged. A screen keeps this whatever the phone looks like. */
  const rhythm = {
    padding: nativeSpacing[padding],
    gap: nativeSpacing[gap],
  } as const;

  /*
   * THE BACKGROUND PAINTS BEHIND THE STATUS BAR, and that is deliberate rather than an oversight
   * of the above. The wrapper reaches the edge of the screen and is opaque, so the notch area
   * is the app's ground; without it a phone would show a band of platform colour above the
   * content, which is the same defect pointing the other way.
   */
  const ground = { flex: 1, backgroundColor: colors.background, ...hardware } as const;

  if (!scroll)
    return (
      <View style={ground}>
        <View {...rest} style={{ flex: 1, flexDirection: 'column', ...rhythm }}>
          {content}
        </View>
      </View>
    );

  return (
    <View style={ground}>
      <ScrollView
        {...rest}
        style={{ flex: 1 }}
        contentContainerStyle={{ flexDirection: 'column', ...rhythm }}
        /*
          iOS ADJUSTS CONTENT INSETS FOR SAFE AREAS BY ITSELF unless told not to, and the wrapper
          above has already done it. Left at the default this would be counted twice on exactly
          the phones that have a notch — the devices the fix is for.
        */
        contentInsetAdjustmentBehavior="never"
      >
        {content}
      </ScrollView>
    </View>
  );
}
