/**
 * A theme from a seed nobody knew about at build time (F-154).
 *
 * ## What is actually being proven
 *
 * Not that a seed produces a theme — that is arithmetic, and `themes.test.ts` already proves what
 * the derivation is allowed to change.
 *
 * What only this file can say is that **no seed is ever applied unchecked**. Every hue is derived
 * and run through the gate's own contrast and CVD functions, and every one of them either applies
 * with its corrections named or is refused with a reason. A sweep rather than three sampled
 * hues, because "we tried blue and it was fine" is not a policy.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  BASE_THEMES,
  isInGamut,
  MINIMUM_SEED_CHROMA,
  oklchToRgb,
  parseManifest,
  themeFromSeed,
  type SeedOutcome,
} from '../src/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const manifest = parseManifest(
  JSON.parse(
    readFileSync(
      join(HERE, '..', '..', '..', 'docs', 'design', 'design-system.manifest.json'),
      'utf8',
    ),
  ) as Record<string, unknown>,
);

/**
 * A seed at a mid lightness carrying as much chroma as sRGB allows at that hue, up to a cap.
 *
 * FITTED RATHER THAN FIXED, because a platform accent is a colour the device is already
 * showing — it is in gamut by construction. A fixture with one chroma for every hue is not
 * that: 0.12 at L 0.55 leaves sRGB somewhere in the blues, so a sweep built on it would spend
 * most of its 720 cases exercising the "outside sRGB" refusal and calling that coverage.
 */
const seedAt = (h: number, cap = 0.12) => {
  let c = cap;
  while (c > 0 && !isInGamut(oklchToRgb({ l: 0.55, c, h }))) c -= 0.002;
  return { l: 0.55, c: Math.round(c * 1000) / 1000, h };
};

const applied = (outcome: SeedOutcome) => (outcome.kind === 'applied' ? outcome : null);

describe('every hue, in both modes', () => {
  it('is either applied or refused — never applied unchecked', () => {
    /*
     * THE ASSERTION THE FEATURE TURNS ON. The seed is not ours to choose, so the policy has to
     * hold for all of them: 360 hues times two modes, each derived and each run through
     * `checkContrast` and `checkSeparation` — the gate's own functions, not a copy that agrees
     * with them until it does not.
     */
    let checked = 0;
    let refused = 0;
    for (const mode of BASE_THEMES)
      for (let h = 0; h < 360; h += 1) {
        const outcome = themeFromSeed(manifest, mode, seedAt(h));
        expect(`${mode}/${String(h)}: ${outcome.kind}`).toMatch(/: (applied|refused)$/u);
        if (outcome.kind === 'refused') {
          refused += 1;
          expect(outcome.reason.length).toBeGreaterThan(20);
        }
        checked += 1;
      }

    // Non-vacuity: a loop that ran zero times would pass every assertion above.
    expect(checked).toBe(720);

    // AND EVERY ONE OF THEM APPLIES. A seed that is a real colour on the device always produces
    // a theme, because the derivation cannot move lightness and cannot pass the ceiling — so a
    // sweep where half the cases were refusals would be measuring the fixture, not the policy.
    expect(refused).toBe(0);
  });

  it('preserves lightness exactly, in every one of them', () => {
    // The same assertion the build-time themes get, made here because this is the derivation's
    // other caller and a second copy of the rule is where it would drift.
    for (const mode of BASE_THEMES)
      for (const h of [0, 37, 120, 211, 300, 359]) {
        const outcome = applied(themeFromSeed(manifest, mode, seedAt(h)));
        expect(outcome).not.toBeNull();
        for (const [name, token] of Object.entries(manifest.color[mode]))
          expect(`${mode}/${String(h)}/${name}`).toBe(
            outcome?.colors[name]?.oklch.l === token.oklch.l
              ? `${mode}/${String(h)}/${name}`
              : 'L moved',
          );
      }
  });

  it('produces only values a device can paint', () => {
    for (const mode of BASE_THEMES)
      for (let h = 0; h < 360; h += 7) {
        const outcome = applied(themeFromSeed(manifest, mode, seedAt(h)));
        for (const [name, token] of Object.entries(outcome?.colors ?? {}))
          expect(`${mode}/${String(h)}/${name}`).toBe(
            isInGamut(oklchToRgb(token.oklch)) ? `${mode}/${String(h)}/${name}` : 'outside sRGB',
          );
      }
  });
});

describe('correction within stated bounds', () => {
  it('names what each token gave up, and to which bound', () => {
    /*
     * Corrections are NORMAL and that is the point of reporting them. At L 0.99 the sRGB gamut
     * is a sliver, so a light background cannot hold the chroma the ceiling would allow — and a
     * theme that quietly did less than it was asked is a theme nobody can reason about.
     */
    const outcome = applied(themeFromSeed(manifest, 'light', seedAt(240)));
    expect(outcome).not.toBeNull();
    expect(outcome?.corrections.length).toBeGreaterThan(0);

    for (const c of outcome?.corrections ?? []) {
      expect(['ceiling', 'gamut']).toContain(c.bound);
      // A correction only ever takes chroma away; it is the one lever that leaves L and hue alone.
      expect(c.now).toBeLessThan(c.was);
      expect(c.token.length).toBeGreaterThan(0);
    }
  });

  it('DECOY — a seed does not correct everything, so the report is a report', () => {
    // Without this, `corrections` could list every token and the case above would pass while
    // saying nothing [[a-decoy-that-is-not-broken-proves-nothing]].
    const outcome = applied(themeFromSeed(manifest, 'dark', seedAt(240)));
    const tokens = Object.keys(manifest.color.dark).length;
    expect(outcome?.corrections.length).toBeLessThan(tokens);
  });
});

describe('refusal, and its reason', () => {
  it('refuses a seed with no hue in it', () => {
    /*
     * A greyscale wallpaper is a real thing. The honest answer is to say there is no colour to
     * take and leave the base theme alone — not to fabricate a hue out of the rounding on a
     * grey, which would give somebody a theme decided by the last bit of their photograph.
     */
    const outcome = themeFromSeed(manifest, 'light', {
      l: 0.5,
      c: MINIMUM_SEED_CHROMA / 2,
      h: 210,
    });
    expect(outcome.kind).toBe('refused');
    if (outcome.kind === 'refused') expect(outcome.reason).toMatch(/achromatic/u);
  });

  it('refuses a seed outside sRGB', () => {
    const outcome = themeFromSeed(manifest, 'light', { l: 0.6, c: 0.5, h: 140 });
    expect(outcome.kind).toBe('refused');
    if (outcome.kind === 'refused') expect(outcome.reason).toMatch(/sRGB/u);
  });

  it('refuses a seed that is not numbers', () => {
    for (const bad of [
      { l: Number.NaN, c: 0.1, h: 200 },
      { l: 0.5, c: Number.POSITIVE_INFINITY, h: 200 },
      { l: 0.5, c: 0.1, h: Number.NaN },
    ])
      expect(themeFromSeed(manifest, 'light', bad).kind).toBe('refused');
  });

  it('refuses a lightness outside the scale', () => {
    expect(themeFromSeed(manifest, 'light', { l: 1.4, c: 0.1, h: 200 }).kind).toBe('refused');
  });

  it('DECOY — an ordinary accent is NOT refused', () => {
    // The refusals above would all pass on a function that refused everything, which is the
    // failure mode a policy of "check before applying" invites.
    expect(themeFromSeed(manifest, 'light', seedAt(211)).kind).toBe('applied');
  });
});

describe('the checks are the gate’s own', () => {
  it('answers about a built-in palette the way the gate does', () => {
    /*
     * A seed whose hue is a built-in family's produces that family's palette, so running it
     * through the runtime path and getting `applied` is the same statement gate 9 makes about
     * that theme at build time. If the two ever disagreed, one of them would be a copy.
     */
    const outcome = themeFromSeed(manifest, 'light', seedAt(240));
    expect(outcome.kind).toBe('applied');

    const fuka = manifest.color['fuka.light'];
    for (const [name, token] of Object.entries(applied(outcome)?.colors ?? {}))
      expect(`${name}: ${String(token.oklch.h)}`).toBe(
        `${name}: ${String(fuka[name]?.oklch.h ?? token.oklch.h)}`,
      );
  });
});
