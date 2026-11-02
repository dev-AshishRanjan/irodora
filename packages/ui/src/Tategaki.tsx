/**
 * Japanese set top to bottom — 縦書き — one upright character a line (F-251, `16`'s tray).
 *
 * ## Why a component
 *
 * React Native has no vertical writing mode. `16` sets each tray tile's kanji down the tile, and a
 * screen that stacked its own `Text` nodes would announce a name as one character at a time — 銀,
 * then 鼠 — which is not a name. This is one accessible node holding the whole string, read as
 * written; the characters under it are the drawing.
 *
 * ## The advance is the em
 *
 * In vertical setting a character advances by its em, not by a horizontal line's height: the
 * leading a line of Japanese takes sits between COLUMNS, not between the characters of one. So each
 * character's cell is the step's em, at the person's text size (Dynamic Type, to the 200 % every
 * `Text` allows), and the glyph is centred in it. `16`'s two-character names fill about 29.5 dp of a
 * tile at the `label` step's 14 dp em — 1.05 em each, read off the image.
 *
 * ## What it does not set
 *
 * Upright is right for kanji and kana. It is wrong for the characters whose VERTICAL form differs:
 * the long-vowel mark ー and the wave dash 〜 turn, brackets turn, 、 and 。 move to the upper right,
 * and small kana move too. No corpus name holds one (F-251's census); {@link tategakiReady} says
 * whether a string is safe, so a test over the corpus fails the day one arrives rather than a tile
 * drawing it wrong.
 *
 * ## The ink
 *
 * It sits on a colour sample, so its ink is `Text on`'s — C8's, whichever of the two clears 4.5:1
 * against that sample (ADR-0116) — never a token, which a mid-tone would swallow.
 */

import { useWindowDimensions, View } from 'react-native';
import { nativeType } from '@irodora/design-tokens';
import type { Sample } from './inkOnSample.js';
import { Text } from './Text.js';

/**
 * The characters whose vertical form is not the horizontal one turned upright: the prolonged sound
 * mark, dashes and tildes, brackets, the comma and full stop, the ellipsis, and the small kana.
 */
const TURNS_OR_MOVES =
  /[ー〜～—―‐…‥、。，．「」『』（）()［］【】〈〉《》〔〕｛｝ぁぃぅぇぉっゃゅょゎゕゖァィゥェォッャュョヮヵヶ]/u;

/**
 * The characters a name is set as, one a line: each base character with the marks that belong to it —
 * a combining voiced mark (か + ゙) or an ideographic variation selector stays with its kanji, where
 * splitting by code point would set the mark alone on a line of its own.
 */
export function tategakiCharacters(text: string): readonly string[] {
  return text.match(/\P{M}\p{M}*/gu) ?? [];
}

/** Whether every character of `text` is set upright in vertical writing, as this component sets it. */
export function tategakiReady(text: string): boolean {
  return !TURNS_OR_MOVES.test(text);
}

export interface TategakiProps {
  /** The words, as they are read: a name, in kanji or kana. */
  readonly text: string;
  /** The sample it is set on. Its ink is the one C8 chooses for that sample. */
  readonly on: Sample;
  /** The step: `label` by default, as `16`'s tray sets its names. */
  readonly size?: 'label' | 'caption';
  readonly testID?: string;
}

/** The largest text size `Text` scales to (A7: 200 %). */
const MAX_SCALE = 2;

export function Tategaki({ text, on, size = 'label', testID }: TategakiProps): React.JSX.Element {
  const { fontScale } = useWindowDimensions();
  const advance = nativeType.japanese[size].fontSize * Math.min(fontScale, MAX_SCALE);
  return (
    <View
      // ONE node, the whole string, read as written. The characters are its drawing.
      accessible
      accessibilityRole="text"
      accessibilityLabel={text}
      {...(testID === undefined ? {} : { testID })}
      style={{ alignItems: 'center' }}
    >
      {tategakiCharacters(text).map((character, index) => (
        <View
          key={String(index)}
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={{ height: advance, justifyContent: 'center', overflow: 'visible' }}
        >
          <Text size={size} on={on} script="japanese">
            {character}
          </Text>
        </View>
      ))}
    </View>
  );
}
