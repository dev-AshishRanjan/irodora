/**
 * React Native styles.
 *
 * A separate target from the TypeScript one, even though both are TypeScript, because they
 * are not the same artefact: RN has no custom properties and no cascade, so a theme is a
 * plain object chosen at runtime; and RN's colour parser accepts `#RRGGBB` and
 * `rgba(r, g, b, a)` and nothing else — no `oklch()`, no `color-mix()`.
 *
 * That last constraint is why the translucent tokens are emitted **both** as their `rgba()`
 * form and as the pre-composited hex. RN composites in the encoded space; the pre-composited
 * value is the linear-light one, which is the same number the `contrast` gate certified. A
 * surface that needs the checked value uses `composited`; one that genuinely needs to
 * overlay something unknown uses `rgba`.
 */

import { compositeOver, derivedSrgb, toHex, tokenRgb } from '../derive.js';
import { THEMES, type Manifest } from '../manifest.js';

const quote = (v: string): string => `'${v.replace(/'/gu, "\\'")}'`;
const key = (name: string): string => (/^[A-Za-z_$][\w$]*$/u.test(name) ? name : quote(name));

export function emitReactNative(manifest: Manifest): string {
  const out: string[] = [
    '/**',
    ' * GENERATED — do not edit.',
    ' *   source: docs/design/design-system.manifest.json',
    ' *   regenerate: pnpm --filter @irodora/design-tokens generate',
    ' *',
    ' * React Native accepts #RRGGBB and rgba() only. A translucent token carries both its',
    ' * rgba() form and `composited` — the pre-composited hex over its declared base, blended',
    ' * in LINEAR LIGHT, which is the value the contrast gate checked.',
    ' */',
    '',
    'export const nativeColors = {',
  ];

  for (const theme of THEMES) {
    const tokens = manifest.color[theme];
    out.push(`  ${theme}: {`);
    for (const [name, token] of Object.entries(tokens)) {
      const value = quote(derivedSrgb(name, token));
      const alpha = token.oklch.alpha;
      if (alpha === undefined) {
        out.push(`    ${key(name)}: ${value},`);
        continue;
      }
      // One pre-composited hex per declared ground. A single `composited` value would have
      // to pick a ground, and picking one is what let a border pass its gate on white while
      // being invisible on a meter track — so the emitter refuses to pick.
      const grounds = token.compositeOver;
      if (grounds === undefined || grounds.length === 0)
        throw new Error(`${theme}.${name} is translucent but names no compositeOver grounds`);
      const composited = grounds.map((ground) => {
        const groundToken = tokens[ground];
        if (groundToken === undefined)
          throw new Error(`${theme}.${name}.compositeOver names "${ground}", not a token`);
        const hex = toHex(
          compositeOver(tokenRgb(name, token), alpha, tokenRgb(ground, groundToken)),
        );
        return `${key(`${name}.on.${ground}`)}: ${quote(hex)}`;
      });
      out.push(`    ${key(name)}: ${value}, ${composited.join(', ')},`);
    }
    out.push('  },');
  }

  out.push('} as const;');
  out.push('');
  out.push('export const nativeRadius = {');
  for (const [name, value] of Object.entries(manifest.radius))
    out.push(`  ${key(name)}: ${String(value)},`);
  out.push('} as const;');
  out.push('');
  out.push(`export const nativeSpacing = [${manifest.spacing.scale.join(', ')}] as const;`);
  out.push(`export const nativeTapTarget = ${String(manifest.size.tapTarget)} as const;`);
  out.push('');
  return out.join('\n');
}
