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
    background: { srgb: '#090807', oklch: { l: 0.135, c: 0.004, h: 70 }, usage: 'surface' },
    'surface.1': { srgb: '#12100F', oklch: { l: 0.175, c: 0.004, h: 70 }, usage: 'surface' },
    'surface.2': { srgb: '#1A1817', oklch: { l: 0.212, c: 0.004, h: 70 }, usage: 'surface' },
    'surface.3': { srgb: '#22211F', oklch: { l: 0.248, c: 0.004, h: 70 }, usage: 'surface' },
    'swatch.well': { srgb: '#2B2A28', oklch: { l: 0.285, c: 0.004, h: 70 }, usage: 'surface' },
    'swatch.hairline': { srgb: '#F6F5F3', oklch: { l: 0.97, c: 0.003, h: 85 }, usage: 'nonText' },
    foreground: { srgb: '#F6F4F1', oklch: { l: 0.968, c: 0.005, h: 85 }, usage: 'text' },
    'foreground.2': { srgb: '#A5A39F', oklch: { l: 0.715, c: 0.006, h: 80 }, usage: 'text' },
    'foreground.3': { srgb: '#82807C', oklch: { l: 0.6, c: 0.006, h: 80 }, usage: 'largeText' },
    link: { srgb: '#F6F4F1', oklch: { l: 0.968, c: 0.005, h: 85 }, usage: 'text' },
    border: { srgb: 'rgba(255, 255, 255, 0.08)', oklch: { l: 1, c: 0, h: 0, alpha: 0.08 }, usage: 'nonText' },
    backdrop: { srgb: 'rgba(0, 0, 0, 0.6)', oklch: { l: 0, c: 0, h: 0, alpha: 0.6 }, usage: 'nonText' },
    'border.strong': { srgb: '#7B7977', oklch: { l: 0.578, c: 0.004, h: 70 }, usage: 'nonText' },
    inverse: { srgb: '#F6F4F1', oklch: { l: 0.968, c: 0.005, h: 85 }, usage: 'surface' },
    'inverse.foreground': { srgb: '#0C0B09', oklch: { l: 0.15, c: 0.004, h: 70 }, usage: 'text' },
    ring: { srgb: '#719DC4', oklch: { l: 0.68, c: 0.075, h: 246 }, usage: 'nonText' },
    'status.ok': { srgb: '#49AB79', oklch: { l: 0.67, c: 0.12, h: 158 }, usage: 'text' },
    'status.warn': { srgb: '#D58D25', oklch: { l: 0.7, c: 0.14, h: 70 }, usage: 'text' },
    'status.bad': { srgb: '#FEAAAC', oklch: { l: 0.82, c: 0.1, h: 18 }, usage: 'text' },
    'chart.1': { srgb: '#F5F5F5', oklch: { l: 0.97, c: 0, h: 0 }, usage: 'nonText' },
    'chart.2': { srgb: '#B7B7B7', oklch: { l: 0.78, c: 0, h: 0 }, usage: 'nonText' },
    'chart.3': { srgb: '#808080', oklch: { l: 0.6, c: 0, h: 0 }, usage: 'nonText' },
    'chart.4': { srgb: '#525252', oklch: { l: 0.44, c: 0, h: 0 }, usage: 'nonText' },
    'chart.5': { srgb: '#303030', oklch: { l: 0.31, c: 0, h: 0 }, usage: 'nonText' },
    'swatch.hairline.inverse': { srgb: '#131110', oklch: { l: 0.18, c: 0.004, h: 70 }, usage: 'nonText' },
  },
  light: {
    background: { srgb: '#FDFCF9', oklch: { l: 0.99, c: 0.003, h: 85 }, usage: 'surface' },
    'surface.1': { srgb: '#FFFFFF', oklch: { l: 1, c: 0, h: 0 }, usage: 'surface' },
    'surface.2': { srgb: '#F7F6F3', oklch: { l: 0.972, c: 0.004, h: 85 }, usage: 'surface' },
    'surface.3': { srgb: '#F0EEEB', oklch: { l: 0.95, c: 0.004, h: 85 }, usage: 'surface' },
    'swatch.well': { srgb: '#ECEAE7', oklch: { l: 0.938, c: 0.005, h: 85 }, usage: 'surface' },
    'swatch.hairline': { srgb: '#131110', oklch: { l: 0.18, c: 0.004, h: 70 }, usage: 'nonText' },
    foreground: { srgb: '#171411', oklch: { l: 0.195, c: 0.008, h: 70 }, usage: 'text' },
    'foreground.2': { srgb: '#5E5A56', oklch: { l: 0.47, c: 0.008, h: 72 }, usage: 'text' },
    'foreground.3': { srgb: '#8D8A87', oklch: { l: 0.635, c: 0.006, h: 75 }, usage: 'largeText' },
    link: { srgb: '#171411', oklch: { l: 0.195, c: 0.008, h: 70 }, usage: 'text' },
    border: { srgb: 'rgba(0, 0, 0, 0.08)', oklch: { l: 0, c: 0, h: 0, alpha: 0.08 }, usage: 'nonText' },
    backdrop: { srgb: 'rgba(0, 0, 0, 0.4)', oklch: { l: 0, c: 0, h: 0, alpha: 0.4 }, usage: 'nonText' },
    'border.strong': { srgb: '#817F7D', oklch: { l: 0.598, c: 0.004, h: 85 }, usage: 'nonText' },
    inverse: { srgb: '#171411', oklch: { l: 0.195, c: 0.008, h: 70 }, usage: 'surface' },
    'inverse.foreground': { srgb: '#FDFCF9', oklch: { l: 0.99, c: 0.003, h: 85 }, usage: 'text' },
    ring: { srgb: '#426D95', oklch: { l: 0.52, c: 0.08, h: 248 }, usage: 'nonText' },
    'status.ok': { srgb: '#387B58', oklch: { l: 0.53, c: 0.09, h: 158 }, usage: 'text' },
    'status.warn': { srgb: '#976213', oklch: { l: 0.54, c: 0.11, h: 70 }, usage: 'text' },
    'status.bad': { srgb: '#861116', oklch: { l: 0.4, c: 0.15, h: 26 }, usage: 'text' },
    'chart.1': { srgb: '#161616', oklch: { l: 0.2, c: 0, h: 0 }, usage: 'nonText' },
    'chart.2': { srgb: '#484848', oklch: { l: 0.4, c: 0, h: 0 }, usage: 'nonText' },
    'chart.3': { srgb: '#7A7A7A', oklch: { l: 0.58, c: 0, h: 0 }, usage: 'nonText' },
    'chart.4': { srgb: '#ABABAB', oklch: { l: 0.74, c: 0, h: 0 }, usage: 'nonText' },
    'chart.5': { srgb: '#D4D4D4', oklch: { l: 0.87, c: 0, h: 0 }, usage: 'nonText' },
    'swatch.hairline.inverse': { srgb: '#F6F5F3', oklch: { l: 0.97, c: 0.003, h: 85 }, usage: 'nonText' },
  },
} as const;

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
  swatch: 0,
} as const;

export const SPACING = [4, 8, 14, 20, 28, 40, 56, 96] as const;
export const TAP_TARGET = 44 as const;

/** Token names usable for normal-size text: AA 4.5:1 against their surfaces. */
export const TEXT_TOKENS = ['foreground', 'foreground.2', 'link', 'inverse.foreground', 'status.ok', 'status.warn', 'status.bad'] as const;

/** Token names restricted to >= 18.66px, or >= 24px bold. */
export const LARGE_TEXT_TOKENS = ['foreground.3'] as const;

/** A token name usable for normal-size text. DERIVED, so it cannot drift. */
export type TextToken = (typeof TEXT_TOKENS)[number];

/** Restricted to large text. Not assignable to TextToken — structurally, not by fiat. */
export type LargeTextToken = (typeof LARGE_TEXT_TOKENS)[number];

export const STATUS_PAIRING = {
  ok: { colorToken: 'status.ok', iconToken: 'icon.check', textRequired: true },
  warn: { colorToken: 'status.warn', iconToken: 'icon.alert', textRequired: true },
  bad: { colorToken: 'status.bad', iconToken: 'icon.cross', textRequired: true },
} as const;
