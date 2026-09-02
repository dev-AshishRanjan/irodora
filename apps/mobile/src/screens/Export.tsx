/**
 * Export a palette or a comparison (FR-51, F-129).
 *
 * ## What was missing
 *
 * F-056 built six writers and deliberately not a surface, and **nothing in the app called any of
 * them.** Six formats, a contract test over all six, and no way to produce a file — the
 * consumer-with-no-producer shape F-125 closed for the Lens, one package along.
 *
 * ## The subject arrives; this screen does not build one
 *
 * `ExportSubject` is what the writers take, and a palette or a comparison is what a person has.
 * Assembling one is the caller's business — a second way to build a subject would be a second
 * answer to what an export contains, and the two would drift.
 *
 * ## The sink is a port, and the reason is the lint
 *
 * `expo-file-system` and `expo-sharing` reach a device, so a screen importing either could not
 * be rendered by jest — and jest is where the accessibility guarantees are checked. The route
 * supplies `deviceSink()`; the suite supplies one that records. See
 * [`../export/sink.ts`](../export/sink.ts).
 *
 * ## A format that refuses is not a failure of the export
 *
 * `toPdf` refuses a character it cannot draw, by name (ADR-0080, ADR-0083). That is a property
 * of **that format**, not of the palette — the other five carry every character — so the screen
 * says which format cannot take it and leaves the rest available. A screen that reported "export
 * failed" would send somebody looking for a broken feature.
 */

import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { nativeTapTarget } from '@irodora/design-tokens';
import { Button, Surface, Text, useTheme } from '@irodora/ui';
import { ExportError, WRITERS, type ExportFile, type ExportSubject } from '@irodora/export';
import type { FileSink, SaveResult } from '../export/sink';
import { useMessages } from '../i18n/useMessages';
import type { MessageKey } from '../i18n/index';

/** Format → its line on the screen. Total, so a seventh writer is a compile error here. */
const FORMAT_KEYS = {
  csv: 'export.formatCsv',
  json: 'export.formatJson',
  css: 'export.formatCss',
  tokens: 'export.formatTokens',
  ase: 'export.formatAse',
  pdf: 'export.formatPdf',
} as const satisfies Record<(typeof WRITERS)[number]['format'], MessageKey>;

type Format = keyof typeof FORMAT_KEYS;

/** What happened, as a key. `saved` carries a filename, so it is handled separately. */
const RESULT_KEYS = {
  cancelled: 'export.cancelled',
  failed: 'export.failed',
} as const satisfies Record<Exclude<SaveResult['kind'], 'saved'>, MessageKey>;

export interface ExportProps {
  /** What to export. `null` when the person has not built anything yet. */
  readonly subject: ExportSubject | null;
  readonly sink: FileSink;
  /** The format selected on arrival. The registry uses it to render a chosen state. */
  readonly initialFormat?: Format;
}

export function Export({ subject, sink, initialFormat = 'json' }: ExportProps): React.JSX.Element {
  const { t, script } = useMessages();
  const { colors } = useTheme();

  const [format, setFormat] = useState<Format>(initialFormat);
  const [outcome, setOutcome] = useState<SaveResult | null>(null);
  /** Set when the chosen writer refuses the subject — its own message, which names the character. */
  const [refusal, setRefusal] = useState<string | null>(null);

  const write = useMemo(() => WRITERS.find((w) => w.format === format)?.write ?? null, [format]);

  const save = useCallback(() => {
    setOutcome(null);
    setRefusal(null);
    if (subject === null || write === null) return;

    let file: ExportFile;
    try {
      file = write(subject);
    } catch (error) {
      // AN EXPORT ERROR IS THE FORMAT'S, NOT THE PALETTE'S. Its message names the character
      // and the formats that carry it, so it is shown rather than replaced with our own.
      if (!(error instanceof ExportError)) throw error;
      setRefusal(error.message);
      return;
    }

    void sink.save(file).then(setOutcome);
  }, [sink, subject, write]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, gap: 16 }}
    >
      <Text size="title" color="foreground" script={script} heading>
        {t('export.title')}
      </Text>
      <Text size="small" color="foreground.2" script={script}>
        {t('export.origin')}
      </Text>

      {subject === null ? (
        <Text size="body" color="foreground.2" script={script}>
          {t('export.empty')}
        </Text>
      ) : (
        <>
          <Surface level="1" padding={12}>
            <View style={{ gap: 8 }}>
              <Text size="body" color="foreground" script={script} heading>
                {t('export.subject')}
              </Text>
              <Text size="body" color="foreground" script={script}>
                {subject.title}
              </Text>
              {/*
                NAMES AND HEXES, NOT SWATCHES, and the reason is ADR-0005.

                A `Swatch` requires a `Color` — provenance in the type — and `ExportColour`
                carries a provenance WORD but no confidence. Building one here would mean
                inventing a number nobody measured for every colour on the screen, which is the
                exact thing the type exists to prevent. The export screen's job is choosing a
                format; it does not need to be a second Atlas.

                Colour is not the only channel here either way: every line is the name and the
                hex, read as text.
              */}
              {subject.colours.map((colour) => (
                <Text key={colour.id} size="small" color="foreground.2" script={script} numeric>
                  {`${colour.name}   ${colour.hex}   ${colour.source}`}
                </Text>
              ))}
              {/*
                THE VERSIONS, ON SCREEN AND IN THE FILE. Every export embeds the envelope
                (FR-10); showing it here is how somebody knows what they are about to keep,
                rather than discovering it by opening the file.
              */}
              <Text size="small" color="foreground.2" script={script} numeric>
                {`${t('export.versions')}: ${subject.envelope.engine} · ${subject.envelope.corpus} · ${subject.envelope.rules}`}
              </Text>
            </View>
          </Surface>

          <Text size="body" color="foreground" script={script} heading>
            {t('export.format')}
          </Text>
          {/*
            EVERY FORMAT, DRAWN FROM `WRITERS`. Listing them by hand would let a seventh writer
            ship with no way to choose it — which is the defect this whole feature is.
          */}
          {WRITERS.map((writer) => (
            <Pressable
              key={writer.format}
              accessibilityRole="radio"
              accessibilityState={{ selected: format === writer.format }}
              accessibilityLabel={t(FORMAT_KEYS[writer.format])}
              onPress={() => {
                setFormat(writer.format);
                setOutcome(null);
                setRefusal(null);
              }}
              style={{ minHeight: nativeTapTarget, justifyContent: 'center' }}
            >
              <Text
                size="body"
                color={format === writer.format ? 'foreground' : 'foreground.2'}
                script={script}
              >
                {`${format === writer.format ? '●' : '○'}  ${t(FORMAT_KEYS[writer.format])}`}
              </Text>
            </Pressable>
          ))}

          <Button label={t('export.save')} onPress={save} />

          {refusal === null ? null : (
            <Surface level="1" padding={12}>
              <View style={{ gap: 4 }}>
                <Text size="body" color="foreground" script={script}>
                  {t('export.refused')}
                </Text>
                {/*
                  THE WRITER'S OWN SENTENCE. It names the character and the formats that carry
                  it, which is more use than anything this screen could say instead — and it is
                  the one place in the app where an engine message reaches a person verbatim,
                  because rewriting it would lose the character it names.
                */}
                <Text size="small" color="foreground.2" script={script}>
                  {refusal}
                </Text>
              </View>
            </Surface>
          )}

          {outcome === null ? null : (
            <Text size="body" color="foreground.2" script={script}>
              {outcome.kind === 'saved'
                ? `${t('export.saved')}: ${outcome.filename}`
                : t(RESULT_KEYS[outcome.kind])}
            </Text>
          )}
        </>
      )}
    </ScrollView>
  );
}
