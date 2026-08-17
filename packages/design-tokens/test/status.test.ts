/**
 * NFR-9 as a compile error.
 *
 * The runtime cases below are the small half. The important half is `test/types/`, where a
 * status built without an icon must fail `tsc` — a rule that has never been watched fail is
 * configuration that parses
 * [[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]].
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseManifest, statusPresentation, THEMES, type Manifest } from '../src/index.js';

const MANIFEST_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'docs',
  'design',
  'design-system.manifest.json',
);
const manifest: Manifest = parseManifest(JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')));

describe('statusPresentation', () => {
  it('carries all three channels', () => {
    const entry = manifest.statusPairing['bad'];
    expect(entry).toBeDefined();
    const presented = statusPresentation('bad', entry!, 'Could not read this colour');
    expect(presented.colorToken).toBe('status.bad');
    expect(presented.iconToken).toBe('icon.cross');
    expect(presented.text).toBe('Could not read this colour');
  });

  it('refuses an empty label', () => {
    // `text: ''` satisfies `string`, so the type alone does not close this door. An empty
    // label is a status carried by colour and an icon — the thing NFR-9 forbids, reached
    // through the front door.
    const entry = manifest.statusPairing['ok']!;
    expect(() => statusPresentation('ok', entry, '')).toThrow(/visible text label/u);
    expect(() => statusPresentation('ok', entry, '   ')).toThrow(/visible text label/u);
    // The baseline: a real label is accepted, so the assertions above are about emptiness
    // rather than about the function throwing on everything.
    expect(() => statusPresentation('ok', entry, 'Verified')).not.toThrow();
  });

  it('every status token in the manifest has a pairing', () => {
    const paired = new Set(Object.values(manifest.statusPairing).map((e) => e.colorToken));
    for (const theme of THEMES)
      for (const name of Object.keys(manifest.color[theme]))
        if (name.startsWith('status.')) expect(paired, `${theme}.${name}`).toContain(name);
  });
});
