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

import { useContext, useMemo, useRef, useState, type ComponentRef } from 'react';
import { useWindowDimensions, View } from 'react-native';
import type GorhomBottomSheet from '@gorhom/bottom-sheet';
import {
  BottomSheetFooter,
  BottomSheetScrollView,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
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
        <Text size="label" color="foreground.2" script={script}>
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
            hazard `swatch.well` and the line around a sample exist to prevent, and the reason
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
            padding: nativeSpacing.md,
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
            <Text size="label" color="foreground.2" script={script}>
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
              paddingHorizontal: nativeSpacing.md,
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
              size="label"
              color={item.value === value ? 'foreground' : 'foreground.2'}
              script={script}
            >
              {item.label}
            </Text>
          </HeroTabs.Trigger>
        ))}
      </HeroTabs.List>
      {children === undefined ? null : (
        <View style={{ paddingTop: nativeSpacing.md }}>{children}</View>
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
            padding: nativeSpacing.md,
            gap: nativeSpacing.sm,
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
 * **This is the "space at the top", and it is a ceiling rather than an inset.** A fraction holds on
 * every device without asking. The one inset this file reads is the bottom one, for the floating
 * sheet's gap, and `verify-viewport` lists it as an owner for that read alone.
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

/**
 * The drag handle, in dp: `03`'s, drawn at 2 px per dp (40 × 4). `04`'s, drawn on a spec card, is
 * 39.5 × 4.5, within the half dp a reading carries. Recomputed by `sheet.test`; the decoy is
 * gorhom's own, 7.5 % of the window by 4.
 */
export const SHEET_HANDLE = { width: 40, height: 4 } as const;

/**
 * Each form as its mockup draws it, in dp (F-234, ADR-0118), recomputed by `sheet.test`.
 *
 * - **floating** (`03`): `side` either side of it and `below` under it, off the frame's edges;
 *   `inset` either side of the content; the handle `handleTop` below the sheet's top; the content
 *   `contentTop` below the handle.
 * - **docked** (`04`): the same reading, with nothing beside or below it — its side inset is OQ-16's.
 */
export const SHEET_FORMS = {
  floating: { side: 28.5, below: 29.5, inset: 9, handleTop: 5, contentTop: 7.5 },
  docked: { inset: 12.5, handleTop: 9.5, contentTop: 11 },
} as const;

/**
 * Which sheet the surface draws. **Required**: no board draws a sheet to default from, and the two
 * the screens draw differ in every number.
 */
type SheetForm =
  | { readonly form: 'floating'; readonly sideInset?: never }
  | {
      readonly form: 'docked';
      /** The docked sheet's side inset, in dp: OQ-16's, passed by its caller (F-245). */
      readonly sideInset: number;
    };

export type SheetProps = SheetForm & {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  /**
   * The sheet's accessible name. Required, for the reason `Dialog`'s is — and NOT drawn: neither
   * `03` nor `04` draws a title, so the name is carried by the sheet's content container.
   */
  readonly title: string;
  /** What the dismiss layer announces. Caller-supplied: `@irodora/ui` owns no copy (ADR-0056). */
  readonly closeLabel: string;
  /** The handle's accessible name, replacing gorhom's English default (ADR-0056). */
  readonly handleLabel: string;
  /**
   * What the handle does, for a screen reader, replacing gorhom's English default. It is adjustable:
   * describe the resize, not a drag a screen-reader user cannot make.
   */
  readonly handleHint: string;
  /** Pinned under the content, over it as it scrolls: `03`'s actions (F-244). */
  readonly footer?: React.ReactNode;
  readonly children?: React.ReactNode;
  readonly testID?: string;
};

/** What the handle's screen-reader actions move: gorhom's sheet, or anything that resizes like it. */
export interface SheetResize {
  readonly expand: () => void;
  readonly collapse: () => void;
}

/**
 * The handle's two accessibility actions (F-234's review, S2). A handle that announces itself as
 * `adjustable` must adjust: `increment` opens the sheet to its larger detent, `decrement` returns it
 * to its smaller one. Closing stays the dismiss layer's, a named button, so no action closes by
 * surprise. An unknown action, or a sheet not yet mounted, does nothing.
 */
export function resizeSheet(action: string, sheet: SheetResize | null): void {
  if (sheet === null) return;
  if (action === 'increment') sheet.expand();
  else if (action === 'decrement') sheet.collapse();
}

/**
 * A panel that rises from the bottom edge and can be dragged away, in the two forms the screens
 * draw: `03`'s, floating over the live frame, and `04`'s, docked to the bottom (F-234).
 *
 * ## What each form draws
 *
 * | | floating (`03`) | docked (`04`) |
 * |---|---|---|
 * | ground | `background`, a dp of `border` round it | `surface.1`, no edge |
 * | corners | `lg`, all four | `lg`, the top two |
 * | sides | {@link SHEET_FORMS} `side` | the caller's `sideInset` (OQ-16) |
 * | bottom | `below` off the frame, or the device inset where larger | the frame's edge |
 *
 * **No title is drawn** and **nothing dims the frame**: `03` and `04` draw neither. The dismiss layer
 * stays — transparent, a named button — so a tap outside and a screen reader can still close it.
 *
 * ## The floating sheet reads the bottom inset
 *
 * Its gap under the sheet is `max(below, inset)`: the device's home indicator is laid into the drawn
 * space where it fits, the reading the tab bar makes (ADR-0117). It reads the inset the way
 * `Screen` does — the context, never the throwing hook — and `verify-viewport` lists this file as an
 * owner for that one read.
 *
 * ## The API is `Dialog`'s, deliberately
 *
 * Same prop names, same order, same meanings, so a reviewer can see the dismiss layer and the
 * naming are the SAME decisions. A dialog interrupts; a sheet coexists with the thing you are
 * working on — the Lens is the case: a reading is about the frame it was taken from.
 *
 * ## The background layer is ours
 *
 * `BottomSheet.Content` accepts gorhom's `backgroundStyle` and does not let it reach the tree: a
 * rendered sheet showed HeroUI's own `rgba(0, 0, 0, 0.75)`. A sheet is where a colour reading is
 * shown, so the ground behind the sample must be a token the contrast gate measures. It is a plain
 * `View`, painted through `style`.
 *
 * ## Height comes from the content, and stops before the top of the screen (F-177)
 *
 * One declared detent at {@link SHEET_LARGE_DETENT}, and the content's own, which gorhom measures
 * and clamps by {@link SHEET_CONTENT_CEILING}:
 *
 * | content | detents | behaviour |
 * |---|---|---|
 * | short | `[content, 90%]` | rests small, drags up |
 * | tall | `[80%, 90%]` | rests at 80%, drags up, scrolls inside |
 *
 * Neither reaches the top. The two numbers are apart on purpose: equal, rounding would make two
 * detents a pixel apart, which drags like a stutter.
 */
export function Sheet({
  form,
  sideInset,
  open,
  onOpenChange,
  title,
  closeLabel,
  handleLabel,
  handleHint,
  footer,
  children,
  testID,
}: SheetProps): React.JSX.Element {
  const { colors } = useTheme();
  // THE WINDOW for the detents, which are fractions of it.
  const { height } = useWindowDimensions();
  // THE INSET, as `Screen` reads it: the context, with a flat phone's zero where none is provided.
  const insets = useContext(SafeAreaInsetsContext) ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const { reduced, timing } = useMotion();
  const [footerHeight, setFooterHeight] = useState(0);
  // The library's sheet, for the handle's screen-reader actions.
  const sheet = useRef<ComponentRef<typeof GorhomBottomSheet>>(null);

  // ONE DECLARED DETENT; the second is the content's own (F-177). Memoised: this sheet re-renders
  // at camera frame rate behind the Lens, and a new array re-derives every detent.
  const snapPoints = useMemo(() => [`${String(Math.round(SHEET_LARGE_DETENT * 100))}%`], []);

  // REDUCED MOTION GETS NO ANIMATION, and the zero is the motion system's (F-144). Keyed on
  // `reduced`, because `timing` is rebuilt every render (the argument `Appear` makes).
  const animationConfigs = useMemo(() => (reduced ? timing('micro') : SHEET_SPRING), [reduced]);

  const floating = form === 'floating';
  const drawn = floating ? SHEET_FORMS.floating : SHEET_FORMS.docked;
  const ground = floating ? colors.background : colors['surface.1'];
  /*
   * WHAT THE DOCKED SHEET KEEPS CLEAR AT THE BOTTOM (F-234's review, S4). It reaches the frame's
   * edge, so its last content and its footer end above the home indicator. The floating sheet is
   * already lifted clear of it by its gap.
   */
  const clear = floating ? 0 : insets.bottom;

  /*
   * THE FORM, AS GORHOM TAKES IT. A floating sheet is gorhom's `detached` sheet: its margins are the
   * container's `marginHorizontal`, and `bottomInset` lifts it off the frame's edge. A docked sheet
   * takes only its side inset.
   */
  const shape = floating
    ? {
        detached: true,
        bottomInset: Math.max(SHEET_FORMS.floating.below, insets.bottom),
        style: { marginHorizontal: SHEET_FORMS.floating.side },
      }
    : { style: { marginHorizontal: sideInset } };

  return (
    <HeroBottomSheet isOpen={open} onOpenChange={onOpenChange}>
      <HeroBottomSheet.Portal>
        {/*
          THE DISMISS LAYER, DRAWN AS NOTHING. `03` and `04` show the frame undimmed, so it paints
          no colour; it is still a named button, so a tap outside and a screen reader close the
          sheet as they did when it drew a scrim.
        */}
        <HeroBottomSheet.Overlay
          accessibilityRole="button"
          accessibilityLabel={closeLabel}
          style={{ backgroundColor: 'transparent' }}
        />
        <HeroBottomSheet.Content
          ref={sheet}
          enablePanDownToClose
          snapPoints={snapPoints}
          maxDynamicContentSize={height * SHEET_CONTENT_CEILING}
          animationConfigs={animationConfigs}
          {...shape}
          backgroundComponent={({ style }) => (
            <View
              style={[
                style,
                {
                  backgroundColor: ground,
                  borderTopLeftRadius: nativeRadius.lg,
                  borderTopRightRadius: nativeRadius.lg,
                  ...(floating
                    ? {
                        borderBottomLeftRadius: nativeRadius.lg,
                        borderBottomRightRadius: nativeRadius.lg,
                        borderWidth: 1,
                        borderColor: colors.border,
                      }
                    : {}),
                },
              ]}
            />
          )}
          /*
            THE HANDLE, OURS IN NAME AND SIZE. gorhom's announces "Bottom sheet handle" and "Drag up
            or down to extend or minimize the bottom sheet" in English whatever the locale, and
            HeroUI keeps them (ADR-0056); its indicator is 7.5 % of the window wide, in a box padded
            10 dp all round. So the handle is drawn here: the caller's words, the role gorhom gives
            its own (`adjustable`) with the two actions that role promises (`resizeSheet`), and the
            drawn bar at the form's drawn offset, in `border.indicator`, the handle's E3 move
            (F-225). gorhom wraps it in its drag region exactly as it wraps its own.
          */
          handleComponent={() => (
            <View
              accessible
              accessibilityRole="adjustable"
              accessibilityLabel={handleLabel}
              accessibilityHint={handleHint}
              accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
              onAccessibilityAction={(event) => {
                resizeSheet(event.nativeEvent.actionName, sheet.current);
              }}
              style={{ paddingTop: drawn.handleTop, alignItems: 'center' }}
            >
              <View
                style={{
                  width: SHEET_HANDLE.width,
                  height: SHEET_HANDLE.height,
                  borderRadius: SHEET_HANDLE.height / 2,
                  backgroundColor: colors['border.indicator'],
                }}
              />
            </View>
          )}
          {...(footer === undefined
            ? {}
            : {
                footerComponent: (props: BottomSheetFooterProps) => (
                  <BottomSheetFooter {...props}>
                    <View
                      onLayout={(event) => {
                        setFooterHeight(event.nativeEvent.layout.height);
                      }}
                      style={{
                        backgroundColor: ground,
                        paddingHorizontal: drawn.inset,
                        paddingBottom: drawn.inset + clear,
                      }}
                    >
                      {footer}
                    </View>
                  </BottomSheetFooter>
                ),
              })}
        >
          {/*
            THE CONTENT SCROLLS, and that is what makes the ceiling safe: `BottomSheetScrollView`
            reports its height into gorhom's dynamic sizing, so the rest position is still measured.
            It carries the sheet's name, which nothing draws; and it ends a footer's height lower,
            so the last of it is never under the pinned footer, or, with no footer, above the home
            indicator where the sheet is docked.
          */}
          <BottomSheetScrollView
            {...(testID === undefined ? {} : { testID })}
            accessibilityLabel={title}
            contentContainerStyle={{
              paddingHorizontal: drawn.inset,
              paddingTop: drawn.contentTop,
              paddingBottom: drawn.inset + (footer === undefined ? clear : footerHeight),
              gap: nativeSpacing.sm,
            }}
          >
            {children}
          </BottomSheetScrollView>
        </HeroBottomSheet.Content>
      </HeroBottomSheet.Portal>
    </HeroBottomSheet>
  );
}
