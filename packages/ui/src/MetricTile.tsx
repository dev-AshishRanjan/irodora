/**
 * The metric tile — a count, what it counts, and the basis it was counted on (F-235, criterion 2;
 * mockup 22).
 *
 * `22` draws four tiles in a two-column grid, each a level-1 card with its edge and `md` corner,
 * centred: the count (`title` 600, tabular), what it counts (`body` 500) and a basis line (`label`,
 * `foreground.2`). Every number is `22`'s, recomputed by `rows.test`.
 *
 * - **The count and its noun are one figure.** The tile takes a `value` and builds the count from it
 *   and its label, so what is printed and what is said cannot drift: *+14 Outfits Unlocked*.
 * - **One accessible element**: the count with its noun, then the basis.
 * - **The figure's step is the recorded `title`** (R9 §2's snap). `22` draws it at 45–47 dp, which is
 *   OQ-13's; its answer changes this step, not the tile's shape.
 * - **The grid's spacing is the screen's** (F-258): a tile is as wide as its column.
 */

import { View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import { Card, CARD_EDGE } from './Card.js';
import { figureName, figureText, type CountFigure } from './figures.js';
import type { Script } from './layout.js';
import { Text } from './Text.js';

/** A tile's drawn height, in dp: the median of 22's four. */
export const METRIC_TILE_HEIGHT = 112.5;
/** The least space between a tile's edge and its widest line, in dp: 22's *Gaps Addressed*. */
export const METRIC_TILE_INSET = 9.5;

export interface MetricTileProps {
  /** The count. */
  readonly value: number;
  /** Print its sign: `+14`, a change rather than a total. */
  readonly signed?: boolean;
  /** What it counts: `Outfits Unlocked`. The figure's noun as well as its label. */
  readonly label: string;
  /** What it was counted on: `New combination possibilities`. */
  readonly detail: string;
  readonly script?: Script;
  readonly testID?: string;
}

export function MetricTile({
  value,
  signed = false,
  label,
  detail,
  script = 'latin',
  testID,
}: MetricTileProps): React.JSX.Element {
  const count: CountFigure = { kind: 'count', value, signed, noun: label };
  // The card pads by a step; the rest of 22's inset, and its height, are made up inside it.
  const pad = nativeSpacing.sm;
  return (
    <Card level="1" padding="sm" {...(testID === undefined ? {} : { testID })}>
      <View
        accessible
        accessibilityRole="text"
        accessibilityLabel={`${figureName(count)}, ${detail}`}
        style={{
          minHeight: METRIC_TILE_HEIGHT - 2 * (pad + CARD_EDGE),
          paddingHorizontal: METRIC_TILE_INSET - pad,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text size="title" weight={600} color="foreground" numeric selectable>
          {figureText(count)}
        </Text>
        <Text size="body" weight={500} color="foreground" script={script} align="center">
          {label}
        </Text>
        <Text size="label" color="foreground.2" script={script} align="center" numeric>
          {detail}
        </Text>
      </View>
    </Card>
  );
}
