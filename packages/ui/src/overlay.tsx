/**
 * The overlay family (F-143) — things that appear *over* the page instead of replacing it.
 *
 * ## Why these are wrapped when `Surface` and `Stack` are not
 *
 * [`heroui-wrappers.md`](../../../.harness/rules/frontend/heroui-wrappers.md): *"Wrap HeroUI when
 * there is BEHAVIOUR to inherit. Do not wrap it for provenance."* A styled box has none of that.
 * These have a portal, a scrim, a dismissal, a focus return and — for `Tabs` — roving focus and
 * a selected index a screen reader has to hear. Those are tedious to get right, easy to get
 * subtly wrong, and invisible to a sighted developer with a mouse.
 *
 * ## The compound API is collapsed on purpose
 *
 * HeroUI exposes `Root → Trigger → Portal → Overlay → Content → Close → Title → Description`.
 * That is eight things a screen can get wrong, and two of the mistakes are silent: omit the
 * `Portal` and the overlay renders inside the page's clipping context; put the `Title` outside
 * the `Content` and the dialog loses its accessible name while still looking correct.
 *
 * So each component here takes one declarative shape. **The wrapper earns its place by removing
 * the ways to be wrong**, not by re-exporting.
 *
 * ## Why `Dialog` and `Sheet` arrived a feature late
 *
 * F-143 shipped only `Popover` and `Tabs`, because `pnpm peers check` had just reported
 * `react-native-gesture-handler` 3.2.1 installed against HeroUI's declared `^2.28.0` and it was
 * not yet known whether that was a stale range or a real break.
 *
 * **It was a real break.** RNGH 3 moved `GestureDetector` out of the package root into a `v3`
 * subtree and did not re-export it; HeroUI imports it from the root in eleven places, so the
 * symbol was `undefined` and every component using it — Dialog, BottomSheet, Slider, Menu —
 * would have thrown on render rather than degrading. F-157 pinned the tree to 2.32.0, where the
 * root exports it again, and these two arrived with that ([ADR-0089](../../../docs/adr/0089-the-gesture-stack-is-pinned-to-the-version-heroui-was-built-against.md)).
 */

import { useState } from 'react';
import { View } from 'react-native';
import { Dialog as HeroDialog, Popover as HeroPopover, Tabs as HeroTabs } from 'heroui-native';
import { nativeRadius, nativeSpacing } from '@irodora/design-tokens';
import { overlayKeyframes } from './motion.js';
import { useTheme } from './theme.js';
import { Text } from './Text.js';
import type { Script } from './layout.js';

export interface PopoverProps {
  /**
   * What the control that opens this says, to a reader and to a screen reader.
   *
   * **A string, not a node, and the conformance suite is why.** The first draft took
   * `trigger: React.ReactNode` and passed it straight to `Popover.Trigger` — which renders a
   * bare pressable `View`. The suite immediately reported *"is pressable with no
   * accessibilityRole"* and *"is pressable with no accessible name"*, in both themes: HeroUI
   * wraps whatever you give it in something tappable and puts no role or name on it, so a
   * perfectly good `<Text>` inside became an unnamed button.
   *
   * Taking the label instead means the wrapper owns the role and the name, and a caller cannot
   * supply a trigger that has neither.
   */
  readonly triggerLabel: string;
  /**
   * The heading inside the popover.
   *
   * **Required, not optional.** A popover with no title has no accessible name, and a screen
   * reader announces it as an unnamed group — which is indistinguishable from a bug. HeroUI lets
   * you omit it; this does not.
   */
  readonly title: string;
  /**
   * What the scrim announces — "Close", in the caller's language.
   *
   * **Required, and it is a string the CALLER supplies**, because `@irodora/ui` has no message
   * catalogue and must never invent user-facing copy: the app owns i18n (ADR-0056), and an
   * English default here would be an untranslated string that no completeness check can see.
   *
   * The scrim needs a name because it is the primary way a popover is dismissed. HeroUI renders
   * it as a bare pressable `View` — the conformance suite reported it as *"pressable with no
   * accessible name"* alongside the trigger — so to anyone not using a pointer it was an
   * invisible, unnamed tap target covering the whole screen.
   */
  readonly closeLabel: string;
  readonly description?: string;
  readonly script?: Script;
  readonly children?: React.ReactNode;
  /** Controlled open state. Omit to let the component own it. */
  readonly open?: boolean;
  readonly onOpenChange?: (open: boolean) => void;
  readonly testID?: string;
}

/**
 * A small panel anchored to the control that opened it.
 *
 * **This is the first thing in the product to paint `backdrop`.** The token has existed since
 * F-003 and was declared unreached with the reason *"there is no dialog, bottom sheet or modal
 * anywhere in the app yet — every screen in `apps/mobile/src/screens` is a full route"*. It is a
 * scrim: the thing that dims the page so the panel above it reads as *over* rather than *in*.
 */
export function Popover({
  triggerLabel,
  title,
  closeLabel,
  description,
  script = 'latin',
  children,
  open,
  onOpenChange,
  testID,
}: PopoverProps): React.JSX.Element {
  const { colors } = useTheme();
  const [internal, setInternal] = useState(false);
  const isOpen = open ?? internal;

  const setOpen = (next: boolean): void => {
    if (open === undefined) setInternal(next);
    onOpenChange?.(next);
  };

  return (
    <HeroPopover isOpen={isOpen} onOpenChange={setOpen}>
      <HeroPopover.Trigger
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={triggerLabel}
        accessibilityState={{ expanded: isOpen }}
      >
        <Text size="small" color="foreground.2" script={script}>
          {triggerLabel}
        </Text>
      </HeroPopover.Trigger>
      <HeroPopover.Portal>
        {/*
          THE SCRIM. `backdrop` is translucent and the manifest names every ground it may sit on,
          because an rgba() has no contrast ratio until something is behind it — here that is the
          whole page, whatever it happens to be.
        */}
        <HeroPopover.Overlay
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={{ backgroundColor: colors.backdrop }}
        />
        <HeroPopover.Content
          presentation="popover"
          /*
            OUR TIMING RATHER THAN HeroUI's (F-144). Its defaults are 200ms in and 150ms out;
            neither is on our scale, and an overlay that moves at a different speed from the
            screen behind it is the specific thing that reads as assembled from parts. These are
            `local` (180) and `micro` (120), and both animate opacity and scale only.
          */
          animation={overlayKeyframes}
          /*
            `null` REMOVES THE BACKGROUND LAYER, and this is the one line in the file that the
            wrapper rule names outright.

            Left undefined, HeroUI renders `Popover.ContentBackground`, "whose content is decided
            by the active library theme (e.g. a frosted-glass blur layer when the theme is
            glass)". A blur TINTS WHAT IT SURROUNDS — which is precisely the simultaneous-contrast
            hazard `swatch.well` and the two-tone keyline exist to prevent, and the reason
            `expo-blur` is a refused peer rather than a missing one.

            So the ground is painted here, opaquely, from a token the contrast gate measures. A
            default that is "decided by the theme" is a colour nobody in this repository chose.
          */
          background={null}
          style={{
            backgroundColor: colors['surface.2'],
            borderRadius: nativeRadius.lg,
            borderWidth: 1,
            borderColor: colors['border.strong'],
            padding: nativeSpacing.lg,
            gap: nativeSpacing.sm,
          }}
        >
          {/*
            `Text`, not `HeroPopover.Title`. HeroUI's own title renders through its typography
            scale and its `className` path, and colour that reaches a component through a class
            is absent from the tree the contrast gate reads — Uniwind resolves className in
            Metro, and jest never runs Metro
            [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]]. The accessibility
            role is what makes it the popover's name, so it is stated rather than inherited.
          */}
          <Text size="body" color="foreground" script={script} heading>
            {title}
          </Text>
          {description === undefined ? null : (
            <Text size="small" color="foreground.2" script={script}>
              {description}
            </Text>
          )}
          {children}
        </HeroPopover.Content>
      </HeroPopover.Portal>
    </HeroPopover>
  );
}

export interface TabItem {
  readonly value: string;
  readonly label: string;
}

export interface TabsProps {
  readonly items: readonly TabItem[];
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  readonly script?: Script;
  readonly children?: React.ReactNode;
  readonly testID?: string;
}

/**
 * A row of tabs and the panel below them.
 *
 * **Controlled only.** HeroUI supports an uncontrolled mode; this does not, because a tab set
 * whose selection lives inside the component cannot be restored, deep-linked, or driven by a
 * conformance subject — and the third one is why every state of this is checkable at all.
 *
 * `items` is a list rather than children, so the labels and the panel cannot disagree about how
 * many tabs there are. A `Tabs.Trigger` with no matching `Tabs.Content` renders a tab that
 * selects nothing, which looks exactly like a tab whose content failed to load.
 */
export function Tabs({
  items,
  value,
  onValueChange,
  script = 'latin',
  children,
  testID,
}: TabsProps): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <HeroTabs value={value} onValueChange={onValueChange} testID={testID}>
      <HeroTabs.List
        style={{
          backgroundColor: colors['surface.2'],
          borderRadius: nativeRadius.pill,
          padding: nativeSpacing.xs,
        }}
      >
        {items.map((item) => (
          <HeroTabs.Trigger
            key={item.value}
            value={item.value}
            // Announced, not inferred. The role tells a screen reader this is a tab; the
            // selected state is what tells it WHICH — and HeroUI sets the first and not always
            // the second, which is silent to everyone who can see the indicator.
            accessibilityRole="tab"
            accessibilityState={{ selected: item.value === value }}
            accessibilityLabel={item.label}
            style={{
              paddingVertical: nativeSpacing.sm,
              paddingHorizontal: nativeSpacing.lg,
              borderRadius: nativeRadius.pill,
              backgroundColor: item.value === value ? colors['surface.1'] : 'transparent',
            }}
          >
            {/*
              THE SELECTED TAB IS NOT MARKED BY COLOUR ALONE (NFR-9, golden rule 13). It carries
              a different ground AND a heavier weight AND the selected state above — three
              channels, because somebody who cannot separate two near-neutrals still reads the
              weight, and somebody using a screen reader hears the state.
            */}
            <Text
              size="small"
              color={item.value === value ? 'foreground' : 'foreground.2'}
              script={script}
            >
              {item.label}
            </Text>
          </HeroTabs.Trigger>
        ))}
      </HeroTabs.List>
      {children === undefined ? null : (
        <View style={{ paddingTop: nativeSpacing.lg }}>{children}</View>
      )}
    </HeroTabs>
  );
}

export interface DialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** The dialog's accessible name. Required — an unnamed dialog is announced as a blank group. */
  readonly title: string;
  readonly description?: string;
  /** What the scrim announces. Caller-supplied: `@irodora/ui` owns no copy (ADR-0056). */
  readonly closeLabel: string;
  readonly script?: Script;
  readonly children?: React.ReactNode;
  readonly testID?: string;
}

/**
 * A modal panel, centred, over a scrim.
 *
 * **No `Trigger`.** HeroUI's compound form pairs the dialog with the control that opens it;
 * this takes `open` and `onOpenChange` instead, because a confirmation is almost never opened by
 * the control that sits next to it — it is opened by a destructive action three levels down a
 * screen, and threading a trigger there means rendering the dialog there too.
 *
 * `Dialog.Content` is where HeroUI reaches for `GestureDetector`, for drag-to-dismiss. That is
 * the import F-157 was about; see the header.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  script = 'latin',
  children,
  testID,
}: DialogProps): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <HeroDialog isOpen={open} onOpenChange={onOpenChange}>
      <HeroDialog.Portal>
        <HeroDialog.Overlay
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={{ backgroundColor: colors.backdrop }}
        />
        <HeroDialog.Content
          testID={testID}
          // The same timing as Popover, and for the same reason (F-144).
          animation={overlayKeyframes}
          // The same refusal as Popover's: undefined lets the active library theme decide the
          // layer, and one of its choices is a blur. A blur tints what it surrounds.
          background={null}
          style={{
            backgroundColor: colors['surface.2'],
            borderRadius: nativeRadius.lg,
            borderWidth: 1,
            borderColor: colors['border.strong'],
            padding: nativeSpacing.xl,
            gap: nativeSpacing.md,
          }}
        >
          <Text size="title" color="foreground" script={script} heading>
            {title}
          </Text>
          {description === undefined ? null : (
            <Text size="body" color="foreground.2" script={script}>
              {description}
            </Text>
          )}
          {children}
        </HeroDialog.Content>
      </HeroDialog.Portal>
    </HeroDialog>
  );
}
