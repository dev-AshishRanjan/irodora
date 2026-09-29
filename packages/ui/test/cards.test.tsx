/**
 * Cards, as the mockups draw them (F-233, criterion 1).
 *
 * - **The defaults are the inventories', recomputed**: the `md` corner (the old `lg` the decoy), and
 *   a resting edge on level 1 only, because board 00 draws none on levels 2 and 3.
 * - **The edge sits on the card's outer edge**, one dp of `border`, and only at rest: a chosen or
 *   focused card draws its state edge there instead.
 * - **Media can be inset**, at what the surface draws, with its own corner.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { Text as RNText } from 'react-native';
import { nativeColors, nativeRadius, type Theme } from '@irodora/design-tokens';
import { Card, CARD_EDGE, CARD_RADIUS, SELECTION_EDGE, ThemeProvider } from '../src/index.js';
import { flattenStyle, type TestNode } from '../src/testing/index.js';

const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');
interface Element {
  readonly id: string;
  readonly component: string | null;
  readonly tokens?: Readonly<Record<string, string>>;
}
const cards: readonly Element[] = readdirSync(INVENTORY)
  .filter((f) => /^\d\d\.json$/u.test(f))
  .flatMap(
    (f) =>
      (JSON.parse(readFileSync(join(INVENTORY, f), 'utf8')) as { elements?: readonly Element[] })
        .elements ?? [],
  )
  .filter((e) => e.component === 'ui:Card');

describe('the defaults are the inventories’, recomputed', () => {
  it('CARD_RADIUS is the step most cards are bound to — md, not the lg it replaced', () => {
    const count = (step: string): number =>
      cards.filter((e) => e.tokens?.['radius'] === step).length;
    expect([count('md'), count('sm'), count('lg')]).toStrictEqual([56, 21, 4]);
    expect(CARD_RADIUS).toBe('md');
    expect(CARD_RADIUS).not.toBe('lg');
  });

  it('a filled level-1 card carries the edge; board 00’s levels 2 and 3 carry none', () => {
    const filled = cards.filter((e) => e.tokens?.['bg'] !== undefined);
    const edged = filled.filter((e) => e.tokens?.['border'] === 'border.subtle');
    expect([edged.length, filled.length]).toStrictEqual([73, 80]);
    for (const level of ['level2', 'level3'])
      expect(
        cards.filter((e) => e.tokens?.['bg'] === level && e.tokens['border'] !== undefined),
      ).toHaveLength(0);
  });
});

function draw(node: React.JSX.Element, theme: Theme = 'dark'): TestNode {
  const rendered = render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
  const json = rendered.toJSON() as TestNode;
  rendered.unmount();
  return json;
}

function nodes(tree: TestNode): readonly TestNode[] {
  const out: TestNode[] = [tree];
  for (const child of tree.children ?? []) if (typeof child !== 'string') out.push(...nodes(child));
  return out;
}

/** The resting edge: the absolutely positioned line over the card's outer edge. */
const edgeOf = (tree: TestNode): Record<string, unknown> | undefined =>
  nodes(tree)
    .map((n) => flattenStyle(n.props['style']))
    .find((s) => s['position'] === 'absolute' && s['borderWidth'] === CARD_EDGE);

const body = <RNText>Provenance</RNText>;

describe('the resting edge', () => {
  it.each(['dark', 'light', 'slate.dark', 'obsidian.dark'] as const)(
    '%s: a level-1 card draws one dp of `border` over its outer edge, at its own corner',
    (theme) => {
      expect(edgeOf(draw(<Card>{body}</Card>, theme))).toMatchObject({
        top: -SELECTION_EDGE,
        left: -SELECTION_EDGE,
        right: -SELECTION_EDGE,
        bottom: -SELECTION_EDGE,
        borderColor: nativeColors[theme].border,
        borderRadius: nativeRadius[CARD_RADIUS],
      });
    },
  );

  it('draws none on levels 2 and 3, and none where a surface says so', () => {
    expect(edgeOf(draw(<Card level="2">{body}</Card>))).toBeUndefined();
    expect(edgeOf(draw(<Card level="3">{body}</Card>))).toBeUndefined();
    expect(edgeOf(draw(<Card edge={false}>{body}</Card>))).toBeUndefined();
  });

  it('gives way to the state edge when the card is chosen or focused', () => {
    const press = (): void => undefined;
    for (const state of [{ selected: true }, { focused: true }]) {
      const tree = draw(
        <Card onPress={press} label="Provenance" {...state}>
          {body}
        </Card>,
      );
      expect(edgeOf(tree)).toBeUndefined();
    }
    // DECOY: the same pressable card at rest does carry it.
    expect(
      edgeOf(
        draw(
          <Card onPress={press} label="Provenance">
            {body}
          </Card>,
        ),
      ),
    ).toBeDefined();
  });
});

describe('media', () => {
  const photo = <RNText>photo</RNText>;

  it('is edge to edge by default', () => {
    const tree = draw(<Card media={photo}>{body}</Card>);
    const insets = nodes(tree)
      .map((n) => flattenStyle(n.props['style']))
      .filter((s) => s['paddingTop'] !== undefined);
    expect(insets).toHaveLength(0);
  });

  it('sits inside the card at the inset the surface draws, with its own corner (11: 7.25, sm)', () => {
    const tree = draw(
      <Card media={photo} mediaInset={7.25} mediaRadius="sm">
        {body}
      </Card>,
    );
    const styles = nodes(tree).map((n) => flattenStyle(n.props['style']));
    expect(styles).toContainEqual({ paddingTop: 7.25, paddingLeft: 7.25, paddingRight: 7.25 });
    expect(styles).toContainEqual({ borderRadius: nativeRadius.sm, overflow: 'hidden' });
  });
});
