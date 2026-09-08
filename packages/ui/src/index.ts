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
  DEFAULT_APPEARANCE,
  DEVICE_FAMILY,
  formatAppearance,
  parseAppearance,
  resolveThemeName,
  type Appearance,
  ThemeProvider,
  useTheme,
  type ThemeColors,
  type ThemeProviderProps,
  type ThemeValue,
} from './theme.js';
export { Text, type ColorFor, type LargeTypeSize, type TextProps, type TypeSize } from './Text.js';
export { NavIcon, NAV_ICON_NAMES, type NavIconName, type NavIconProps } from './NavIcon.js';
export { Icon, ICON_TOKENS, type IconProps, type IconToken } from './Icon.js';
export {
  Illustration,
  ILLUSTRATIONS,
  type IllustrationName,
  type IllustrationProps,
} from './Illustration.js';
export { Status, type StatusProps } from './Status.js';
export { Surface, type ElevationLevel, type SurfaceProps } from './Surface.js';
export { Button, type ButtonProps, type ButtonVariant } from './Button.js';
export { Bands, MAX_BANDS, type Band, type BandsProps } from './Bands.js';
export { Card, type CardLevel, type CardProps } from './Card.js';
export { Chip, chipAccessibleName, type ChipProps } from './Chip.js';
export { ChoiceGroup, type Choice, type ChoiceGroupProps } from './ChoiceGroup.js';
export {
  currentTone,
  SelectionMark,
  selectionStyle,
  selectionTone,
  SELECTION_EDGE,
  SELECTION_MARK,
  type SelectionMarkProps,
  type SelectionState,
  type SelectionTone,
} from './selection.js';
export { EmptyState, type EmptyAction, type EmptyStateProps } from './EmptyState.js';
export {
  Skeleton,
  useConfirm,
  type Confirmation,
  type ConfirmKind,
  type SkeletonProps,
} from './feedback.js';
export { SearchField, type SearchFieldProps } from './SearchField.js';
export { TextField, type TextFieldProps } from './TextField.js';
export {
  Pair,
  Strip,
  halfWidth,
  pairRingTone,
  type PairHalf,
  type PairProps,
  type StripProps,
} from './Pair.js';
export {
  Swatch,
  swatchAccessibleName,
  swatchCorner,
  keylineTones,
  type SwatchProps,
} from './Swatch.js';
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
  markDiscs,
  markReach,
  markSvg,
  narrowestFeature,
  EYE_RADIUS,
  PETAL_RADIUS,
  svgNumber,
  Wordmark,
  type MarkProps,
  type MarkDisc,
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
  Accordion,
  Select,
  Slider,
  Switch,
  percentOf,
  type AccordionItem,
  type AccordionProps,
  type SelectOption,
  type SelectProps,
  type SliderProps,
  type SwitchProps,
} from './controls.js';
export {
  Appear,
  durations,
  overlayKeyframes,
  useMotion,
  usePress,
  type AppearProps,
  type DurationStep,
  type EasingName,
  type MotionValues,
  type PressResponse,
} from './motion.js';

export const UI_VERSION = '0.0.0' as const;
