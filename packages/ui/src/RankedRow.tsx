/**
 * A ranked row — one result in an ordered list, in the form its screen draws (F-235, criterion 2;
 * mockups 19, 21 and 24).
 *
 * | form | screen | what it draws |
 * |---|---|---|
 * | `harmony` | `19` | a level-1 card: the sample, the name in English • 日本語, the relationship and the ΔE00 on one line, and an outlined action |
 * | `nearest` | `21` | a level-1 card: the sample, a two-line name led by its Japanese, the hex, a ΔE00 badge filled and outlined, and a plain *View →* |
 * | `fields` | `24` | inside its screen's card, under a rule: the rank, the relationship, a ΔE00 badge tinted by the sample, the sample with its keyline, and three labelled fields |
 *
 * Each form takes only what its drawing has, by type. `19` and `21` print no rank numeral, so the
 * order carries the rank (golden rule 14): a `rank` is refused there, and `24` has no action. Every
 * number is the drawing's, recomputed by `rows.test`.
 *
 * - **The sample is a `Swatch`**, provenanced by type (ADR-0005), named by its colour.
 * - **The distance is a figure**: the badge prints what its screen prints (`ΔE00: 2.14` in `21`,
 *   `ΔE00 1.42` in `24`) and says the metric's name in full (FR-61).
 * - **The row is not one element**: it holds a control, and a control inside a named group is lost to
 *   a screen reader. Each part reads in order; a field reads as its label and value.
 */

import { View } from 'react-native';
import { nativeSpacing } from '@irodora/design-tokens';
import type { Color } from '@irodora/color-core';
import { Bilingual } from './bilingual.js';
import { Button } from './Button.js';
import { Card, CARD_EDGE } from './Card.js';
import { Chip } from './Chip.js';
import { figureName, figureText, type MeasureFigure } from './figures.js';
import type { Script } from './layout.js';
import { Swatch } from './Swatch.js';
import { Text } from './Text.js';
import { useTheme } from './theme.js';

/** `19`'s harmony row, in dp: the medians of its five. */
export const HARMONY_ROW = {
  height: 84,
  swatch: 62,
  /** From the card's edge to the sample. */
  inset: 18,
  /** From the sample to the name. */
  nameGap: 11.5,
  action: { height: 26.5, inset: 10.5 },
} as const;

/** `21`'s nearest row, in dp: the medians of its five. */
export const NEAREST_ROW = {
  height: 79,
  swatch: 60,
  inset: 10.5,
  nameGap: 10,
  /** The badge's height, and its distance from the card's top and right edges. */
  badge: { height: 20.5, top: 10, right: 10.5 },
} as const;

/** `24`'s field row, in dp, measured from its rule's start; the medians of its four. */
export const FIELDS_ROW = {
  pitch: 112.5,
  rule: 1.5,
  /** From the rule to the badge's top. */
  top: 14,
  /** The badge's height, which the rank line shares. */
  head: 23.5,
  /** From the badge to the sample. */
  headGap: 6.5,
  /** From the rule's start to the rank. */
  rankInset: 12,
  /** From the rule's start to the relationship and the sample. */
  indent: 34,
  swatch: 54.5,
  /** From the sample to the first field. */
  fieldsGap: 10,
  /** The first two fields' widths: the third takes the rest. */
  columns: [76, 90.5],
  /** From the badge to the rule's end. */
  badgeInset: 11.5,
} as const;

export interface RankedSample {
  /** The colour's name, as its swatch says it. */
  readonly name: string;
  readonly hex: string;
  /** Carries provenance in its type (ADR-0005). */
  readonly color: Color;
}

export interface RankedAction {
  readonly label: string;
  /** The accessible name, where the label alone does not say what it acts on. */
  readonly name?: string;
  readonly onPress: () => void;
}

export interface RankedField {
  readonly label: string;
  readonly value: string;
  /** The value's script: a Japanese name sets in the Japanese face. */
  readonly script?: Script;
  /** The value is a code with figures (a hex), set tabular. */
  readonly numeric?: boolean;
}

interface HarmonyProps {
  readonly form: 'harmony';
  readonly sample: RankedSample;
  /** The name: `Amber Ochre`. */
  readonly name: string;
  /** Its Japanese, after the bullet: `琥珀色`. */
  readonly ja?: string;
  /** The relationship: `Complementary`. Printed before the distance, as `19` prints it. */
  readonly relationship: string;
  /** The distance to the anchor: printed `ΔE00: 48.2`, and said with its space (FR-61). */
  readonly distance: MeasureFigure;
  readonly action: RankedAction;
  readonly rank?: never;
  readonly script?: Script;
  readonly testID?: string;
}

interface NearestProps {
  readonly form: 'nearest';
  readonly sample: RankedSample;
  /** The name after its Japanese, up to two lines with it: `Sabi-asagi (Rust Light Teal)`. */
  readonly name: string;
  /** The Japanese it leads with, set in the Japanese face: `錆浅葱`. */
  readonly ja?: string;
  readonly distance: MeasureFigure;
  readonly view: RankedAction;
  readonly rank?: never;
  readonly action?: never;
  readonly script?: Script;
  readonly testID?: string;
}

interface FieldsProps {
  readonly form: 'fields';
  /** The position, printed: `24` numbers its rows. */
  readonly rank: number;
  readonly relationship: string;
  readonly distance: MeasureFigure;
  readonly sample: RankedSample;
  readonly fields: readonly [RankedField, RankedField, RankedField];
  /** Draw the rule above the row, as `24` does between rows. */
  readonly ruled?: boolean;
  readonly action?: never;
  readonly view?: never;
  readonly script?: Script;
  readonly testID?: string;
}

export type RankedRowProps = HarmonyProps | NearestProps | FieldsProps;

export function RankedRow(props: RankedRowProps): React.JSX.Element {
  switch (props.form) {
    case 'harmony':
      return <Harmony {...props} />;
    case 'nearest':
      return <Nearest {...props} />;
    case 'fields':
      return <Fields {...props} />;
  }
}

/** Both card forms draw a level-1 card with its edge, padded by a step; the rest of each inset is inside. */
const PAD = nativeSpacing.sm;

function Harmony({
  sample,
  name,
  ja,
  relationship,
  distance,
  action,
  script = 'latin',
  testID,
}: HarmonyProps): React.JSX.Element {
  const h = HARMONY_ROW;
  return (
    <Card level="1" padding="sm" {...(testID === undefined ? {} : { testID })}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: h.height - 2 * (PAD + CARD_EDGE),
          paddingLeft: h.inset - PAD - CARD_EDGE,
          paddingRight: h.action.inset - PAD - CARD_EDGE,
          gap: h.nameGap,
        }}
      >
        <Swatch
          name={sample.name}
          hex={sample.hex}
          color={sample.color}
          size={h.swatch}
          corner="md"
          keyline={false}
          script={script}
        />
        <View style={{ flex: 1 }}>
          <Bilingual
            text={name}
            {...(ja === undefined ? {} : { ja })}
            size="body"
            weight={500}
            color="foreground"
            script={script}
            numberOfLines={1}
          />
          <View
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${relationship}, ${figureName(distance)}`}
          >
            <Text size="label" color="foreground.2" script={script} numeric>
              {`${relationship} • ${distance.quantity}: ${figureText(distance)}`}
            </Text>
          </View>
        </View>
        <Button
          variant="secondary"
          edge="border"
          radius="sm"
          height={h.action.height}
          label={action.label}
          {...(action.name === undefined ? {} : { name: action.name })}
          onPress={action.onPress}
        />
      </View>
    </Card>
  );
}

function Nearest({
  sample,
  name,
  ja,
  distance,
  view,
  script = 'latin',
  testID,
}: NearestProps): React.JSX.Element {
  const n = NEAREST_ROW;
  const inner = n.height - 2 * (PAD + CARD_EDGE);
  return (
    <Card level="1" padding="sm" {...(testID === undefined ? {} : { testID })}>
      <View
        style={{
          flexDirection: 'row',
          minHeight: inner,
          paddingLeft: n.inset - PAD - CARD_EDGE,
          gap: n.nameGap,
        }}
      >
        <View style={{ justifyContent: 'center' }}>
          <Swatch
            name={sample.name}
            hex={sample.hex}
            color={sample.color}
            size={n.swatch}
            corner="md"
            keyline={false}
            script={script}
          />
        </View>
        <View style={{ flex: 1, justifyContent: 'space-between' }}>
          <Text size="body" color="foreground" script={script} numberOfLines={2}>
            {ja === undefined ? null : (
              <Text size="body" color="foreground" script="japanese">{`${ja} `}</Text>
            )}
            {name}
          </Text>
          <Text size="body" color="foreground.2" numeric selectable>
            {sample.hex}
          </Text>
        </View>
        <View
          style={{
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            paddingTop: n.badge.top - PAD - CARD_EDGE,
            paddingRight: n.badge.right - PAD - CARD_EDGE,
          }}
        >
          <Chip
            form="badge"
            label={`${distance.quantity}: ${figureText(distance)}`}
            name={figureName(distance)}
            fill="surface.2"
            edge
            radius="sm"
            height={n.badge.height}
            numeric
          />
          <Button
            variant="plain"
            label={view.label}
            glyph="arrow-right"
            {...(view.name === undefined ? {} : { name: view.name })}
            onPress={view.onPress}
          />
        </View>
      </View>
    </Card>
  );
}

function Fields({
  rank,
  relationship,
  distance,
  sample,
  fields,
  ruled = false,
  script = 'latin',
  testID,
}: FieldsProps): React.JSX.Element {
  const { colors } = useTheme();
  const f = FIELDS_ROW;
  return (
    <View
      {...(testID === undefined ? {} : { testID })}
      style={{
        borderTopWidth: ruled ? f.rule : 0,
        borderTopColor: colors.border,
        paddingTop: f.top,
        paddingBottom: f.pitch - f.rule - f.top - f.head - f.headGap - f.swatch,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: f.head }}>
        <View style={{ width: f.indent, paddingLeft: f.rankInset }}>
          <Text size="body" color="foreground" numeric>{`${String(rank)}.`}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text size="body" color="foreground" script={script} numberOfLines={1}>
            {relationship}
          </Text>
        </View>
        <View style={{ paddingRight: f.badgeInset }}>
          <Chip
            form="badge"
            label={`${distance.quantity} ${figureText(distance)}`}
            name={figureName(distance)}
            tint={sample}
            radius="sm"
            height={f.head}
            numeric
          />
        </View>
      </View>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginTop: f.headGap,
          paddingLeft: f.indent,
        }}
      >
        <View style={{ marginRight: f.fieldsGap }}>
          <Swatch
            name={sample.name}
            hex={sample.hex}
            color={sample.color}
            size={f.swatch}
            corner="md"
            script={script}
          />
        </View>
        {fields.map((field, i) => (
          <View
            key={field.label}
            accessible
            accessibilityRole="text"
            accessibilityLabel={`${field.label}: ${field.value}`}
            style={i < f.columns.length ? { width: f.columns[i] } : { flex: 1 }}
          >
            {/* Tertiary on its screen's card: E3's card value (#94A1AF on Sumi). */}
            <Text size="label" color="foreground.3.card" script={script}>
              {field.label}
            </Text>
            <Text
              size="title"
              color="foreground"
              script={field.script ?? 'latin'}
              numeric={field.numeric ?? false}
              selectable
              numberOfLines={1}
            >
              {field.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
