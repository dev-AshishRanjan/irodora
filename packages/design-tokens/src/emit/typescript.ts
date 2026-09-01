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

  out.push('export const SPACING = {');
  for (const [name, value] of Object.entries(manifest.spacing.scale))
    out.push(`  ${key(name)}: ${String(value)},`);
  out.push('} as const;');
  out.push(`export const TAP_TARGET = ${String(manifest.size.tapTarget)} as const;`);
  out.push('');

  // The `largeText` restriction, as types rather than as a sentence.
  //
  // Emitting `usage` alongside each token records the restriction; it does not enforce it —
  // a consumer reading COLOR.light['foreground.3'] gets a plain string and no compile error.
  // These two lists are what make `DESIGN-SYSTEM.md`'s claim true, and the types are DERIVED
  // from them, so a component asking for a `TextToken` cannot be handed `foreground.3`.
  //
  // The first attempt declared the two types by hand as phantom brands. Nothing produced a
  // value of either, the generated tokens stayed plain strings, and the document's claim was
  // false for as long as it stood. Deriving from the data is what makes it true, and what
  // stops it drifting when `usage` changes.
  const byUsage = (want: string): string[] => {
    const [reference] = THEMES;
    return Object.entries(manifest.color[reference])
      .filter(([, token]) => token.usage === want)
      .map(([name]) => name);
  };

  out.push('/** Token names usable for normal-size text: AA 4.5:1 against their surfaces. */');
  out.push(`export const TEXT_TOKENS = [${byUsage('text').map(quote).join(', ')}] as const;`);
  out.push('');
  out.push('/** Token names restricted to >= 18.66px, or >= 24px bold. */');
  out.push(
    `export const LARGE_TEXT_TOKENS = [${byUsage('largeText').map(quote).join(', ')}] as const;`,
  );
  out.push('');
  out.push('/** A token name usable for normal-size text. DERIVED, so it cannot drift. */');
  out.push('export type TextToken = (typeof TEXT_TOKENS)[number];');
  out.push('');
  out.push(
    '/** Restricted to large text. Not assignable to TextToken — structurally, not by fiat. */',
  );
  out.push('export type LargeTextToken = (typeof LARGE_TEXT_TOKENS)[number];');
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
