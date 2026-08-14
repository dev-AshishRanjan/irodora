/**
 * The shape every golden dataset in this repository has, and the check that it is honest.
 *
 * A golden dataset assembled by running our own code and pasting the output proves only that
 * the code still agrees with itself. So every entry must say where its number came from, and
 * `assertGoldenDataset` fails the gate if one does not — the citation is not documentation,
 * it is the thing that makes the dataset evidence.
 *
 * Changing a golden value is changing our claim about physical reality and requires an ADR
 * (`packages/color-core/AGENTS.md`). That is a rule about people; this file is what stops a
 * dataset from being *added* without one.
 */

/** What kind of claim an entry is. All three are checks; they are not equally strong. */
export type GoldenDerivation =
  /** A number printed in the cited source. The strongest kind. */
  | 'published-value'
  /** Computed by hand from a formula printed in the cited source; `derivationNote` shows the arithmetic. */
  | 'published-formula'
  /** A consequence of the definition that any correct implementation must reproduce. */
  | 'definitional';

const DERIVATIONS = [
  'published-value',
  'published-formula',
  'definitional',
] as const satisfies readonly GoldenDerivation[];

const isDerivation = (value: unknown): value is GoldenDerivation =>
  typeof value === 'string' && (DERIVATIONS as readonly string[]).includes(value);

export interface GoldenEntry {
  readonly id: string;
  /** The publication. Specific enough to look up: a standard clause, a paper, a table. */
  readonly source: string;
  readonly derivation: GoldenDerivation;
  /** Required for `published-formula`: the arithmetic, so a reader can check it. */
  readonly derivationNote?: string;
  readonly input: unknown;
  readonly expected: unknown;
  /**
   * Absolute tolerance for this entry, in the units of `expected`. Per entry rather than per
   * dataset because published values are published to a stated precision, and a single
   * dataset mixes three-decimal table values with exact definitional ones.
   */
  readonly tolerance: number;
}

export interface GoldenDataset {
  readonly id: string;
  readonly description: string;
  readonly entries: readonly GoldenEntry[];
}

function bad(id: string, why: string): never {
  throw new Error(`golden dataset "${id}": ${why}`);
}

const asRecord = (value: unknown): Record<string, unknown> | null =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;

/**
 * Validates a dataset loaded from JSON. Throws — inside a test that is a failure, which is
 * the point: an uncited entry must not be able to sit in the set contributing nothing.
 */
export function assertGoldenDataset(value: unknown, expectedId: string): GoldenDataset {
  const dataset = asRecord(value);
  if (!dataset) bad(expectedId, 'is not an object');

  if (dataset['id'] !== expectedId) bad(expectedId, `declares id ${JSON.stringify(dataset['id'])}`);

  const description = dataset['description'];
  if (typeof description !== 'string' || description.length === 0)
    bad(expectedId, 'has no description');

  const rawEntries = dataset['entries'];
  if (!Array.isArray(rawEntries) || rawEntries.length === 0)
    bad(expectedId, 'has no entries — an empty golden set passes whatever it is pointed at');

  const seen = new Set<string>();
  const entries: GoldenEntry[] = [];

  for (const raw of rawEntries as readonly unknown[]) {
    const entry = asRecord(raw);
    if (!entry) bad(expectedId, 'has an entry that is not an object');

    const id = entry['id'];
    if (typeof id !== 'string' || id.length === 0) bad(expectedId, 'has an entry with no id');
    if (seen.has(id)) bad(expectedId, `has two entries with id "${id}"`);
    seen.add(id);

    const source = entry['source'];
    if (typeof source !== 'string' || source.length === 0)
      bad(expectedId, `entry "${id}" cites no source`);

    const derivation = entry['derivation'];
    if (!isDerivation(derivation))
      bad(expectedId, `entry "${id}" has derivation ${JSON.stringify(derivation)}`);

    const derivationNote = entry['derivationNote'];
    if (derivation === 'published-formula' && typeof derivationNote !== 'string')
      bad(expectedId, `entry "${id}" is computed from a formula but does not show the arithmetic`);

    const tolerance = entry['tolerance'];
    if (typeof tolerance !== 'number' || !Number.isFinite(tolerance) || tolerance < 0)
      bad(expectedId, `entry "${id}" has no tolerance`);

    entries.push({
      id,
      source,
      derivation,
      ...(typeof derivationNote === 'string' ? { derivationNote } : {}),
      input: entry['input'],
      expected: entry['expected'],
      tolerance,
    });
  }

  return { id: expectedId, description, entries };
}
