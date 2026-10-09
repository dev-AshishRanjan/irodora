/**
 * The app names none of `27`'s state tints (F-236, C10, E-188).
 *
 * The six tints minted for `27`'s pictures are drawn by `@irodora/ui`'s state components, each by
 * its one owner (`packages/ui/test/states.test.tsx` holds that). A screen that read one directly
 * would be a state's colour leaking into a surface no mockup drew it on. Each package scans only
 * itself, so its cached test result covers what it read.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const TINT = /'state\.(?:hanger|mark|refused\.plate|refused\.edge|refused\.glyph|lock)'/gu;

/** Every TypeScript source under a directory, with its text. */
function sources(dir: string): { readonly path: string; readonly text: string }[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) return sources(full);
    return /\.(ts|tsx)$/u.test(name) ? [{ path: full, text: readFileSync(full, 'utf8') }] : [];
  });
}

/** Each file that names a state tint, with the tints it names. */
const readers = (files: readonly { readonly path: string; readonly text: string }[]): string[] =>
  files.flatMap(({ path, text }) => (text.match(TINT) ?? []).map((t) => `${path}: ${t}`));

describe('the app names none of 27’s state tints', () => {
  const files = [
    ...sources(join(__dirname, '..', 'src')),
    ...sources(join(__dirname, '..', 'app')),
  ];

  it('reads the app’s source — an empty scan would agree with anything', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('finds no screen naming a state tint', () => {
    expect(readers(files)).toStrictEqual([]);
  });

  it('DECOY — a planted reader is named', () => {
    expect(readers([{ path: 'Planted.tsx', text: "colors['state.mark']" }])).toStrictEqual([
      "Planted.tsx: 'state.mark'",
    ]);
  });
});
