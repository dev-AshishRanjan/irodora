/**
 * The texture badge — `01`'s woven mark in the corner of a garment tile (F-242, ADR-0137).
 *
 * `01` draws the same small checker at the bottom-right of each of its five wardrobe tiles
 * (`01.wardrobe.tile-N.badge`), and `25` calls it a *woven texture badge*. ADR-0137 gives it its
 * meaning: **the garment's material is recorded**. The caller decides whether one is; this draws
 * the mark, and nothing else.
 *
 * ## Drawn as `01` draws it
 *
 * - **One ink over the sample.** The cells are light on `01`'s dark tiles and dark on its cream one;
 *   the cells between them are the tile's own colour. The ink is the one text on that sample takes
 *   (`sampleInk`, ADR-0116), so it clears 4.5:1 against the sample — above the 3:1 WCAG 2.2
 *   SC 1.4.11 asks of a graphic — on every sample, in every palette.
 * - **A checker of {@link TEXTURE_BADGE_CELLS} cells a side**, at {@link TEXTURE_BADGE} dp, both read
 *   off `01` and recomputed by `texture-badge.test` from its inventory.
 * - **Its corner is `sm`, bounded** as a sample's is (ADR-0103): `min(sm, floor(side / 4))`.
 *
 * ## It says nothing to a screen reader, on purpose
 *
 * Its meaning is in words: the tile carrying it names the material in its own accessible name. A
 * mark announced as well would say the same thing twice, and a mark announced *instead* would say
 * less. So it is hidden, as `Illustration` is, and it takes no touch: the tile under it is the target.
 */

import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { nativeRadius } from '@irodora/design-tokens';
import type { Sample } from './inkOnSample.js';
import { sampleInk } from './sampleInk.js';
import { useTheme } from './theme.js';

/** The badge's side in dp: the median of the ten sides of `01`'s five badge boxes. */
export const TEXTURE_BADGE = 14;

/** Cells a side: `01`'s `raw.cells`, read off the five 28 px crops at about 2 px a cell. */
export const TEXTURE_BADGE_CELLS = 12;

export interface TextureBadgeProps {
  /** The sample the badge is drawn on — the tile's own colour, with its provenance (ADR-0005). */
  readonly on: Sample;
  /** The side in dp. Defaults to {@link TEXTURE_BADGE}. */
  readonly size?: number;
  readonly testID?: string;
}

/**
 * The inked half of a checker of `cells` a side over a square of side `size`, as one SVG path: the
 * cells whose row and column add to an even number, the top-left one inked. One path rather than a
 * rect per cell, because a tile row draws five of these.
 */
export function checkerPath(size: number, cells: number = TEXTURE_BADGE_CELLS): string {
  const cell = size / cells;
  const fixed = (v: number): string => String(Math.round(v * 1000) / 1000);
  const runs: string[] = [];
  for (let row = 0; row < cells; row += 1)
    for (let col = row % 2; col < cells; col += 2) {
      const x = fixed(col * cell);
      const y = fixed(row * cell);
      const side = fixed(cell);
      runs.push(`M${x} ${y}h${side}v${side}h-${side}Z`);
    }
  return runs.join('');
}

/** The badge's corner: `sm`, never more than a quarter of its side (ADR-0103's bound). */
export function textureBadgeCorner(size: number): number {
  return Math.min(nativeRadius.sm, Math.floor(size / 4));
}

export function TextureBadge({
  on,
  size = TEXTURE_BADGE,
  testID,
}: TextureBadgeProps): React.JSX.Element {
  const { source, paint } = useTheme();
  // SOLVED ON THE DECLARED PALETTE, THEN PAINTED (F-240, ADR-0131 §3), as the sample's own ink is.
  const ink = sampleInk(on.hex, source);
  return (
    <View
      testID={testID}
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={{
        width: size,
        height: size,
        borderRadius: textureBadgeCorner(size),
        overflow: 'hidden',
      }}
    >
      {/* `fill="none"` on the root: react-native-svg injects `#000000` there otherwise (Glyph). */}
      <Svg width={size} height={size} fill="none" accessible={false}>
        <Path d={checkerPath(size)} fill={paint(ink.hex)} />
      </Svg>
    </View>
  );
}
