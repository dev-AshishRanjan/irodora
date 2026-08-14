/**
 * OKLCh design tokens, compiled to CSS, TypeScript, React Native and Tailwind.
 *
 * Four targets from one manifest, so web and mobile cannot drift (ADR-0020).
 * That single property is why Astryx was not adopted (ADR-0033).
 */

/** Generous everywhere — except the swatch, which is 0 forever. */
export const RADIUS = { xs: 6, sm: 10, md: 14, lg: 20, xl: 28, pill: 999, swatch: 0 } as const;

/** Implemented in F-003. */
export const TOKENS_VERSION = '0.0.0' as const;
