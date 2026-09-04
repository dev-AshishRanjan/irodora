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
 * ## What is deliberately NOT here, and it is not an oversight
 *
 * **`Dialog` and `Sheet`.** Both reach `react-native-gesture-handler` — `dialog.js` imports
 * `GestureDetector` for drag-to-dismiss, and the sheet is `@gorhom/bottom-sheet` throughout — and
 * `pnpm peers check` reports 3.2.1 installed against HeroUI's declared `^2.28.0`. A major version
 * apart, under exactly the behaviour those two exist for. `@gorhom/bottom-sheet` is not in the
 * store at all, so the sheet could never have rendered either.
 *
 * F-157 resolves the version question; these two arrive with it. Shipping them now would mean
 * shipping the one part of a component that cannot be tested here and is most likely to be
 * broken. **Popover and Tabs import nothing from gesture-handler — measured, not assumed.**
 */

import { useState } from 'react';
import { View } from 'react-native';
import { Popover as HeroPopover, Tabs as HeroTabs } from 'heroui-native';
import { nativeRadius, nativeSpacing } from '@irodora/design-tokens';
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
