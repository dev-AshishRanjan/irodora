/**
 * The family a Japanese reader sees (F-090, FR-20, NFR-11).
 *
 * ## Why this is its own file
 *
 * The locale comes from `expo-localization`, so rendering in Japanese needs a module mock — and
 * a module mock is file-wide. `screens.test.tsx` renders everything in English and must keep
 * doing so, because the English locale is the DECOY here: it is the one that legitimately looks
 * like the authoring slug.
 *
 * ## What was wrong
 *
 * Until this feature the Atlas filter, every Atlas row and the colour detail screen rendered
 * `taxonomy.family` raw — `blue-grey`, `off-white`, `mineral-green` — **in both locales**. On a
 * Japanese colour product that is a wart on the screen the product exists for, and it survived
 * from F-018 because nothing had ever rendered a screen in `ja`.
 */

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: 'ja-JP' }],
}));

import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import type { TestNode } from '@irodora/ui/testing';
import { Atlas } from '../src/screens/Atlas';
import { ColourDetail } from '../src/screens/ColourDetail';
import { allEntries, familyLabel } from '../src/corpus';

function draw(node: React.JSX.Element): TestNode {
  const json = render(<ThemeProvider theme="light">{node}</ThemeProvider>).toJSON();
  if (json === null) throw new Error('rendered nothing');
  return Array.isArray(json) ? { type: 'Root', props: {}, children: json } : json;
}

function textOf(node: TestNode, out: string[] = []): string[] {
  for (const child of node.children ?? []) {
    if (typeof child === 'string') out.push(child);
    else textOf(child, out);
  }
  const label: unknown = node.props['accessibilityLabel'];
  if (typeof label === 'string') out.push(label);
  return out;
}

const shown = (node: React.JSX.Element): string => textOf(draw(node)).join(' ');

/** Every authoring slug a published entry uses. Read from the corpus, never listed. */
const SLUGS = [...new Set(allEntries().map((e) => e.entry.taxonomy.family))];
const ENTRY = allEntries()[0]!;

describe('the app is actually rendering in Japanese', () => {
  it('has slugs to check at all', () => {
    // A slug list of zero would make every assertion below vacuously true.
    expect(SLUGS.length).toBeGreaterThan(20);
  });

  it('proves the locale mock took effect', () => {
    // Without this, "no English slug appears" would also be true of a screen rendering nothing,
    // and of a mock that silently failed to apply.
    expect(shown(<Atlas />)).toContain('色の一覧');
  });
});

describe('no authoring slug reaches a Japanese reader', () => {
  /*
   * ASSERTED ON WHOLE TEXT NODES, not on a joined blob — and the first draft was the blunt
   * version. Scanning the blob for each slug reported `red` and `brown`: `red` matches inside
   * "japanese-inspired" and `brown` inside an English description. Both were false positives,
   * and a check that cries wolf on prose gets deleted.
   *
   * The family renders in exactly three shapes — `label count`, `label · temp · hex`, and the
   * bare label — so a leak is a node that EQUALS a slug or STARTS with one followed by a
   * separator. Prose cannot satisfy that.
   */
  const isLeak = (text: string, slug: string): boolean =>
    text === slug || text.startsWith(`${slug} `);

  const leaks = (node: React.JSX.Element): string[] => {
    const nodes = textOf(draw(node));
    return SLUGS.filter((slug) => nodes.some((text) => isLeak(text, slug)));
  };

  it('shows none on the Atlas — filter chips and list rows in one pass', () => {
    expect(leaks(<Atlas />)).toEqual([]);
  });

  it('shows none on the colour detail screen', () => {
    expect(leaks(<ColourDetail slug={ENTRY.entry.slug} />)).toEqual([]);
  });

  /*
   * THE DECOY FOR THE LEAK CHECK ITSELF, and it earned its keep immediately.
   *
   * An earlier draft lost the argument to `startsWith`, so only the equality half worked — and
   * a decoy that tested only a BARE slug passed anyway, because equality alone caught it. So
   * this covers BOTH shapes: the bare label (the detail row) and the composed one (the Atlas
   * chip, `label count`), which only `startsWith` can catch.
   *
   * And the prose cases must stay silent, because those are the false positives that got the
   * first draft of this check rewritten.
   */
  it.each([
    ['a bare slug, as the detail row would render it', 'clay', true],
    ['a slug with a count, as the Atlas chip would render it', 'clay 4', true],
    ['a slug in the middle of prose', 'soil that anyone would call clay', false],
    ['a slug as a substring of a longer word', 'japanese-inspired', false],
  ])('DECOY — %s', (_what, text, expected) => {
    expect(isLeak(text, 'clay')).toBe(expected);
  });

  it('shows the Japanese word the vocabulary authored', () => {
    expect(shown(<ColourDetail slug={ENTRY.entry.slug} />)).toContain(
      familyLabel(ENTRY.entry.taxonomy.family, 'ja'),
    );
  });
});

describe('the vocabulary covers the corpus, not a sample of it', () => {
  it('has a Japanese word for every family, and it is never the slug', () => {
    // The content gate asserts this over the FILES. This asserts it over what the app loads,
    // which is a different artefact reached by a different path.
    for (const slug of SLUGS) {
      const ja = familyLabel(slug, 'ja');
      expect(`${slug}: ${ja}`).not.toBe(`${slug}: ${slug}`);
      expect(ja.length).toBeGreaterThan(0);
    }
  });

  /*
   * THE DECOY. Every assertion above is equally true of an app that shows Japanese in BOTH
   * locales. The English form must still differ from the Japanese one — and it is the form
   * that legitimately resembles the slug.
   */
  it('DECOY — the English form is different, and still English', () => {
    for (const slug of SLUGS) {
      const en = familyLabel(slug, 'en');
      const ja = familyLabel(slug, 'ja');
      expect(`${slug}: ${en === ja ? 'same' : 'different'}`).toBe(`${slug}: different`);
      expect(/^[\x20-\x7E]+$/u.test(en)).toBe(true);
    }
  });

  it('throws on an unknown family rather than falling back to the slug', () => {
    // Returning `no-such-family` quietly is the fallback ADR-0028 forbids, and it is how this
    // defect survived from F-018 to F-090 in the first place.
    expect(() => familyLabel('no-such-family', 'ja')).toThrow();
  });
});
