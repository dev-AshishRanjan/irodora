/**
 * The loader, and the failures it must not let through.
 *
 * Every negative case here is a mutation of the REAL manifest rather than a hand-built
 * fixture, so each one starts from a document that is known to parse. A negative test
 * against a fixture that was never valid proves nothing about the file the gates read.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkStructure, ManifestError, parseManifest, THEMES, USAGES } from '../src/index.js';

const MANIFEST_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'docs',
  'design',
  'design-system.manifest.json',
);

const source = readFileSync(MANIFEST_PATH, 'utf8');

/**
 * A fresh mutable copy of the real manifest, plus the two operations every negative case
 * needs.
 *
 * The unsafe indexing is confined to `at`, which is called once per mutation with an
 * explicit path. Spraying `any` across thirty assertions would make the tests read as if the
 * manifest had no shape at all — and the point of these tests is that it does.
 */
type Json = Record<string, unknown>;

const clone = (): Json => JSON.parse(source) as Json;

/** Walk to the object holding the last path segment. */
function at(root: Json, path: readonly string[]): { holder: Json; key: string } {
  let node = root;
  for (const segment of path.slice(0, -1)) {
    const next = node[segment];
    if (typeof next !== 'object' || next === null)
      throw new Error(`path ${path.join('.')} does not exist in the manifest`);
    node = next as Json;
  }
  const key = path[path.length - 1];
  if (key === undefined) throw new Error('empty path');
  return { holder: node, key };
}

/** Replace a value, asserting the path existed — so a mutation cannot silently do nothing. */
function withValue(path: readonly string[], value: unknown): Json {
  const root = clone();
  const { holder, key } = at(root, path);
  if (!(key in holder)) throw new Error(`${path.join('.')} is not in the manifest`);
  holder[key] = value;
  return root;
}

/**
 * Remove a field, asserting it existed.
 *
 * Rebuilt on the way down rather than `delete`d: a dynamic delete is banned workspace-wide,
 * and copying every key except one is the same result without asking for an exception. The
 * "asserting it existed" half is the important half — a removal that silently does nothing
 * turns every negative case below into a test that parses a perfectly valid manifest.
 */
function without(path: readonly string[]): Json {
  const drop = (node: Json, remaining: readonly string[]): Json => {
    const [head, ...rest] = remaining;
    if (head === undefined) throw new Error('empty path');
    if (!(head in node)) throw new Error(`${head} is not in the manifest`);
    const out: Json = {};
    for (const [k, v] of Object.entries(node)) {
      if (k !== head) {
        out[k] = v;
        continue;
      }
      if (rest.length === 0) continue;
      if (typeof v !== 'object' || v === null)
        throw new Error(`path ${path.join('.')} does not exist in the manifest`);
      out[k] = drop(v as Json, rest);
    }
    return out;
  };
  return drop(clone(), path);
}

describe('the manifest as committed', () => {
  it('parses', () => {
    expect(() => parseManifest(clone())).not.toThrow();
  });

  it('has exactly one top-level `status`, and it is the approval string', () => {
    // The defect this exists for: the file once carried `"status": "approved"` AND
    // `"status": { ok, warn, bad }`. JSON keeps the last, so the approval value vanished at
    // parse time and `gate.contrast.blockingWhenStatus` compared against an object — the
    // gate's blocking condition could never be true. A duplicate key is not a syntax error
    // in any parser we use, so nothing would have said so.
    const occurrences = source.split('\n').filter((l) => /^ {2}"status":/u.test(l)).length;
    expect(occurrences).toBe(1);
    expect(typeof parseManifest(clone()).status).toBe('string');
  });

  it('declares the same token names in every theme', () => {
    const manifest = parseManifest(clone());
    const [reference, ...rest] = THEMES;
    const expected = Object.keys(manifest.color[reference]).sort();
    for (const theme of rest)
      expect(Object.keys(manifest.color[theme]).sort(), theme).toEqual(expected);
  });
});

describe('what the loader refuses', () => {
  it('a token with no usage', () => {
    const m = without(['color', 'dark', 'background', 'usage']);
    expect(() => parseManifest(m)).toThrow(ManifestError);
    expect(() => parseManifest(m)).toThrow(/usage/u);
  });

  it('a usage that is not one of the four', () => {
    expect(() =>
      parseManifest(withValue(['color', 'dark', 'background', 'usage'], 'body')),
    ).toThrow(/expected one of/u);

    // The baseline: every declared usage IS accepted, so the assertion above is about the
    // value rather than about the field being read at all.
    for (const usage of USAGES)
      expect(
        () => parseManifest(withValue(['color', 'dark', 'background', 'usage'], usage)),
        usage,
      ).not.toThrow();
  });

  it('a translucent token that names no compositeOver base', () => {
    expect(() => parseManifest(without(['color', 'dark', 'border', 'compositeOver']))).toThrow(
      /compositeOver/u,
    );
  });

  it('a compositeOver naming a token that does not exist', () => {
    expect(() =>
      parseManifest(withValue(['color', 'dark', 'border', 'compositeOver'], ['surface.9'])),
    ).toThrow(/surface\.9/u);
  });

  it('a compositeOver that is a bare string rather than a list of grounds', () => {
    // The single-ground form is what let the gate check the favourable case. It is not
    // accepted quietly and coerced — it is refused, so the migration cannot be half done.
    expect(() =>
      parseManifest(withValue(['color', 'dark', 'border', 'compositeOver'], 'surface.1')),
    ).toThrow(/every ground it may sit on/u);
  });

  it('a compositeOver that is an empty list', () => {
    expect(() =>
      parseManifest(withValue(['color', 'dark', 'border', 'compositeOver'], [])),
    ).toThrow(/every ground it may sit on/u);
  });

  it('a pairsWith naming a token that does not exist', () => {
    expect(() =>
      parseManifest(
        withValue(['color', 'dark', 'background', 'pairsWith'], ['foreground', 'foreground.4']),
      ),
    ).toThrow(/foreground\.4/u);
  });

  it('a token present in one theme and missing from the other', () => {
    expect(() => parseManifest(without(['color', 'light', 'status.warn']))).toThrow(
      /token names differ/u,
    );
  });

  it('a status pairing that does not require text (NFR-9)', () => {
    expect(() => parseManifest(withValue(['statusPairing', 'bad', 'textRequired'], false))).toThrow(
      /colour is never the only channel/u,
    );
  });

  it('a status pairing with no icon token (NFR-9)', () => {
    expect(() => parseManifest(without(['statusPairing', 'bad', 'iconToken']))).toThrow(
      /iconToken/u,
    );
  });

  it('a status pairing naming a colour token that does not exist', () => {
    expect(() =>
      parseManifest(withValue(['statusPairing', 'bad', 'colorToken'], 'status.terrible')),
    ).toThrow(/status\.terrible/u);
  });

  it('a swatch corner that leaves less of each edge straight than the floor permits', () => {
    /*
     * THE REFUSAL HAS SURVIVED TWO REWRITES, which is the point of it. It read "not 0" until
     * ADR-0090, then "removes more area than declared", and now — ADR-0094 — "leaves too little
     * of each edge straight", because area was the wrong measure: the difference between losing
     * 1.3% and 5.4% of a swatch is not something anybody can see, and what actually degrades a
     * sample is the corner growing until the shape stops being a field.
     *
     * 0.5 is a corner half the sample's width, which is a circle: nothing straight is left.
     */
    expect(() => parseManifest(withValue(['radius', 'swatchRatio'], 0.5))).toThrow(
      /leaves 0\.0% of each edge straight/u,
    );
  });

  it('DECOY — a corner inside the floor is accepted', () => {
    // Without this the case above would pass for a loader that rejected every ratio, turning a
    // bound into a different absolute rule. 0.25 is what the manifest ships and is exactly at
    // the floor; 0.1 is comfortably inside it.
    expect(() => parseManifest(withValue(['radius', 'swatchRatio'], 0.25))).not.toThrow();
    expect(() => parseManifest(withValue(['radius', 'swatchRatio'], 0.1))).not.toThrow();
  });

  it('an OKLCh lightness outside [0,1]', () => {
    expect(() =>
      parseManifest(withValue(['color', 'dark', 'background', 'oklch', 'l'], 1.4)),
    ).toThrow(/OKLCh L is \[0,1\]/u);
  });

  it('an alpha outside [0,1]', () => {
    expect(() =>
      parseManifest(withValue(['color', 'dark', 'border', 'oklch', 'alpha'], 1.5)),
    ).toThrow(/alpha is \[0,1\]/u);
  });

  it('the mutation helpers themselves fail on a path that does not exist', () => {
    // The helpers need their own decoy. If `without` silently no-opped on a wrong path,
    // every negative case above would be parsing a VALID manifest — and would then either
    // fail for the right reason by accident, or pass because parseManifest threw for
    // something else entirely. [[a-negative-test-needs-a-decoy-not-an-empty-fixture]]
    expect(() => without(['color', 'dark', 'background', 'usaeg'])).toThrow(
      /is not in the manifest/u,
    );
    expect(() => withValue(['color', 'dark', 'nonesuch', 'usage'], 'text')).toThrow(
      /does not exist in the manifest/u,
    );
  });
});

describe('coverage — an unchecked token must not look like a checked one', () => {
  it('every token is either covered by a pairing or declares why it is not', () => {
    const manifest = parseManifest(clone());
    for (const theme of THEMES) {
      const tokens = manifest.color[theme];
      const covered = new Set<string>();
      for (const [name, token] of Object.entries(tokens))
        for (const other of token.pairsWith) {
          covered.add(name);
          covered.add(other);
        }
      for (const [name, token] of Object.entries(tokens))
        expect(
          covered.has(name) || token.uncheckedReason !== undefined,
          `${theme}.${name} is covered by no pairing and gives no reason — the gate would ` +
            'say nothing about it, which reads as a pass',
        ).toBe(true);
    }
  });

  it('the gate reports a token that is covered by nothing and gives no reason', () => {
    // The decoy. `chart.1` currently carries an uncheckedReason; removing it must produce a
    // finding, or the coverage check is decoration.
    const m = without(['color', 'dark', 'chart.1', 'uncheckedReason']);
    const findings = checkStructure(parseManifest(m));
    expect(findings.map((f) => f.check)).toContain('coverage');
    expect(findings.some((f) => f.detail.includes('dark.chart.1'))).toBe(true);

    // The baseline: with the reason present there is no coverage finding at all.
    expect(checkStructure(parseManifest(clone())).filter((f) => f.check === 'coverage')).toEqual(
      [],
    );
  });

  it('the gate reports a stale reason on a token that IS covered', () => {
    // The inverse decoy — an exemption that outlives the fact it exempted. `foreground` is
    // covered because the surfaces list it, so a reason on it exempts nothing.
    // `withValue` refuses a key that is absent, so the field is added rather than replaced.
    const m = clone();
    const dark = (m['color'] as Json)['dark'] as Json;
    dark['foreground'] = {
      ...(dark['foreground'] as Json),
      uncheckedReason: 'no longer true',
    };
    const findings = checkStructure(parseManifest(m));
    expect(findings.some((f) => f.check === 'coverage' && f.detail.includes('IS covered'))).toBe(
      true,
    );
  });
  /*
   * --- THE SAMPLE FLOOR (F-151, ADR-0095) ------------------------------------------------
   *
   * These assert the ARITHMETIC, never the number. A test that expected 77 would agree with
   * whatever the parser produced the day it was written, which is the failure mode recorded in
   * E-085: the Android safe-zone check carried the previous mark's constants and would have
   * passed while the new mark was clipped.
   */
  it('derives the judgeable sample from the observer rather than reading it', () => {
    const m = parseManifest(clone());
    const size = (clone()['size'] ?? {}) as Json;

    const degrees = size['observerDegrees'] as number;
    const distance = size['viewingDistanceMm'] as number;
    const perInch = size['dpPerInch'] as number;

    // Re-derived here from the published definitions: the chord a field of θ subtends at
    // distance d, converted by the density-independent pixel's own definition.
    const mm = 2 * distance * Math.tan((degrees / 2) * (Math.PI / 180));
    expect(m.size.judgeable).toBe(Math.round(mm / (25.4 / perInch)));

    // And it is the 2° standard observer this product's colorimetry uses everywhere else,
    // which is the whole argument for the floor existing.
    expect(degrees).toBe(2);
  });

  it('moves when the viewing distance moves', () => {
    // The decoy in the direction that matters: an input change the value must follow. A
    // hard-coded constant would pass every other assertion here and fail this one.
    const near = parseManifest(withValue(['size', 'viewingDistanceMm'], 250));
    const far = parseManifest(withValue(['size', 'viewingDistanceMm'], 500));
    expect(near.size.judgeable).toBeLessThan(parseManifest(clone()).size.judgeable);
    expect(far.size.judgeable).toBeGreaterThan(parseManifest(clone()).size.judgeable);
  });

  it('REFUSES a judgeable written down instead of derived', () => {
    // Writing the value copies it out of its reasoning, and a copy cannot be checked against
    // the thing it came from. `withValue` refuses a key that is absent, so this adds it.
    const m = clone();
    m['size'] = { ...(m['size'] as Json), judgeable: 77 };
    expect(() => parseManifest(m)).toThrow(ManifestError);
    expect(() => parseManifest(m)).toThrow(/derived/u);
  });

  it('refuses a physical quantity that is not positive', () => {
    for (const key of ['observerDegrees', 'viewingDistanceMm', 'dpPerInch'])
      expect(() => parseManifest(withValue(['size', key], 0))).toThrow(ManifestError);
  });
});
