/**
 * Delta rows — how far a reading sits from its target on each axis, as a signed bar from a centre axis
 * and a signed figure with its reading (F-235, criterion 1; mockup 04; ADR-0119).
 *
 * ## What 04 draws, and what ADR-0119 decides (closing OQ-50 and OQ-51)
 *
 * - **A label column, a bar region with the axis at the card's centre, and a right-aligned figure
 *   with its reading in brackets**, one row per axis. The geometry is 04's, held as fractions of the
 *   rows' width ({@link DELTA_LABEL_END}, {@link DELTA_AXIS}) and recomputed by `delta.test`.
 * - **The row prints what 04 prints** (OQ-51): the label, the figure, the reading. The quantity and
 *   the space it was computed in are in the row's accessible name, from its figure. FR-61's
 *   "named beside it" governs the professional surfaces, where `08` prints the notation; `04` is the
 *   Lens verdict, and its headline names the metric.
 * - **One ink for every bar**: the one 04 draws for the hue bar, `text.tertiary` on a card
 *   (`foreground.3.card`, ΔE00 4.7 from the drawn #89939D). The lightness bar's slate is 2.72:1 on the
 *   card, under the 3:1 a graphic needs (WCAG 1.4.11, E3); the chroma bar's green is the verdict
 *   colour, a per-axis pass that no figure or word states and the engine does not compute (E2,
 *   golden rule 13). The sign is the side, the size is the length, and the words carry the reading.
 * - **One unit for every row and both sides** (OQ-50): the smaller of the room left of the axis and
 *   the room right of it before the widest figure, so equal magnitudes draw equal lengths and no bar
 *   is clamped below `scale`. A magnitude past `scale` draws a full unit, and the figure always
 *   carries the exact value. `magnitude` and `scale` are the caller's, in one unit across the rows
 *   (F-245: each axis's weighted CIEDE2000 term, against the tolerance).
 * - **The side is the printed figure's sign** (F-235's review): the weighted term can differ in sign
 *   from the raw delta printed beside it (ΔC′ is computed from a stretched a′), so the bar takes only
 *   its length from `magnitude` and never sits on the side the figure contradicts.
 * - **The row says what the bar draws**: after the figure and the reading, the share of `scale` the
 *   bar's length stands for, in the caller's words (`scaleName`), past 100 % where it is.
 */

import { useState } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { figureName, figureText, type MeasureFigure } from './figures.js';
import type { Script } from './layout.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

/** Where the bar region begins, as a fraction of the rows' width: the end of 04's widest label. */
export const DELTA_LABEL_END = 0.167;
/** Where the axis's centre sits, as a fraction of the rows' width: 04's card centre. */
export const DELTA_AXIS = 0.501;
/** The axis's width, in dp. */
export const DELTA_AXIS_WIDTH = 1.5;
/** A row's height, in dp: 04's axis spans its three rows. */
export const DELTA_ROW = 26;
/** A bar's height, in dp: the median of 04's three. */
export const DELTA_BAR = 14;
/** A bar's outer corner, in dp: 04's 3 px; the end at the axis is square. */
export const DELTA_BAR_RADIUS = 2;
/** The least space between a bar's end and the figures, in dp: 04's chroma row. */
export const DELTA_GAP = 17;

export interface DeltaRow {
  readonly key: string;
  /** `Lightness`. */
  readonly label: string;
  /** The signed figure, printed; its quantity and space are spoken. */
  readonly delta: MeasureFigure;
  /** The words after it, in brackets: `Slightly darker` (F-222's bands). */
  readonly reading: string;
  /** The bar's size, in the unit `scale` is in, which every row shares (ADR-0119). Its side is the figure's. */
  readonly magnitude: number;
}

export interface DeltaBarsProps {
  readonly rows: readonly DeltaRow[];
  /** The magnitude that draws a full unit: F-245's tolerance (ADR-0119). */
  readonly scale: number;
  /** What `scale` is, spoken before the bar's share of it: `Share of tolerance`. */
  readonly scaleName: string;
  readonly script?: Script;
  readonly testID?: string;
}

/**
 * The length one `scale` draws, in dp, for rows this wide whose widest figure is this wide: the
 * smaller of the two sides' room, so both sides draw at one rate.
 */
export function deltaUnit(width: number, widestValue: number): number {
  const axis = DELTA_AXIS * width;
  const left = axis - DELTA_LABEL_END * width;
  const right = width - widestValue - DELTA_GAP - axis;
  return Math.max(0, Math.min(left, right));
}

/** A bar's side — the printed figure's sign — and its length in dp, from its magnitude. */
export function deltaBar(
  value: number,
  magnitude: number,
  scale: number,
  unit: number,
): { readonly side: 'left' | 'right' | 'none'; readonly length: number } {
  if (!(scale > 0)) throw new RangeError(`DeltaBars: scale must be positive, not ${String(scale)}`);
  if (!Number.isFinite(magnitude) || !Number.isFinite(value)) {
    throw new RangeError(
      `DeltaBars: a delta must be finite, not ${String(value)} or ${String(magnitude)}`,
    );
  }
  if (value === 0 || magnitude === 0 || unit <= 0) return { side: 'none', length: 0 };
  return {
    side: value < 0 ? 'left' : 'right',
    length: Math.min(Math.abs(magnitude) / scale, 1) * unit,
  };
}

/** The share of `scale` a magnitude stands for, as a whole percent, unclamped. */
export function deltaShare(magnitude: number, scale: number): number {
  return Math.round((Math.abs(magnitude) / scale) * 100);
}

function DeltaBarRow({
  row,
  scale,
  scaleName,
  width,
  unit,
  script,
  onValueWidth,
}: {
  readonly row: DeltaRow;
  readonly scale: number;
  readonly scaleName: string;
  readonly width: number;
  readonly unit: number;
  readonly script: Script;
  readonly onValueWidth: (key: string, width: number) => void;
}): React.JSX.Element {
  const { colors } = useTheme();
  const bar = deltaBar(row.delta.value, row.magnitude, scale, unit);
  const axis = DELTA_AXIS * width;
  const [open, close] = script === 'japanese' ? ['（', '）'] : ['(', ')'];
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${row.label}: ${figureName(row.delta)}, ${row.reading}, ${scaleName} ${String(deltaShare(row.magnitude, scale))}%`}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: DELTA_ROW }}
    >
      <View style={{ width: `${String(DELTA_LABEL_END * 100)}%` as `${number}%` }}>
        <Text size="label" color="foreground" script={script}>
          {row.label}
        </Text>
      </View>
      {bar.side === 'none' ? null : (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            height: DELTA_BAR,
            width: bar.length,
            left: bar.side === 'left' ? axis - bar.length : axis,
            backgroundColor: colors['foreground.3.card'],
            ...(bar.side === 'left'
              ? { borderTopLeftRadius: DELTA_BAR_RADIUS, borderBottomLeftRadius: DELTA_BAR_RADIUS }
              : {
                  borderTopRightRadius: DELTA_BAR_RADIUS,
                  borderBottomRightRadius: DELTA_BAR_RADIUS,
                }),
          }}
        />
      )}
      {/* Over the bars' square ends, and the row's full height, so the rows draw one line. */}
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: axis - DELTA_AXIS_WIDTH / 2,
          width: DELTA_AXIS_WIDTH,
          backgroundColor: colors['foreground.2'],
        }}
      />
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <View
          onLayout={(event: LayoutChangeEvent) => {
            onValueWidth(row.key, event.nativeEvent.layout.width);
          }}
        >
          <Text size="label" color="foreground" numeric selectable>
            {figureText(row.delta)}
            <Text size="label" color="foreground.2" script={script}>
              {` ${open}${row.reading}${close}`}
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}

export function DeltaBars({
  rows,
  scale,
  scaleName,
  script = 'latin',
  testID,
}: DeltaBarsProps): React.JSX.Element {
  const [width, setWidth] = useState(0);
  const [valueWidths, setValueWidths] = useState<Readonly<Record<string, number>>>({});
  const widest = Math.max(0, ...rows.map((row) => valueWidths[row.key] ?? 0));
  // Until every figure is measured, no bar is drawn: a unit from a partial measure would change.
  const measured = rows.every((row) => valueWidths[row.key] !== undefined);
  const unit = measured ? deltaUnit(width, widest) : 0;
  const onValueWidth = (key: string, w: number): void => {
    setValueWidths((current) => (current[key] === w ? current : { ...current, [key]: w }));
  };
  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      onLayout={(event: LayoutChangeEvent) => {
        setWidth(event.nativeEvent.layout.width);
      }}
    >
      {rows.map((row) => (
        <DeltaBarRow
          key={row.key}
          row={row}
          scale={scale}
          scaleName={scaleName}
          width={width}
          unit={unit}
          script={script}
          onValueWidth={onValueWidth}
        />
      ))}
    </View>
  );
}
