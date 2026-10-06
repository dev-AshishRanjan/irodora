/**
 * Factor rows — the parts of a score, each with its icon, its share and the reason for it (F-235,
 * criterion 2; mockup 13).
 *
 * `13` draws five rows between 1 dp rules: an icon, the factor's name (`label`), its score
 * (`label` 500, tabular) and the reason in brackets (`label`, `foreground.2`), in columns that start
 * at fixed fractions of the row. Every number is `13`'s, recomputed by `rows.test`.
 *
 * - **The score and its name are one figure**: a row takes a `score` from 0 to 1 and prints the share
 *   of its label, so the name said and the name printed cannot drift.
 * - **The reason is the caller's words** (FR-11): `ComponentScore.messageKey`, rendered. The direction
 *   of a factor is said in words, never by the icon or a colour. `ui` takes no dependency on the
 *   recommendation engine.
 * - **The icon is decorative**: the name says what it says. `score-harmony` draws its three colours
 *   (ADR-0110); the others take `foreground.2`, as `13` draws them (#A7ABB1).
 * - **One accessible element per row**: the share with its name, then the reason.
 */

import { View } from 'react-native';
import { figureName, figureText, type ShareFigure } from './figures.js';
import { Glyph, glyphSpectrum } from './Glyph.js';
import type { Script } from './layout.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

/** A row's pitch, rule to rule, in dp: the median of 13's four. */
export const FACTOR_ROW = 26.5;
/** A rule's width, in dp. */
export const FACTOR_RULE = 1;
/** The icon's box, in dp: the median of 13's five glyphs' larger side. */
export const FACTOR_ICON = 14;
/** From the row's start to the icon's box, in dp. */
export const FACTOR_ICON_INSET = 3.5;
/** Where the name, the score and the reason begin, as fractions of the row's width. */
export const FACTOR_COLUMNS = { label: 0.073, value: 0.458, note: 0.553 } as const;

export type FactorIcon =
  'score-harmony' | 'score-fit' | 'score-contrast' | 'score-balance' | 'score-cvd';

export interface FactorRow {
  readonly key: string;
  readonly icon: FactorIcon;
  /** The factor: `Colour Harmony`. */
  readonly label: string;
  /** Its score, 0 to 1, printed as a whole percent. */
  readonly score: number;
  /** Why, in words: the caller's rendering of the factor's message (FR-11). */
  readonly note: string;
}

export interface FactorRowsProps {
  readonly rows: readonly FactorRow[];
  readonly script?: Script;
  readonly testID?: string;
}

const percent = (fraction: number): `${number}%` =>
  `${String(Math.round(fraction * 1000) / 10)}%` as `${number}%`;

export function FactorRows({ rows, script = 'latin', testID }: FactorRowsProps): React.JSX.Element {
  const { colors } = useTheme();
  const [open, close] = script === 'japanese' ? ['（', '）'] : ['(', ')'];
  return (
    <View {...(testID === undefined ? {} : { testID })}>
      {rows.map((row, i) => {
        const share: ShareFigure = { kind: 'share', fraction: row.score, of: row.label };
        return (
          <View
            key={row.key}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${figureName(share)}, ${row.note}`}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              // The pitch counts the rule above a row; the first row has none.
              minHeight: FACTOR_ROW - (i === 0 ? FACTOR_RULE : 0),
              borderTopWidth: i === 0 ? 0 : FACTOR_RULE,
              borderTopColor: colors.border,
            }}
          >
            <View style={{ width: percent(FACTOR_COLUMNS.label), paddingLeft: FACTOR_ICON_INSET }}>
              <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
                <Glyph
                  name={row.icon}
                  size={FACTOR_ICON}
                  color={colors['foreground.2']}
                  spectrum={glyphSpectrum(row.icon, colors)}
                />
              </View>
            </View>
            <View style={{ width: percent(FACTOR_COLUMNS.value - FACTOR_COLUMNS.label) }}>
              <Text size="label" color="foreground" script={script}>
                {row.label}
              </Text>
            </View>
            <View style={{ width: percent(FACTOR_COLUMNS.note - FACTOR_COLUMNS.value) }}>
              <Text size="label" weight={500} color="foreground" numeric selectable>
                {figureText(share)}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text size="label" color="foreground.2" script={script} numeric>
                {`${open}${row.note}${close}`}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
