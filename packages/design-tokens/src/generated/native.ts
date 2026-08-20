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
    background: '#090807',
    'surface.1': '#12100F',
    'surface.2': '#1A1817',
    'surface.3': '#22211F',
    'swatch.well': '#2B2A28',
    'swatch.hairline': 'rgba(255, 255, 255, 0.16)', 'swatch.hairline.on.swatch.well': '#767575', 'swatch.hairline.on.background': '#707070', 'swatch.hairline.on.surface.1': '#717171', 'swatch.hairline.on.surface.2': '#727272', 'swatch.hairline.on.surface.3': '#747373',
    foreground: '#F6F4F1',
    'foreground.2': '#A5A39F',
    'foreground.3': '#82807C',
    border: 'rgba(255, 255, 255, 0.08)', 'border.on.background': '#515151', 'border.on.surface.1': '#525252', 'border.on.surface.2': '#545454', 'border.on.surface.3': '#575656',
    'border.strong': 'rgba(255, 255, 255, 0.14)', 'border.strong.on.background': '#696969', 'border.strong.on.surface.1': '#6A6A6A', 'border.strong.on.surface.2': '#6C6B6B', 'border.strong.on.surface.3': '#6D6D6D',
    inverse: '#F6F4F1',
    'inverse.foreground': '#0C0B09',
    ring: '#719DC4',
    'status.ok': '#49AB79',
    'status.warn': '#D58D25',
    'status.bad': '#FEAAAC',
    'chart.1': '#F5F5F5',
    'chart.2': '#B7B7B7',
    'chart.3': '#808080',
    'chart.4': '#525252',
    'chart.5': '#303030',
  },
  light: {
    background: '#FDFCF9',
    'surface.1': '#FFFFFF',
    'surface.2': '#F7F6F3',
    'surface.3': '#F0EEEB',
    'swatch.well': '#ECEAE7',
    'swatch.hairline': 'rgba(0, 0, 0, 0.14)', 'swatch.hairline.on.swatch.well': '#DDDBD8', 'swatch.hairline.on.background': '#ECEBE9', 'swatch.hairline.on.surface.1': '#EFEFEF', 'swatch.hairline.on.surface.2': '#E7E6E3', 'swatch.hairline.on.surface.3': '#E0DFDC',
    foreground: '#171411',
    'foreground.2': '#5E5A56',
    'foreground.3': '#8D8A87',
    border: 'rgba(0, 0, 0, 0.08)', 'border.on.background': '#F4F3F0', 'border.on.surface.1': '#F6F6F6', 'border.on.surface.2': '#EEEDEA', 'border.on.surface.3': '#E7E6E3',
    'border.strong': 'rgba(0, 0, 0, 0.15)', 'border.strong.on.background': '#EBEAE8', 'border.strong.on.surface.1': '#EDEDED', 'border.strong.on.surface.2': '#E6E5E2', 'border.strong.on.surface.3': '#DFDEDB',
    inverse: '#171411',
    'inverse.foreground': '#FDFCF9',
    ring: '#426D95',
    'status.ok': '#387B58',
    'status.warn': '#976213',
    'status.bad': '#861116',
    'chart.1': '#161616',
    'chart.2': '#484848',
    'chart.3': '#7A7A7A',
    'chart.4': '#ABABAB',
    'chart.5': '#D4D4D4',
  },
} as const;

export const nativeRadius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
  swatch: 0,
} as const;

export const nativeSpacing = [4, 8, 14, 20, 28, 40, 56, 96] as const;
export const nativeTapTarget = 44 as const;

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

export const nativeNumericFeature = 'tabular-nums' as const;

/** Tonal. Each level names the surface token it resolves to; there is no shadow. */
export const nativeElevation = {
  '0': 'background',
  '1': 'surface.1',
  '2': 'surface.2',
  '3': 'surface.3',
} as const;

export const nativeMotion = {
  durations: {
    micro: 120,
    local: 180,
    view: 260,
  },
  animatable: ['opacity', 'transform'],
  forbidden: ['background-color on a swatch', 'cross-fade between samples', 'width', 'height', 'top', 'left'],
} as const;

/** Used when the platform expresses no preference — NOT a hard-coded light. */
export const nativeDefaultTheme = 'dark' as const;
