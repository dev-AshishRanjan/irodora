/**
 * `@irodora/ui` — React Native components over the platform's own primitives (ADR-0054).
 *
 * **A component here must be reachable from a real screen or registered in the conformance
 * registry.** A package with no consumers passes every gate and ships nothing, and six
 * increments have already been lost to that shape
 * [[a-tested-module-nobody-wired-up-passes-every-test-it-has]].
 *
 * The conformance suite is at `@irodora/ui/testing`, and `apps/mobile` runs the same suite
 * over its screens rather than a copy of it.
 */

export {
  resolveThemeName,
  ThemeProvider,
  useTheme,
  type ThemeColors,
  type ThemeProviderProps,
  type ThemeValue,
} from './theme.js';
export { Text, type ColorFor, type LargeTypeSize, type TextProps, type TypeSize } from './Text.js';
export { Icon, ICON_TOKENS, type IconProps, type IconToken } from './Icon.js';
export { Status, type StatusProps } from './Status.js';
export { Surface, type ElevationLevel, type SurfaceProps } from './Surface.js';
export { Button, type ButtonProps, type ButtonVariant } from './Button.js';
export { Bands, MAX_BANDS, type Band, type BandsProps } from './Bands.js';
export { Chip, chipAccessibleName, type ChipProps } from './Chip.js';
export { EmptyState, type EmptyAction, type EmptyStateProps } from './EmptyState.js';
export { SearchField, type SearchFieldProps } from './SearchField.js';
export { TextField, type TextFieldProps } from './TextField.js';
export { Swatch, swatchAccessibleName, swatchCorner, type SwatchProps } from './Swatch.js';
export {
  Screen,
  Section,
  Stack,
  Row,
  type Align,
  type Justify,
  type RowProps,
  type ScreenProps,
  type Script,
  type SectionProps,
  type SpacingStep,
  type StackProps,
} from './layout.js';
export {
  Mark,
  MARK,
  MARK_MIN_SIZE,
  markFields,
  markSvg,
  narrowestFeature,
  Wordmark,
  type MarkProps,
  type WordmarkProps,
  type WordmarkSize,
} from './brand.js';
export {
  Dialog,
  Popover,
  Sheet,
  Tabs,
  type DialogProps,
  type PopoverProps,
  type SheetProps,
  type TabItem,
  type TabsProps,
} from './overlay.js';
export {
  Appear,
  durations,
  overlayKeyframes,
  useMotion,
  type AppearProps,
  type DurationStep,
  type EasingName,
  type MotionValues,
} from './motion.js';

export const UI_VERSION = '0.0.0' as const;
