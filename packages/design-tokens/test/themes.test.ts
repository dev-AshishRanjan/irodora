/**
 * The derived themes (F-153, ADR-0096).
 *
 * ## What is actually being proven
 *
 * Not that eight palettes exist — gate 9 and gate 10 already run over every one of them, and
 * that is criterion 3 discharged by the derivation happening at parse time, before any check.
 *
 * What those gates cannot say is **what a theme is allowed to change**. A palette that moved
 * lightness would still pass contrast if it moved it the right way; a palette that tinted the
 * swatch well would still pass every pairing the manifest declares. Both are the wrong product,
 * and both are invisible to a checker that only asks whether the numbers clear a floor.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { xyzToOklch } from '@irodora/color-spaces';

import {
  BASE_THEMES,
  isInGamut,
  ManifestError,
  NEUTRAL_IN_EVERY_THEME,
  oklchToRgb,
  parseManifest,
  THEME_FAMILIES,
  themeMode,
  themeName,
  THEMES,
} from '../src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/*
 * EACH PATH IS ONE `join` WITH EVERY SEGMENT IN IT, and that is not style.
 *
 * `verify-cache-scope.mjs` reads the literal segments of a `join` to work out which file a
 * test reaches outside its own package, so it can check that turbo will invalidate the cached
 * result when that file changes. A bare `ROOT` computed once and reused resolves to the
 * repository root and nothing else — the scan sees an escape to "" and fails closed, correctly:
 * it genuinely cannot tell what is being read.
 */
const source = readFileSync(
  join(HERE, '..', '..', '..', 'docs', 'design', 'design-system.manifest.json'),
  'utf8',
);

/**
 * The published corpus entry a theme's hue is pinned to.
 *
 * `content/colors/**` is in turbo's `globalDependencies` because of this read: without it a
 * corpus republish that moved one of these colours would leave this package's result CACHED,
 * and the pin would be green about a file it never re-read — which is the failure the pin
 * exists to prevent.
 */
const corpusEntry = (slug: string): { color: { xyz: { x: number; y: number; z: number } } } =>
  JSON.parse(
    readFileSync(join(HERE, '..', '..', '..', 'content', 'colors', `${slug}.json`), 'utf8'),
  ) as { color: { xyz: { x: number; y: number; z: number } } };

type Json = Record<string, unknown>;
const clone = (): Json => JSON.parse(source) as Json;

const manifest = parseManifest(clone());
const TINTED = THEME_FAMILIES.filter((f) => f !== 'base');

describe('the palettes that exist', () => {
  it('is the base pair plus every family in both modes', () => {
    expect([...THEMES].sort()).toEqual(
      [...BASE_THEMES, ...TINTED.flatMap((f) => BASE_THEMES.map((m) => themeName(f, m)))].sort(),
    );
  });

  it('gives every palette the same token names', () => {
    // A component written against one theme resolving to `undefined` in another is a defect
    // that only appears on whichever theme the author was not looking at.
    const reference = Object.keys(manifest.color.light).sort().join(' ');
    for (const theme of THEMES)
      expect(`${theme}: ${Object.keys(manifest.color[theme]).sort().join(' ')}`).toBe(
        `${theme}: ${reference}`,
      );
  });
});

describe('a theme never moves lightness', () => {
  it('preserves L exactly, for every token, in every derived palette', () => {
    /*
     * THE ASSERTION THE WHOLE DESIGN RESTS ON. Contrast is dominated by lightness, so a derived
     * theme that preserves it starts from a palette that already passes and the only open
     * question is whether the added chroma cost anything — which gate 9 then measures.
     *
     * Asserted against the BASE rather than against a recorded number, so it stays true when
     * somebody changes a base value.
     */
    for (const family of TINTED)
      for (const mode of BASE_THEMES) {
        const base = manifest.color[mode];
        const derived = manifest.color[themeName(family, mode)];
        for (const [name, token] of Object.entries(base))
          expect(`${family}.${mode}.${name}`).toBe(
            token.oklch.l === derived[name]?.oklch.l ? `${family}.${mode}.${name}` : 'L moved',
          );
      }
  });
});

describe('what a theme may not tint (criterion 4)', () => {
  it('leaves the swatch furniture, the chart ramp, the statuses and the ring untouched', () => {
    /*
     * `swatch.well` and the two-tone keyline are what a colour is READ AGAINST — tinting them
     * would put a hue behind every sample in a colour-measurement app. The rest are signals
     * rather than chrome: a status says something is wrong, a ring says where the cursor is,
     * and the chart ramp is greyscale precisely so hue is not the channel. A signal that
     * changes colour with the decoration has to be relearned.
     */
    for (const family of TINTED)
      for (const mode of BASE_THEMES) {
        const base = manifest.color[mode];
        const derived = manifest.color[themeName(family, mode)];
        for (const name of NEUTRAL_IN_EVERY_THEME)
          expect(`${family}.${mode}.${name}`).toBe(
            JSON.stringify(base[name]) === JSON.stringify(derived[name])
              ? `${family}.${mode}.${name}`
              : 'tinted',
          );
      }
  });

  it('DECOY — the chrome IS tinted, so "nothing changed" cannot pass', () => {
    // Without this the derivation could return the base untouched and the case above would be
    // green [[a-decoy-that-is-not-broken-proves-nothing]].
    for (const family of TINTED)
      for (const mode of BASE_THEMES) {
        const base = manifest.color[mode];
        const derived = manifest.color[themeName(family, mode)];
        const moved = Object.keys(base).filter((n) => base[n]?.oklch.h !== derived[n]?.oklch.h);
        expect(`${family}.${mode}: ${String(moved.length)}`).not.toBe(`${family}.${mode}: 0`);
      }
  });
});

describe('every derived value is one a device can actually paint', () => {
  it('stays inside sRGB', () => {
    // The chroma cap is what this is for: a tint that left the gamut would clip to a hex that
    // no longer matches its own OKLCh, which `tokenRgb` refuses rather than rounding away.
    for (const theme of THEMES)
      for (const [name, token] of Object.entries(manifest.color[theme]))
        expect(`${theme}.${name}`).toBe(
          isInGamut(oklchToRgb(token.oklch)) ? `${theme}.${name}` : 'out of gamut',
        );
  });

  it('respects the chroma ceiling the design system already had', () => {
    /*
     * The ceiling predates this feature and states its own reason: *"the interface is
     * near-achromatic by rule so that the garment colour is the only chroma competing for the
     * eye."* A theme does not get to argue with that — which is why NO THEME ADDS A CHROMA
     * EXCEPTION, and the near-achromatic guarantee holds in all eight palettes rather than in
     * the two somebody happened to author.
     */
    const ceiling = manifest.gate.contrast.chromaCeiling.maxChroma;
    const excepted = new Set(manifest.exceptions.map((e) => e.token));

    for (const family of TINTED)
      for (const mode of BASE_THEMES)
        for (const [name, token] of Object.entries(manifest.color[themeName(family, mode)])) {
          if (excepted.has(name)) continue;
          expect(`${family}.${mode}.${name} ${String(token.oklch.c)}`).toBe(
            token.oklch.c <= ceiling
              ? `${family}.${mode}.${name} ${String(token.oklch.c)}`
              : 'above the ceiling',
          );
        }
  });
});

describe('the hue comes from the corpus, pinned by slug', () => {
  it('matches the published entry each recipe names', () => {
    /*
     * NOT INVENTED. Each theme's hue is a corpus entry's hue, and this reads the published
     * entry and fails if the declared value has drifted from it — the same pin
     * `generate-brand-assets.mjs` puts on the icon's five petals, so a republished corpus that
     * moves a colour is a decision somebody makes rather than a silent redraw.
     */
    const recipes = (clone()['themeRecipes'] ?? {}) as Json;
    let checked = 0;

    for (const family of TINTED) {
      const recipe = recipes[family] as { entry: string; hue: number } | undefined;
      expect(recipe).toBeDefined();
      if (recipe === undefined) continue;

      const entry = corpusEntry(recipe.entry);

      const [, , h] = xyzToOklch([entry.color.xyz.x, entry.color.xyz.y, entry.color.xyz.z]);
      // A degree of slack: the manifest keeps whole degrees and the entry is stored as XYZ.
      expect(`${family} ${recipe.entry}`).toBe(
        Math.abs(h - recipe.hue) < 1 ? `${family} ${recipe.entry}` : `drifted to ${h.toFixed(1)}`,
      );
      checked += 1;
    }

    // Non-vacuity: a loop that checked nothing would pass every assertion above.
    expect(checked).toBe(TINTED.length);
  });
});

describe('the manifest refuses a recipe the types cannot name', () => {
  it('fails when the recipes and THEME_FAMILIES disagree', () => {
    // The list is a const so every theme name is a literal type. A recipe the list does not
    // name would be derived into a palette nothing can refer to.
    const m = clone();
    // Rebuilt without the first family rather than deleted out of a copy: a dynamic `delete`
    // is refused by lint, and filtering says what is happening more directly anyway.
    const dropped = TINTED[0] ?? '';
    m['themeRecipes'] = Object.fromEntries(
      Object.entries(m['themeRecipes'] as Json).filter(([k]) => k !== dropped),
    );
    expect(() => parseManifest(m)).toThrow(ManifestError);
  });

  it('refuses a hue outside a circle and a scale that is not positive', () => {
    for (const [key, value] of [
      ['hue', 400],
      ['chromaScale', 0],
    ] as const) {
      const m = clone();
      const recipes = m['themeRecipes'] as Json;
      const first = TINTED[0] ?? '';
      recipes[first] = { ...(recipes[first] as Json), [key]: value };
      expect(() => parseManifest(m)).toThrow(ManifestError);
    }
  });
});

describe('themeMode', () => {
  it('reads the mode off every palette name', () => {
    for (const theme of THEMES)
      expect(`${theme} ${themeMode(theme)}`).toBe(
        `${theme} ${theme.endsWith('dark') ? 'dark' : 'light'}`,
      );
  });
});
