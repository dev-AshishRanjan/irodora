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
import { dynamicTypeRampFor } from '../typography.js';
import { SCRIPTS, THEMES, type Manifest } from '../manifest.js';

const quote = (v: string): string => `'${v.replace(/'/gu, "\\'")}'`;
const key = (name: string): string => (/^[A-Za-z_$][\w$]*$/u.test(name) ? name : quote(name));

/**
 * Round to 2dp, and normalise `-0`.
 *
 * The emitted file is byte-compared by its own test, so an unrounded float would make the
 * comparison hostage to the last bit of an IEEE double. `-0` is included because
 * `Math.round(-0.001)` is `-0`, which stringifies as `"-0"` and would flip a byte comparison
 * for a value that is numerically zero.
 */
const round2 = (n: number): number => {
  const r = Math.round(n * 100) / 100;
  return r === 0 ? 0 : r;
};

/** `-0.04em` (or `"0"`) as a multiple of the font size. */
function emRatio(tracking: string): number {
  if (tracking === '0') return 0;
  return Number(tracking.slice(0, -2));
}

/**
 * `cubic-bezier(0.16, 1, 0.3, 1)` as its four control points.
 *
 * The same shape of trap as the unitless line-height: the manifest states easing in CSS
 * syntax, and React Native's `Easing` takes a **function**, not a string. Passing the CSS
 * string through would be accepted by the type system and produce no animation at all.
 * `Easing.bezier(...nativeEasing.out)` is what the consumer writes.
 */
function bezierPoints(easing: string, name: string): readonly number[] {
  const match = /^cubic-bezier\(([^)]*)\)$/u.exec(easing);
  if (match === null)
    throw new Error(
      `motion.easing.${name}: expected cubic-bezier(...), got "${easing}" — React Native ` +
        'takes control points, not a CSS easing keyword',
    );
  const points = (match[1] ?? '').split(',').map((p) => Number(p.trim()));
  if (points.length !== 4 || points.some((p) => !Number.isFinite(p)))
    throw new Error(`motion.easing.${name}: expected four numeric control points`);
  return points;
}

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
  // The scale is POSITIONAL in all four targets — CSS emits `--space-1..N`, Tailwind
  // `--spacing-1..N`, and both TypeScript targets an array. `nativeSpacing[2]` is `--space-3`.
  // Said in the emitted file rather than only here, because the reader of an index is a
  // component author who will never open this emitter (F-095).
  out.push('/**');
  out.push(" * The spacing scale, in order. Index N is CSS's `--space-{N+1}`.");
  out.push(' *');
  out.push(' * POSITIONAL, AND THE POSITIONS SHIFT when a step is added or removed — ADR-0074');
  out.push(' * removed a 14 and added 12 and 16, which moved every index above 1. That was safe');
  out.push(' * because nothing read this yet. It will not be safe next time, so a change to');
  out.push(' * `spacing.scale` means reading every index in packages/ui.');
  out.push(' *');
  out.push(' * Every step is a multiple of `spacing.base`, and');
  out.push(' * scripts/verify-spacing-scale.mjs fails if that stops being true.');
  out.push(' */');
  out.push(`export const nativeSpacing = [${manifest.spacing.scale.join(', ')}] as const;`);
  out.push(`export const nativeTapTarget = ${String(manifest.size.tapTarget)} as const;`);
  out.push('');

  // --- typography -----------------------------------------------------------------------
  //
  // THE TRAP THIS EXISTS TO DISARM: CSS `line-height: 1.65` is a MULTIPLE of the font size.
  // React Native's `lineHeight` is an ABSOLUTE value in points. Copying the manifest's number
  // across gives a 15pt line 1.65 POINTS of leading — lines drawn on top of each other — and
  // it fails silently, because it is a valid number in a valid field. The same applies to
  // `letterSpacing`, which RN also takes in points while the manifest states it in `em`.
  //
  // JAPANESE LEADING is derived, not declared per step. The manifest gives a base ratio per
  // script (latin 1.65, japanese 1.85) and a per-step ratio tuned for Latin. Japanese scales
  // each step by japanese/latin, which preserves the display-size tightening while giving
  // Japanese proportionally more leading everywhere. Because the parser requires
  // japanese > latin, this is strictly greater than Latin at every step, and the test asserts
  // that rather than trusting the arithmetic.
  const { scale, lineHeight: leading } = manifest.typography;
  out.push('/** Absolute points, NOT the manifest ratios — RN lineHeight is a length. */');
  out.push('export const nativeType = {');
  for (const script of SCRIPTS) {
    const factor = leading[script] / leading.latin;
    out.push(`  ${script}: {`);
    for (const [name, step] of Object.entries(scale)) {
      const parts = [
        `fontSize: ${String(step.size)}`,
        `lineHeight: ${String(round2(step.size * step.lineHeight * factor))}`,
        `letterSpacing: ${String(round2(step.size * emRatio(step.tracking)))}`,
        `fontWeight: ${quote(String(step.weight))}`,
      ];
      if (step.transform !== undefined) parts.push(`textTransform: ${quote(step.transform)}`);
      out.push(`    ${key(name)}: { ${parts.join(', ')} },`);
    }
    out.push('  },');
  }
  out.push('} as const;');
  out.push('');

  // Which steps of the scale clear the WCAG large-text floor.
  //
  // DERIVED, never listed. `@irodora/ui`'s `Text` uses this to make
  // `<Text size="small" color="foreground.3">` a TYPE ERROR, so the pairing that fails AA
  // cannot be written rather than being caught later by a gate. Deriving it means a step
  // whose size changes, or a new step, is classified correctly with nobody remembering to —
  // and a hand-written list is exactly how `foreground.3` went unchecked before F-003.
  const floor = manifest.gate.contrast.largeTextMinPx;
  const large = Object.entries(scale)
    .filter(([, step]) => step.size >= floor)
    .map(([name]) => name);
  const small = Object.entries(scale)
    .filter(([, step]) => step.size < floor)
    .map(([name]) => name);
  if (large.length === 0 || small.length === 0)
    throw new Error(
      `the type scale does not straddle the large-text floor of ${String(floor)}px ` +
        `(${String(large.length)} at or above, ${String(small.length)} below) — a split with ` +
        "an empty side makes the Text component's type constraint vacuous",
    );
  out.push(`/** Scale steps at or above the ${String(floor)}px WCAG large-text floor. */`);
  out.push(`export const nativeLargeTextSizes = [${large.map(quote).join(', ')}] as const;`);
  out.push('/** Scale steps BELOW it. A largeText-only token may never be used at these. */');
  out.push(`export const nativeSmallTextSizes = [${small.map(quote).join(', ')}] as const;`);
  out.push(`export const nativeLargeTextMinPx = ${String(floor)} as const;`);
  out.push('');

  // Which iOS Dynamic Type CURVE each step scales along.
  //
  // Derived from the step's size against Apple's published ramp, for the same reason
  // nativeLargeTextSizes is derived: a new step, or a step whose size changes, is classified
  // with nobody remembering to. Matching is by SIZE rather than by name — see typography.ts.
  //
  // iOS only. Android ignores the prop; maxFontSizeMultiplier remains the mechanism there.
  out.push("/** iOS Dynamic Type curve per step, matched by SIZE to Apple's ramp. */");
  out.push('export const nativeDynamicTypeRamp = {');
  for (const [name, step] of Object.entries(scale))
    out.push(`  ${key(name)}: ${quote(dynamicTypeRampFor(step.size))},`);
  out.push('} as const;');
  out.push('');

  // --- families -------------------------------------------------------------------------
  //
  // F-017 deliberately emitted NOTHING here, because naming a face the bundle does not carry
  // fails over to the system font SILENTLY and produces tofu for exactly the rare kanji the
  // corpus is made of. F-076 shipped the asset, so the name is now true.
  //
  // ONE name per script, not a stack: React Native has no fallback cascade — `fontFamily`
  // takes a single family and there is no second chance. The manifest's CSS stacks stay for
  // the CSS target, where a cascade exists.
  //
  // `jp` only. The Latin face is deliberately still the platform's (ADR-0057 §6): Latin has
  // no tofu failure mode, so the script that can fail silently gets the bundled font and the
  // script that cannot, does not.
  out.push(
    '/** ONE family per script — RN has no fallback cascade. jp is bundled; Latin is the platform. */',
  );
  out.push("export const nativeFamilies = { jp: 'NotoSansJP' } as const;");
  out.push('');

  out.push(
    `export const nativeNumericFeature = ${quote(manifest.typography.numeric.fontFeature)} as const;`,
  );
  out.push('');

  // --- elevation, motion, default theme -------------------------------------------------
  out.push('/** Tonal. Each level names the surface token it resolves to; there is no shadow. */');
  out.push('export const nativeElevation = {');
  for (const [level, token] of Object.entries(manifest.elevation.levels))
    out.push(`  ${key(level)}: ${quote(token)},`);
  out.push('} as const;');
  out.push('');

  out.push('export const nativeMotion = {');
  out.push('  durations: {');
  for (const [name, ms] of Object.entries(manifest.motion.durations))
    out.push(`    ${key(name)}: ${String(ms)},`);
  out.push('  },');
  // Control points, not the CSS string — RN's Easing takes a function, and the consumer
  // writes `Easing.bezier(...nativeEasing.out)`. Emitting the string would typecheck and
  // animate nothing.
  out.push('  easing: {');
  for (const [name, value] of Object.entries(manifest.motion.easing))
    out.push(`    ${key(name)}: [${bezierPoints(value, name).join(', ')}],`);
  out.push('  },');
  // The forbidden list travels with the tokens deliberately: a component author reaching for
  // an animated background-color should find the prohibition next to the value, not in a doc.
  out.push(`  animatable: [${manifest.motion.animatable.map(quote).join(', ')}],`);
  out.push(`  forbidden: [${manifest.motion.forbidden.map(quote).join(', ')}],`);
  out.push('} as const;');
  out.push('');

  out.push('/** Used when the platform expresses no preference — NOT a hard-coded light. */');
  out.push(`export const nativeDefaultTheme = ${quote(manifest.defaultTheme)} as const;`);
  out.push('');
  return out.join('\n');
}
