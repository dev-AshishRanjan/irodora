/**
 * The test runner's claims reader agrees with the lint's (F-221, ADR-0134 D3).
 *
 * The lint's proof holds the lint to three fixtures: every list item in `drawn.md` (the claims the
 * mockups draw) and `variants.md` is refused, and every one in `near-misses.md` passes. This holds
 * the sweep's reader to the same three, so a sweep that reads rendered text cannot be laxer, or
 * stricter, than the gate over source lines.
 *
 * Then the shape the sweep exists for: each drawn claim, split into a figure and a label set side
 * by side, is read back as one line and refused.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderedTexts, type TestNode } from '@irodora/ui/testing';
import { bannedIn, loadBanned } from './claims';

const FIXTURES = join(__dirname, '../../../packages/testing/fixtures/claims');

/** A fixture's list items, the lines its proof holds one by one. */
const items = (name: string): readonly string[] =>
  readFileSync(join(FIXTURES, `${name}.md`), 'utf8')
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.slice(2).trim());

const banned = loadBanned();

describe('the sweep reads claims.json as the lint does', () => {
  it('has patterns and fixtures, so agreement is not over nothing', () => {
    expect(banned.length).toBeGreaterThan(0);
    for (const name of ['drawn', 'variants', 'near-misses'])
      expect(items(name).length).toBeGreaterThan(0);
  });

  it.each(['drawn', 'variants'])('refuses every item in %s.md', (name) => {
    const passed = items(name).filter((item) => bannedIn(item, banned).length === 0);
    expect(passed).toStrictEqual([]);
  });

  it('passes every item in near-misses.md', () => {
    const refused = items('near-misses').filter((item) => bannedIn(item, banned).length > 0);
    expect(refused).toStrictEqual([]);
  });
});

describe('a claim composed on the screen is read as the claim (renderedTexts)', () => {
  const text = (content: string): TestNode => ({ type: 'Text', props: {}, children: [content] });
  const row = (...children: TestNode[]): TestNode => ({
    type: 'View',
    props: { style: { flexDirection: 'row' } },
    children,
  });

  it('refuses every drawn claim split at every space into two paragraphs side by side', () => {
    const missed: string[] = [];
    let splits = 0;
    for (const item of items('drawn')) {
      const words = item.split(/\s+/u);
      for (let at = 1; at < words.length; at++) {
        splits += 1;
        const tree = row(text(words.slice(0, at).join(' ')), text(words.slice(at).join(' ')));
        const lines = renderedTexts(tree).filter((t) => t.kind === 'line');
        if (!lines.some((l) => bannedIn(l.text, banned).length > 0))
          missed.push(`${words.slice(0, at).join(' ')} | ${words.slice(at).join(' ')}`);
      }
    }
    expect(splits).toBeGreaterThan(items('drawn').length);
    expect(missed).toStrictEqual([]);
  });

  it('DECOY — the same split in a column is two paragraphs, and neither half alone is the claim', () => {
    // The point of reading lines: "97%" alone and "Match" alone are honest; together they are not.
    // Held apart in this source, as a screen holds them, so the claims lint never reads the claim.
    const figure = '97%';
    const label = 'Match';
    const column: TestNode = { type: 'View', props: {}, children: [text(figure), text(label)] };
    const read = renderedTexts(column);
    expect(read.filter((t) => t.kind === 'line')).toHaveLength(0);
    expect(read.filter((t) => bannedIn(t.text, banned).length > 0)).toHaveLength(0);
    expect(bannedIn(`${figure} ${label}`, banned).length).toBeGreaterThan(0);
  });
});
