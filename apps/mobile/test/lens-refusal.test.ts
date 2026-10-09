/**
 * Which captures the Lens refuses, and what it says (F-236; ADR-0128 D1, D10; FR-18).
 *
 * - **Only a poor capture is refused**, for the engine's first failure; fair, good and excellent
 *   are the decoys.
 * - **The words come from the engine**: each check's threshold is read through the engine's rule
 *   table, never retyped, and each fix mirrors the engine's own instruction.
 * - **A refusal names a reading, never a measurement** (E2), and prints no confidence (D10).
 */

import {
  QUALITY_CHECK_RULES,
  QUALITY_CHECKS,
  QUALITY_INSTRUCTIONS,
  QUALITY_THRESHOLDS,
  type QualityCheck,
} from '@irodora/color-sampling';
import { t } from '../src/i18n';
import { refusalOf, refusalText, thresholdText } from '../src/lens/refusal';

const failing = (quality: 'excellent' | 'good' | 'fair' | 'poor', failures: QualityCheck[]) => ({
  quality,
  qualityFailures: failures,
});

describe('only a poor capture is refused', () => {
  it('refuses a poor capture for the engine’s first failure', () => {
    expect(refusalOf(failing('poor', ['clipping', 'evenness', 'sharpness']))).toBe('clipping');
    expect(refusalOf(failing('poor', ['samples', 'evenness', 'singleColour']))).toBe('samples');
  });

  it('DECOY — fair, good and excellent are not refused, whatever failed', () => {
    expect(refusalOf(failing('fair', ['clipping', 'evenness']))).toBeNull();
    expect(refusalOf(failing('good', ['sharpness']))).toBeNull();
    expect(refusalOf(failing('excellent', []))).toBeNull();
  });

  it('fails closed on a poor reading that names no failure: a defect, never an open sheet (review M1)', () => {
    // The engine calls a capture poor because three checks failed; one naming none is a disagreement
    // between the class and its failures. Returning null would open the sheet on a poor capture.
    expect(() => refusalOf(failing('poor', []))).toThrow(/names no failed check/u);
  });
});

describe('the words come from the engine', () => {
  it('reads each threshold through the engine’s rule table — never retyped', () => {
    const expected: Record<QualityCheck, string> = {
      samples: '1,000',
      clipping: `${String(QUALITY_THRESHOLDS.maxClipped * 100)}%`,
      evenness: `${String(QUALITY_THRESHOLDS.maxUnevenness * 100)}%`,
      sharpness: String(QUALITY_THRESHOLDS.minSharpness),
      singleColour: String(QUALITY_THRESHOLDS.maxColourVariance),
    };
    for (const check of QUALITY_CHECKS) {
      expect(thresholdText(check)).toBe(expected[check]);
      // The threshold a check is phrased against is the one its rule names.
      expect(QUALITY_CHECK_RULES[check].threshold).toMatch(/^(min|max)/u);
    }
  });

  it.each(QUALITY_CHECKS.map((c) => [c]))(
    'words the %s fix as the engine instructs it',
    (check) => {
      // The engine's instruction, to the action after any dash, is the catalogue's English fix.
      const engine = QUALITY_INSTRUCTIONS[check].split(' — ').at(-1) ?? '';
      const fix = t('en', `lens.check.${check}.fix`);
      expect(fix.replace(/\.$/u, '').toLowerCase()).toBe(engine.toLowerCase());
    },
  );
});

describe('what the refused state says', () => {
  it.each(QUALITY_CHECKS.flatMap((c) => [[c, 'en'] as const, [c, 'ja'] as const]))(
    'heads %s (%s) as a reading refused, and gives the threshold and the fix',
    (check, locale) => {
      const say = (key: Parameters<typeof t>[1]): string => t(locale, key);
      const { title, body } = refusalText(check, say, locale === 'ja' ? 'japanese' : 'latin');
      expect(title.startsWith(t(locale, 'lens.refused.title'))).toBe(true);
      expect(title).toContain(t(locale, `lens.check.${check}.name`));
      expect(body).toContain(thresholdText(check));
      expect(body).toContain(t(locale, `lens.check.${check}.fix`));
      // Never a measurement (E2, golden rule 11), and no confidence (D10).
      expect(`${title} ${body}`).not.toMatch(/measure|測定|confidence|信頼度/iu);
    },
  );

  it('sets each script’s own punctuation', () => {
    const en = refusalText('clipping', (k) => t('en', k), 'latin');
    expect(en).toStrictEqual({
      title: 'Reading Refused: Exposure Clipped',
      body: 'Clipped pixels, the most a reading allows: 2%. Move out of direct light, or reduce exposure.',
    });
    const ja = refusalText('clipping', (k) => t('ja', k), 'japanese');
    expect(ja.title).toBe('読み取りを中止：露出の飛び');
    expect(ja.body).toBe(
      '読み取りで許容される白飛び・黒つぶれの上限：2%。直射光を避けるか、露出を下げてください。',
    );
  });
});
