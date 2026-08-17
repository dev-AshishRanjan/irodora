/**
 * The four targets.
 *
 * Two kinds of assertion here, and the second is the one that matters.
 *
 * **Byte comparison against the committed output.** The emitters run again and their result
 * must equal what is checked in. A generator whose output is never compared is a generator
 * nobody is checking, and the failure is silent by construction: the code changes, the
 * output changes with it, and every test that reads the output still agrees.
 *
 * **Cross-target agreement.** The whole reason this package exists is that web and mobile
 * cannot drift (ADR-0020, E-007). That is a property BETWEEN the outputs, so it needs an
 * assertion between them — not four assertions that each output is internally consistent.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  cssVarName,
  emitCss,
  emitReactNative,
  emitTailwind,
  emitTypescript,
  parseManifest,
  THEMES,
  type Manifest,
} from '../src/index.js';
import { COLOR, RADIUS, SPACING, STATUS_PAIRING, TAP_TARGET } from '../src/generated/tokens.js';
import { nativeColors, nativeRadius } from '../src/generated/native.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE = join(HERE, '..');
const MANIFEST_PATH = join(PACKAGE, '..', '..', 'docs', 'design', 'design-system.manifest.json');

const manifest: Manifest = parseManifest(JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')));
const read = (...parts: string[]): string => readFileSync(join(PACKAGE, ...parts), 'utf8');

describe('committed output is current', () => {
  const cases: [string, string, string][] = [
    ['CSS', emitCss(manifest), read('generated', 'tokens.css')],
    ['Tailwind', emitTailwind(manifest), read('generated', 'tokens.tailwind.css')],
    ['TypeScript', emitTypescript(manifest), read('src', 'generated', 'tokens.ts')],
    ['React Native', emitReactNative(manifest), read('src', 'generated', 'native.ts')],
  ];

  for (const [name, emitted, committed] of cases)
    it(`${name} matches the manifest`, () => {
      expect(
        emitted,
        `${name} output is stale. Run \`pnpm --filter @irodora/design-tokens generate\`.`,
      ).toBe(committed);
    });

  it('checks all four targets', () => {
    // Asserted, so a target quietly dropped from the list cannot make this suite pass by
    // having less to compare.
    expect(cases).toHaveLength(4);
  });
});

describe('the four targets agree', () => {
  it('every token appears in every target', () => {
    const [reference] = THEMES;
    const names = Object.keys(manifest.color[reference]);
    expect(names.length).toBeGreaterThan(20);

    const css = read('generated', 'tokens.css');
    const tailwind = read('generated', 'tokens.tailwind.css');

    for (const theme of THEMES)
      for (const name of names) {
        expect(css, `CSS is missing ${name}`).toContain(cssVarName('color', name));
        expect(tailwind, `Tailwind is missing ${name}`).toContain(cssVarName('color', name));
        expect(COLOR[theme], `TypeScript is missing ${theme}.${name}`).toHaveProperty(name);
        expect(nativeColors[theme], `React Native is missing ${theme}.${name}`).toHaveProperty(
          name,
        );
      }
  });

  it('the same hex reaches TypeScript and React Native', () => {
    for (const theme of THEMES)
      for (const [name, token] of Object.entries(manifest.color[theme])) {
        const ts = COLOR[theme][name as keyof (typeof COLOR)[typeof theme]] as { srgb: string };
        const rn = nativeColors[theme][name as keyof (typeof nativeColors)[typeof theme]] as string;
        expect(ts.srgb, `${theme}.${name}`).toBe(token.srgb);
        expect(rn, `${theme}.${name}`).toBe(token.srgb);
      }
  });

  it('Tailwind references the token layer rather than repeating its values', () => {
    const tailwind = read('generated', 'tokens.tailwind.css');
    // Two generated files holding the same literal is the drift this package exists to
    // prevent, and it would look correct in both. So the Tailwind theme must contain no
    // colour literal at all.
    expect(tailwind).not.toMatch(/#[0-9A-Fa-f]{6}/u);
    expect(tailwind).not.toMatch(/rgba\(/u);
    expect(tailwind).toContain(`var(${cssVarName('color', 'background')})`);
  });

  it("the CSS token layer is namespaced away from Tailwind's own --color-*", () => {
    // `--color-background: var(--color-background)` is a self-reference that resolves to
    // nothing. Tailwind v4's @theme defines --color-*, so the raw layer cannot.
    expect(cssVarName('color', 'background')).toBe('--irodora-color-background');
    const tailwind = read('generated', 'tokens.tailwind.css');
    expect(tailwind).toContain('--color-background: var(--irodora-color-background);');
  });

  it('the sRGB fallback precedes the OKLCh upgrade in the CSS', () => {
    // A browser without oklch() ignores the whole declaration, so reversing these produces a
    // stylesheet that is correct in every browser the author happened to test.
    const css = read('generated', 'tokens.css');
    // The at-rule, not the word: the header comment explains the ordering and mentions
    // `@supports` 200 characters before the rule itself, so a bare indexOf finds the prose.
    const atRule = css.indexOf('\n@supports (color: oklch(0 0 0)) {');
    expect(atRule).toBeGreaterThan(-1);
    expect(css.indexOf('#090807')).toBeLessThan(atRule);
  });

  it('React Native carries a pre-composited hex for every translucent token', () => {
    // RN composites in the encoded space; `composited` is the linear-light value the
    // contrast gate actually certified.
    for (const theme of THEMES)
      for (const [name, token] of Object.entries(manifest.color[theme])) {
        if (token.oklch.alpha === undefined) continue;
        for (const ground of token.compositeOver ?? []) {
          const key = `${name}.on.${ground}` as keyof (typeof nativeColors)[typeof theme];
          expect(nativeColors[theme], `${theme}.${name} over ${ground}`).toHaveProperty(key);
          expect(nativeColors[theme][key]).toMatch(/^#[0-9A-F]{6}$/u);
        }
      }
  });
});

describe('the non-colour scales survive the trip', () => {
  it('radius, spacing and tap target match the manifest', () => {
    expect(RADIUS).toEqual(manifest.radius);
    expect(nativeRadius).toEqual(manifest.radius);
    expect([...SPACING]).toEqual([...manifest.spacing.scale]);
    expect(TAP_TARGET).toBe(manifest.size.tapTarget);
  });

  it('the swatch radius is 0 in every target', () => {
    expect(RADIUS.swatch).toBe(0);
    expect(nativeRadius.swatch).toBe(0);
    expect(read('generated', 'tokens.css')).toContain('--irodora-radius-swatch: 0px;');
  });

  it('the status pairing reaches TypeScript intact', () => {
    expect(Object.keys(STATUS_PAIRING).sort()).toEqual(Object.keys(manifest.statusPairing).sort());
    for (const [name, entry] of Object.entries(manifest.statusPairing)) {
      const emitted = STATUS_PAIRING[name as keyof typeof STATUS_PAIRING];
      expect(emitted.colorToken).toBe(entry.colorToken);
      expect(emitted.iconToken).toBe(entry.iconToken);
      expect(emitted.textRequired).toBe(true);
    }
  });
});
