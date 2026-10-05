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
  APPEARANCES,
  DEFAULT_APPEARANCE,
  DEVICE_APPEARANCE,
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
export {
  Text,
  type ColorFor,
  type LargeTypeSize,
  type TextProps,
  type TextWeight,
  type TypeSize,
} from './Text.js';
export { Avatar, AVATAR_SIZE, type AvatarProps } from './Avatar.js';
export {
  Glyph,
  GLYPH_NAMES,
  FILLABLE_GLYPHS,
  glyphSpectrum,
  SPECTRUM_GLYPHS,
  SPECTRUM_STOPS,
  glyphStroke,
  type GlyphName,
  type GlyphProps,
} from './Glyph.js';
export { NavIcon, NAV_ICON_NAMES, type NavIconName, type NavIconProps } from './NavIcon.js';
export {
  TabBar,
  TAB_BELOW,
  TAB_CONTENT,
  TAB_GLYPH,
  TAB_GLYPH_TOP,
  TAB_INDICATOR,
  TAB_LABEL_TOP,
  TAB_RULE,
  TAB_SIDE_INSET,
  tabLabelTop,
  type TabBarItem,
  type TabBarProps,
} from './TabBar.js';
export { Icon, ICON_TOKENS, type IconProps, type IconToken } from './Icon.js';
export {
  ActionBar,
  ACTION_BAR_BOTTOM,
  ACTION_BAR_GAP,
  ACTION_BAR_RULE,
  ACTION_BAR_SIDE,
  ACTION_BAR_TOP,
  type Action,
  type ActionBarProps,
} from './ActionBar.js';
export {
  AppBar,
  APP_BAR_HEIGHT,
  APP_BAR_INSET,
  APP_BAR_RULE,
  APP_BAR_STACKED,
  type AppBarBack,
  type AppBarIcon,
  type AppBarProps,
  type AppBarTitle,
  type AppBarTrailing,
} from './AppBar.js';
export {
  Illustration,
  ILLUSTRATIONS,
  DRAWN_ILLUSTRATIONS,
  EMPTY_STATE_ILLUSTRATIONS,
  ILLUSTRATION_SET_VERSION,
  UNBUILT_ILLUSTRATIONS,
  illustrationBox,
  type IllustrationName,
  type IllustrationProps,
} from './Illustration.js';
export {
  DisplaySettingsProvider,
  DRAWN_DISPLAY_SETTINGS,
  DISPLAY_SETTING_KEYS,
  useDisplaySettings,
  type DisplaySettings,
  type DisplaySettingKey,
  type DisplaySettingsProviderProps,
} from './displaySettings.js';
export { Status, STATUS_PILL_HEIGHT, type StatusProps } from './Status.js';
export { inkOnSample, TEXT_CONTRAST, type InkOnSample, type Sample } from './inkOnSample.js';
export { sampleEdge, sampleInk, type SampleEdge, type SampleInk } from './sampleInk.js';
export { ProvenanceChip, type ProvenanceChipProps } from './ProvenanceChip.js';
export { Surface, type ElevationLevel, type SurfaceProps } from './Surface.js';
export {
  Button,
  BUTTON_HEIGHT,
  GLYPH_IN_PLATE,
  glyphSide,
  ICON_PLATE,
  type ButtonProps,
  type ButtonRadius,
  type ButtonVariant,
  type GlyphSide,
} from './Button.js';
export { IconButton, type IconButtonProps } from './IconButton.js';
export { hitArea, platformTapTarget } from './hitArea.js';
export { Bands, MAX_BANDS, type Band, type BandsProps } from './Bands.js';
export { elevationShadow } from './elevation.js';
export { Card, CARD_EDGE, CARD_RADIUS, type CardLevel, type CardProps } from './Card.js';
export {
  BADGE_HEIGHT,
  Chip,
  CHIP_HEIGHT,
  chipAccessibleName,
  SAMPLE_DOT,
  type ChipProps,
} from './Chip.js';
export {
  ChoiceGroup,
  SEGMENT_INSET,
  SEGMENTED_HEIGHT,
  type Choice,
  type ChoiceGroupProps,
  type Segmented,
} from './ChoiceGroup.js';
export {
  currentTone,
  FocusRing,
  FOCUS_RING,
  pillTone,
  SelectionDot,
  SELECTION_DOT,
  SelectionFrame,
  SelectionMark,
  selectionStyle,
  selectionTone,
  SELECTION_EDGE,
  SELECTION_MARK,
  type PillFill,
  type PillTone,
  type SelectionDotProps,
  type SelectionFrameProps,
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
  STRIP_CORNER,
  STRIP_KEYLINE,
  type PairHalf,
  type PairProps,
  type StripProps,
} from './Pair.js';
export {
  FABRIC_KEYLINE,
  FABRIC_PITCH,
  FABRIC_SIZE,
  FABRIC_TOOTH,
  FabricSwatch,
  pinkedOutline,
  type FabricSwatchProps,
  type PinkedPoint,
} from './FabricSwatch.js';
export {
  Swatch,
  SWATCH_KEYLINE,
  SWATCH_SIZE,
  swatchAccessibleName,
  swatchCorner,
  type SwatchAnchor,
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
  type ScreenAppBar,
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
  SHEET_FORMS,
  SHEET_HANDLE,
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
  SLIDER_THUMB,
  SLIDER_TRACK,
  Switch,
  SWITCH_THUMB,
  SWITCH_TRACK,
  percentOf,
  type AccordionItem,
  type AccordionProps,
  type SelectOption,
  type SelectProps,
  type SliderEnds,
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
