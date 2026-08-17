/**
 * TypeScript constants — the target `@irodora/design-tokens` itself ships.
 *
 * Emitted as source and committed, rather than read from the manifest at runtime, for two
 * reasons that are really one: `apps/mobile` bundles this package, and a `node:fs` read
 * inside it is a crash on a phone. The generated file is checked in so a token change shows
 * up as a diff a reviewer can read, and the test regenerates and byte-compares it — a
 * generator whose output is never compared is a generator nobody is checking.
 *
 * Hex values, not `oklch()` strings: this is what React Native and every canvas API accept.
 * The OKLCh is carried alongside so a consumer that wants the authoritative coordinates has
 * them without parsing a CSS string.
 */

import { derivedSrgb } from '../derive.js';
import { THEMES, type Manifest } from '../manifest.js';

const quote = (v: string): string => `'${v.replace(/'/gu, "\\'")}'`;

/** `surface.1` → `'surface.1'` as an object key. Dotted names need quoting. */
const key = (name: string): string => (/^[A-Za-z_$][\w$]*$/u.test(name) ? name : quote(name));

export function emitTypescript(manifest: Manifest): string {
  const out: string[] = [
    '/**',
    ' * GENERATED — do not edit.',
    ' *   source: docs/design/design-system.manifest.json',
    ' *   regenerate: pnpm --filter @irodora/design-tokens generate',
    ' *',
    ' * `srgb` is derived from `oklch` by the engine (ADR-0043). The OKLCh is the value that',
    ' * was designed; the hex is what a renderer without OKLCh support can take.',
    ' */',
    '',
  ];

  out.push('export const COLOR = {');
  for (const theme of THEMES) {
    out.push(`  ${theme}: {`);
    for (const [name, token] of Object.entries(manifest.color[theme])) {
      const { l, c, h, alpha } = token.oklch;
      const oklch =
        alpha === undefined
          ? `{ l: ${String(l)}, c: ${String(c)}, h: ${String(h)} }`
          : `{ l: ${String(l)}, c: ${String(c)}, h: ${String(h)}, alpha: ${String(alpha)} }`;
      out.push(
        `    ${key(name)}: { srgb: ${quote(derivedSrgb(name, token))}, oklch: ${oklch}, usage: ${quote(token.usage)} },`,
      );
    }
    out.push('  },');
  }
  out.push('} as const;');
  out.push('');

  out.push('export const RADIUS = {');
  for (const [name, value] of Object.entries(manifest.radius))
    out.push(`  ${key(name)}: ${String(value)},`);
  out.push('} as const;');
  out.push('');

  out.push(`export const SPACING = [${manifest.spacing.scale.join(', ')}] as const;`);
  out.push(`export const TAP_TARGET = ${String(manifest.size.tapTarget)} as const;`);
  out.push('');

  out.push('export const STATUS_PAIRING = {');
  for (const [name, entry] of Object.entries(manifest.statusPairing))
    out.push(
      `  ${key(name)}: { colorToken: ${quote(entry.colorToken)}, iconToken: ${quote(entry.iconToken)}, textRequired: ${String(entry.textRequired)} },`,
    );
  out.push('} as const;');
  out.push('');

  return out.join('\n');
}
