/**
 * A name in both scripts on one line — `English • 日本語` (F-234's app bar; F-235's ranked rows).
 *
 * The mockups set a bilingual name as ONE run of text with the Japanese after a bullet: 02 05 08 09
 * 11 12 13 title their screens that way, and 19 names each harmony row the same. It is one node, so a
 * screen reader reads one name, and the Japanese run is set in the Japanese face (`script`), so it
 * never falls back to a Latin font's missing glyphs.
 */

import { Text, type ColorFor, type TextWeight, type TypeSize } from './Text.js';
import type { Script } from './layout.js';

/** Between the two scripts: a bullet with a space either side, as every bilingual line draws it. */
export const BILINGUAL_SEPARATOR = ' • ';

export interface BilingualProps<S extends TypeSize> {
  readonly text: string;
  /** The Japanese, after the separator. Absent, the line is the text alone. */
  readonly ja?: string;
  readonly size: S;
  readonly color: ColorFor<S>;
  readonly weight?: TextWeight;
  /** The script the first run is written in. */
  readonly script?: Script;
  /** Announce it as a heading (an app bar's title). */
  readonly heading?: boolean;
  readonly numberOfLines?: number;
  readonly testID?: string;
}

export function Bilingual<S extends TypeSize>({
  text,
  ja,
  size,
  color,
  weight,
  script = 'latin',
  heading = false,
  numberOfLines,
  testID,
}: BilingualProps<S>): React.JSX.Element {
  const shared = weight === undefined ? {} : { weight };
  return (
    <Text
      size={size}
      color={color}
      script={script}
      heading={heading}
      {...shared}
      {...(numberOfLines === undefined ? {} : { numberOfLines })}
      {...(testID === undefined ? {} : { testID })}
    >
      {text}
      {ja === undefined ? null : (
        <Text size={size} color={color} script="japanese" {...shared}>
          {`${BILINGUAL_SEPARATOR}${ja}`}
        </Text>
      )}
    </Text>
  );
}
