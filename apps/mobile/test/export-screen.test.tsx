/**
 * The export screen, driven (FR-51, F-129).
 *
 * ## Why this file exists
 *
 * `@irodora/export` proves each writer produces the right bytes. It cannot prove **the screen
 * hands those bytes to the sink** — a screen that wrote the wrong format, or built its own
 * subject, or never called `save` at all would leave every assertion in that package green.
 *
 * The conformance registry cannot see it either: the bytes are produced by a tap it never
 * performs [[a-static-render-suite-cannot-check-what-a-form-does-on-save]].
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import { toCsv, toJson, WRITERS, type ExportFile, type ExportSubject } from '@irodora/export';
import { Export } from '../src/screens/Export';
import type { FileSink, SaveResult } from '../src/export/sink';
import { en } from '../src/i18n/en';

const ENVELOPE = { engine: '0.1.0', corpus: '2026.08.1', rules: '0.3.0' } as const;

const SUBJECT: ExportSubject = {
  title: 'Evening walk',
  envelope: ENVELOPE,
  colours: [
    {
      id: 'ai-iro',
      name: 'Indigo, deep',
      hex: '#264348',
      lab: [26.5, -8.1, -5.2],
      lch: [26.5, 9.63, 212.7],
      oklch: [0.36, 0.031, 210.4],
      source: 'reference',
    },
  ],
};

/** A subject no PDF can draw: its title is Japanese, and the report is Latin-1 without a font. */
const JAPANESE: ExportSubject = { ...SUBJECT, title: '藍色の組み合わせ' };

function open(
  subject: ExportSubject | null,
  result: SaveResult = { kind: 'saved', filename: 'x' },
): ExportFile[] {
  const written: ExportFile[] = [];
  const sink: FileSink = {
    save: (file) => {
      written.push(file);
      return Promise.resolve(result);
    },
  };

  render(
    <ThemeProvider theme="light">
      <Export subject={subject} sink={sink} />
    </ThemeProvider>,
  );
  return written;
}

const choose = (label: string): void => {
  fireEvent.press(screen.getByLabelText(label));
};
const exportNow = (): void => {
  fireEvent.press(screen.getByLabelText(en['export.save']));
};

describe('choosing a format and exporting', () => {
  it('hands the sink exactly the bytes the chosen writer produced', () => {
    const written = open(SUBJECT);

    choose(en['export.formatCsv']);
    exportNow();

    expect(written).toHaveLength(1);
    const expected = toCsv(SUBJECT);
    expect(written[0]?.filename).toBe(expected.filename);
    expect(Buffer.from(written[0]?.bytes ?? []).equals(Buffer.from(expected.bytes))).toBe(true);
  });

  /*
   * THE DECOY. Without it, the case above would pass for a screen that always wrote CSV — and
   * "the format control works" would be a claim about a control nobody moved.
   */
  it('DECOY — a different choice produces different bytes', () => {
    const written = open(SUBJECT);

    choose(en['export.formatJson']);
    exportNow();

    const asJson = toJson(SUBJECT);
    expect(written[0]?.filename).toBe(asJson.filename);
    expect(Buffer.from(written[0]?.bytes ?? []).equals(Buffer.from(toCsv(SUBJECT).bytes))).toBe(
      false,
    );
  });

  it('offers every writer, so a seventh format cannot ship unreachable', () => {
    open(SUBJECT);

    // Drawn from WRITERS rather than from a list here: a screen that hard-coded six would pass
    // a test that hard-coded the same six, and both would be wrong together.
    for (const writer of WRITERS)
      expect(
        screen.queryByLabelText(en[`export.format${cap(writer.format)}` as never]),
      ).not.toBeNull();
  });

  it('writes nothing until the button is pressed', () => {
    const written = open(SUBJECT);

    choose(en['export.formatCsv']);

    // `toHaveLength(0)`, NOT `toEqual([])`. Jest's toEqual treats [undefined] as equal to [] —
    // confirmed against this runner — so a screen that handed the sink an UNDEFINED file would
    // satisfy the weaker assertion. That is not hypothetical: a mutation removing the `return`
    // after a refusal does exactly that, and it survived until this line changed.
    expect(written).toHaveLength(0);
  });
});

describe('what the screen says afterwards', () => {
  it('names the file it wrote', async () => {
    open(SUBJECT, { kind: 'saved', filename: 'evening-walk.csv' });
    exportNow();

    expect(await screen.findByText(`${en['export.saved']}: evening-walk.csv`)).toBeTruthy();
  });

  it('separates a cancellation from a failure', async () => {
    open(SUBJECT, { kind: 'cancelled' });
    exportNow();

    expect(await screen.findByText(en['export.cancelled'])).toBeTruthy();
    expect(screen.queryByText(en['export.failed'])).toBeNull();
  });

  it('says nothing before an export has happened', () => {
    open(SUBJECT);

    expect(screen.queryByText(en['export.cancelled'])).toBeNull();
    expect(screen.queryByText(en['export.saved'])).toBeNull();
  });
});

describe('a format that cannot carry the palette', () => {
  it('reports the format’s own refusal, and writes nothing', () => {
    const written = open(JAPANESE);

    choose(en['export.formatPdf']);
    exportNow();

    expect(written).toHaveLength(0);
    expect(screen.getByText(en['export.refused'])).toBeTruthy();
    // THE WRITER'S SENTENCE, verbatim — it names the character, which is the part that helps.
    expect(screen.getByText(/U\+85CD/u)).toBeTruthy();
  });

  /*
   * THE DECOY, and it is the point of the refusal being per-format: the other five carry every
   * character, so a screen reporting "export failed" would send somebody looking for a broken
   * feature instead of choosing JSON.
   */
  it('DECOY — the same palette exports as JSON', () => {
    const written = open(JAPANESE);

    choose(en['export.formatJson']);
    exportNow();

    expect(written).toHaveLength(1);
    expect(screen.queryByText(en['export.refused'])).toBeNull();
  });
});

describe('with nothing to export', () => {
  it('says so rather than offering six formats for nothing', () => {
    open(null);

    expect(screen.getByText(en['export.empty'])).toBeTruthy();
    expect(screen.queryByLabelText(en['export.save'])).toBeNull();
  });
});

/** `csv` → `Csv`, to build the message key from the writer's own format name. */
function cap(format: string): string {
  return format.charAt(0).toUpperCase() + format.slice(1);
}
