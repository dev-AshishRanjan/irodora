/**
 * What every export is an export **of** (FR-51, FR-65, F-056).
 *
 * ## One subject, six writers, and every writer is a pure function of it
 *
 * That is [ADR-0070](../../../docs/adr/0070-a-shareable-card-is-a-deterministic-document-not-a-bitmap.md)'s
 * shape: a shareable card is a pure function returning SVG text, and **the byte equality is
 * what makes its criterion checkable in CI with no device at all.** The same argument applies
 * with more force here — a PDF nobody can diff is a PDF nobody can verify, and FR-65 asks for
 * a report that is *reproducible from its envelope*.
 *
 * So nothing platform-shaped touches a writer. No clock, no locale lookup, no random source,
 * no filesystem. Every value comes from the subject, and the same subject produces the same
 * bytes on both platforms and in CI.
 *
 * ## The colours arrive derived, and are not recomputed
 *
 * `hex`, `lab`, `lch` and `oklch` are on the subject because the caller already has them —
 * from the corpus bundle, where they were frozen at publish time, or from a value the engine
 * produced a moment ago. **Recomputing one here would be today's engine's answer for a version
 * that was pinned on purpose** (FR-10, E-001), and an export is exactly the artefact that
 * outlives the session that made it.
 *
 * ## Why the source travels with each colour
 *
 * A file on somebody's disk is the furthest a value ever gets from the thing that produced it.
 * ADR-0005 makes provenance part of a colour, and dropping it at the boundary is where a camera
 * estimate quietly becomes a reference value in somebody's design system.
 */

import { assertEnvelope, type ReproducibilityEnvelope } from '@irodora/color-core';
import { utf8 as encodeUtf8 } from './utf8.js';

/** A colour as an export sees it: the values, already derived, plus where they came from. */
export interface ExportColour {
  /** Stable within the subject. A corpus slug, a palette member id, a measurement label. */
  readonly id: string;
  /** Shown to a person. May be any text — the PDF writer is the only one with an opinion. */
  readonly name: string;
  /** `#RRGGBB`, uppercase. The rendering, not the value. */
  readonly hex: string;
  readonly lab: readonly [number, number, number];
  readonly lch: readonly [number, number, number];
  readonly oklch: readonly [number, number, number];
  /** `reference` | `calibrated` | `estimated` | `declared` — ADR-0005's word, carried out. */
  readonly source: string;
}

/** One row of FR-65's ΔE table: two ids from the subject and the difference between them. */
export interface ExportDelta {
  readonly fromId: string;
  readonly toId: string;
  /** CIELAB (D65). The space is named in every format, because ΔE00 is defined there. */
  readonly deltaE00: number;
}

/** Everything an export is an export of. */
export interface ExportSubject {
  /** A palette name, a report title. Free text, and the PDF is the only writer that refuses. */
  readonly title: string;
  /**
   * The versions that produced it (FR-10).
   *
   * Required on the type, not optional-with-a-default: criterion 2 is *"every export embeds
   * the engine and corpus versions"*, and a default would be a version nobody chose appearing
   * in a file somebody keeps.
   */
  readonly envelope: ReproducibilityEnvelope;
  readonly colours: readonly ExportColour[];
  /** FR-65's table. Absent rather than empty when the subject is not a comparison. */
  readonly deltas?: readonly ExportDelta[] | undefined;
}

/** A written file, ready for whatever the platform does with bytes. */
export interface ExportFile {
  /** Derived from the title and the format. **Never supplied by a caller** — see `filenameFor`. */
  readonly filename: string;
  readonly mediaType: string;
  readonly bytes: Uint8Array;
}

export class ExportError extends Error {
  constructor(detail: string) {
    super(`export: ${detail}`);
    this.name = 'ExportError';
  }
}

/**
 * Refuse a subject nothing can be written from.
 *
 * `assertEnvelope` does the version half — it is `@irodora/color-core`'s and is not repeated
 * here. What is added is the two things a writer cannot work around: a subject with no colours
 * produces a file that looks like a failed export, and a duplicate id makes a ΔE row ambiguous
 * about which colour it means.
 */
export function assertSubject(subject: ExportSubject): void {
  assertEnvelope(subject.envelope);

  if (subject.colours.length === 0)
    throw new ExportError('a subject needs at least one colour; an empty file is not an export');

  const seen = new Set<string>();
  for (const colour of subject.colours) {
    if (seen.has(colour.id))
      throw new ExportError(
        `duplicate colour id ${JSON.stringify(colour.id)} — a delta row naming it would be ` +
          'ambiguous about which colour it meant',
      );
    seen.add(colour.id);
  }

  for (const delta of subject.deltas ?? [])
    for (const id of [delta.fromId, delta.toId])
      if (!seen.has(id))
        throw new ExportError(
          `delta names ${JSON.stringify(id)}, which is not a colour in this subject`,
        );
}

/**
 * The ASCII slug a filename is built from.
 *
 * **A caller does not supply the filename.** A caller that can name the file can write `../`
 * into it, and every platform this runs on resolves that. The title is reduced to letters,
 * digits and hyphens; anything else becomes a hyphen and runs collapse.
 *
 * A title that reduces to nothing — one written entirely in Japanese, which is an ordinary
 * thing for this product — falls back to `irodora` rather than producing a file called `.csv`.
 */
export function slugify(title: string): string {
  const slug = title
    .normalize('NFKD')
    .replace(/[^A-Za-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .toLowerCase()
    .slice(0, 60);
  return slug === '' ? 'irodora' : slug;
}

/** `<slug>.<extension>`. The only place a filename is made. */
export const filenameFor = (title: string, extension: string): string =>
  `${slugify(title)}.${extension}`;

/**
 * The envelope as the line every text format embeds.
 *
 * One function so six writers cannot disagree about what "embeds the versions" means, and so
 * the test that a seventh format embeds one has something to look for.
 */
export function envelopeFields(
  envelope: ReproducibilityEnvelope,
): readonly (readonly [string, string])[] {
  const fields: (readonly [string, string])[] = [
    ['engine', envelope.engine],
    ['corpus', envelope.corpus],
    ['rules', envelope.rules],
  ];
  if (envelope.profile !== undefined) fields.push(['profile', envelope.profile]);
  return fields;
}

/** UTF-8 bytes. Re-exported so a writer imports one thing — see `utf8.ts` for why not `TextEncoder`. */
export const utf8 = encodeUtf8;
