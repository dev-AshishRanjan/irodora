/**
 * A Tailwind v4 theme.
 *
 * v4 configures in CSS through `@theme`, not in `tailwind.config.js`, so this emitter
 * produces CSS rather than JavaScript. The values reference the custom properties the CSS
 * emitter defines instead of repeating them: two files carrying the same literal is the
 * drift this whole package exists to prevent, and it would be invisible because both would
 * be generated and both would look right.
 *
 * The consequence is an ordering requirement — `tokens.css` must be imported before this
 * file — and it is stated at the top of the output rather than left for someone to discover
 * through a page of unstyled colour.
 */

import { cssVarName } from './css.js';
import { THEMES, type Manifest } from '../manifest.js';

export function emitTailwind(manifest: Manifest): string {
  const out: string[] = [
    '/*',
    ' * GENERATED — do not edit.',
    ' *   source: docs/design/design-system.manifest.json',
    ' *   regenerate: pnpm --filter @irodora/design-tokens generate',
    ' *',
    ' * IMPORT tokens.css FIRST. Every value here is a var() reference to a custom property',
    ' * that file defines; on its own this theme resolves to nothing.',
    ' */',
    '',
    '@theme {',
  ];

  // Token names are identical across themes — parseManifest fails the build otherwise — so
  // the theme is emitted once and the namespaced custom property carries the per-theme
  // value. Every entry is a var() reference, never a literal: two generated files holding
  // the same hex is the drift this package exists to prevent, and it would look correct in
  // both.
  const [reference] = THEMES;
  for (const name of Object.keys(manifest.color[reference]))
    out.push(`  --color-${name.replace(/\./gu, '-')}: var(${cssVarName('color', name)});`);

  for (const name of Object.keys(manifest.radius))
    out.push(`  --radius-${name}: var(${cssVarName('radius', name)});`);

  // Named like radius directly above, so the utility is `p-md` rather than `p-3` (F-103).
  for (const name of Object.keys(manifest.spacing.scale))
    out.push(`  --spacing-${name}: var(${cssVarName('space', name)});`);

  out.push('}');
  out.push('');
  return out.join('\n');
}
