/**
 * The readout table — a colour's values, each named and in its space (F-235, criterion 1; FR-61).
 *
 * ## Three forms, one per drawing (P1)
 *
 * | form | drawn on | what it is |
 * |---|---|---|
 * | `table` | `06` | a bordered table: a label column, a divider, a value column; rules between rows; a second value after a bar (06's Display-P3) |
 * | `ruled` | `08` | rows between rules, no outer edge: `columns` puts the label (with a notation line or a formula) beside the value (with its reading under it); `stacked` puts the value line under the label, its words running after the figure, and a note under that |
 * | `grid` | `26` | two cells to a row, a label over each value, a divider down the middle and rules between rows; an odd count leaves the last cell empty, as drawn |
 *
 * The form is required, and each takes only the parts its drawing has: a row of the grid has no
 * reading, and only the table has a second value.
 *
 * ## Values
 *
 * A value is figures with the separator its drawing prints (06 joins OKLCh with ` • `, 26 with
 * ` / `), each optionally labelled (`L*`, `R`), or a code (a hex). The words between are the
 * caller's; the figures are set tabular and selectable in one run. Each row is ONE accessible
 * element whose name is its label and every value's spoken name (`OKLCh: L 0.490, C 0.035, h
 * 240.2°, OKLCh`), so a screen reader hears what each number is and where it was computed.
 *
 * ## Numbers
 *
 * Horizontal geometry is each drawing's, recomputed by `readout.test`: the table's label column and
 * insets, the ruled form's label column, the grid's cell inset. Vertical rhythm comes from the type
 * steps — the drawings set this type smaller than the steps it snaps to (ADR-0113) — with each form's
 * padding derived so that a row keeps its drawn pitch between rules.
 */

import { View } from 'react-native';
import { nativeRadius } from '@irodora/design-tokens';
import { figuresName, figureText, type Figure } from './figures.js';
import type { Script } from './layout.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

/** 06's label column, in dp: from the row's edge to its value column. */
export const READOUT_LABEL = 70.5;
/** 06's ink inset from the table's edge and from its divider, in dp. */
export const READOUT_INSET = 7.5;
/** 06's row, in dp, between its rules. */
export const READOUT_ROW = 21;
/** The rule between rows and the table's edge, in dp. */
export const READOUT_RULE = 1;
/** 08's label column, in dp: the median, over its five metric rows, of value less label. */
export const READOUT_RULED_LABEL = 66.5;
/** 08's padding above and below a row's lines, in dp: its single-line pitch less one label line. */
export const READOUT_RULED_PAD = 1.5;
/** 26's cell inset from the card's edge and from its divider, in dp. */
export const READOUT_GRID_INSET = 12.5;
/** 26's padding above and below a cell's two lines, in dp: its row pitch less the two lines. */
export const READOUT_GRID_PAD = 1;
/** 26's rules and divider, in dp. */
export const READOUT_GRID_RULE = 1.5;
/** 06's bar between a row's two values, in dp: its drawn height. */
export const READOUT_BAR = 14.5;

/** One labelled figure in a value: `L* 45.2`. */
export interface ReadoutPart {
  readonly label?: string;
  readonly figure: Figure;
}

/** A row's value: figures joined by the separator the drawing prints, or a code such as a hex. */
export type ReadoutValue =
  | { readonly kind: 'figures'; readonly parts: readonly ReadoutPart[]; readonly separator: string }
  | {
      readonly kind: 'code';
      readonly text: string;
      /** What a screen reader says for it: `hex 5B6B78`. */
      readonly spoken: string;
    };

interface RowBase {
  /** Stable across renders: the quantity's key. */
  readonly key: string;
  readonly label: string;
  readonly value: ReadoutValue;
}

/** 06's row: a label, a value, and optionally a second value after a bar (Display-P3). */
export interface TableRow extends RowBase {
  readonly also?: { readonly label: string; readonly value: ReadoutValue };
  /**
   * Words after the row's values, in the row's own script (F-247): 06's hex row, for the one entry
   * outside sRGB, says its hex is the nearest rendering and by how much (R9 §4 E2). Part of the row's
   * name, so a screen reader hears it with the value it qualifies.
   */
  readonly note?: string;
}

/** 08's row. */
export interface RuledRow extends RowBase {
  /** A second line under the label, in its style: `ΔL*`. */
  readonly notation?: string;
  /** A caption under the label: `(CIEDE2000)`. */
  readonly formula?: string;
  /** Words after or under the figure: `B is lighter`. */
  readonly reading?: string;
  /** A caption under the row: 08's APCA line. */
  readonly note?: string;
}

/** 26's cell. */
export type GridRow = RowBase;

export type ReadoutTableProps = (
  | { readonly form: 'table'; readonly rows: readonly TableRow[] }
  | {
      readonly form: 'ruled';
      /** `columns` (08's metrics) or `stacked` (08's contrast and colour vision). */
      readonly layout: 'columns' | 'stacked';
      readonly rows: readonly RuledRow[];
    }
  | { readonly form: 'grid'; readonly rows: readonly GridRow[] }
) & {
  /** The script the labels are written in. */
  readonly script?: Script;
  readonly testID?: string;
};

/** What a value prints. */
export function valueText(value: ReadoutValue): string {
  if (value.kind === 'code') return value.text;
  return value.parts
    .map((p) => `${p.label === undefined ? '' : `${p.label} `}${figureText(p.figure)}`)
    .join(value.separator);
}

/** What a screen reader says for a value. */
export function valueSpoken(value: ReadoutValue): string {
  return value.kind === 'code' ? value.spoken : figuresName(value.parts.map((p) => p.figure));
}

/**
 * A row's whole name: its label and every value's spoken name. Exported so a screen's test can find
 * a row by the name a screen reader hears (F-247).
 */
export function readoutRowName(
  label: string,
  value: ReadoutValue,
  also?: TableRow['also'],
  note?: string,
): string {
  const first = `${label}: ${valueSpoken(value)}`;
  const values = also === undefined ? first : `${first}; ${also.label}: ${valueSpoken(also.value)}`;
  return note === undefined ? values : `${values}; ${note}`;
}

export function ReadoutTable(props: ReadoutTableProps): React.JSX.Element {
  const { colors } = useTheme();
  const script = props.script ?? 'latin';
  const id = props.testID === undefined ? {} : { testID: props.testID };
  /*
   * EACH PART BY ITS OWN ID, under the caller's (F-247): a row's label and value, the column rule's
   * cell, the bar and the second value's two runs. An inventory records each as an element, and a
   * sweep finds a part by what it draws — a bordered cell or a run of text — not by the table's id
   * alone. Without a `testID` no part carries one.
   */
  const part = (key: string, name: string): { testID?: string } =>
    props.testID === undefined ? {} : { testID: `${props.testID}.${key}.${name}` };

  if (props.form === 'table')
    return (
      <View
        {...id}
        style={{
          borderWidth: READOUT_RULE,
          borderColor: colors.border,
          borderRadius: nativeRadius.sm,
          overflow: 'hidden',
        }}
      >
        {props.rows.map((row, i) => (
          <View
            key={row.key}
            accessible
            accessibilityRole="text"
            accessibilityLabel={readoutRowName(row.label, row.value, row.also, row.note)}
            style={{
              flexDirection: 'row',
              minHeight: READOUT_ROW,
              ...(i === 0 ? {} : { borderTopWidth: READOUT_RULE, borderTopColor: colors.border }),
            }}
          >
            <View
              {...part(row.key, 'divider')}
              style={{
                width: READOUT_LABEL,
                paddingHorizontal: READOUT_INSET,
                justifyContent: 'center',
                borderRightWidth: READOUT_RULE,
                borderRightColor: colors.border,
              }}
            >
              <Text
                size="label"
                weight={500}
                color="foreground"
                script={script}
                {...part(row.key, 'label')}
              >
                {row.label}
              </Text>
            </View>
            <View
              style={{
                flex: 1,
                flexDirection: 'row',
                flexWrap: 'wrap',
                alignItems: 'center',
                columnGap: READOUT_INSET,
                paddingHorizontal: READOUT_INSET,
              }}
            >
              <Text size="label" color="foreground" numeric selectable {...part(row.key, 'value')}>
                {valueText(row.value)}
              </Text>
              {row.also === undefined ? null : (
                <>
                  <View
                    {...part(row.key, 'bar')}
                    style={{
                      width: READOUT_RULE,
                      height: READOUT_BAR,
                      backgroundColor: colors.border,
                    }}
                  />
                  <Text
                    size="label"
                    color="foreground"
                    numeric
                    selectable
                    {...part(row.key, 'also.value')}
                  >
                    <Text
                      size="label"
                      weight={500}
                      color="foreground"
                      script={script}
                      {...part(row.key, 'also.label')}
                    >
                      {`${row.also.label} `}
                    </Text>
                    {valueText(row.also.value)}
                  </Text>
                </>
              )}
              {row.note === undefined ? null : (
                <Text
                  size="label"
                  color="foreground.2"
                  script={script}
                  numeric
                  {...part(row.key, 'note')}
                >
                  {row.note}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );

  if (props.form === 'ruled') {
    const stacked = props.layout === 'stacked';
    return (
      <View {...id}>
        {props.rows.map((row) => (
          <View
            key={row.key}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${readoutRowName(row.label, row.value)}${
              row.reading === undefined ? '' : `, ${row.reading}`
            }${row.note === undefined ? '' : `, ${row.note}`}`}
            style={{
              flexDirection: stacked ? 'column' : 'row',
              paddingVertical: READOUT_RULED_PAD,
              borderTopWidth: READOUT_RULE,
              borderTopColor: colors.border,
            }}
          >
            <View style={stacked ? {} : { width: READOUT_RULED_LABEL }}>
              <Text size="label" color="foreground" script={script}>
                {row.notation === undefined ? row.label : `${row.label}\n${row.notation}`}
              </Text>
              {row.formula === undefined ? null : (
                <Text size="caption" color="foreground.2" script={script}>
                  {row.formula}
                </Text>
              )}
            </View>
            <View style={stacked ? {} : { flex: 1 }}>
              {stacked ? (
                <Text size="label" color="foreground.2" script={script} numeric selectable>
                  <Text size="label" weight={500} color="foreground" numeric>
                    {valueText(row.value)}
                  </Text>
                  {row.reading === undefined ? '' : ` ${row.reading}`}
                </Text>
              ) : (
                <>
                  <Text size="label" weight={500} color="foreground" numeric selectable>
                    {valueText(row.value)}
                  </Text>
                  {row.reading === undefined ? null : (
                    <Text size="caption" color="foreground.2" script={script}>
                      {row.reading}
                    </Text>
                  )}
                </>
              )}
              {row.note === undefined ? null : (
                <Text size="caption" color="foreground.2" script={script} numeric>
                  {row.note}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>
    );
  }

  // The grid: two cells to a row. An odd count leaves the last cell empty, as 26 draws it.
  const pairs: (readonly [GridRow, GridRow | undefined])[] = [];
  for (let i = 0; i < props.rows.length; i += 2) {
    const first = props.rows[i];
    if (first !== undefined) pairs.push([first, props.rows[i + 1]]);
  }
  const cell = (row: GridRow | undefined, end: boolean): React.JSX.Element => (
    <View
      {...(row === undefined
        ? {}
        : {
            accessible: true,
            accessibilityRole: 'text' as const,
            accessibilityLabel: readoutRowName(row.label, row.value),
          })}
      style={{
        flex: 1,
        paddingHorizontal: READOUT_GRID_INSET,
        paddingVertical: READOUT_GRID_PAD,
        ...(end ? {} : { borderRightWidth: READOUT_GRID_RULE, borderRightColor: colors.border }),
      }}
    >
      {row === undefined ? null : (
        <>
          <Text size="body" color="foreground.2" script={script}>
            {row.label}
          </Text>
          <Text size="body" color="foreground" numeric selectable>
            {valueText(row.value)}
          </Text>
        </>
      )}
    </View>
  );
  return (
    <View {...id}>
      {pairs.map(([a, b], i) => (
        <View
          key={a.key}
          style={{
            flexDirection: 'row',
            ...(i === 0
              ? {}
              : { borderTopWidth: READOUT_GRID_RULE, borderTopColor: colors.border }),
          }}
        >
          {cell(a, false)}
          {cell(b, true)}
        </View>
      ))}
    </View>
  );
}
