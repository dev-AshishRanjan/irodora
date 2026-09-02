/**
 * `@irodora/export` — the local export formats (FR-51, FR-65).
 *
 * **Deterministic bytes, and no runtime dependencies.** Not because this is an engine package —
 * it is not, and `verify-engine-purity.mjs` closes the engine zone without it — but because a
 * compressor or a PDF library would produce output nobody here could diff, and
 * [ADR-0070](../../../docs/adr/0070-a-shareable-card-is-a-deterministic-document-not-a-bitmap.md)
 * already settled what that costs: a document that cannot be compared byte for byte has a
 * criterion nobody can check, and a criterion nobody can check quietly becomes nothing.
 *
 * Every writer is a pure function of an `ExportSubject`. No clock, no locale, no random source,
 * no filesystem — so the same subject at the same versions writes the same file on both
 * platforms and in CI, which is what FR-65's *"reproducible from its envelope"* means in
 * practice.
 */

export {
  assertSubject,
  envelopeFields,
  ExportError,
  filenameFor,
  slugify,
  TOKEN_EXTENSION,
  type ExportColour,
  type ExportDelta,
  type ExportFile,
  type ExportSubject,
} from './subject.js';

import { toCsv, toCss, toDesignTokens, toJson } from './text.js';
import { toAse } from './ase.js';
import { toPdf } from './pdf.js';

export { toCsv, toCss, toDesignTokens, toJson } from './text.js';

export {
  ASE_BLOCK,
  ASE_COLOUR_TYPE,
  parseAse,
  toAse,
  type AseColour,
  type AseFile,
} from './ase.js';

export { toPdf, type PdfOptions } from './pdf.js';

export { FontError, glyphFor, parseTrueType, pdfWidth, type TrueTypeFont } from './truetype.js';

export { concat, fromUtf8, latin1, utf8 } from './utf8.js';

export { fromDesignTokens, fromJson } from './import.js';

/**
 * Every writer, in one list.
 *
 * The contract test iterates THIS rather than naming six cases, so a seventh format cannot be
 * added without embedding the envelope and without being deterministic — criterion 2 says
 * *every* export, and a test that names its cases stops covering the one somebody adds next.
 */
export const WRITERS = [
  { format: 'csv', write: toCsv },
  { format: 'json', write: toJson },
  { format: 'css', write: toCss },
  { format: 'tokens', write: toDesignTokens },
  { format: 'ase', write: toAse },
  { format: 'pdf', write: toPdf },
] as const;

export const EXPORT_VERSION = '0.1.0' as const;
