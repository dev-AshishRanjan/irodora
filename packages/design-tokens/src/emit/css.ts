/**
 * CSS custom properties, with an `@supports` upgrade to OKLCh.
 *
 * The sRGB hex is the declared value and the OKLCh is the upgrade, not the other way round:
 * a browser that does not understand `oklch()` ignores the whole declaration, so the
 * fallback has to come first and the upgrade has to be guarded. Reversing them produces a
 * stylesheet that is correct in every browser the author tested.
 *
 * The OKLCh values are the authoritative ones (ADR-0043); on a wide-gamut display the
 * `@supports` block is what actually renders, and the hex above it is what a
 * seven-year-old browser falls back to.
 */

import { derivedSrgb, toOklchString } from '../derive.js';
import { THEMES, type Manifest } from '../manifest.js';

const SELECTOR: Record<string, string> = {
  dark: ':root, [data-theme="dark"]',
  light: '[data-theme="light"]',
};

/**
 * The namespace on every custom property this emitter writes.
 *
 * **Not `--color-*`.** Tailwind v4's `@theme` block *defines* `--color-*` itself, so an
 * unprefixed token layer collides with it and `--color-background: var(--color-background)`
 * is a self-reference that resolves to nothing. The raw layer is namespaced and the Tailwind
 * theme maps onto it, which is also what makes the two files a chain rather than two copies
 * of the same literal.
 */
export const CSS_NAMESPACE = 'irodora';

/** `surface.1` → `--irodora-color-surface-1`. Dots are not legal in a property name. */
export function cssVarName(group: string, token: string): string {
  return `--${CSS_NAMESPACE}-${group}-${token.replace(/\./gu, '-')}`;
}

export function emitCss(manifest: Manifest): string {
  const out: string[] = [
    '/*',
    ' * GENERATED — do not edit.',
    ' *   source: docs/design/design-system.manifest.json',
    ' *   regenerate: pnpm --filter @irodora/design-tokens generate',
    ' *',
    ' * The hex declaration is the sRGB fallback; the @supports block carries the',
    ' * authoritative OKLCh (ADR-0043). Order matters — a browser without oklch() must',
    ' * see the fallback first.',
    ' */',
    '',
  ];

  for (const theme of THEMES) {
    const tokens = manifest.color[theme];
    out.push(`${SELECTOR[theme] ?? `[data-theme="${theme}"]`} {`);
    for (const [name, token] of Object.entries(tokens))
      out.push(`  ${cssVarName('color', name)}: ${derivedSrgb(name, token)};`);
    out.push('}');
    out.push('');
  }

  out.push('@supports (color: oklch(0 0 0)) {');
  for (const theme of THEMES) {
    const tokens = manifest.color[theme];
    out.push(`  ${SELECTOR[theme] ?? `[data-theme="${theme}"]`} {`);
    for (const [name, token] of Object.entries(tokens))
      out.push(`    ${cssVarName('color', name)}: ${toOklchString(token.oklch)};`);
    out.push('  }');
  }
  out.push('}');
  out.push('');

  out.push(':root {');
  for (const [name, value] of Object.entries(manifest.radius))
    out.push(`  ${cssVarName('radius', name)}: ${String(value)}px;`);
  manifest.spacing.scale.forEach((value, i) =>
    out.push(`  ${cssVarName('space', String(i + 1))}: ${String(value)}px;`),
  );
  out.push(`  ${cssVarName('size', 'tap-target')}: ${String(manifest.size.tapTarget)}px;`);
  out.push('}');
  out.push('');

  return out.join('\n');
}
