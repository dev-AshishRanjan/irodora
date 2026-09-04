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

  it('a swatch corner that removes more of the sample than the ceiling permits', () => {
    /*
     * THE REFUSAL SURVIVED THE REVERSAL, which is the point of ADR-0090. It used to read "not
     * 0"; it now reads "removes more area than declared" — the thing the zero stood in for.
     * 0.5 is a corner half the sample's width, which takes 21% of it; the manifest permits 2%.
     */
    expect(() => parseManifest(withValue(['radius', 'swatchRatio'], 0.5))).toThrow(
      /removes 21\.\d\d% of the sample/u,
    );
  });

  it('DECOY — a corner inside the ceiling is accepted', () => {
    // Without this the case above would pass for a loader that rejected every ratio, turning a
    // reversal into a different absolute rule.
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
});
