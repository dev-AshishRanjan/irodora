/**
 * GENERATED — do not edit.
 *   source: docs/design/design-system.manifest.json
 *   regenerate: pnpm --filter @irodora/design-tokens generate
 *
 * React Native accepts #RRGGBB and rgba() only. A translucent token carries both its
 * rgba() form and `composited` — the pre-composited hex over its declared base, blended
 * in LINEAR LIGHT, which is the value the contrast gate checked.
 */

export const nativeColors = {
  dark: {
    background: '#15171B',
    'surface.1': '#20232A',
    'surface.2': '#282C35',
    'surface.3': '#323742',
    'swatch.well': '#20232A',
    'swatch.hairline': '#F6F5F3',
    foreground: '#F7F8FA',
    'foreground.2': '#A6B0BC',
    'foreground.3': '#768290',
    link: '#F7F8FA',
    border: '#2E333D',
    backdrop: 'rgba(0, 0, 0, 0.6)', 'backdrop.on.background': '#0A0B0E', 'backdrop.on.surface.1': '#111318', 'backdrop.on.surface.2': '#171A20', 'backdrop.on.surface.3': '#1E2129',
    'border.strong': '#464D5B',
    'border.indicator': '#788090',
    inverse: '#FFFFFF',
    'inverse.foreground': '#15171B',
    ring: '#788090',
    'status.ok': '#49AB79',
    'status.warn': '#D58D25',
    'status.bad': '#FEAAAC',
    'chart.1': '#F5F5F5',
    'chart.2': '#B7B7B7',
    'chart.3': '#808080',
    'chart.4': '#525252',
    'chart.5': '#303030',
    'swatch.hairline.inverse': '#131110',
    accent: '#FFFFFF',
    'accent.foreground': '#15171B',
    'accent.muted': '#20232A',
    'swatch.keyline': 'rgba(255, 255, 255, 0.13333333333333333)', 'swatch.keyline.on.background': '#68696A', 'swatch.keyline.on.surface.1': '#6B6B6D', 'swatch.keyline.on.surface.2': '#6D6E71', 'swatch.keyline.on.surface.3': '#707176',
    'foreground.3.card': '#94A1AF',
  },
  light: {
    background: '#F6F5F2',
    'surface.1': '#FFFFFF',
    'surface.2': '#EEEDE8',
    'surface.3': '#E5E3DE',
    'swatch.well': '#FFFFFF',
    'swatch.hairline': '#131110',
    foreground: '#1A1B1E',
    'foreground.2': '#5C6470',
    'foreground.3': '#5D6674',
    link: '#1A1B1E',
    border: '#E5E3DE',
    backdrop: 'rgba(0, 0, 0, 0.4)', 'backdrop.on.background': '#C4C3C1', 'backdrop.on.surface.1': '#CBCBCB', 'backdrop.on.surface.2': '#BEBDB9', 'backdrop.on.surface.3': '#B6B5B1',
    'border.strong': '#1A1B1E',
    'border.indicator': '#1A1B1E',
    inverse: '#1A1B1E',
    'inverse.foreground': '#F6F5F2',
    ring: '#3A3B3E',
    'status.ok': '#307450',
    'status.warn': '#905B06',
    'status.bad': '#7C000C',
    'chart.1': '#161616',
    'chart.2': '#484848',
    'chart.3': '#7A7A7A',
    'chart.4': '#ABABAB',
    'chart.5': '#D4D4D4',
    'swatch.hairline.inverse': '#F6F5F3',
    accent: '#1A1B1E',
    'accent.foreground': '#F6F5F2',
    'accent.muted': '#FFFFFF',
    'swatch.keyline': 'rgba(26, 27, 30, 0.09411764705882353)', 'swatch.keyline.on.background': '#ECEBE8', 'swatch.keyline.on.surface.1': '#F4F4F4', 'swatch.keyline.on.surface.2': '#E4E3DE', 'swatch.keyline.on.surface.3': '#DBD9D5',
    'foreground.3.card': '#5D6674',
  },
  'slate.dark': {
    background: '#2C323A',
    'surface.1': '#3B3F46',
    'surface.2': '#444952',
    'surface.3': '#4F5460',
    'swatch.well': '#3B3F46',
    'swatch.hairline': '#F6F5F3',
    foreground: '#F7F8FA',
    'foreground.2': '#BFC9D5',
    'foreground.3': '#8D9AA8',
    link: '#F7F8FA',
    border: '#2E333D',
    backdrop: 'rgba(0, 0, 0, 0.6)', 'backdrop.on.background': '#1A1E23', 'backdrop.on.surface.1': '#24262C', 'backdrop.on.surface.2': '#2A2D34', 'backdrop.on.surface.3': '#31353D',
    'border.strong': '#464D5B',
    'border.indicator': '#9CA4B4',
    inverse: '#FFFFFF',
    'inverse.foreground': '#2F3136',
    ring: '#9CA4B4',
    'status.ok': '#69C995',
    'status.warn': '#F2A847',
    'status.bad': '#FECACA',
    'chart.1': '#F5F5F5',
    'chart.2': '#B7B7B7',
    'chart.3': '#808080',
    'chart.4': '#525252',
    'chart.5': '#303030',
    'swatch.hairline.inverse': '#131110',
    accent: '#FFFFFF',
    'accent.foreground': '#2F3136',
    'accent.muted': '#3B3F46',
    'swatch.keyline': 'rgba(255, 255, 255, 0.13333333333333333)', 'swatch.keyline.on.background': '#6E7073', 'swatch.keyline.on.surface.1': '#737478', 'swatch.keyline.on.surface.2': '#77797E', 'swatch.keyline.on.surface.3': '#7C7F85',
    'foreground.3.card': '#BCCAD8',
  },
  'obsidian.dark': {
    background: '#101114',
    'surface.1': '#1A1D24',
    'surface.2': '#22262E',
    'surface.3': '#2B303B',
    'swatch.well': '#1A1D24',
    'swatch.hairline': '#F6F5F3',
    foreground: '#F7F8FA',
    'foreground.2': '#A6B0BC',
    'foreground.3': '#768290',
    link: '#F7F8FA',
    border: '#2E333D',
    backdrop: 'rgba(0, 0, 0, 0.6)', 'backdrop.on.background': '#070709', 'backdrop.on.surface.1': '#0D0F14', 'backdrop.on.surface.2': '#13151B', 'backdrop.on.surface.3': '#191D24',
    'border.strong': '#464D5B',
    'border.indicator': '#788090',
    inverse: '#FFFFFF',
    'inverse.foreground': '#0F1115',
    ring: '#788090',
    'status.ok': '#49AB79',
    'status.warn': '#D58D25',
    'status.bad': '#FEAAAC',
    'chart.1': '#F5F5F5',
    'chart.2': '#B7B7B7',
    'chart.3': '#808080',
    'chart.4': '#525252',
    'chart.5': '#303030',
    'swatch.hairline.inverse': '#131110',
    accent: '#FFFFFF',
    'accent.foreground': '#0F1115',
    'accent.muted': '#1A1D24',
    'swatch.keyline': 'rgba(255, 255, 255, 0.13333333333333333)', 'swatch.keyline.on.background': '#686868', 'swatch.keyline.on.surface.1': '#696A6B', 'swatch.keyline.on.surface.2': '#6B6C6E', 'swatch.keyline.on.surface.3': '#6E6F73',
    'foreground.3.card': '#94A1AF',
  },
} as const;

export const nativeRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 9999,
  swatchRatio: 0.25,
} as const;

/**
 * The spacing scale, by name. `nativeSpacing.md` is CSS's `--space-md`.
 *
 * NAMED RATHER THAN POSITIONAL, and F-103 is why. This was an array, so a component
 * wrote `nativeSpacing[2]` and nothing in that expression named 12. ADR-0074 removed
 * a 14 and added 12 and 16, moving every index above 1 — safe only because nothing
 * read the scale yet. Five components read it by the time this was fixed, and a
 * shifted index would have compiled, passed every test, and handed a style prop a
 * perfectly valid wrong number.
 *
 * Removing or renaming a step now fails `typecheck` at every call site that wanted
 * it. Every step is a multiple of `spacing.base`, and
 * scripts/verify-spacing-scale.mjs fails if that stops being true.
 */
export const nativeSpacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
export const nativeTapTarget = 44 as const;
/** An icon line's rendered width in dp. The glyph converts it to grid units at every size. */
export const nativeIconStroke = 1.65 as const;
/** An illustration line's rendered width in dp, half the icon's: the drawing converts it. */
export const nativeArtStroke = 0.5 as const;
/** How strongly a backdrop drawing is inked, as a fraction of the theme's foreground. */
export const nativeArtOpacity = 0.15 as const;
/**
 * The smallest a sample may be drawn where the screen asks you to JUDGE a colour, in dp.
 *
 * Derived from the CIE 2° standard observer at the declared viewing distance — the same
 * observer this product's colorimetry uses throughout. A list that RANKS may keep its
 * thumbnails; a pair that has to be assessed reaches this (ADR-0095).
 */
export const nativeJudgeableSample = 77 as const;

/** Absolute points, NOT the manifest ratios — RN lineHeight is a length. */
export const nativeType = {
  latin: {
    'display.1': { fontSize: 72, lineHeight: 70.56, letterSpacing: -2.88, fontWeight: '500' },
    'display.2': { fontSize: 34, lineHeight: 35.7, letterSpacing: -1.02, fontWeight: '500' },
    title: { fontSize: 22, lineHeight: 26.4, letterSpacing: -0.44, fontWeight: '600' },
    body: { fontSize: 15, lineHeight: 24.75, letterSpacing: 0, fontWeight: '400' },
    small: { fontSize: 13, lineHeight: 20.15, letterSpacing: 0, fontWeight: '400' },
    xs: { fontSize: 11.5, lineHeight: 17.25, letterSpacing: 0, fontWeight: '400' },
    label: { fontSize: 10, lineHeight: 14, letterSpacing: 1.6, fontWeight: '600', textTransform: 'uppercase' },
  },
  japanese: {
    'display.1': { fontSize: 72, lineHeight: 79.11, letterSpacing: -2.88, fontWeight: '500' },
    'display.2': { fontSize: 34, lineHeight: 40.03, letterSpacing: -1.02, fontWeight: '500' },
    title: { fontSize: 22, lineHeight: 29.6, letterSpacing: -0.44, fontWeight: '600' },
    body: { fontSize: 15, lineHeight: 27.75, letterSpacing: 0, fontWeight: '400' },
    small: { fontSize: 13, lineHeight: 22.59, letterSpacing: 0, fontWeight: '400' },
    xs: { fontSize: 11.5, lineHeight: 19.34, letterSpacing: 0, fontWeight: '400' },
    label: { fontSize: 10, lineHeight: 15.7, letterSpacing: 1.6, fontWeight: '600', textTransform: 'uppercase' },
  },
} as const;

/** Scale steps at or above the 18.66px WCAG large-text floor. */
export const nativeLargeTextSizes = ['display.1', 'display.2', 'title'] as const;
/** Scale steps BELOW it. A largeText-only token may never be used at these. */
export const nativeSmallTextSizes = ['body', 'small', 'xs', 'label'] as const;
export const nativeLargeTextMinPx = 18.66 as const;

/** iOS Dynamic Type curve per step, matched by SIZE to Apple's ramp. */
export const nativeDynamicTypeRamp = {
  'display.1': 'largeTitle',
  'display.2': 'largeTitle',
  title: 'title2',
  body: 'subheadline',
  small: 'footnote',
  xs: 'caption1',
  label: 'caption2',
} as const;

/** ONE family per script — RN has no fallback cascade. jp is bundled; Latin is the platform. */
export const nativeFamilies = { jp: 'NotoSansJP' } as const;

export const nativeNumericFeature = 'tabular-nums' as const;

/** Tonal. Each level names the surface token it resolves to; the one drawn shadow is below. */
export const nativeElevation = {
  '0': 'background',
  '1': 'surface.1',
  '2': 'surface.2',
  '3': 'surface.3',
} as const;

/** The one shadow a mockup draws (ADR-0103) — light level 1, read off 25 — or "none". */
export const nativeShadow = {
  modes: ['light'],
  levels: ['1'],
  ink: 'foreground',
  opacity: 0.1,
  offsetY: 2,
  blur: 8,
} as const;

export const nativeMotion = {
  durations: {
    micro: 120,
    local: 180,
    view: 260,
  },
  easing: {
    out: [0.16, 1, 0.3, 1],
    inOut: [0.65, 0, 0.35, 1],
  },
  animatable: ['opacity', 'transform'],
  forbidden: ['background-color on a swatch', 'cross-fade between samples', 'width', 'height', 'top', 'left'],
} as const;

/** Used when the platform expresses no preference — NOT a hard-coded light. */
export const nativeDefaultTheme = 'dark' as const;
