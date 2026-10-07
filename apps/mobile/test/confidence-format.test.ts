/**
 * A reading's confidence, in its one format, across the app (F-222, ADR-0124).
 *
 * `@irodora/ui`'s `confidenceText` is the format and `percent.test` holds its arithmetic. Here: every
 * ceiling the product publishes prints as the whole percent it is, and the app's source carries no
 * second format — the shared `secondConfidenceFormats` rule, over this package's own `src`.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ILLUMINATION_CEILING, QUALITY_CEILING } from '@irodora/color-sampling';
import { confidencePercent, confidenceText } from '@irodora/ui';
import { secondConfidenceFormats } from '@irodora/ui/testing';
import { SPACE_CONFIDENCE_CEILING } from '../src/lens/reading';
import { CONFIDENCE_MAJORITY, CONFIDENCE_UNANIMOUS } from '../src/profile/derive';
import { PHOTO_CEILING } from '../src/profile/photo';
import { t } from '../src/i18n';

// jest transpiles to CJS, where `import.meta.url` is null; the runner's cwd is the package root.
const SRC = join(process.cwd(), 'src');

/**
 * The one place the app prints a confidence that is NOT a reading's: `Shopping.tsx` prints
 * `CompatibilityScore.confidence`, how much evidence a profile brought to a score (score.ts) — a
 * different quantity. Named, with its owner: F-258 rebuilds the screen and removes it.
 */
const EXCEPTIONS: ReadonlyMap<string, string> = new Map([
  [join('screens', 'Shopping.tsx'), 'CompatibilityScore.confidence — F-258'],
]);

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.(ts|tsx)$/u.test(name) ? [path] : [];
  });

/** Comments are history, not rendering: the Lens's own comment quotes the format it replaced. */
const code = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gmu, '$1');

describe('every published ceiling prints as the whole percent it is', () => {
  const ceilings: readonly (readonly [string, number])[] = [
    ...Object.entries(QUALITY_CEILING),
    ...Object.entries(ILLUMINATION_CEILING),
    ...Object.entries(SPACE_CONFIDENCE_CEILING),
    ['unanimous', CONFIDENCE_UNANIMOUS],
    ['majority', CONFIDENCE_MAJORITY],
    ['photo', PHOTO_CEILING],
  ];

  it('reads each ceiling as its author wrote it', () => {
    expect(ceilings.length).toBeGreaterThan(8);
    for (const [name, value] of ceilings)
      expect({ name, percent: confidencePercent(value) }).toStrictEqual({
        name,
        percent: Math.round(value * 100),
      });
  });

  it('prints in the catalogue’s word, in both languages', () => {
    expect(confidenceText(QUALITY_CEILING.poor, t('en', 'confidence.word'), 'latin')).toBe(
      `${String(Math.round(QUALITY_CEILING.poor * 100))}% Confidence`,
    );
    expect(confidenceText(0.95, t('ja', 'confidence.word'), 'japanese')).toBe('信頼度95%');
  });
});

describe('the only format in the app', () => {
  it('finds no second confidence format in src, past the one named exception', () => {
    const found = files(SRC).flatMap((path) => {
      const exception = [...EXCEPTIONS.keys()].some((rel) => path.endsWith(rel));
      if (exception) return [];
      return secondConfidenceFormats(code(readFileSync(path, 'utf8'))).map((m) => `${path}: ${m}`);
    });
    expect(found).toStrictEqual([]);
  });

  it('DECOY — the exception is real, and the scan finds what it names', () => {
    const shopping = files(SRC).find((path) => path.endsWith(join('screens', 'Shopping.tsx')));
    if (shopping === undefined) throw new Error('Shopping.tsx');
    expect(secondConfidenceFormats(code(readFileSync(shopping, 'utf8'))).length).toBeGreaterThan(0);
  });

  it('DECOY — a planted bare figure is found, and a comment quoting one is not', () => {
    expect(secondConfidenceFormats(code('{capture.confidence.toFixed(2)}'))).toHaveLength(1);
    expect(secondConfidenceFormats(code('// was `confidence.toFixed(2)`'))).toStrictEqual([]);
  });
});
