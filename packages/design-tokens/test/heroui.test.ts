/**
 * The HeroUI target.
 *
 * Three things are asserted, and the third is the one that matters.
 *
 * 1. **Shape** — all 35 base variables in both themes, all 29 derived ones, nothing missing.
 * 2. **Hex only** — no `oklch()`, no `color-mix()`, no `rgba()` in any DECLARATION, because
 *    Uniwind hands whatever it finds to `culori` on the device and a hex leaves that call
 *    nothing to decide (ADR-0063). Comments are exempt and deliberately carry the OKLCh
 *    provenance; the check strips them first, which is also what the guard script must do.
 * 3. **The emitter REFUSES to emit a failing stylesheet.** Four derived colours carry text —
 *    `Alert` tints its title with `--color-success-soft-foreground` — and a generator that
 *    writes them anyway and reports the problem beside it is a generator whose output someone
 *    ships [[a-gate-that-errors-is-failing-open]]. That path is exercised with a manifest
 *    built to fail, not asserted from its absence.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wcagContrast } from '@irodora/color-difference';
import { describe, expect, it } from 'vitest';
import {
  derivedSrgb,
  emitHeroui,
  herouiTheme,
  HerouiEmitError,
  nonHexDeclarations,
  parseManifest,
  THEMES,
  type Manifest,
} from '../src/index.js';

const MANIFEST_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'docs',
  'design',
  'design-system.manifest.json',
);

/** A fresh mutable parse each time, so a test that breaks the manifest cannot leak. */
const raw = (): unknown => JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as unknown;
const manifest: Manifest = parseManifest(raw());

/** Declarations only. Comments carry OKLCh provenance on purpose and are not values. */
const declarations = (css: string): string[] =>
  css
    .replace(/\/\*[\s\S]*?\*\//gu, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('--'));

describe('shape', () => {
  const css = emitHeroui(manifest);

  it('declares every HeroUI base variable in both themes', () => {
    const BASE_COUNT = 35;
    for (const theme of THEMES) {
      const block = css.split(`@variant ${theme} {`)[1]?.split('    }')[0] ?? '';
      const names = declarations(block).map((l) => l.split(':')[0] ?? '');
      const base = names.filter((n) => !n.startsWith('--irodora-'));
      expect(base, `${theme} base variables`).toHaveLength(BASE_COUNT);
      expect(new Set(base).size, `${theme} has a duplicate`).toBe(BASE_COUNT);
    }
  });

  it('maps every derived variable onto a per-theme intermediate', () => {
    const DERIVED_COUNT = 29;
    const theme = css.split('@theme inline static {')[1] ?? '';
    const mapped = declarations(theme).filter((l) => l.startsWith('--color-'));
    expect(mapped).toHaveLength(DERIVED_COUNT);
    // Each one must point at an intermediate that is actually set, in BOTH themes.
    for (const line of mapped) {
      const ref = /var\((--irodora-[a-z0-9-]+)\)/u.exec(line)?.[1];
      expect(ref, line).toBeDefined();
      for (const t of THEMES) {
        const block = css.split(`@variant ${t} {`)[1]?.split('    }')[0] ?? '';
        expect(block, `${t} is missing ${ref ?? '?'}`).toContain(`${ref ?? ''}:`);
      }
    }
  });
});

describe('hex only (ADR-0063)', () => {
  const css = emitHeroui(manifest);

  it('no declaration uses a colour function', () => {
    const offenders = declarations(css).filter((l) =>
      /(?:oklch|color-mix|rgba?|hsla?|lab|lch)\(/u.test(l),
    );
    expect(offenders).toEqual([]);
  });

  it('every colour declaration is #RRGGBB or #RRGGBBAA', () => {
    const colours = declarations(css).filter(
      (l) => !l.includes('var(') && !l.includes('transparent'),
    );
    expect(colours.length).toBeGreaterThan(100);
    for (const line of colours) {
      const value = line.split(':')[1]?.replace(';', '').trim() ?? '';
      expect(value, line).toMatch(/^#[0-9A-F]{6}(?:[0-9A-F]{2})?$/u);
    }
  });

  it('KEEPS the OKLCh provenance in comments, which is what makes the hex readable', () => {
    expect(css).toContain('oklch(0.135 0.004 70)');
  });
});

describe('the text-carrying derived colours are measured', () => {
  const SOFT = [
    ['--color-accent-soft-foreground', '--color-accent-soft'],
    ['--color-danger-soft-foreground', '--color-danger-soft'],
    ['--color-warning-soft-foreground', '--color-warning-soft'],
    ['--color-success-soft-foreground', '--color-success-soft'],
  ] as const;

  for (const theme of THEMES)
    for (const [text, fill] of SOFT)
      it(`${theme}: ${text} on ${fill}`, () => {
        const { values } = herouiTheme(manifest, theme);
        const t = values.get(text);
        const f = values.get(fill);
        expect(t, text).toBeDefined();
        expect(f, fill).toBeDefined();
        // The fill is translucent, so it is composited over the page before measuring —
        // measuring the fill's own colour would be measuring something never drawn.
        const page = values.get('--background')!;
        const over: readonly [number, number, number] = [
          f!.rgb[0] * f!.alpha + page.rgb[0] * (1 - f!.alpha),
          f!.rgb[1] * f!.alpha + page.rgb[1] * (1 - f!.alpha),
          f!.rgb[2] * f!.alpha + page.rgb[2] * (1 - f!.alpha),
        ];
        expect(wcagContrast(t!.rgb, over)).toBeGreaterThanOrEqual(4.5);
      });
});

describe('DECOY — the emitter refuses to write a failing stylesheet', () => {
  /**
   * A manifest whose dark `status.ok` sits almost on top of `background`.
   *
   * `--color-success-soft` is then indistinguishable from the page, and
   * `--color-success-soft-foreground` — a 70/30 mix of that same near-background colour with
   * the foreground — lands close enough to it that `Alert`'s title becomes unreadable. This
   * is a real failure of a real pairing, not an invented one.
   */
  function broken(): Manifest {
    const j = raw() as {
      color: Record<string, Record<string, { oklch: Record<string, number>; srgb: string }>>;
    };
    const dark = j.color['dark'];
    if (dark === undefined) throw new Error('no dark theme');
    const token = dark['status.ok'];
    if (token === undefined) throw new Error('no status.ok');
    token.oklch = { l: 0.16, c: 0.006, h: 158 };
    token.srgb = derivedSrgb('status.ok', token as never);
    return parseManifest(j);
  }

  it('the broken manifest really does fail the pairing', () => {
    // Without this, a throw could come from anywhere and the decoy would prove nothing
    // [[a-decoy-that-is-not-broken-proves-nothing]].
    const { findings } = herouiTheme(broken(), 'dark');
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.join(' ')).toContain('--color-success-soft-foreground');
  });

  it('emitHeroui throws rather than returning the stylesheet', () => {
    expect(() => emitHeroui(broken())).toThrow(HerouiEmitError);
  });

  it('the unbroken manifest emits cleanly, so the decoy is the difference', () => {
    expect(() => emitHeroui(manifest)).not.toThrow();
    expect(herouiTheme(manifest, 'dark').findings).toEqual([]);
    expect(herouiTheme(manifest, 'light').findings).toEqual([]);
  });
});

describe('the hex-only rule is enforced by the emitter, not only by this test', () => {
  it('a colour function in a declaration is rejected', () => {
    // The emitter cannot produce this — `format` has no branch that does — so the guard is
    // handed a crafted string directly. A guard whose failing path is unreachable from its
    // own caller is a guard nobody has watched fail
    // [[a-decoy-that-is-not-broken-proves-nothing]].
    const bad = [
      '@layer theme {',
      '  --background: oklch(0.135 0.004 70);',
      '  --accent: color-mix(in oklab, var(--x) 90%, var(--y) 10%);',
      '  --border: rgba(255, 255, 255, 0.08);',
      '}',
    ].join('\n');
    expect(nonHexDeclarations(bad)).toHaveLength(3);
  });

  it('the same notations inside a COMMENT are fine, because that is the provenance', () => {
    const good = [
      '@layer theme {',
      '  --background: #090807; /* background — oklch(0.135 0.004 70) */',
      '  --accent-hover: #DBD9D6; /* mix(--accent 90%, --accent-foreground 10%) */',
      '}',
    ].join('\n');
    expect(nonHexDeclarations(good)).toEqual([]);
  });

  it('the real emitted stylesheet has none', () => {
    expect(nonHexDeclarations(emitHeroui(manifest))).toEqual([]);
  });
});
