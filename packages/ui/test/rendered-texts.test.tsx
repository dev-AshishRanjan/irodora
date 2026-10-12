/**
 * The text a person reads, as the claims sweep reads it (F-221, ADR-0134 D3), and what an element
 * must do to count as drawn (D1).
 *
 * A claim is composed on the screen: a figure and its label sit in two `Text`s, side by side. Each
 * case below plants the shape and its decoy: a reader that joined everything would flag honest
 * columns; one that joined nothing would let the drawn claims through.
 */

import { Text as NativeText, View } from 'react-native';
import { render } from '@testing-library/react-native';
import Svg, { Circle } from 'react-native-svg';
import { type Theme } from '@irodora/design-tokens';
import { ThemeProvider } from '../src/index.js';
import {
  checkSubject,
  drawsSomething,
  renderedTexts,
  type ConformanceSubject,
  type TestNode,
} from '../src/testing/index.js';

function draw(node: React.JSX.Element, theme: Theme = 'light'): TestNode {
  const rendered = render(<ThemeProvider theme={theme}>{node}</ThemeProvider>);
  const json = rendered.toJSON();
  rendered.unmount();
  if (json === null) throw new Error('rendered nothing');
  return Array.isArray(json) ? { type: 'Root', props: {}, children: json } : json;
}

const of = (tree: TestNode, kind: 'paragraph' | 'line' | 'name'): string[] =>
  renderedTexts(tree)
    .filter((t) => t.kind === kind)
    .map((t) => t.text);

/*
 * The claim these cases plant, held apart as a screen holds it: a figure and a word. Written whole
 * on one source line, the claims lint would read it here, where it is the decoy, not the product.
 */
const FIGURE = '97%';
const LABEL = 'Match';
const CLAIM = [FIGURE, LABEL].join(' ');

describe('renderedTexts', () => {
  it('joins a figure and its label set side by side in a row into one line', () => {
    const tree = draw(
      <View style={{ flexDirection: 'row' }}>
        <NativeText>{FIGURE}</NativeText>
        <NativeText>{LABEL}</NativeText>
      </View>,
    );
    expect(of(tree, 'line')).toStrictEqual([CLAIM]);
    expect(of(tree, 'paragraph')).toStrictEqual([FIGURE, LABEL]);
  });

  it('DECOY — the same two paragraphs in a column are two lines, never one', () => {
    const tree = draw(
      <View>
        <NativeText>{FIGURE}</NativeText>
        <NativeText>{LABEL}</NativeText>
      </View>,
    );
    expect(of(tree, 'line')).toHaveLength(0);
  });

  it('reads a row-reverse in the order a person sees it', () => {
    const tree = draw(
      <View style={{ flexDirection: 'row-reverse' }}>
        <NativeText>{LABEL}</NativeText>
        <NativeText>{FIGURE}</NativeText>
      </View>,
    );
    expect(of(tree, 'line')).toStrictEqual([CLAIM]);
  });

  it('reads through the boxes each side is wrapped in', () => {
    const tree = draw(
      <View style={{ flexDirection: 'row' }}>
        <View>
          <NativeText>{FIGURE}</NativeText>
        </View>
        <View>
          <Svg width={8} height={8}>
            <Circle cx={4} cy={4} r={4} fill="#000000" />
          </Svg>
        </View>
        <View>
          <NativeText>{LABEL}</NativeText>
        </View>
      </View>,
    );
    // The dot between them holds no paragraph, so it neither joins nor breaks the line.
    expect(of(tree, 'line')).toStrictEqual([CLAIM]);
  });

  it('DECOY — a column inside a row ends the run, so a title is never read into its subtitle', () => {
    const tree = draw(
      <View style={{ flexDirection: 'row' }}>
        <NativeText>Ai</NativeText>
        <View>
          <NativeText>Indigo</NativeText>
          <NativeText>Cool, deep</NativeText>
        </View>
        <NativeText>{FIGURE}</NativeText>
      </View>,
    );
    expect(of(tree, 'line')).toHaveLength(0);
  });

  it('reads nested text as the one paragraph React Native sets it as', () => {
    const tree = draw(
      <NativeText>
        {'97'}
        <NativeText>{`% ${LABEL}`}</NativeText>
      </NativeText>,
    );
    expect(of(tree, 'paragraph')).toStrictEqual([CLAIM]);
  });

  it('reads accessible names, hints and values, which a screen reader speaks', () => {
    const tree = draw(
      <View
        accessible
        accessibilityLabel="Similarity"
        accessibilityHint="Opens the comparison"
        accessibilityValue={{ text: CLAIM }}
      />,
    );
    expect(of(tree, 'name')).toStrictEqual(['Similarity', 'Opens the comparison', CLAIM]);
  });
});

describe('drawsSomething', () => {
  it('counts text, a name, and paint', () => {
    expect(drawsSomething(draw(<NativeText>Ai</NativeText>))).toBe(true);
    expect(drawsSomething(draw(<View accessible accessibilityLabel="Ai" />))).toBe(true);
    expect(drawsSomething(draw(<View style={{ backgroundColor: '#2B4B7E', height: 8 }} />))).toBe(
      true,
    );
    expect(
      drawsSomething(
        draw(
          <Svg width={8} height={8}>
            <Circle cx={4} cy={4} r={4} fill="#000000" />
          </Svg>,
        ),
      ),
    ).toBe(true);
  });

  it('DECOY — an empty View with an id is not drawn, whatever it claims to be', () => {
    expect(drawsSomething(draw(<View testID="launch.glow" />))).toBe(false);
    expect(
      drawsSomething(draw(<View testID="x" style={{ backgroundColor: 'transparent' }} />)),
    ).toBe(false);
  });
});

describe('the observe hook', () => {
  it('sees every tree the check renders, once each, and changes no finding', () => {
    const subject: ConformanceSubject = {
      name: 'a label',
      kind: 'static',
      render: (_state, theme) => draw(<NativeText>Ai</NativeText>, theme),
    };
    const seen: string[] = [];
    const without = checkSubject(subject, ['light', 'dark']);
    const withHook = checkSubject(subject, ['light', 'dark'], (s, state, theme, tree) => {
      seen.push(`${s.name}/${state}/${theme}/${String(of(tree, 'paragraph'))}`);
    });
    expect(seen).toStrictEqual(['a label/default/light/Ai', 'a label/default/dark/Ai']);
    expect(withHook).toStrictEqual(without);
  });
});
