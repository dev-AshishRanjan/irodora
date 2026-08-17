/**
 * The design system's own tokens, under simulated colour-vision deficiency.
 *
 * `ACCESSIBILITY.md` §3 states it plainly: *our own interface is held to the standard the
 * product applies to outfits.* That is either a gate or it is a sentence. This is the gate.
 *
 * The score is `separationScore` from `@irodora/cvd-engine` — the **same function the
 * recommendation engine ranks with** (E-005). Not a threshold reimplemented here against the
 * same idea: one definition, or the two drift and the interface starts passing a standard
 * the product no longer applies.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  checkSeparation,
  CVD_SEVERITIES,
  CVD_SEVERITY,
  DEFICIENCIES,
  parseManifest,
  THEMES,
  type Manifest,
} from '../../src/index.js';

const MANIFEST_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  'docs',
  'design',
  'design-system.manifest.json',
);

const manifest: Manifest = parseManifest(JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')));

describe('design-system cvdPairs', () => {
  const results = checkSeparation(manifest);

  it('checks every declared pair, in both themes, against every deficiency', () => {
    // The count is asserted rather than inferred. A pair silently dropped from the manifest
    // would otherwise make this suite pass by having less to check — the failure mode a
    // "all results pass" assertion cannot see.
    expect(results).toHaveLength(
      manifest.cvdPairs.pairs.length * DEFICIENCIES.length * THEMES.length,
    );
    expect(manifest.cvdPairs.pairs.length).toBeGreaterThanOrEqual(4);
  });

  it('simulates at severity 1.0 — the total case', () => {
    // A pair that survives severity 1.0 survives every milder one, so this is the only
    // severity worth gating on. Asserted so a future edit cannot quietly soften it.
    expect(CVD_SEVERITY).toBe(1);
  });

  for (const result of results)
    it(`${result.theme}: ${result.a} / ${result.b} stays separable under ${result.deficiency}`, () => {
      expect(
        result.score,
        `separation ${result.score.toFixed(1)} is below the declared minimum ` +
          `${String(result.required)}. Change the colours — the minimum is not a dial.`,
      ).toBeGreaterThanOrEqual(result.required);
    });
});

describe('what the separation check actually covers', () => {
  const results = checkSeparation(manifest);

  it('evaluates both models, not only Machado', () => {
    // `color-engine.md` §7 assigns TOTAL dichromacy to Brettel-Viénot and anomalous
    // trichromacy to Machado. Evaluating "separable at severity 1.0" only through Machado's
    // extrapolation to its endpoint is a claim about the wrong model — and the two disagree
    // by up to 5.6 points on this palette, in the direction that hides a failure.
    const models = new Set(results.map((r) => r.model));
    expect(models).toContain('vienot');
    expect(models).toContain('machado');
  });

  it('evaluates every tabulated severity, because Machado is not monotone', () => {
    // The decoy for CVD_SEVERITIES. If the sweep were dropped and only 1.0 checked, this
    // pair would be reported 4.6 points higher than its true worst.
    expect(CVD_SEVERITIES).toHaveLength(11);
    expect(CVD_SEVERITIES.at(-1)).toBe(1);

    const tritanWorst = results.filter((r) => r.deficiency === 'tritan' && r.severity < 1);
    expect(
      tritanWorst.length,
      'no tritan pair reported a worst case below severity 1.0 — if that is now genuinely ' +
        'true the comment on CVD_SEVERITIES needs re-measuring, not deleting',
    ).toBeGreaterThan(0);
  });

  it('reports which model and severity produced each worst case', () => {
    // A score with no provenance cannot be argued with. Every row says where it came from.
    for (const r of results) {
      expect(['machado', 'vienot']).toContain(r.model);
      expect(r.severity).toBeGreaterThanOrEqual(0);
      expect(r.severity).toBeLessThanOrEqual(1);
    }
  });
});
