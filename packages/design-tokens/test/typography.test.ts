/**
 * Typography, elevation, motion and the default theme, on the React Native target.
 *
 * ## The defect these exist to catch
 *
 * CSS `line-height: 1.65` is a **multiple** of the font size. React Native's `lineHeight` is
 * an **absolute length in points**. The manifest states the CSS form, so copying the number
 * across gives a 15 pt line 1.65 points of leading — every line drawn on top of the last —
 * and nothing reports it, because 1.65 is a valid number in a valid field. The same trap sits
 * in `letterSpacing`, which RN also takes in points while the manifest states `em`.
 *
 * ## Why the assertions are shaped the way they are
 *
 * Every check below is written so that it would **fail if the emitter simply copied the
 * manifest value**. Asserting `lineHeight === 24.75` proves the arithmetic only because 24.75
 * is not 1.65; asserting `typeof lineHeight === 'number'` would have passed on the bug. The
 * conversions are recomputed from the manifest here rather than compared against whatever the
 * emitter produced, so the test is an independent second opinion and not an echo.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ManifestError, parseManifest, SCRIPTS, THEMES, type Manifest } from '../src/index.js';
import {
  nativeDefaultTheme,
  nativeElevation,
  nativeMotion,
  nativeNumericFeature,
  nativeType,
} from '../src/generated/native.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST_PATH = join(HERE, '..', '..', '..', 'docs', 'design', 'design-system.manifest.json');
const raw: unknown = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
const manifest: Manifest = parseManifest(raw);

/** A deep clone of the raw manifest, for the mutation cases. */
const clone = (): Record<string, unknown> =>
  JSON.parse(JSON.stringify(raw)) as Record<string, unknown>;

describe('line height crosses from CSS ratio to React Native points', () => {
  it('is a length, not the ratio — the whole point of the target', () => {
    for (const script of SCRIPTS)
      for (const [name, step] of Object.entries(manifest.typography.scale)) {
        const emitted = nativeType[script][name as keyof (typeof nativeType)[typeof script]];
        // The decoy: had the emitter copied the manifest, this is the value it would hold.
        expect(emitted.lineHeight).not.toBe(step.lineHeight);
        // And it must be a plausible LENGTH — within a line of the font size, never below a
        // third of it, which is the range a ratio-copied value would fall far outside.
        expect(emitted.lineHeight).toBeGreaterThan(step.size * 0.5);
        expect(emitted.lineHeight).toBeLessThan(step.size * 3);
      }
  });

  it('equals size x ratio x the script factor, recomputed here', () => {
    const { latin, japanese } = manifest.typography.lineHeight;
    for (const script of SCRIPTS) {
      const factor = script === 'latin' ? 1 : japanese / latin;
      for (const [name, step] of Object.entries(manifest.typography.scale)) {
        const emitted = nativeType[script][name as keyof (typeof nativeType)[typeof script]];
        expect(emitted.lineHeight).toBeCloseTo(step.size * step.lineHeight * factor, 2);
      }
    }
  });

  it('gives Japanese strictly more leading than Latin at EVERY step', () => {
    const steps = Object.keys(manifest.typography.scale);
    expect(steps.length).toBeGreaterThan(0);
    for (const name of steps) {
      const k = name as keyof typeof nativeType.latin;
      expect(nativeType.japanese[k].lineHeight).toBeGreaterThan(nativeType.latin[k].lineHeight);
      // Same glyph size — only the leading differs. A Japanese scale that also changed the
      // font size would be a different type scale, not the same one leaded differently.
      expect(nativeType.japanese[k].fontSize).toBe(nativeType.latin[k].fontSize);
    }
  });
});

describe('letter spacing crosses from em to points', () => {
  it('is the em value times the font size, and 0 stays 0', () => {
    for (const [name, step] of Object.entries(manifest.typography.scale)) {
      const em = step.tracking === '0' ? 0 : Number(step.tracking.slice(0, -2));
      const emitted = nativeType.latin[name as keyof typeof nativeType.latin];
      expect(emitted.letterSpacing).toBeCloseTo(step.size * em, 2);
    }
  });

  it('actually converted something — the negative tracking is not zero', () => {
    // Without this, the test above passes on an emitter that emits 0 for everything, because
    // most steps declare "0". The display sizes are the ones carrying real tracking.
    const tracked = Object.values(nativeType.latin).filter((s) => s.letterSpacing !== 0);
    expect(tracked.length).toBeGreaterThan(0);
    expect(nativeType.latin['display.1'].letterSpacing).toBeLessThan(0);
    expect(nativeType.latin.label.letterSpacing).toBeGreaterThan(0);
  });
});

describe('the parser refuses the manifests that would produce silent breakage', () => {
  it('rejects a Japanese leading that does not exceed Latin', () => {
    const m = clone();
    (m['typography'] as { lineHeight: Record<string, number> }).lineHeight['japanese'] = 1.65;
    expect(() => parseManifest(m)).toThrow(ManifestError);
    expect(() => parseManifest(m)).toThrow(/must exceed latin/u);
  });

  it('rejects tracking stated as a px length, which both targets would read differently', () => {
    const m = clone();
    const scale = (m['typography'] as { scale: Record<string, { tracking: string } | undefined> })
      .scale;
    const body = scale['body'];
    // Asserted rather than optional-chained: a silently absent step would make the mutation a
    // no-op and this case would then be proving that the unmodified manifest parses.
    expect(body).toBeDefined();
    if (body === undefined) throw new Error('unreachable');
    body.tracking = '-2px';
    expect(() => parseManifest(m)).toThrow(/tracking is relative to the font size/u);
  });

  it('rejects a shadow, because elevation here is tonal', () => {
    const m = clone();
    (m['elevation'] as Record<string, unknown>)['shadow'] = '0 2px 8px rgba(0,0,0,0.2)';
    expect(() => parseManifest(m)).toThrow(/elevation is tonal/u);
  });

  it('rejects an elevation level naming a token that does not exist', () => {
    const m = clone();
    (m['elevation'] as Record<string, unknown>)['2'] = 'surface.does-not-exist';
    expect(() => parseManifest(m)).toThrow(/is not a token in color\./u);
  });

  it('rejects a defaultTheme that is not a theme', () => {
    const m = clone();
    m['defaultTheme'] = 'sepia';
    expect(() => parseManifest(m)).toThrow(/expected one of/u);
  });

  it('accepts the real manifest — the baseline the five cases above are measured against', () => {
    expect(() => parseManifest(clone())).not.toThrow();
  });
});

describe('elevation, motion and the default theme reach the target', () => {
  it('resolves every elevation level to a real token in BOTH themes', () => {
    const levels = Object.entries(nativeElevation);
    expect(levels.length).toBeGreaterThan(0);
    for (const theme of THEMES)
      for (const [level, token] of levels)
        expect(
          manifest.color[theme][token],
          `elevation.${level} -> ${token} missing in ${theme}`,
        ).toBeDefined();
  });

  it('carries the forbidden list to where a component author will meet it', () => {
    // NFR-9's neighbour: motion must never alter a colour mid-transition, because the
    // intermediate frames are plausible and a user reads a colour that never existed.
    expect(nativeMotion.forbidden).toContain('background-color on a swatch');
    expect(nativeMotion.forbidden).toContain('cross-fade between samples');
    expect(nativeMotion.animatable).toEqual(['opacity', 'transform']);
  });

  it('names the manifest default theme rather than a hard-coded light', () => {
    expect(nativeDefaultTheme).toBe(manifest.defaultTheme);
    expect(nativeDefaultTheme).toBe('dark');
  });

  it('carries tabular numerals, which every colour value depends on', () => {
    expect(nativeNumericFeature).toBe(manifest.typography.numeric.fontFeature);
  });
});

describe('what this target deliberately does NOT carry', () => {
  it('emits no font family, because the manifest states CSS stacks', () => {
    // React Native takes ONE family name and has no fallback cascade, so a CSS stack cannot
    // be emitted as-is, and a resolved name would point at a font the bundle does not carry
    // until ADR-0057's asset lands — which fails over to the system face silently and
    // produces tofu for exactly the rare kanji the corpus is made of.
    const emitted = readFileSync(join(HERE, '..', 'src', 'generated', 'native.ts'), 'utf8');
    expect(emitted).not.toMatch(/nativeFamilies/u);
    expect(emitted).not.toMatch(/Hiragino|Geist|sans-serif/u);
  });
});
