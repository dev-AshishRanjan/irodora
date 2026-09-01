/**
 * Professional surfaces: colorimeter entry and the ΔE00 table (FR-28, FR-61, F-055).
 *
 * ## Numbers first, swatches beside them
 *
 * > *Numeric values are shown by default rather than only swatches, with the space each was
 * > computed in named beside it.*
 *
 * Every row of the table carries its Lab, its LCh, its ΔE00 from the reference, and **the space
 * it arrived in** — which is `lab` for something typed off an instrument and `oklch` for a
 * published entry. Those are different kinds of fact and the table says which is which; a
 * column that showed the reference's space against every row would label a published value as
 * an instrument reading.
 *
 * ## The direction of the workflow is the calibration workflow
 *
 * Pick the colour you measured from a published library, type what your instrument said about
 * it, and read the difference. That is how an instrument is checked, and it is why the
 * reference comes from the library and the samples are typed rather than the other way round.
 *
 * ## No verdict, and no entitlement check
 *
 * There is no tolerance column and no pass/fail, because any threshold here would be ours
 * rather than the standard the person works to. And FR-61 is explicit that this is available to
 * every user **because no entitlement exists** — there is nothing to check and nothing to sell
 * (ADR-0051).
 *
 * ## The refusal appears under the field it is about
 *
 * `parseMeasurement` returns which of the three fields is wrong. A single "invalid input" under
 * a three-field form is the message that makes somebody retype all three, so the sentence is
 * rendered beneath the field it names and nowhere else.
 */

import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { nativeTapTarget } from '@irodora/design-tokens';
import { Button, Surface, Swatch, swatchAccessibleName, Text, TextField } from '@irodora/ui';
import type { Color } from '@irodora/color-core';
import { hexOf } from '../engine';
import {
  batchCompare,
  ENTRY_SPACES,
  parseMeasurement,
  type BatchSample,
  type EntrySpace,
  type FieldIndex,
  type MeasurementProblem,
} from '../measure';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/** Problem → sentence. Total, so a fourth problem is a compile error rather than a blank space. */
const PROBLEM_KEYS = {
  blank: 'measure.problem.blank',
  notANumber: 'measure.problem.notANumber',
  outOfRange: 'measure.problem.outOfRange',
} as const satisfies Record<MeasurementProblem, MessageKey>;

/** Field labels per space. The existing axis keys, because CIELAB's axes are named already. */
const FIELD_KEYS = {
  lab: ['axis.labL', 'axis.labA', 'axis.labB'],
  lch: ['axis.labL', 'measure.axisLchC', 'axis.hue'],
} as const satisfies Record<EntrySpace, readonly [MessageKey, MessageKey, MessageKey]>;

/** Space → its published name. `space.cielab` already says "(D65)", which is the half that matters. */
const SPACE_KEYS = {
  lab: 'space.cielab',
  lch: 'coord.lch',
} as const satisfies Record<EntrySpace, MessageKey>;

/** One colour a reference library offers. */
export interface LibraryEntry {
  readonly id: string;
  readonly name: string;
  readonly color: Color;
}

/** A named set of published colours. The corpus is one; a saved palette is another. */
export interface ReferenceLibrary {
  readonly id: string;
  /** Shown as given — a corpus version or a palette name is a value, not a translatable string. */
  readonly name: string;
  readonly entries: readonly LibraryEntry[];
}

export interface MeasureProps {
  readonly libraries: readonly ReferenceLibrary[];
  readonly initialReferenceId?: string;
  /** Measurements already entered, so a registry subject can render the table branch. */
  readonly initialSamples?: readonly BatchSample[];
}

const EMPTY_FIELDS: readonly [string, string, string] = ['', '', ''];

export function Measure({
  libraries,
  initialReferenceId,
  initialSamples = [],
}: MeasureProps): React.JSX.Element {
  const { t } = useMessages();
  const [space, setSpace] = useState<EntrySpace>('lab');
  const [fields, setFields] = useState<readonly [string, string, string]>(EMPTY_FIELDS);
  const [samples, setSamples] = useState<readonly BatchSample[]>(initialSamples);
  const [referenceId, setReferenceId] = useState<string | null>(initialReferenceId ?? null);

  const entries = useMemo(() => libraries.flatMap((l) => l.entries), [libraries]);
  const reference = entries.find((e) => e.id === referenceId) ?? null;

  const parsed = parseMeasurement(space, fields);
  const typedAnything = fields.some((f) => f.trim() !== '');
  // Silent until somebody has typed. A form that opens complaining is wrong about the
  // commonest state there is.
  const problem = typedAnything && !parsed.ok ? parsed : null;

  const rows = reference === null ? [] : batchCompare(reference.color, samples);

  const setField = useCallback((index: FieldIndex, value: string) => {
    setFields((f) => {
      const next: [string, string, string] = [f[0], f[1], f[2]];
      next[index] = value;
      return next;
    });
  }, []);

  const add = useCallback(() => {
    if (!parsed.ok) return;
    setSamples((s) => [
      ...s,
      {
        id: `m-${String(s.length + 1)}`,
        name: `${space.toUpperCase()} ${parsed.components.map((c) => c.toFixed(2)).join(' ')}`,
        color: parsed.color,
      },
    ]);
    setFields(EMPTY_FIELDS);
  }, [parsed, space]);

  return (
    <ScrollView>
      <View style={{ padding: 16, gap: 16 }}>
        <Text size="title" color="foreground" heading>
          {t('measure.title')}
        </Text>
        <Text size="body" color="foreground.2">
          {t('measure.origin')}
        </Text>

        {/* ------------------------------------------------- the reference library */}
        <Text size="body" color="foreground" heading>
          {t('measure.library')}
        </Text>
        {libraries.map((library) => (
          <Surface key={library.id} level="1">
            <View style={{ padding: 12, gap: 8 }}>
              <Text size="body" color="foreground.2">
                {library.name}
              </Text>
              <Text size="small" color="foreground.2">
                {t('measure.pickReference')}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {library.entries.map((entry) => (
                  <Pressable
                    key={entry.id}
                    accessibilityRole="button"
                    accessibilityLabel={swatchAccessibleName(
                      entry.name,
                      hexOf(entry.color),
                      entry.color,
                    )}
                    onPress={() => {
                      setReferenceId(entry.id);
                    }}
                    style={{ minWidth: nativeTapTarget, minHeight: nativeTapTarget }}
                  >
                    <Swatch
                      name={entry.name}
                      hex={hexOf(entry.color)}
                      color={entry.color}
                      size={44}
                      selected={referenceId === entry.id}
                    />
                  </Pressable>
                ))}
              </View>
            </View>
          </Surface>
        ))}

        {reference === null ? (
          <Text size="body" color="foreground.2">
            {t('measure.noReference')}
          </Text>
        ) : (
          <Text size="body" color="foreground">
            {`${t('measure.reference')}: ${reference.name}`}
          </Text>
        )}

        {/* ------------------------------------------------------ the entry form */}
        <Surface level="1">
          <View style={{ padding: 12, gap: 12 }}>
            <Text size="body" color="foreground" heading>
              {t('measure.space')}
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {ENTRY_SPACES.map((candidate) => (
                <Button
                  key={candidate}
                  label={t(SPACE_KEYS[candidate])}
                  variant={space === candidate ? 'primary' : 'secondary'}
                  onPress={() => {
                    setSpace(candidate);
                    setFields(EMPTY_FIELDS);
                  }}
                />
              ))}
            </View>

            {([0, 1, 2] as const).map((index) => (
              <View key={index} style={{ gap: 4 }}>
                <TextField
                  label={t(FIELD_KEYS[space][index])}
                  value={fields[index]}
                  onChangeText={(value) => {
                    setField(index, value);
                  }}
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                />
                {/*
                 * BENEATH THE FIELD IT NAMES, and nowhere else. `parseMeasurement` returns the
                 * index precisely so this sentence can sit under the one that is wrong.
                 */}
                {problem !== null && problem.field === index ? (
                  <Text size="small" color="foreground.2">
                    {t(PROBLEM_KEYS[problem.problem])}
                  </Text>
                ) : null}
              </View>
            ))}

            <Button label={t('measure.add')} disabled={!parsed.ok} onPress={add} />
          </View>
        </Surface>

        {/* ------------------------------------------------------------ the table */}
        <Text size="body" color="foreground" heading>
          {t('measure.samples')}
        </Text>
        {rows.length === 0 ? (
          <Text size="body" color="foreground.2">
            {t('measure.empty')}
          </Text>
        ) : (
          rows.map((row) => (
            <Surface key={row.id} level="1">
              <View style={{ padding: 12, gap: 4 }}>
                <Text size="body" color="foreground" numeric>
                  {`${row.name} — ${t('compare.difference')}: ${row.deltaE00.toFixed(2)} ${t('unit.deltaE00')}`}
                </Text>
                {/*
                 * LAB AND LCH BY DEFAULT, each with the space it was computed in named beside
                 * it. That is criterion 1, and FR-61's own sentence: the same quantity in a
                 * different space is a different claim.
                 */}
                <Text size="small" color="foreground.2" numeric>
                  {`${t('space.cielab')}: ${row.lab.map((v) => v.toFixed(2)).join('  ')}`}
                </Text>
                <Text size="small" color="foreground.2" numeric>
                  {`${t('coord.lch')}: ${row.lch.map((v) => v.toFixed(2)).join('  ')}`}
                </Text>
                <Text size="small" color="foreground.2">
                  {`${t('measure.arrivedIn')}: ${row.originSpace}`}
                </Text>
              </View>
            </Surface>
          ))
        )}
      </View>
    </ScrollView>
  );
}
