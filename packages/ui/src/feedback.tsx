/**
 * The three states this product rendered as nothing: **loading, working, and done**.
 *
 * ## What was there
 *
 * `EmptyState` covers *nothing here yet* and `Status` covers *something went wrong*. Between
 * them there was a gap the product filled with prose: a button whose label changed to
 * `"Reading…"`, a `<Text>` that appeared saying `"Saved"`, and — while a screen was computing —
 * nothing at all.
 *
 * A screen that renders nothing while it works is indistinguishable from a screen that has
 * finished and found nothing, which is the one confusion an empty state exists to prevent.
 *
 * ## Which of these wrap HeroUI, and why the answers differ
 *
 * [`heroui-wrappers.md`](../../../.harness/rules/frontend/heroui-wrappers.md): *wrap when there
 * is BEHAVIOUR to inherit.*
 *
 * | | wrapped | what is inherited |
 * |---|---|---|
 * | `Skeleton` | **yes** | a repeating opacity animation, and the group stagger |
 * | `Toast` | **yes** | a portal, a queue, stacking, auto-dismiss and swipe-to-dismiss |
 * | `Spinner` | **REFUSED** | see below |
 *
 * The toast is the clearest case in the library: a queue that stacks, times out, and can be
 * swiped away is exactly the *"tedious to get right, easy to get subtly wrong, and invisible to
 * a sighted developer with a mouse"* the rule is about.
 *
 * **And its provider is already mounted.** `HeroUINativeProvider` wraps its children in
 * `ToastProvider`, so `ThemeProvider` has been supplying one since F-087 without anybody using
 * it. No root-layout change; the capability was already there.
 *
 * ## Reduced motion turns them off rather than slowing them down
 *
 * F-144's rule, and it matters more here than anywhere else in the product: a skeleton and a
 * spinner are the only things that animate *continuously*. Under reduced motion the skeleton is
 * a static tinted block and the spinner does not turn — both still announce that work is
 * happening, because the announcement was never the animation's job.
 *
 * ## HeroUI's Spinner is refused, and the conformance suite is why
 *
 * It was wrapped, registered, and **reported in every one of the eight palettes**: its SVG draws
 * `fill = #000000` regardless of the `color` prop, and its inner view is pressable with no
 * accessible name. A component that paints a literal black on a dark theme, in a
 * colour-measurement app, is not a component this product can use — and this is the same shape
 * as `Sheet`'s `backgroundStyle`, which HeroUI accepts and then ignores.
 *
 * **Nothing replaces it, deliberately.** A rotation is a transform, which the motion system
 * already does, so building one would be easy — and there is no consumer for a spinner that a
 * `Skeleton` does not serve better. *"No wrapper without a consumer"*, and the same is true of
 * something hand-rolled. One arrives when a screen genuinely cannot say what shape is coming.
 *
 * That the suite found this before any screen used it is the argument for registering a
 * component the day it is written rather than the day it ships.
 *
 * ## Colour never animates, including here
 *
 * HeroUI's skeleton interpolates **opacity** — checked in its source, not assumed — so it is
 * inside `motion.animatable` as it stands. `verify-motion` scans our source and cannot see
 * inside a dependency, which is exactly why that was read rather than trusted.
 */

import { View } from 'react-native';
import { Skeleton as HeroSkeleton, useToast as useHeroToast } from 'heroui-native';
import { nativeRadius, nativeSpacing } from '@irodora/design-tokens';
import { useMotion } from './motion.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

export interface SkeletonProps {
  /**
   * How tall the placeholder is, in the same units the thing it stands in for uses.
   *
   * **Required, and there is no default.** A skeleton whose size is decided by the component
   * rather than by the caller is a grey box that stands in for nothing — the content jumps when
   * the real thing arrives, which is the flicker a skeleton exists to remove. Criterion 2 is
   * *"shaped like the thing it stands in for"*, and a default would make that unenforceable.
   */
  readonly height: number;
  readonly width?: number | `${number}%`;
  readonly radius?: keyof typeof nativeRadius;
  /**
   * What is loading, in the caller's language.
   *
   * **Required**, and `@irodora/ui` owns no copy (ADR-0056). A skeleton with no name is a
   * decoration to anyone not looking at it, and "loading" alone does not say loading *what*.
   */
  readonly label: string;
  readonly testID?: string;
}

/**
 * A placeholder shaped like the thing that is coming.
 *
 * Announced as busy, so the state exists for somebody who cannot see the pulse. That is the
 * half a shimmer cannot carry and the half that is usually missing.
 */
export function Skeleton({
  height,
  width = '100%',
  radius = 'md',
  label,
  testID,
}: SkeletonProps): React.JSX.Element {
  const { colors } = useTheme();
  const { reduced } = useMotion();

  return (
    <HeroSkeleton
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityState={{ busy: true }}
      /*
       * REDUCED MOTION REMOVES THE PULSE, and leaves the block. `isAnimatedStyleActive={false}`
       * is HeroUI's own escape — its docs say it removes the animated style so you can supply
       * your own — and supplying none is the correct answer here: what the setting asks for is
       * no animation, not a slower one (F-144).
       */
      isAnimatedStyleActive={!reduced}
      style={{
        height,
        width,
        borderRadius: nativeRadius[radius],
        /*
         * OUR GROUND, NOT THE LIBRARY'S. HeroUI's skeleton takes its fill from the active
         * library theme — the same "decided by the theme" hazard `Dialog` and `Popover` refuse
         * with `background={null}`. `surface.3` is a declared token the contrast gate measures.
         */
        backgroundColor: colors['surface.3'],
      }}
    />
  );
}

/** What a confirmation is allowed to be. There is no `error` here — that is `Status`. */
export type ConfirmKind = 'done';

export interface Confirmation {
  /**
   * What happened, **in the past tense**, in the caller's language.
   *
   * Criterion 3, and it is a copy rule with a reason: *"Saving…"* and *"Saved"* are different
   * claims, and a confirmation that arrives before the write finished is a lie the person has
   * no way to check. The past tense is the assertion that it is done.
   */
  readonly message: string;
  /** How long it stays, or `'persistent'` for one that must be dismissed. */
  readonly duration?: number | 'persistent';
}

/**
 * Confirm that something happened.
 *
 * ## Why this is a hook and not a component
 *
 * A confirmation is not part of a screen's layout — it appears over whatever is there, after an
 * action, and leaves. Rendering it inline would mean every screen reserving space for something
 * that is absent almost always, which is how a confirmation ends up as a `<Text>` that appears
 * and shifts the page.
 *
 * ## Dismissible without a pointer
 *
 * Criterion 3's other half. HeroUI's toast dismisses on a timer **and** on a swipe, and it is
 * reachable by a screen reader as a live region — so the three ways out are: wait, swipe, or
 * hear it and move on. What it must never be is dismissible *only* by a tap on a small target.
 */
export function useConfirm(): { readonly confirm: (c: Confirmation) => void } {
  const { toast } = useHeroToast();
  const { colors } = useTheme();

  return {
    confirm: ({ message, duration = 4000 }: Confirmation) => {
      /*
       * A COMPONENT, NOT A CONFIGURED TOAST, AND THE TYPE FORCED THE RIGHT ANSWER.
       *
       * HeroUI's configured form takes `label`, `description` and `variant` — and no
       * `style`. `tsc` refused the first draft for exactly that, which is the seam working:
       * a toast configured by variant is coloured **by the active library theme**, and that is
       * the same "a colour nobody in this repository chose" hazard `Dialog`, `Popover` and
       * `Sheet` each refuse with `background={null}`.
       *
       * The custom form takes a render function, so the ground, the edge and the text all come
       * from declared tokens the contrast gate measures. `surface.2` pairsWith `foreground`.
       */
      toast.show({
        duration,
        component: () => (
          <View
            // A live region, so it is HEARD rather than only seen — which is most of what makes
            // a transient confirmation accessible at all.
            accessibilityLiveRegion="polite"
            accessibilityRole="alert"
            accessibilityLabel={message}
            style={{
              backgroundColor: colors['surface.2'],
              borderRadius: nativeRadius.lg,
              borderWidth: 1,
              borderColor: colors['border.strong'],
              paddingVertical: nativeSpacing.md,
              paddingHorizontal: nativeSpacing.lg,
            }}
          >
            <Text size="small" color="foreground">
              {message}
            </Text>
          </View>
        ),
      });
    },
  };
}
