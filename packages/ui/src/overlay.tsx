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

import { useMemo, useState } from 'react';
import { useWindowDimensions, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  BottomSheet as HeroBottomSheet,
  Dialog as HeroDialog,
  Popover as HeroPopover,
  Tabs as HeroTabs,
} from 'heroui-native';
import { nativeRadius, nativeSpacing } from '@irodora/design-tokens';
import { overlayKeyframes, useMotion } from './motion.js';
import { currentTone, selectionStyle } from './selection.js';
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
              /*
               * `currentTone`, NOT `selectionTone` (F-176), and the difference is the whole
               * decision: **a tab is where you are, not what you chose.** The tick that marks a
               * chosen chip or sample would be claiming something a tab cannot claim, so this
               * takes the same fill and the same reserved edge from the same tokens and draws
               * no mark.
               *
               * It filled with `surface.1` before, which was a third answer to the question
               * `Swatch` and `Chip` each answered differently. The colour language is one
               * thing now; the mark is what separates picking from arriving.
               */
              ...selectionStyle(
                currentTone({ selected: item.value === value, focused: false }, colors),
              ),
            }}
          >
            {/*
              THE SELECTED TAB IS NOT MARKED BY COLOUR ALONE (NFR-9, golden rule 13). It carries
              a different ground AND a reserved edge AND the selected state above — three
              channels, because somebody who cannot separate two near-neutrals still reads the
              edge, and somebody using a screen reader hears the state.
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

/**
 * The largest a sheet may ever be, as a fraction of the window.
 *
 * **This is the "space at the top", and it is a ceiling rather than an inset.** An inset would
 * mean reading a safe area, which `verify-viewport` reserves for `layout.tsx` and the tab
 * layout — and a fraction holds on every device without asking.
 */
const SHEET_LARGE_DETENT = 0.9;

/**
 * The tallest the CONTENT may make the sheet on its own.
 *
 * Below {@link SHEET_LARGE_DETENT} on purpose, and the gap is the point: gorhom pushes the
 * content-derived detent into the same sorted list as the declared one, so a ceiling equal to
 * the snap point produces two detents a rounding error apart — which drags like a stutter
 * rather than like a sheet.
 */
const SHEET_CONTENT_CEILING = 0.8;

/** How long the sheet takes to settle, and how tightly. Position only, which is a transform. */
const SHEET_SPRING = { damping: 28, stiffness: 260, mass: 1 } as const;

export interface SheetProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /** The sheet's accessible name. Required, for the reason `Dialog`'s is. */
  readonly title: string;
  readonly description?: string;
  /** What the scrim announces. Caller-supplied: `@irodora/ui` owns no copy (ADR-0056). */
  readonly closeLabel: string;
  readonly script?: Script;
  readonly children?: React.ReactNode;
  readonly testID?: string;
}

/**
 * A panel that rises from the bottom edge, over a scrim, and can be dragged away.
 *
 * ## The API is `Dialog`'s, deliberately
 *
 * Same prop names, same order, same meanings. Somebody who has used `Dialog` can use this
 * without reading it — and a reviewer comparing the two can see at a glance that the scrim, the
 * title level and the script handling are the SAME decisions rather than three independent ones
 * that happen to agree today.
 *
 * ## What a sheet is for, and why the Lens needed one
 *
 * A dialog INTERRUPTS: it takes the screen, and what is behind it is context you are done with.
 * A sheet COEXISTS: what is behind it is still the thing you are working on. The Lens is the
 * case that makes the difference concrete — a reading is about the frame it was taken from, and
 * acting on it used to mean scrolling the camera off the screen.
 *
 * ## The background layer is refused, and this one was found by probing rather than by reading
 *
 * `BottomSheet.Content` accepts gorhom's `backgroundStyle`. **It does not reach the tree.** A
 * style walk over a rendered sheet returns `rgba(0, 0, 0, 0.75)` instead — HeroUI's own
 * background layer, "decided by the active library theme", painting a colour nobody in this
 * repository chose.
 *
 * That is the hazard `background={null}` closes on `Dialog` and `Popover`, and it is worse
 * here: a sheet is where a colour READING is shown, so the ground behind the sample would be
 * decided by the theme. Simultaneous contrast is the whole reason `swatch.well` exists.
 *
 * So the background is a component of ours — a plain `View` painted from `surface.2` with the
 * top corners and an edge, all through `style`, where the contrast gate measures it.
 *
 * ## Height comes from the content, and stops before the top of the screen (F-177)
 *
 * F-158 wrote: *"No snap points. A result sheet fixed at a fraction of the screen is either
 * cropping the result or padding it, and the content is the only thing that knows which."*
 *
 * **The argument is right and the conclusion did not follow.** It rules out a FIXED fraction; it
 * does not rule out a second detent. What shipped was a sheet with exactly ONE detent — gorhom's
 * `enableDynamicSizing` defaults to `true`, and with no `snapPoints` the content height is
 * the only stop there is. So there was nothing to drag TO, and content taller than the screen
 * made the sheet the screen. Reported as *"we can't drag the bottom sheet up or down, and the
 * bottom sheet opens full screen"*, and both halves are that one cause.
 *
 * `useAnimatedDetents` computes the dynamic detent from the measured content, clamps it by
 * {@link SHEET_CONTENT_CEILING}, pushes it into the provided list if it is not already there,
 * and sorts. So one snap point plus dynamic sizing gives:
 *
 * | content | detents | behaviour |
 * |---|---|---|
 * | short | `[content, 90%]` | rests small, drags up |
 * | tall | `[80%, 90%]` | rests at 80%, drags up, scrolls inside |
 *
 * **Neither case reaches the top.** That is the "little bit of space" as a property of the
 * ceiling rather than of an inset — which matters, because `verify-viewport` reserves
 * safe-area reads for two files and this is not one of them.
 *
 * The two numbers are deliberately apart: a ceiling equal to the snap point lets rounding
 * produce two detents a pixel apart, which drags like a stutter.
 */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  closeLabel,
  script = 'latin',
  children,
  testID,
}: SheetProps): React.JSX.Element {
  const { colors } = useTheme();
  /*
   * THE WINDOW, NOT AN INSET. `verify-viewport` names `useWindowDimensions()` as the right
   * way to derive a size, and reserves `useSafeAreaInsets` for two files. The detents are
   * fractions of the window; the safe area is somebody else's job.
   */
  const { height } = useWindowDimensions();
  const { reduced, timing } = useMotion();

  /*
   * ONE DECLARED DETENT. The second one is the content's own, computed by gorhom and merged
   * into this list — see the header. Memoised because a new array identity on every render
   * re-derives every detent, and this sheet re-renders at camera frame rate behind the Lens.
   */
  const snapPoints = useMemo(() => [`${String(Math.round(SHEET_LARGE_DETENT * 100))}%`], []);

  /*
   * REDUCED MOTION GETS NO ANIMATION, NOT A FASTER ONE (F-144). A spring with a shorter
   * duration is still motion, and the setting is a request not to move things.
   *
   * THE ZERO COMES FROM `useMotion`, NOT FROM A LITERAL. The first draft wrote
   * `{ duration: 0 }` and `verify-motion` refused it — *"a duration literal, which is how a
   * scale stops being a scale"*. It is right even when the literal is zero: what reduced motion
   * means is the motion system's to say, and `timing()` already collapses every step to 0 when
   * the platform asks. A hand-written zero would be a second implementation of that rule,
   * agreeing with it on the day it was written and never again.
   */
  // KEYED ON `reduced`, NOT ON `timing`. `useMotion` rebuilds `timing` every render, so
  // listing it would rebuild this object every render to get the same answer — the same
  // argument `Appear` makes in motion.tsx, where it reads the duration out first for exactly
  // this reason. There is no exhaustive-deps rule configured here to disable; the list is
  // honest rather than silenced.
  const animationConfigs = useMemo(() => (reduced ? timing('micro') : SHEET_SPRING), [reduced]);

  return (
    <HeroBottomSheet isOpen={open} onOpenChange={onOpenChange}>
      <HeroBottomSheet.Portal>
        <HeroBottomSheet.Overlay
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={{ backgroundColor: colors.backdrop }}
        />
        <HeroBottomSheet.Content
          // NO `testID` HERE: `BottomSheet.Content` does not accept one — it forwards a gorhom
          // ref rather than view props. It goes on the content container below, which is the
          // node a test would want anyway, because it is the one holding the children.
          enablePanDownToClose
          /*
           * THE DETENTS (F-177). One declared, one derived from the content, merged and sorted
           * by gorhom — see the header for the table. Passed through HeroUI, which spreads
           * `Partial<BottomSheetProps>` onto the gorhom sheet, so no wrapper shape changes.
           */
          snapPoints={snapPoints}
          maxDynamicContentSize={height * SHEET_CONTENT_CEILING}
          // The sheet SETTLES. A spring rather than a curve, because a panel a thumb is
          // dragging should arrive where the thumb left it going.
          animationConfigs={animationConfigs}
          /*
            OUR GROUND, NOT THE LIBRARY'S. `backgroundStyle` is accepted and then ignored — the
            docblock above records what a rendered tree actually contains without this. The
            component paints the same three tokens `Dialog.Content` does, minus the bottom
            corners, which a sheet does not have because its bottom edge is the screen.
          */
          backgroundComponent={({ style }) => (
            <View
              style={[
                style,
                {
                  backgroundColor: colors['surface.2'],
                  borderTopLeftRadius: nativeRadius.lg,
                  borderTopRightRadius: nativeRadius.lg,
                  borderWidth: 1,
                  borderColor: colors['border.strong'],
                },
              ]}
            />
          )}
          // The drag handle is the only affordance saying this panel moves, so it is drawn from
          // a border token rather than left to the library's grey.
          handleIndicatorStyle={{ backgroundColor: colors['border.strong'] }}
        >
          {/*
            THE CONTENT SCROLLS, AND THAT IS WHAT MAKES THE CEILING SAFE.

            `BottomSheetScrollView` rather than HeroUI's plain container. It reports its own
            content height into gorhom's dynamic sizing through `useBottomSheetContentSizeSetter`,
            so the rest position is still MEASURED — the sheet has not stopped sizing to its
            content, it has stopped being allowed to eat the screen doing it. Without this a
            ceiling would crop rather than scroll, which is the failure F-158's docblock was
            right to be afraid of.

            The padding moved here with it: `contentContainerProps` styled HeroUI's container,
            and that container is no longer the thing holding the children.
          */}
          <BottomSheetScrollView
            {...(testID === undefined ? {} : { testID })}
            contentContainerStyle={{ padding: nativeSpacing.xl, gap: nativeSpacing.md }}
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
          </BottomSheetScrollView>
        </HeroBottomSheet.Content>
      </HeroBottomSheet.Portal>
    </HeroBottomSheet>
  );
}
