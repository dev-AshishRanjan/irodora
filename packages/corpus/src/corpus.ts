/**
 * The checks that need the whole corpus, not one record.
 *
 * A parser can say an entry is well formed. It cannot say the slug is unique, that a relation
 * points at something, that the reviewer exists, or that the source is registered — those are
 * questions about the set. This module asks them.
 *
 * ## It collects rather than throws
 *
 * `parseEntry` throws, because a malformed record has no usable value. These checks return a
 * list instead: an editor fixing a batch of entries needs every failure in one run, not the
 * first one repeated ten times. The gate prints them all and exits 1 if the list is non-empty.
 */

import { CorpusError } from './errors.js';
import type { CorpusEntry } from './entry.js';
import type { CorpusPalette } from './palette.js';
import { checkSourceRegistered, type SourceRegister } from './register.js';
import { checkEditorialIdentity, requiresReviewer, type Roster } from './workflow.js';

/** A record and the file it came from. The file is what makes a failure actionable. */
export interface Sourced<T> {
  readonly file: string;
  readonly record: T;
}

export interface CorpusInput {
  readonly entries: readonly Sourced<CorpusEntry>[];
  readonly palettes: readonly Sourced<CorpusPalette>[];
  readonly roster: Roster;
  readonly register: SourceRegister;
}

/**
 * The prefix reserved for test fixtures.
 *
 * `packages/corpus/test/fixtures/` holds a deliberately valid corpus and a set of deliberately
 * broken ones, so the gate exercises its rules even with zero authored entries. Three separate
 * things keep them from being mistaken for content: they live under `packages/`, the gate's
 * corpus scan globs `content/` only, and this — a `fixture-` slug appearing under `content/` is
 * a failure. A convention plus a check, rather than a convention.
 */
export const FIXTURE_PREFIX = 'fixture-';

function collect(run: () => void, into: CorpusError[]): void {
  try {
    run();
  } catch (error) {
    if (error instanceof CorpusError) into.push(error);
    else throw error;
  }
}

/**
 * Every whole-corpus rule, as a list of failures.
 *
 * `allowFixtureSlugs` is false for the real corpus and true when the gate is running its own
 * fixtures through the same code. It is a parameter rather than a heuristic on the path,
 * because the check that fixture slugs stay out of `content/` is one of the things being
 * tested, and a rule that inspects its own input to decide whether to apply is not a rule.
 */
export function checkCorpus(
  input: CorpusInput,
  { allowFixtureSlugs = false }: { readonly allowFixtureSlugs?: boolean } = {},
): readonly CorpusError[] {
  const failures: CorpusError[] = [];
  const { entries, palettes, roster, register } = input;

  // --- slugs are unique across the corpus ------------------------------------------
  const seenEntry = new Map<string, string>();
  for (const { file, record } of entries) {
    const first = seenEntry.get(record.slug);
    if (first !== undefined)
      failures.push(
        new CorpusError(
          file,
          'slug',
          `"${record.slug}" is already used by ${first}. A slug is a URL and a relation target; ` +
            'two records sharing one means every reference to it is ambiguous.',
        ),
      );
    else seenEntry.set(record.slug, file);
  }

  const seenPalette = new Map<string, string>();
  for (const { file, record } of palettes) {
    const first = seenPalette.get(record.slug);
    if (first !== undefined)
      failures.push(new CorpusError(file, 'slug', `"${record.slug}" is already used by ${first}`));
    else seenPalette.set(record.slug, file);
  }

  // --- fixture slugs may not become content ----------------------------------------
  if (!allowFixtureSlugs)
    for (const { file, record } of [...entries, ...palettes])
      if (record.slug.startsWith(FIXTURE_PREFIX))
        failures.push(
          new CorpusError(
            file,
            'slug',
            `"${record.slug}" uses the ${FIXTURE_PREFIX} prefix, which is reserved for the ` +
              "gate's own test fixtures. A fixture that reached content/ would be published " +
              'as a real colour, and it has no real provenance behind it.',
          ),
        );

  // --- relations resolve ------------------------------------------------------------
  const known = new Set(entries.map(({ record }) => record.slug));
  for (const { file, record } of entries)
    for (const kind of ['related', 'complementary', 'historicalVariants'] as const)
      for (const [i, target] of record.relations[kind].entries())
        if (!known.has(target))
          failures.push(
            new CorpusError(
              file,
              `relations.${kind}[${String(i)}]`,
              `"${target}" is not a colour in this corpus. A dangling relation renders as a ` +
                'link to nothing, and it is usually a rename that only got applied on one side.',
            ),
          );

  // --- palette members resolve ------------------------------------------------------
  for (const { file, record } of palettes)
    for (const [i, member] of record.colors.entries())
      if (!known.has(member.slug))
        failures.push(
          new CorpusError(
            file,
            `colors[${String(i)}].slug`,
            `"${member.slug}" is not a colour in this corpus.`,
          ),
        );

  // --- editorial identity ------------------------------------------------------------
  for (const { file, record } of [...entries, ...palettes]) {
    if (!requiresReviewer(record.status)) continue;
    const { authoredBy, verifiedBy, reviewIndependence } = record.provenance;
    // `verifiedBy` is non-null at these statuses — `parseProvenance` enforced it — but the
    // narrowing is done rather than asserted, because a parser change is exactly the thing
    // that would make a `!` here silently wrong.
    if (verifiedBy === null || reviewIndependence === null) continue;
    collect(() => {
      checkEditorialIdentity(authoredBy, verifiedBy, reviewIndependence, roster, file);
    }, failures);
  }

  // --- the source register ------------------------------------------------------------
  for (const { file, record } of [...entries, ...palettes])
    collect(() => {
      checkSourceRegistered(record.provenance, register, file);
    }, failures);

  return failures;
}
