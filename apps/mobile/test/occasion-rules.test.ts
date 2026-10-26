/**
 * `07`'s occasion control ranks under FR-34's published weightings (F-248, E-220).
 *
 * `occasionRuleSet` reads the SAME verified file as `ruleSet()` — the digest against the ledger's,
 * then the rationale count — for another occasion's weighting. What is checked here is that it is the
 * same file, that it is checked, and that an occasion is a different weighting rather than a label on
 * the default one. The weighting's own arithmetic is the engine's, tested in its package.
 */

import { OCCASIONS } from '@irodora/recommendation';
import { occasionRuleSet, ruleSet, RULES_OCCASION } from '../src/rules';
import { WEAR_OCCASIONS } from '../src/wear';
import type * as Rules from '../src/rules';
import type * as Weights from '../src/rules/generated/weights';

describe('an occasion is a published weighting (E-220)', () => {
  it('reads the same versioned file as the default rule set', () => {
    for (const occasion of WEAR_OCCASIONS)
      expect(occasionRuleSet(occasion).versionId).toBe(ruleSet().versionId);
  });

  it('weights its factors to 1, as every published weighting does', () => {
    for (const occasion of WEAR_OCCASIONS) {
      const total = Object.values(occasionRuleSet(occasion).weights).reduce((n, w) => n + w, 0);
      expect(total).toBeCloseTo(1, 9);
    }
  });

  it('gives at least one of 07’s occasions a weighting the default does not have', () => {
    const differs = WEAR_OCCASIONS.filter(
      (o) => JSON.stringify(occasionRuleSet(o).weights) !== JSON.stringify(ruleSet().weights),
    );
    expect(differs.length).toBeGreaterThan(0);
  });

  it('DECOY: the default occasion through it is exactly `ruleSet()`, which is unchanged', () => {
    expect(RULES_OCCASION).toBe('default');
    expect(occasionRuleSet('default')).toStrictEqual(ruleSet());
  });

  it('is built once per occasion', () => {
    expect(occasionRuleSet('office')).toBe(occasionRuleSet('office'));
  });

  it('names only occasions the engine knows', () => {
    for (const occasion of WEAR_OCCASIONS) expect(OCCASIONS).toContain(occasion);
  });
});

describe('the file is verified before any occasion is read from it', () => {
  // `doMock` outlives `isolateModules`: the mock is unregistered, not merely the registry reset.
  afterEach(() => {
    jest.dontMock('../src/rules/generated/weights');
    jest.resetModules();
  });

  it('refuses a weights text that does not match the ledger’s digest, for an occasion too', () => {
    jest.isolateModules(() => {
      jest.doMock('../src/rules/generated/weights', () => {
        const actual = jest.requireActual<typeof Weights>('../src/rules/generated/weights');
        // One weight rationale edited: still valid JSON, still a valid weight set, not the file
        // the ledger recorded.
        return {
          ...actual,
          WEIGHTS_TEXT: actual.WEIGHTS_TEXT.replace('"rationale": "', '"rationale": "x'),
        };
      });
      const rules = jest.requireActual<typeof Rules>('../src/rules');
      expect(() => rules.occasionRuleSet('office')).toThrow(/digest/);
    });
  });

  it('DECOY: the untouched file verifies, so the refusal above is the edit’s', () => {
    jest.isolateModules(() => {
      const rules = jest.requireActual<typeof Rules>('../src/rules');
      expect(() => rules.occasionRuleSet('office')).not.toThrow();
    });
  });
});
