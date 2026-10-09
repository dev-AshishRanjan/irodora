/**
 * The nothing the states replace (F-236, ADR-0129 §4): a panel drawn with nothing in it, and a zero
 * standing for "nothing". Each rule is shown to fire on its planted case and to stay quiet on the
 * decoy beside it — a rule that only ever passes is not evidence of anything.
 */

import { Text as NativeText, View } from 'react-native';
import { render } from '@testing-library/react-native';
import { fromSpace } from '@irodora/color-core';
import { nativeColors, type Theme } from '@irodora/design-tokens';
import { Card, Surface, Swatch, Text, ThemeProvider } from '../src/index.js';
import {
  bareZeros,
  blankPanels,
  checkSubject,
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

const SAMPLE = fromSpace('oklch', [0.42, 0.09, 264], { source: 'declared', confidence: 1 });

describe('a blank panel', () => {
  it('is an empty card, at every level, in both themes', () => {
    for (const theme of ['light', 'dark'] as const)
      for (const level of ['1', '2', '3'] as const) {
        const found = blankPanels(draw(<Card level={level} />, theme), theme);
        expect(found.map((p) => p.token)).toStrictEqual([`surface.${level}`]);
      }
  });

  it('is an empty surface, and a card whose only content is another empty box', () => {
    expect(blankPanels(draw(<Surface level="1" padding="md" />), 'light')).toHaveLength(1);
    // The OUTERMOST is reported once: everything inside a blank panel is blank too.
    const nested = draw(
      <Card level="1">
        <View style={{ padding: 8 }} />
      </Card>,
    );
    expect(blankPanels(nested, 'light')).toHaveLength(1);
  });

  it('DECOY — a card with text, a surface holding a named sample, are not blank', () => {
    const withText = draw(
      <Card level="2">
        <Text size="body" color="foreground">
          Ai-nezumi
        </Text>
      </Card>,
    );
    expect(blankPanels(withText, 'light')).toStrictEqual([]);
    const withSample = draw(
      <Surface level="1" padding="md">
        <Swatch name="Ai-nezumi" hex="#526A6B" color={SAMPLE} />
      </Surface>,
    );
    expect(blankPanels(withSample, 'light')).toStrictEqual([]);
  });

  it('DECOY — a mark drawn at a set size or laid over something is not a panel', () => {
    const ground = (token: 'surface.1' | 'surface.3'): string => nativeColors.light[token];
    // A hairline rule and a track: painted to be seen as themselves, holding nothing by design.
    const rule = draw(
      <Card level="1">
        <Text size="body" color="foreground">
          Held
        </Text>
        <View style={{ height: 1, backgroundColor: ground('surface.3') }} />
      </Card>,
    );
    expect(blankPanels(rule, 'light')).toStrictEqual([]);
    const track = draw(<View style={{ height: 4, backgroundColor: ground('surface.3') }} />);
    expect(blankPanels(track, 'light')).toStrictEqual([]);
    const knob = draw(<View style={{ width: 20, backgroundColor: ground('surface.1') }} />);
    expect(blankPanels(knob, 'light')).toStrictEqual([]);
    // A frame laid over a sample.
    const frame = draw(
      <View
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: ground('surface.1'),
        }}
      />,
    );
    expect(blankPanels(frame, 'light')).toStrictEqual([]);
    // And the same box in flow, sized by what it holds, IS a panel: the exclusion is the size.
    const panel = draw(<View style={{ padding: 8, backgroundColor: ground('surface.1') }} />);
    expect(blankPanels(panel, 'light')).toHaveLength(1);
  });

  it('DECOY — a declared sample that shares a surface’s value is a colour, not a ground', () => {
    // Found on Combinations: a corpus colour whose hex equals a theme's surface.1, drawn as a sample.
    const hex = nativeColors.light['surface.1'];
    const sample = draw(
      <Card level="2">
        <View style={{ padding: 8, backgroundColor: hex }} />
      </Card>,
    );
    expect(blankPanels(sample, 'light', [hex])).toStrictEqual([]);
    // Undeclared, the same box is a panel with nothing in it.
    expect(blankPanels(sample, 'light')).toHaveLength(1);
  });

  it('reports through checkSubject as `blank-panel`, and not for a filled card', () => {
    const subject = (filled: boolean): ConformanceSubject => ({
      name: filled ? 'filled card' : 'empty card',
      kind: 'static',
      render: (_state, theme) =>
        draw(
          <Card level="1">
            {filled ? (
              <Text size="body" color="foreground">
                Ai-nezumi
              </Text>
            ) : undefined}
          </Card>,
          theme,
        ),
    });
    const rules = (s: ConformanceSubject): string[] =>
      checkSubject(s, ['light', 'dark']).map((f) => f.rule);
    expect(rules(subject(false))).toContain('blank-panel');
    expect(rules(subject(true))).not.toContain('blank-panel');
  });
});

describe('a bare zero', () => {
  const line = (...parts: string[]): TestNode =>
    draw(
      <View>
        <Text size="body" color="foreground">
          {parts.length === 1 ? parts[0] : parts.map((p) => <NativeText key={p}>{p}</NativeText>)}
        </Text>
      </View>,
    );

  it('is a zero standing for nothing: alone, a percentage, a count, a counter', () => {
    for (const text of ['0', '0%', '0 pieces', '0件', '０着'])
      expect({ [text]: bareZeros(line(text)) }).toStrictEqual({ [text]: [text] });
  });

  it('is judged as the paragraph a person reads, across nested text', () => {
    expect(bareZeros(line('0', ' pieces'))).toStrictEqual(['0 pieces']);
  });

  it('DECOY — a zero inside a reading, and a count that is not zero, pass', () => {
    for (const text of ['Showing 0 / 120', '#20232A', '0.00', '0.42', '10 pieces', 'ΔE00 0'])
      expect({ [text]: bareZeros(line(text)) }).toStrictEqual({ [text]: [] });
  });

  it('reports through checkSubject only where the subject declares its states', () => {
    const subject = (shows?: readonly []): ConformanceSubject => ({
      name: 'a count of nothing',
      kind: 'static',
      ...(shows === undefined ? {} : { shows }),
      render: (_state, theme) =>
        draw(
          <Card level="1">
            <Text size="body" color="foreground">
              0 pieces
            </Text>
          </Card>,
          theme,
        ),
    });
    const rules = (s: ConformanceSubject): string[] =>
      checkSubject(s, ['light', 'dark']).map((f) => f.rule);
    expect(rules(subject([]))).toContain('bare-zero');
    expect(rules(subject())).not.toContain('bare-zero');
  });
});
