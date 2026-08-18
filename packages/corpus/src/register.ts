/**
 * The source register — `docs/content/licensing-and-provenance.md` §5.
 *
 * That document already states, as a fact about this system:
 *
 * > **A source not in this table cannot appear in a published entry.** The `content` gate
 * > cross-checks `provenance.source` against this register.
 *
 * Before F-011 it did not. A governed document asserting a check that does not exist is worse
 * than no document: it is the reason nobody goes looking for the check. This module is what
 * makes the sentence true.
 *
 * ## Why the register stays a markdown table
 *
 * Parsing prose is brittle, and the obvious alternative — generate the table from a JSON file —
 * was rejected. The register is a **legal safeguard reviewed by a person before each corpus
 * version ships**; turning it into generated output would move it out of the place where that
 * review happens. The brittleness is handled the only honest way: an unparseable table is a
 * FAILURE, never an absence of constraint [[a-gate-that-errors-is-failing-open]].
 *
 * With zero registered sources today, any entry citing a source fails. That is the correct
 * direction to fail in.
 */

import { CorpusError } from './errors.js';

export interface RegisterRow {
  readonly id: string;
  readonly source: string;
  readonly type: string;
  readonly rightsHolder: string;
  readonly licence: string;
  readonly cleared: string;
}

export type SourceRegister = ReadonlyMap<string, RegisterRow>;

/** The columns §5 declares, in order. A table that does not have them is not the register. */
const COLUMNS = ['ID', 'Source', 'Type', 'Rights holder', 'Licence', 'Cleared', 'Notes'] as const;

/**
 * The em dash the placeholder row uses in every column.
 *
 * It marks "no sources registered yet" and must not become a registerable id — an entry citing
 * `—` would otherwise resolve against the placeholder and pass.
 */
const PLACEHOLDER = '—';

function splitRow(line: string): readonly string[] {
  // A markdown row is `| a | b |`. Dropping the outer empties is what turns it into cells.
  const trimmed = line.trim();
  return trimmed
    .slice(1, trimmed.length - 1)
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparator(cells: readonly string[]): boolean {
  return cells.every((c) => /^:?-{3,}:?$/u.test(c));
}

/**
 * Parse the §5 table out of the licensing document.
 *
 * `source` is the document path, for the message. Throws rather than returning an empty
 * register when the section or the table cannot be found: "I could not read the register" and
 * "the register is empty" are opposite facts, and only one of them means an entry may proceed.
 */
export function parseRegister(markdown: string, source: string): SourceRegister {
  const lines = markdown.split(/\r?\n/u);

  const sectionAt = lines.findIndex((l) => /^##\s+5\.\s+Source register\s*$/u.test(l));
  if (sectionAt === -1)
    throw new CorpusError(
      source,
      '§5',
      'the "## 5. Source register" heading is missing. This document states that the content ' +
        'gate cross-checks provenance.source against that table; without the section the ' +
        'check cannot run, and a check that cannot run must fail rather than pass.',
    );

  const end = lines.findIndex((l, i) => i > sectionAt && /^##\s/u.test(l));
  const section = lines.slice(sectionAt, end === -1 ? lines.length : end);

  // Captured in the loop rather than looked up afterwards by index: `noUncheckedIndexedAccess`
  // makes `section[headerAt]` possibly-undefined, and the `!` that would silence it is banned
  // in src for good reasons. Taking the line while we have it is simpler than either.
  let headerAt = -1;
  let headerLine = '';
  for (const [i, line] of section.entries())
    if (line.trim().startsWith('|') && splitRow(line)[0] === COLUMNS[0]) {
      headerAt = i;
      headerLine = line;
      break;
    }

  if (headerAt === -1)
    throw new CorpusError(
      source,
      '§5',
      `no table under "5. Source register" whose first column is "${COLUMNS[0]}". Expected ` +
        `columns: ${COLUMNS.join(' | ')}.`,
    );

  const header = splitRow(headerLine);
  if (header.length !== COLUMNS.length || COLUMNS.some((c, i) => header[i] !== c))
    throw new CorpusError(
      source,
      '§5',
      `the register columns are [${header.join(', ')}] but the gate reads ` +
        `[${COLUMNS.join(', ')}]. Reordering or renaming a column changes what the check means, ` +
        'so it stops rather than guessing.',
    );

  const separator = section[headerAt + 1];
  if (separator === undefined || !isSeparator(splitRow(separator)))
    throw new CorpusError(source, '§5', 'the register table has no separator row under its header');

  const rows = new Map<string, RegisterRow>();
  for (const [offset, line] of section.slice(headerAt + 2).entries()) {
    if (!line.trim().startsWith('|')) break;
    const cells = splitRow(line);
    if (cells.length !== COLUMNS.length)
      throw new CorpusError(
        source,
        `§5 row ${String(offset + 1)}`,
        `has ${String(cells.length)} cells; the register has ${String(COLUMNS.length)} columns`,
      );

    const [id, src, type, rightsHolder, licence, cleared] = cells as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];

    // The "no sources registered yet" row. Skipped, never registered — an entry citing the
    // em dash must not resolve against it.
    if (id === PLACEHOLDER) continue;

    if (rows.has(id))
      throw new CorpusError(source, '§5', `source id "${id}" appears twice in the register`);

    rows.set(id, { id, source: src, type, rightsHolder, licence, cleared });
  }

  return rows;
}

/**
 * Cross-check one record's provenance against the register.
 *
 * Two checks, not one. The id must exist — and the `source` text must match the row, because an
 * id that points at a different source than the entry claims is the failure mode that matters:
 * the entry would then display one provenance and be licensed under another.
 */
export function checkSourceRegistered(
  provenance: { readonly sourceId: string; readonly source: string },
  register: SourceRegister,
  file: string,
): void {
  const row = register.get(provenance.sourceId);
  if (row === undefined)
    throw new CorpusError(
      file,
      'provenance.sourceId',
      `"${provenance.sourceId}" is not in the source register (licensing-and-provenance.md §5). ` +
        'A source not in that table cannot appear in a published entry — add it there, with ' +
        'its licence and clearance, before the entry can ship. The register is reviewed by a ' +
        'person before each corpus version, and that review is the point.',
    );

  if (row.source !== provenance.source)
    throw new CorpusError(
      file,
      'provenance.source',
      `is "${provenance.source}" but register row "${provenance.sourceId}" names ` +
        `"${row.source}". The entry would display one provenance and be licensed under ` +
        'another, which is the disagreement this cross-check exists to catch.',
    );
}
