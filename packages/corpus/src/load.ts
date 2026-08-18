/**
 * Loading a published corpus version — with the checksum verified, or not at all.
 *
 * FR-25 and the threat model both require the checksum to be verified **at load**, not only at
 * write. So there is exactly one way into a `VersionBundle` from text, it takes the expected
 * root digest as an argument, and it throws on mismatch. There is no warn mode and no
 * `{ verify: false }`, because an option to skip verification is a verification nobody
 * performs on the day it matters.
 *
 * **A checksum mismatch is a SEV1** with no threshold and no grace period
 * (`content/AGENTS.md`). There is no benign explanation for immutable content differing from
 * its recorded checksum, so the error says that rather than suggesting a retry.
 */

import { entryDigest, type DigestFn } from './digest.js';
import { parseEntry, serialiseEntry } from './entry.js';
import { CorpusError } from './errors.js';
import { parsePalette } from './palette.js';
import { requireRecord, requireString, VERSION_ID_PATTERN } from './primitives.js';
import {
  bundleRootDigest,
  type Ledger,
  type LedgerRow,
  type PublishedEntry,
  type PublishedPalette,
  type VersionBundle,
} from './version.js';

/**
 * The derived block, parsed back.
 *
 * Deliberately NOT re-derived here. Loading must reproduce what was published, byte for byte,
 * so a stored recommendation still resolves (FR-10) — re-deriving on read would silently
 * return today's engine's answer for an old version, which is the failure the whole
 * reproducibility envelope exists to prevent. The `content` gate is what compares the stored
 * values against the current engine, and it does so as a check, not as a repair.
 */
function parseDerived(v: unknown, path: string, src: string): PublishedEntry['derived'] {
  const o = requireRecord(v, path, src);
  const triple = (key: string): [number, number, number] => {
    const raw: unknown = o[key];
    if (!Array.isArray(raw) || raw.length !== 3)
      throw new CorpusError(src, `${path}.${key}`, 'expected three numbers');
    const [a, b, c] = raw as unknown[];
    if (typeof a !== 'number' || typeof b !== 'number' || typeof c !== 'number')
      throw new CorpusError(src, `${path}.${key}`, 'expected three numbers');
    return [a, b, c];
  };
  const bool = (key: string): boolean => {
    const raw: unknown = o[key];
    if (typeof raw !== 'boolean')
      throw new CorpusError(src, `${path}.${key}`, 'expected a boolean');
    return raw;
  };
  const num = (key: string): number => {
    const raw: unknown = o[key];
    if (typeof raw !== 'number' || !Number.isFinite(raw))
      throw new CorpusError(src, `${path}.${key}`, 'expected a finite number');
    return raw;
  };
  return {
    lab: triple('lab'),
    lch: triple('lch'),
    oklch: triple('oklch'),
    rgb: triple('rgb'),
    hex: requireString(o['hex'], `${path}.hex`, src),
    inSrgbGamut: bool('inSrgbGamut'),
    renderDeltaE00: num('renderDeltaE00'),
    lightnessOutOfRange: bool('lightnessOutOfRange'),
  };
}

function parseBundle(value: unknown, src: string): VersionBundle {
  const o = requireRecord(value, '', src);

  const label = requireString(o['label'], 'label', src);
  if (!VERSION_ID_PATTERN.test(label))
    throw new CorpusError(src, 'label', `expected YYYY.MM.N; got "${label}"`);

  const rawEntries: unknown = o['entries'];
  if (!Array.isArray(rawEntries)) throw new CorpusError(src, 'entries', 'expected an array');
  const rawPalettes: unknown = o['palettes'];
  if (!Array.isArray(rawPalettes)) throw new CorpusError(src, 'palettes', 'expected an array');

  const entries: PublishedEntry[] = rawEntries.map((raw, i) => {
    const path = `entries[${String(i)}]`;
    const e = requireRecord(raw, path, src);
    return {
      entry: parseEntry(e['entry'], `${src} ${path}.entry`),
      derived: parseDerived(e['derived'], `${path}.derived`, src),
      digest: requireString(e['digest'], `${path}.digest`, src),
    };
  });

  const palettes: PublishedPalette[] = rawPalettes.map((raw, i) => {
    const path = `palettes[${String(i)}]`;
    const p = requireRecord(raw, path, src);
    return {
      palette: parsePalette(p['palette'], `${src} ${path}.palette`),
      digest: requireString(p['digest'], `${path}.digest`, src),
    };
  });

  return {
    label,
    corpusSchemaVersion: requireString(o['corpusSchemaVersion'], 'corpusSchemaVersion', src),
    engine: requireString(o['engine'], 'engine', src),
    publishedAt: requireString(o['publishedAt'], 'publishedAt', src),
    entries,
    palettes,
  };
}

/** Parse `content/versions/index.json`. */
export function parseLedger(value: unknown, src: string): Ledger {
  if (!Array.isArray(value)) throw new CorpusError(src, '(root)', 'expected an array of rows');
  const seen = new Set<string>();
  return value.map((raw, i) => {
    const path = `[${String(i)}]`;
    const o = requireRecord(raw, path, src);
    const label = requireString(o['label'], `${path}.label`, src);
    if (seen.has(label))
      throw new CorpusError(
        src,
        `${path}.label`,
        `"${label}" appears twice. The ledger is append-only: a version is published once, and ` +
          'a second row for the same label means one of them is not the version that shipped.',
      );
    seen.add(label);
    const entryCount: unknown = o['entryCount'];
    if (typeof entryCount !== 'number' || !Number.isInteger(entryCount) || entryCount < 0)
      throw new CorpusError(src, `${path}.entryCount`, 'expected a non-negative integer');
    return {
      label,
      checksum: requireString(o['checksum'], `${path}.checksum`, src),
      engine: requireString(o['engine'], `${path}.engine`, src),
      publishedAt: requireString(o['publishedAt'], `${path}.publishedAt`, src),
      entryCount,
    } satisfies LedgerRow;
  });
}

/**
 * Load a published version and verify its checksum, or throw.
 *
 * `expectedRootDigest` comes from the **ledger** — never from the bundle. That separation is
 * the whole mechanism: a bundle carrying its own expected digest would verify against itself.
 */
export function loadPublishedVersion(
  bundleText: string,
  expectedRootDigest: string,
  digestOf: DigestFn,
  src = 'version bundle',
): VersionBundle {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bundleText);
  } catch (error) {
    throw new CorpusError(
      src,
      '(root)',
      `is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    );
  }

  const bundle = parseBundle(parsed, src);

  // Per-entry digests first, so a mismatch NAMES the entry. Checking only the root would turn
  // a SEV1 into a search across every record in the version.
  for (const { entry, derived, digest } of bundle.entries) {
    const actual = entryDigest({ entry: serialiseEntry(entry), derived }, digestOf);
    if (actual !== digest)
      throw new CorpusError(
        src,
        `entries.${entry.slug}`,
        `checksum mismatch: recorded ${digest}, computed ${actual}. A published entry is ` +
          'immutable — correcting one means publishing a NEW corpus version, never editing ' +
          'this file (FR-10). There is no benign explanation for immutable content differing ' +
          'from its recorded checksum: treat this as a SEV1.',
      );
  }

  for (const { palette, digest } of bundle.palettes) {
    const actual = entryDigest(palette, digestOf);
    if (actual !== digest)
      throw new CorpusError(
        src,
        `palettes.${palette.slug}`,
        `checksum mismatch: recorded ${digest}, computed ${actual}. Treat this as a SEV1.`,
      );
  }

  const actualRoot = bundleRootDigest(bundle, digestOf);
  if (actualRoot !== expectedRootDigest)
    throw new CorpusError(
      src,
      'checksum',
      `root checksum mismatch: the ledger records ${expectedRootDigest}, the bundle computes ` +
        `${actualRoot}. Every per-entry digest matched, so this is the SET that changed — an ` +
        'entry was added or removed without minting a new version. Treat this as a SEV1.',
    );

  return bundle;
}

/**
 * Find a version's ledger row, or throw.
 *
 * A bundle with no ledger row cannot be loaded at all. That is deliberate: it is the case
 * where a file appeared in `content/versions/` without going through a publish, and there is
 * nothing to verify it against.
 */
export function ledgerRowFor(ledger: Ledger, label: string, src: string): LedgerRow {
  const row = ledger.find((r) => r.label === label);
  if (row === undefined)
    throw new CorpusError(
      src,
      label,
      `has no row in the ledger. A version bundle with no ledger entry has nothing to verify ` +
        'it against, so it cannot be loaded — which is the correct outcome for a file that ' +
        'appeared without going through a publish.',
    );
  return row;
}
