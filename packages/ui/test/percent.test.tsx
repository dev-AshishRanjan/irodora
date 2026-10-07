/**
 * A reading's confidence in its one display format (F-222, ADR-0124).
 *
 * Floored with a guard, so it never shows more than the value holds and never less than its author
 * wrote; printed as `03` draws it, and in Japanese; and the only format in this package's source.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { confidencePercent, confidenceText, floorPercent } from '../src/index.js';
import { secondConfidenceFormats } from '../src/testing/index.js';

describe('the percentage', () => {
  it('reads every two-decimal confidence as the whole percent its author wrote', () => {
    for (let hundredths = 0; hundredths <= 100; hundredths += 1)
      expect(confidencePercent(hundredths / 100)).toBe(hundredths);
  });

  it('DECOY — a bare floor loses a percent float64 cannot hold', () => {
    // 0.57 × 100 is 56.99999999999999: the guard is what makes the line above pass.
    for (const [c, bare] of [
      [0.57, 56],
      [0.29, 28],
      [0.58, 57],
    ] as const) {
      expect(Math.floor(c * 100)).toBe(bare);
      expect(confidencePercent(c)).toBe(bare + 1);
    }
  });

  it('never shows more than the value holds', () => {
    expect(confidencePercent(0.9999)).toBe(99);
    // DECOY: rounding would print a ceiling of 0.9999 as 100.
    expect(Math.round(0.9999 * 100)).toBe(100);
    for (let i = 0; i <= 1000; i += 1) {
      const c = i / 1000;
      expect(confidencePercent(c)).toBeLessThanOrEqual(100 * c + 1e-9);
    }
  });

  it('rises with the value and stays in [0, 100]', () => {
    let previous = -1;
    for (let i = 0; i <= 1000; i += 1) {
      const p = confidencePercent(i / 1000);
      expect(p).toBeGreaterThanOrEqual(previous);
      previous = p;
    }
    expect([confidencePercent(0), confidencePercent(1)]).toStrictEqual([0, 100]);
  });

  it('refuses what is not a fraction', () => {
    for (const bad of [Number.NaN, -0.01, 1.01, Number.POSITIVE_INFINITY])
      expect(() => floorPercent(bad)).toThrow(RangeError);
  });
});

describe('the text', () => {
  it('prints as 03 draws it, and in Japanese', () => {
    expect(confidenceText(0.95, 'Confidence', 'latin')).toBe('95% Confidence');
    expect(confidenceText(0.95, '信頼度', 'japanese')).toBe('信頼度95%');
    expect(confidenceText(0.21, 'Confidence', 'latin')).toBe('21% Confidence');
  });
});

describe('the only format in this package', () => {
  const SRC = join(__dirname, '..', 'src');
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/u.test(name) ? [path] : [];
    });

  it('finds no second confidence format in src', () => {
    const found = files(SRC)
      // The scanner's own patterns describe the formats it refuses.
      .filter((path) => !path.endsWith(join('testing', 'confidence.ts')))
      .flatMap((path) =>
        secondConfidenceFormats(readFileSync(path, 'utf8')).map((m) => `${path}: ${m.text}`),
      );
    expect(found).toStrictEqual([]);
  });

  it('DECOY — the scanner finds the formats this replaced, and the obvious variants', () => {
    for (const planted of [
      '{capture.confidence.toFixed(2)}',
      'const percent = Math.round(confidence * 100);',
      'Math.round(100 * capture.confidence)',
      'capture?.confidence?.toFixed(2)',
      'reading.confidence.toPrecision(2)',
      'x.confidence.toLocaleString()',
      'String(capture.confidence)',
      '<Text>{capture.confidence}</Text>',
      '`${reading?.confidence}`',
    ])
      expect({ planted, found: secondConfidenceFormats(planted).length > 0 }).toStrictEqual({
        planted,
        found: true,
      });
  });

  it('DECOY — and leaves the one format, and a destructuring, alone', () => {
    for (const honest of [
      'confidenceText(c, word, script)',
      'confidencePercent(capture.confidence)',
      'const { source, confidence } = color.provenance;',
      '`${String(confidencePercent(confidence))}%`',
    ])
      expect({ honest, found: secondConfidenceFormats(honest) }).toStrictEqual({
        honest,
        found: [],
      });
  });

  it('reports every occurrence, in order, so an exception can name one', () => {
    const found = secondConfidenceFormats('a.confidence.toFixed(1); b.confidence.toFixed(2);');
    expect(found.map((m) => m.text)).toStrictEqual(['confidence.toFixed(', 'confidence.toFixed(']);
    expect(found[0]?.index).toBeLessThan(found[1]?.index ?? 0);
  });
});
