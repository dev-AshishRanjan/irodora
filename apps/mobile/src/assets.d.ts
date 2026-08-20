/**
 * Font and image assets are resolved by Metro, not by `tsc`.
 *
 * Declared so an asset can be imported with a normal `import` rather than `require()` — the
 * lint forbids `require`, and reaching for an eslint-disable to load a font would be treating
 * a rule as an obstacle rather than as a rule.
 */
declare module '*.ttf' {
  const asset: number;
  export default asset;
}
