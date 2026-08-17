/**
 * `requirementFor`, `checkContrast` and `checkChromaCeiling`.
 *
 * These had no unit test at all until the F-003 evaluation pointed it out, and the mutation
 * proof did not isolate them either: the one contrast mutation changed a token's `oklch`,
 * which also breaks the ADR-0043 derived-hex check — so gate 9 went red either way. **If
 * `checkContrast` had returned `passes: true` unconditionally, every gate and all eight
 * mutations would still have been green.**
 *
 * That is the exact shape of an unchecked check. The assertions below pin the comparison and
 * the threshold-selection rule directly, against hand-computed expectations rather than
 * against whatever the function currently returns.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { wcagContrast } from '@irodora/color-difference';
import { describe, expect, it } from 'vitest';
import {
  checkChromaCeiling,
  checkContrast,
  parseManifest,
  requirementFor,
  THEMES,
  tokenRgb,
  type ColorToken,
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
const source = readFileSync(MANIFEST_PATH, 'utf8');
const manifest: Manifest = parseManifest(JSON.parse(source));

const token = (usage: ColorToken['usage']): ColorToken => ({
  oklch: { l: 0.5, c: 0, h: 0 },
  srgb: '#777777',
  role: 'fixture',
  usage,
  pairsWith: [],
});

describe('requirementFor — the stricter of the two usages', () => {
  const { normalText, largeText, nonText } = manifest.gate.contrast;

  it('takes the stricter side, whichever end declared the pairing', () => {
    // `pairsWith` does not say which side is the foreground: `background` lists its text
    // tokens, `ring` lists the surfaces it sits on. The rule must therefore be symmetric.
    const surface = { name: 's', token: token('surface') };
    const text = { name: 't', token: token('text') };
    expect(requirementFor(manifest, surface, text)?.required).toBe(normalText);
    expect(requirementFor(manifest, text, surface)?.required).toBe(normalText);
    expect(requirementFor(manifest, surface, text)?.governedBy).toBe('t');
    expect(requirementFor(manifest, text, surface)?.governedBy).toBe('t');
  });

  it('picks text over largeText and nonText', () => {
    expect(normalText).toBeGreaterThan(largeText);
    const text = { name: 't', token: token('text') };
    expect(requirementFor(manifest, text, { name: 'l', token: token('largeText') })?.required).toBe(
      normalText,
    );
    expect(requirementFor(manifest, { name: 'n', token: token('nonText') }, text)?.required).toBe(
      normalText,
    );
  });

  it('uses the large-text and non-text minimums when neither side is body text', () => {
    const surface = { name: 's', token: token('surface') };
    expect(
      requirementFor(manifest, surface, { name: 'l', token: token('largeText') })?.required,
    ).toBe(largeText);
    expect(
      requirementFor(manifest, surface, { name: 'n', token: token('nonText') })?.required,
    ).toBe(nonText);
  });

  it('returns null for two surfaces, which the caller reports rather than skips', () => {
    expect(
      requirementFor(
        manifest,
        { name: 'a', token: token('surface') },
        {
          name: 'b',
          token: token('surface'),
        },
      ),
    ).toBeNull();
  });
});

describe('checkContrast — the comparison itself', () => {
  const { results } = checkContrast(manifest);

  it('checks every declared pairing in both themes, and nothing else', () => {
    let declared = 0;
    for (const theme of THEMES)
      for (const t of Object.values(manifest.color[theme])) declared += t.pairsWith.length;
    expect(results).toHaveLength(declared);
    expect(declared).toBeGreaterThan(40);
  });

  it('reproduces the engine ratio for an opaque pairing, independently computed', () => {
    // Recomputed here from wcagContrast directly rather than trusting the result row. If
    // checkContrast stopped calling the engine, this is what would notice.
    const dark = manifest.color.dark;
    const expected = wcagContrast(
      tokenRgb('foreground', dark['foreground']!),
      tokenRgb('background', dark['background']!),
    );
    const row = results.find(
      (r) => r.theme === 'dark' && r.foreground === 'foreground' && r.background === 'background',
    );
    expect(row).toBeDefined();
    expect(row!.wcag).toBeCloseTo(expected, 10);
    expect(expected).toBeGreaterThan(15);
  });

  it('sets `passes` from the ratio against the requirement, in BOTH directions', () => {
    // The decoy for the comparison. A no-op `passes: true` survives every other assertion in
    // this file and every mutation in verify-contrast-proof.mjs; it does not survive this.
    for (const r of results) expect(r.passes).toBe(r.wcag >= r.required);

    const failing = results.filter((r) => !r.passes);
    expect(failing, 'the committed manifest should have no failing pairing').toEqual([]);

    // …and the same function must report `false` when the ratio is genuinely short. Built by
    // pairing two real surfaces one step apart, which is nowhere near 4.5:1.
    const probe = structuredClone(JSON.parse(source) as Record<string, unknown>) as {
      color: { dark: Record<string, { usage: string; pairsWith: string[] }> };
    };
    probe.color.dark['surface.1']!.usage = 'text';
    probe.color.dark['surface.2']!.pairsWith = ['surface.1'];
    const probed = checkContrast(parseManifest(probe));
    const short = probed.results.find(
      (r) => r.theme === 'dark' && r.foreground === 'surface.1' && r.background === 'surface.2',
    );
    expect(short).toBeDefined();
    expect(short!.wcag).toBeLessThan(4.5);
    expect(short!.passes).toBe(false);
  });

  it('reports APCA alongside, never instead', () => {
    // ADR-0021: WCAG is the gate, APCA is reported. A row whose pass/fail tracked APCA would
    // be a different standard wearing this one's name.
    for (const r of results) expect(Number.isFinite(r.apca)).toBe(true);
    const wrongIfApcaGated = results.filter((r) => r.passes && Math.abs(r.apca) < 45);
    expect(
      wrongIfApcaGated.length,
      'these pass WCAG while below the APCA large-text floor — proof the gate is WCAG',
    ).toBeGreaterThan(0);
  });
});

describe('checkChromaCeiling', () => {
  it('is clean on the committed manifest', () => {
    expect(checkChromaCeiling(manifest)).toEqual([]);
  });

  it('reports a chromatic token with no recorded exception', () => {
    const probe = JSON.parse(source) as {
      exceptions: { token: string }[];
    };
    probe.exceptions = probe.exceptions.filter((e) => e.token !== 'ring');
    const findings = checkChromaCeiling(parseManifest(probe));
    expect(findings.some((f) => f.detail.includes('ring'))).toBe(true);
  });

  it('reports an exception nobody needs', () => {
    const probe = JSON.parse(source) as {
      exceptions: {
        rule: string;
        token: string;
        reason: string;
        owner: string;
        recordedAt: string;
      }[];
    };
    probe.exceptions.push({
      rule: 'chromaCeiling',
      token: 'foreground',
      reason: 'stale',
      owner: 'nobody',
      recordedAt: '2026-08-15',
    });
    const findings = checkChromaCeiling(parseManifest(probe));
    expect(findings.some((f) => f.detail.includes('no longer exceeds'))).toBe(true);
  });
});
