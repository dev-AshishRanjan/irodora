/**
 * The fifth member of `MeasurementSource`, and the three places a union member has to reach.
 *
 * ## Why this file is in the app and not in the engine
 *
 * `derived` (F-207, ADR-0100) is declared in `@irodora/color-core`, which has zero runtime
 * dependencies and no `node:*` — so it cannot read the harness's copy table, and it does not
 * know the database exists. The app is the only place that imports the engine and the store
 * at once, which makes it the only place the reach can be checked at all.
 *
 * ## The runtime witness of a compile-time union
 *
 * `MeasurementSource` is a TYPE. It is erased, so a test cannot iterate it — and iterating is
 * the whole method here. So F-207 turned the union into DATA and derived the type from it:
 * `MEASUREMENT_SOURCES` is the source of truth, and `MeasurementSource` is
 * `(typeof MEASUREMENT_SOURCES)[number]`. Reading the const is therefore reading the union
 * itself rather than a copy of it.
 *
 * THE OTHER CANDIDATE WAS `measurementSourceSchema.options` FROM `@irodora/contracts`, and
 * the dead-package check refused it, correctly: the app declares that package unused pending
 * F-209, and a test import would have made a true statement about the product false.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CAPTURED_SOURCES, MEASUREMENT_SOURCES, UNSAFE_HEX_PROVENANCE } from '@irodora/color-core';
import { MIGRATIONS } from '@irodora/store';
import { displayFromOklch } from '../src/engine';

const SOURCES: readonly string[] = MEASUREMENT_SOURCES;

describe('the union gained a member for a colour an engine computed', () => {
  it('has `derived`, and it is untracked rather than a capture', () => {
    /*
     * The placement is the assertion. A computed colour has no capture conditions to owe, and
     * ADR-0005's whole argument is that the union REFUSES the object rather than asking nicely
     * — so `derived` appearing on the captured side would be a colour able to claim an
     * illuminant nobody observed.
     */
    expect(SOURCES).toContain('derived');

    // `UntrackedSource` is `Exclude<MeasurementSource, CapturedSource>` and has no runtime
    // form, so the exclusion is COMPUTED here the same way the type computes it — rather
    // than a second list that could be right today and wrong after the sixth member.
    const untracked = SOURCES.filter((s) => !(CAPTURED_SOURCES as readonly string[]).includes(s));
    expect(untracked).toContain('derived');
    expect(CAPTURED_SOURCES as readonly string[]).not.toContain('derived');
  });

  it('DECOY — and the other four are still where they were', () => {
    // Without this, the case above would also pass on a union that had been rewritten wholesale.
    expect([...SOURCES].sort()).toStrictEqual([
      'calibrated',
      'declared',
      'derived',
      'estimated',
      'reference',
    ]);
    expect([...CAPTURED_SOURCES]).toStrictEqual(['calibrated', 'estimated']);
  });
});

describe('a computed colour says so, and a typed one still does not', () => {
  it('`displayFromOklch` reports `derived`', () => {
    /*
     * The site that argued for the member. Its input is a bare OKLCh coordinate — no
     * provenance at all — and what comes back is this engine computing a colour from it: a
     * harmony companion, an Atlas swatch, the Lens rendering a capture. It said `declared`
     * until F-207, and `declared` means a PERSON asserted the value.
     */
    expect(displayFromOklch([0.6, 0.1, 40]).color.provenance.source).toBe('derived');
  });

  it('DECOY — `unsafeFromHex` still reports `declared`, because a hex IS somebody typing', () => {
    /*
     * This is what stops F-207 being a global find-and-replace. `declared` did not become
     * wrong; it became narrower. A hex string is the case the word was always for, and it keeps
     * its confidence of 0.5 — a value honest about knowing nothing.
     */
    expect(UNSAFE_HEX_PROVENANCE.source).toBe('declared');
    expect(UNSAFE_HEX_PROVENANCE.confidence).toBe(0.5);
  });
});

describe('every member has been ruled on, and the two that cannot be are named', () => {
  it('the copy table has a row for each source and no orphans', () => {
    /*
     * ADR-0031 §1 binds permissible language to the source. The table is data in `claims.json`
     * and is NOT YET ENFORCED — it activates with the render-tree check — which is exactly why
     * a missing row would go unnoticed: a member with no row is a source nobody has decided the
     * language for, and the lint that would have complained is switched off.
     */
    const claims: unknown = JSON.parse(
      readFileSync(
        join(__dirname, '..', '..', '..', '.harness', 'verification', 'claims.json'),
        'utf8',
      ),
    );
    const table = (claims as { provenanceLanguage: { table: Record<string, unknown> } })
      .provenanceLanguage.table;
    expect(Object.keys(table).sort()).toStrictEqual([...SOURCES].sort());
  });

  it('the database accepts every source EXCEPT the new one, and that is deliberate', () => {
    /*
     * `saved_color.source` is guarded by a SQL `CHECK`, and it does not list `derived`.
     *
     * THAT IS A DECISION, NOT AN OVERSIGHT (F-207). Nothing can write one: `saveColor` has no
     * callers in the app, and the two writers are the wardrobe (`estimated`) and the corpus
     * (`reference`). SQLite cannot alter a CHECK without rebuilding the table, and rebuilding a
     * table that holds user data for a value nothing produces is speculative work against the
     * one thing that must not break.
     *
     * So this case is the marker. THE DAY A SCREEN SAVES A COMPUTED COLOUR — a companion added
     * to a palette, say — it fails here, by name, with the migration named as the work, instead
     * of failing on a device as a constraint error nobody can read.
     *
     * The allowed set is DISCOVERED from the migration SQL rather than restated, because a
     * fixture that writes down what it is checking agrees with it on the day it was written
     * [[a-proof-that-names-a-file-rots-when-the-file-is-not-the-only-one]].
     */
    const checks = MIGRATIONS.flatMap((m) => [
      ...m.up.matchAll(/CHECK \(source IN \(([^)]*)\)\)/gu),
    ]);
    expect(checks.length).toBeGreaterThan(0);

    const allowed = (checks.at(-1)?.[1] ?? '')
      .split(',')
      .map((s) => s.trim().replace(/^'|'$/gu, ''));

    expect(allowed).not.toContain('derived');
    expect(SOURCES.filter((s) => !allowed.includes(s))).toStrictEqual(['derived']);

    /*
     * And the disagreement runs the other way too, which is why this is a comparison rather
     * than a subset check: the column has admitted `unknown` since migration 1 and the union
     * never had it. The read path refuses that value BY NAME rather than reconstructing it.
     */
    expect(allowed.filter((s) => !SOURCES.includes(s))).toStrictEqual(['unknown']);
  });
});
