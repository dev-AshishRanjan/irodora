/**
 * `Tategaki` (F-251): `16`'s tray sets each tile's kanji top to bottom, one upright character a
 * line, on the colour sample, in the ink that sample takes.
 *
 * Held here: one node per character, in reading order; ONE accessible node holding the whole
 * string, so a name is heard as a name; each character advancing by its em; the ink `Text on`
 * chooses for the sample; and `tategakiReady` refusing what an upright setting would draw wrong.
 */

import { render, screen } from '@testing-library/react-native';
import { Dimensions, Text as RNText, View } from 'react-native';
import { fromSpace } from '@irodora/color-core';
import { nativeColors, nativeType } from '@irodora/design-tokens';
import {
  sampleInk,
  Tategaki,
  tategakiCharacters,
  tategakiReady,
  ThemeProvider,
} from '../src/index.js';
import { flattenStyle } from '../src/testing/index.js';

const COLOR = fromSpace('oklch', [0.42, 0.09, 264], { source: 'declared', confidence: 1 });

const draw = (text: string, hex: string) =>
  render(
    <ThemeProvider theme="dark">
      <Tategaki text={text} on={{ hex, color: COLOR }} testID="t" />
    </ThemeProvider>,
  );

const texts = (): readonly RNText[] =>
  screen.UNSAFE_getAllByType(RNText) as unknown as readonly RNText[];

describe('the setting', () => {
  it('sets one character a line, in reading order', () => {
    draw('銀鼠', '#8A929A');
    const characters = texts().map((t) => (t.props as { children?: unknown }).children);
    expect(characters).toStrictEqual(['銀', '鼠']);
  });

  it('advances each character by its em, not by a horizontal line’s height', () => {
    draw('銀鼠', '#8A929A');
    const cells = screen
      .UNSAFE_getAllByType(View)
      .map((v) => flattenStyle((v.props as { style?: unknown }).style))
      .filter((s) => s['justifyContent'] === 'center' && s['height'] !== undefined);
    // At the person's text size: React Native's test window reports a font scale of 2, the most
    // `Text` allows (A7), so the em is read through it here as the component reads it.
    const { fontScale } = Dimensions.get('window');
    const em = nativeType.japanese.label.fontSize * Math.min(fontScale, 2);
    expect(cells.map((c) => c['height'])).toStrictEqual([em, em]);
    // DECOY: the em is not the line height, which would stack two characters 49 dp tall.
    expect(nativeType.japanese.label.lineHeight).toBeGreaterThan(
      nativeType.japanese.label.fontSize,
    );
  });

  it('splits by code point, so a character outside the BMP stays one character', () => {
    draw('𠮷野', '#8A929A');
    expect(texts()).toHaveLength(2);
  });
});

describe('tategakiCharacters', () => {
  it('keeps a mark with the character it belongs to', () => {
    // か followed by the combining voiced mark: one character a person reads, two code points.
    expect(tategakiCharacters('\u304B\u3099\u304D')).toStrictEqual(['\u304B\u3099', '\u304D']);
    // 葛 with an ideographic variation selector (VS17).
    expect(tategakiCharacters('\u845B\u{E0100}\u57CE')).toStrictEqual([
      '\u845B\u{E0100}',
      '\u57CE',
    ]);
  });

  it('DECOY — splitting by code point would set the mark alone', () => {
    expect(Array.from('\u304B\u3099\u304D')).toHaveLength(3);
  });
});

describe('what a screen reader hears', () => {
  it('is one node holding the whole string, its characters hidden beneath it', () => {
    draw('銀鼠', '#8A929A');
    const node = screen.getByTestId('t');
    expect(node.props['accessible']).toBe(true);
    expect(node.props['accessibilityLabel']).toBe('銀鼠');
    expect(screen.getByLabelText('銀鼠')).toBeTruthy();
    const hidden = screen
      .UNSAFE_getAllByType(View)
      .filter((v) => (v.props as Record<string, unknown>)['accessibilityElementsHidden'] === true);
    expect(hidden).toHaveLength(2);
  });
});

describe('the ink', () => {
  it('is the one the sample takes for text, on a light and on a dark sample', () => {
    for (const hex of ['#E8E5DF', '#1E2224']) {
      const { unmount } = draw('白練', hex);
      const expected = sampleInk(hex, nativeColors.dark).hex;
      for (const t of texts())
        expect(flattenStyle((t.props as { style?: unknown }).style)['color']).toBe(expected);
      unmount();
    }
    // DECOY: the two samples take different inks, so a fixed token could not pass both.
    expect(sampleInk('#E8E5DF', nativeColors.dark).hex).not.toBe(
      sampleInk('#1E2224', nativeColors.dark).hex,
    );
  });
});

describe('tategakiReady', () => {
  it('passes kanji and full-size kana, which stand upright', () => {
    for (const name of ['銀鼠', '朽葉', '藍鼠', 'あさぎ', 'ハナダ'])
      expect(tategakiReady(name)).toBe(true);
  });

  it('refuses what turns or moves when set vertically', () => {
    for (const name of ['ルージュー', '〜', '「紅」', '紅、', 'しょう', 'キャラ', '…'])
      expect(tategakiReady(name)).toBe(false);
  });
});
