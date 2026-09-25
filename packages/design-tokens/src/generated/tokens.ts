/**
 * GENERATED — do not edit.
 *   source: docs/design/design-system.manifest.json
 *   regenerate: pnpm --filter @irodora/design-tokens generate
 *
 * `srgb` is derived from `oklch` by the engine (ADR-0043). The OKLCh is the value that
 * was designed; the hex is what a renderer without OKLCh support can take.
 */

export const COLOR = {
  dark: {
    background: { srgb: '#15171B', oklch: { l: 0.20423564960316032, c: 0.008553488228561541, h: 264.3666987591157 }, usage: 'surface' },
    'surface.1': { srgb: '#20232A', oklch: { l: 0.2561043944595853, c: 0.013913560447872099, h: 267.01858257458343 }, usage: 'surface' },
    'surface.2': { srgb: '#282C35', oklch: { l: 0.2929779112096327, c: 0.01737787288040014, h: 266.3606544077609 }, usage: 'surface' },
    'surface.3': { srgb: '#323742', oklch: { l: 0.3365397921614289, c: 0.020573304198048047, h: 265.95855430056014 }, usage: 'surface' },
    'swatch.well': { srgb: '#20232A', oklch: { l: 0.2561043944595853, c: 0.013913560447872099, h: 267.01858257458343 }, usage: 'surface' },
    'swatch.hairline': { srgb: '#F6F5F3', oklch: { l: 0.97, c: 0.003, h: 85 }, usage: 'nonText' },
    foreground: { srgb: '#F7F8FA', oklch: { l: 0.9789322309380892, c: 0.0028651757449798102, h: 264.5421421909542 }, usage: 'text' },
    'foreground.2': { srgb: '#A6B0BC', oklch: { l: 0.7530898415351641, c: 0.02057640060167442, h: 252.9217214821914 }, usage: 'text' },
    'foreground.3': { srgb: '#768290', oklch: { l: 0.6015678678878281, c: 0.02562035019321698, h: 252.29423277758335 }, usage: 'text' },
    link: { srgb: '#F7F8FA', oklch: { l: 0.9789322309380892, c: 0.0028651757449798102, h: 264.5421421909542 }, usage: 'text' },
    border: { srgb: '#2E333D', oklch: { l: 0.32041726700498324, c: 0.01915627225379902, h: 264.25644677294986 }, usage: 'nonText' },
    backdrop: { srgb: 'rgba(0, 0, 0, 0.6)', oklch: { l: 0, c: 0, h: 0, alpha: 0.6 }, usage: 'nonText' },
    'border.strong': { srgb: '#464D5B', oklch: { l: 0.41935340333666893, c: 0.025073982748887492, h: 264.256403293355 }, usage: 'nonText' },
    'border.indicator': { srgb: '#788090', oklch: { l: 0.599353403336669, c: 0.025073982748887492, h: 264.256403293355 }, usage: 'nonText' },
    inverse: { srgb: '#FFFFFF', oklch: { l: 1, c: 0, h: 0 }, usage: 'surface' },
    'inverse.foreground': { srgb: '#15171B', oklch: { l: 0.20423564960316032, c: 0.008553488228561541, h: 264.3666987591157 }, usage: 'text' },
    ring: { srgb: '#788090', oklch: { l: 0.599353403336669, c: 0.025073982748887492, h: 264.256403293355 }, usage: 'nonText' },
    'status.ok': { srgb: '#49AB79', oklch: { l: 0.67, c: 0.12, h: 158 }, usage: 'text' },
    'status.warn': { srgb: '#D58D25', oklch: { l: 0.7, c: 0.14, h: 70 }, usage: 'text' },
    'status.bad': { srgb: '#FEAAAC', oklch: { l: 0.82, c: 0.1, h: 18 }, usage: 'text' },
    'chart.1': { srgb: '#F5F5F5', oklch: { l: 0.97, c: 0, h: 0 }, usage: 'nonText' },
    'chart.2': { srgb: '#B7B7B7', oklch: { l: 0.78, c: 0, h: 0 }, usage: 'nonText' },
    'chart.3': { srgb: '#808080', oklch: { l: 0.6, c: 0, h: 0 }, usage: 'nonText' },
    'chart.4': { srgb: '#525252', oklch: { l: 0.44, c: 0, h: 0 }, usage: 'nonText' },
    'chart.5': { srgb: '#303030', oklch: { l: 0.31, c: 0, h: 0 }, usage: 'nonText' },
    'swatch.hairline.inverse': { srgb: '#131110', oklch: { l: 0.18, c: 0.004, h: 70 }, usage: 'nonText' },
    accent: { srgb: '#FFFFFF', oklch: { l: 1, c: 0, h: 0 }, usage: 'text' },
    'accent.foreground': { srgb: '#15171B', oklch: { l: 0.20423564960316032, c: 0.008553488228561541, h: 264.3666987591157 }, usage: 'text' },
    'accent.muted': { srgb: '#20232A', oklch: { l: 0.2561043944595853, c: 0.013913560447872099, h: 267.01858257458343 }, usage: 'surface' },
    'swatch.keyline': { srgb: 'rgba(255, 255, 255, 0.13333333333333333)', oklch: { l: 1, c: 0, h: 0, alpha: 0.13333333333333333 }, usage: 'nonText' },
    'foreground.3.card': { srgb: '#94A1AF', oklch: { l: 0.7032400162820793, c: 0.02528458762367927, h: 250.16573004323408 }, usage: 'text' },
  },
  light: {
    background: { srgb: '#F6F5F2', oklch: { l: 0.9700818876373151, c: 0.004122095072712324, h: 91.44637793652691 }, usage: 'surface' },
    'surface.1': { srgb: '#FFFFFF', oklch: { l: 1, c: 0, h: 0 }, usage: 'surface' },
    'surface.2': { srgb: '#EEEDE8', oklch: { l: 0.9454846246558881, c: 0.006748582529609743, h: 97.35465486682676 }, usage: 'surface' },
    'surface.3': { srgb: '#E5E3DE', oklch: { l: 0.9159872521518699, c: 0.00706754037676315, h: 88.64560184061156 }, usage: 'surface' },
    'swatch.well': { srgb: '#FFFFFF', oklch: { l: 1, c: 0, h: 0 }, usage: 'surface' },
    'swatch.hairline': { srgb: '#131110', oklch: { l: 0.18, c: 0.004, h: 70 }, usage: 'nonText' },
    foreground: { srgb: '#1A1B1E', oklch: { l: 0.2223215245555405, c: 0.006012717775781599, h: 271.1392735408755 }, usage: 'text' },
    'foreground.2': { srgb: '#5C6470', oklch: { l: 0.5006171373567372, c: 0.021555965451808348, h: 258.3719239797196 }, usage: 'text' },
    'foreground.3': { srgb: '#5D6674', oklch: { l: 0.5076181223305936, c: 0.02488841397003061, h: 259.18426993519626 }, usage: 'text' },
    link: { srgb: '#1A1B1E', oklch: { l: 0.2223215245555405, c: 0.006012717775781599, h: 271.1392735408755 }, usage: 'text' },
    border: { srgb: '#E5E3DE', oklch: { l: 0.9159872521518699, c: 0.00706754037676315, h: 88.64560184061156 }, usage: 'nonText' },
    backdrop: { srgb: 'rgba(0, 0, 0, 0.4)', oklch: { l: 0, c: 0, h: 0, alpha: 0.4 }, usage: 'nonText' },
    'border.strong': { srgb: '#1A1B1E', oklch: { l: 0.2223215245555405, c: 0.006012717775781599, h: 271.1392735408755 }, usage: 'nonText' },
    'border.indicator': { srgb: '#1A1B1E', oklch: { l: 0.2223215245555405, c: 0.006012717775781599, h: 271.1392735408755 }, usage: 'nonText' },
    inverse: { srgb: '#1A1B1E', oklch: { l: 0.2223215245555405, c: 0.006012717775781599, h: 271.1392735408755 }, usage: 'surface' },
    'inverse.foreground': { srgb: '#F6F5F2', oklch: { l: 0.9700818876373151, c: 0.004122095072712324, h: 91.44637793652691 }, usage: 'text' },
    ring: { srgb: '#3A3B3E', oklch: { l: 0.3513215245555405, c: 0.006012717775781599, h: 271.1392735408755 }, usage: 'nonText' },
    'status.ok': { srgb: '#307450', oklch: { l: 0.504, c: 0.09, h: 158 }, usage: 'text' },
    'status.warn': { srgb: '#905B06', oklch: { l: 0.518, c: 0.11, h: 70 }, usage: 'text' },
    'status.bad': { srgb: '#7C000C', oklch: { l: 0.37, c: 0.15, h: 26 }, usage: 'text' },
    'chart.1': { srgb: '#161616', oklch: { l: 0.2, c: 0, h: 0 }, usage: 'nonText' },
    'chart.2': { srgb: '#484848', oklch: { l: 0.4, c: 0, h: 0 }, usage: 'nonText' },
    'chart.3': { srgb: '#7A7A7A', oklch: { l: 0.58, c: 0, h: 0 }, usage: 'nonText' },
    'chart.4': { srgb: '#ABABAB', oklch: { l: 0.74, c: 0, h: 0 }, usage: 'nonText' },
    'chart.5': { srgb: '#D4D4D4', oklch: { l: 0.87, c: 0, h: 0 }, usage: 'nonText' },
    'swatch.hairline.inverse': { srgb: '#F6F5F3', oklch: { l: 0.97, c: 0.003, h: 85 }, usage: 'nonText' },
    accent: { srgb: '#1A1B1E', oklch: { l: 0.2223215245555405, c: 0.006012717775781599, h: 271.1392735408755 }, usage: 'text' },
    'accent.foreground': { srgb: '#F6F5F2', oklch: { l: 0.9700818876373151, c: 0.004122095072712324, h: 91.44637793652691 }, usage: 'text' },
    'accent.muted': { srgb: '#FFFFFF', oklch: { l: 1, c: 0, h: 0 }, usage: 'surface' },
    'swatch.keyline': { srgb: 'rgba(26, 27, 30, 0.09411764705882353)', oklch: { l: 0.2223215245555405, c: 0.006012717775781599, h: 271.1392735408755, alpha: 0.09411764705882353 }, usage: 'nonText' },
    'foreground.3.card': { srgb: '#5D6674', oklch: { l: 0.5076181223305936, c: 0.02488841397003061, h: 259.18426993519626 }, usage: 'text' },
  },
  'slate.dark': {
    background: { srgb: '#2C323A', oklch: { l: 0.3146671601438604, c: 0.01659574570409328, h: 255.64193068066527 }, usage: 'surface' },
    'surface.1': { srgb: '#3B3F46', oklch: { l: 0.36653590500028543, c: 0.013913560447872099, h: 267.01858257458343 }, usage: 'surface' },
    'surface.2': { srgb: '#444952', oklch: { l: 0.4034094217503328, c: 0.01737787288040014, h: 266.3606544077609 }, usage: 'surface' },
    'surface.3': { srgb: '#4F5460', oklch: { l: 0.446971302702129, c: 0.020573304198048047, h: 265.95855430056014 }, usage: 'surface' },
    'swatch.well': { srgb: '#3B3F46', oklch: { l: 0.36653590500028543, c: 0.013913560447872099, h: 267.01858257458343 }, usage: 'surface' },
    'swatch.hairline': { srgb: '#F6F5F3', oklch: { l: 0.97, c: 0.003, h: 85 }, usage: 'nonText' },
    foreground: { srgb: '#F7F8FA', oklch: { l: 0.9789322309380892, c: 0.0028651757449798102, h: 264.5421421909542 }, usage: 'text' },
    'foreground.2': { srgb: '#BFC9D5', oklch: { l: 0.8320898415351641, c: 0.02057640060167442, h: 252.9217214821914 }, usage: 'text' },
    'foreground.3': { srgb: '#8D9AA8', oklch: { l: 0.6805678678878281, c: 0.02562035019321698, h: 252.29423277758335 }, usage: 'text' },
    link: { srgb: '#F7F8FA', oklch: { l: 0.9789322309380892, c: 0.0028651757449798102, h: 264.5421421909542 }, usage: 'text' },
    border: { srgb: '#2E333D', oklch: { l: 0.32041726700498324, c: 0.01915627225379902, h: 264.25644677294986 }, usage: 'nonText' },
    backdrop: { srgb: 'rgba(0, 0, 0, 0.6)', oklch: { l: 0, c: 0, h: 0, alpha: 0.6 }, usage: 'nonText' },
    'border.strong': { srgb: '#464D5B', oklch: { l: 0.41935340333666893, c: 0.025073982748887492, h: 264.256403293355 }, usage: 'nonText' },
    'border.indicator': { srgb: '#9CA4B4', oklch: { l: 0.717353403336669, c: 0.025073982748887492, h: 264.256403293355 }, usage: 'nonText' },
    inverse: { srgb: '#FFFFFF', oklch: { l: 1, c: 0, h: 0 }, usage: 'surface' },
    'inverse.foreground': { srgb: '#2F3136', oklch: { l: 0.3146671601438604, c: 0.008553488228561541, h: 264.3666987591157 }, usage: 'text' },
    ring: { srgb: '#9CA4B4', oklch: { l: 0.717353403336669, c: 0.025073982748887492, h: 264.256403293355 }, usage: 'nonText' },
    'status.ok': { srgb: '#69C995', oklch: { l: 0.764, c: 0.12, h: 158 }, usage: 'text' },
    'status.warn': { srgb: '#F2A847', oklch: { l: 0.7849999999999999, c: 0.14, h: 70 }, usage: 'text' },
    'status.bad': { srgb: '#FECACA', oklch: { l: 0.8840000000000005, c: 0.06000000000000003, h: 18 }, usage: 'text' },
    'chart.1': { srgb: '#F5F5F5', oklch: { l: 0.97, c: 0, h: 0 }, usage: 'nonText' },
    'chart.2': { srgb: '#B7B7B7', oklch: { l: 0.78, c: 0, h: 0 }, usage: 'nonText' },
    'chart.3': { srgb: '#808080', oklch: { l: 0.6, c: 0, h: 0 }, usage: 'nonText' },
    'chart.4': { srgb: '#525252', oklch: { l: 0.44, c: 0, h: 0 }, usage: 'nonText' },
    'chart.5': { srgb: '#303030', oklch: { l: 0.31, c: 0, h: 0 }, usage: 'nonText' },
    'swatch.hairline.inverse': { srgb: '#131110', oklch: { l: 0.18, c: 0.004, h: 70 }, usage: 'nonText' },
    accent: { srgb: '#FFFFFF', oklch: { l: 1, c: 0, h: 0 }, usage: 'text' },
    'accent.foreground': { srgb: '#2F3136', oklch: { l: 0.3146671601438604, c: 0.008553488228561541, h: 264.3666987591157 }, usage: 'text' },
    'accent.muted': { srgb: '#3B3F46', oklch: { l: 0.36653590500028543, c: 0.013913560447872099, h: 267.01858257458343 }, usage: 'surface' },
    'swatch.keyline': { srgb: 'rgba(255, 255, 255, 0.13333333333333333)', oklch: { l: 1, c: 0, h: 0, alpha: 0.13333333333333333 }, usage: 'nonText' },
    'foreground.3.card': { srgb: '#BCCAD8', oklch: { l: 0.8322400162820793, c: 0.02528458762367927, h: 250.16573004323408 }, usage: 'text' },
  },
  'obsidian.dark': {
    background: { srgb: '#101114', oklch: { l: 0.17786923358635712, c: 0.006370287913118377, h: 271.04219528891264 }, usage: 'surface' },
    'surface.1': { srgb: '#1A1D24', oklch: { l: 0.22973797844278213, c: 0.013913560447872099, h: 267.01858257458343 }, usage: 'surface' },
    'surface.2': { srgb: '#22262E', oklch: { l: 0.26661149519282945, c: 0.01737787288040014, h: 266.3606544077609 }, usage: 'surface' },
    'surface.3': { srgb: '#2B303B', oklch: { l: 0.3101733761446257, c: 0.020573304198048047, h: 265.95855430056014 }, usage: 'surface' },
    'swatch.well': { srgb: '#1A1D24', oklch: { l: 0.22973797844278213, c: 0.013913560447872099, h: 267.01858257458343 }, usage: 'surface' },
    'swatch.hairline': { srgb: '#F6F5F3', oklch: { l: 0.97, c: 0.003, h: 85 }, usage: 'nonText' },
    foreground: { srgb: '#F7F8FA', oklch: { l: 0.9789322309380892, c: 0.0028651757449798102, h: 264.5421421909542 }, usage: 'text' },
    'foreground.2': { srgb: '#A6B0BC', oklch: { l: 0.7530898415351641, c: 0.02057640060167442, h: 252.9217214821914 }, usage: 'text' },
    'foreground.3': { srgb: '#768290', oklch: { l: 0.6015678678878281, c: 0.02562035019321698, h: 252.29423277758335 }, usage: 'text' },
    link: { srgb: '#F7F8FA', oklch: { l: 0.9789322309380892, c: 0.0028651757449798102, h: 264.5421421909542 }, usage: 'text' },
    border: { srgb: '#2E333D', oklch: { l: 0.32041726700498324, c: 0.01915627225379902, h: 264.25644677294986 }, usage: 'nonText' },
    backdrop: { srgb: 'rgba(0, 0, 0, 0.6)', oklch: { l: 0, c: 0, h: 0, alpha: 0.6 }, usage: 'nonText' },
    'border.strong': { srgb: '#464D5B', oklch: { l: 0.41935340333666893, c: 0.025073982748887492, h: 264.256403293355 }, usage: 'nonText' },
    'border.indicator': { srgb: '#788090', oklch: { l: 0.599353403336669, c: 0.025073982748887492, h: 264.256403293355 }, usage: 'nonText' },
    inverse: { srgb: '#FFFFFF', oklch: { l: 1, c: 0, h: 0 }, usage: 'surface' },
    'inverse.foreground': { srgb: '#0F1115', oklch: { l: 0.17786923358635712, c: 0.008553488228561541, h: 264.3666987591157 }, usage: 'text' },
    ring: { srgb: '#788090', oklch: { l: 0.599353403336669, c: 0.025073982748887492, h: 264.256403293355 }, usage: 'nonText' },
    'status.ok': { srgb: '#49AB79', oklch: { l: 0.67, c: 0.12, h: 158 }, usage: 'text' },
    'status.warn': { srgb: '#D58D25', oklch: { l: 0.7, c: 0.14, h: 70 }, usage: 'text' },
    'status.bad': { srgb: '#FEAAAC', oklch: { l: 0.82, c: 0.1, h: 18 }, usage: 'text' },
    'chart.1': { srgb: '#F5F5F5', oklch: { l: 0.97, c: 0, h: 0 }, usage: 'nonText' },
    'chart.2': { srgb: '#B7B7B7', oklch: { l: 0.78, c: 0, h: 0 }, usage: 'nonText' },
    'chart.3': { srgb: '#808080', oklch: { l: 0.6, c: 0, h: 0 }, usage: 'nonText' },
    'chart.4': { srgb: '#525252', oklch: { l: 0.44, c: 0, h: 0 }, usage: 'nonText' },
    'chart.5': { srgb: '#303030', oklch: { l: 0.31, c: 0, h: 0 }, usage: 'nonText' },
    'swatch.hairline.inverse': { srgb: '#131110', oklch: { l: 0.18, c: 0.004, h: 70 }, usage: 'nonText' },
    accent: { srgb: '#FFFFFF', oklch: { l: 1, c: 0, h: 0 }, usage: 'text' },
    'accent.foreground': { srgb: '#0F1115', oklch: { l: 0.17786923358635712, c: 0.008553488228561541, h: 264.3666987591157 }, usage: 'text' },
    'accent.muted': { srgb: '#1A1D24', oklch: { l: 0.22973797844278213, c: 0.013913560447872099, h: 267.01858257458343 }, usage: 'surface' },
    'swatch.keyline': { srgb: 'rgba(255, 255, 255, 0.13333333333333333)', oklch: { l: 1, c: 0, h: 0, alpha: 0.13333333333333333 }, usage: 'nonText' },
    'foreground.3.card': { srgb: '#94A1AF', oklch: { l: 0.7032400162820793, c: 0.02528458762367927, h: 250.16573004323408 }, usage: 'text' },
  },
} as const;

export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 9999,
  swatchRatio: 0.25,
} as const;

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;
export const TAP_TARGET = 44 as const;
export const ICON_STROKE = 1.65 as const;
export const ART_STROKE = 0.5 as const;
export const ART_OPACITY = 0.15 as const;
/** The smallest a sample may be where a screen asks you to judge it, in dp (ADR-0095). */
export const JUDGEABLE_SAMPLE = 77 as const;

/** Token names usable for normal-size text: AA 4.5:1 against their surfaces. */
export const TEXT_TOKENS = ['foreground', 'foreground.2', 'foreground.3', 'link', 'inverse.foreground', 'status.ok', 'status.warn', 'status.bad', 'accent', 'accent.foreground', 'foreground.3.card'] as const;

/** Token names restricted to >= 18.66px, or >= 24px bold. */
export const LARGE_TEXT_TOKENS = [] as const;

/** A token name usable for normal-size text. DERIVED, so it cannot drift. */
export type TextToken = (typeof TEXT_TOKENS)[number];

/** Restricted to large text. Not assignable to TextToken — structurally, not by fiat. */
export type LargeTextToken = (typeof LARGE_TEXT_TOKENS)[number];

/** Every declared pairing, as `a|b` both ways. DERIVED from the manifest. */
export const DECLARED_PAIRINGS = ['accent.foreground|accent', 'accent.muted|accent', 'accent.muted|foreground', 'accent.muted|foreground.2', 'accent|accent.foreground', 'accent|accent.muted', 'accent|background', 'accent|surface.1', 'accent|surface.2', 'accent|surface.3', 'background|accent', 'background|border.indicator', 'background|foreground', 'background|foreground.2', 'background|foreground.3', 'background|link', 'background|ring', 'background|status.bad', 'background|status.ok', 'background|status.warn', 'border.indicator|background', 'border.indicator|surface.1', 'border.indicator|surface.2', 'border.indicator|surface.3', 'foreground.2|accent.muted', 'foreground.2|background', 'foreground.2|surface.1', 'foreground.2|surface.2', 'foreground.2|surface.3', 'foreground.3.card|surface.1', 'foreground.3.card|surface.2', 'foreground.3.card|surface.3', 'foreground.3|background', 'foreground|accent.muted', 'foreground|background', 'foreground|surface.1', 'foreground|surface.2', 'foreground|surface.3', 'foreground|swatch.well', 'inverse.foreground|inverse', 'inverse.foreground|status.bad', 'inverse.foreground|status.ok', 'inverse.foreground|status.warn', 'inverse|inverse.foreground', 'link|background', 'link|surface.1', 'link|surface.2', 'link|surface.3', 'ring|background', 'ring|surface.1', 'ring|surface.2', 'ring|surface.3', 'status.bad|background', 'status.bad|inverse.foreground', 'status.bad|surface.1', 'status.bad|surface.2', 'status.bad|swatch.well', 'status.ok|background', 'status.ok|inverse.foreground', 'status.ok|surface.1', 'status.ok|surface.2', 'status.warn|background', 'status.warn|inverse.foreground', 'status.warn|surface.1', 'status.warn|surface.2', 'surface.1|accent', 'surface.1|border.indicator', 'surface.1|foreground', 'surface.1|foreground.2', 'surface.1|foreground.3.card', 'surface.1|link', 'surface.1|ring', 'surface.1|status.bad', 'surface.1|status.ok', 'surface.1|status.warn', 'surface.2|accent', 'surface.2|border.indicator', 'surface.2|foreground', 'surface.2|foreground.2', 'surface.2|foreground.3.card', 'surface.2|link', 'surface.2|ring', 'surface.2|status.bad', 'surface.2|status.ok', 'surface.2|status.warn', 'surface.3|accent', 'surface.3|border.indicator', 'surface.3|foreground', 'surface.3|foreground.2', 'surface.3|foreground.3.card', 'surface.3|link', 'surface.3|ring', 'swatch.well|foreground', 'swatch.well|status.bad'] as const;

export const STATUS_PAIRING = {
  ok: { colorToken: 'status.ok', iconToken: 'icon.check', textRequired: true },
  warn: { colorToken: 'status.warn', iconToken: 'icon.alert', textRequired: true },
  bad: { colorToken: 'status.bad', iconToken: 'icon.cross', textRequired: true },
} as const;
