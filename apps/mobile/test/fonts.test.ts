/**
 * Every bundled face is loaded before the first frame (F-226, criterion 4; ADR-0112).
 *
 * The manifest names the faces (`nativeFaces`), `src/fonts.ts` pairs each name with its file, and
 * the root layout hands that map to `useFonts` and draws nothing until it has loaded. A face the
 * manifest names and nobody loads is a `fontFamily` that resolves to the platform face on a device
 * with every test green; a face loaded under a name nothing sets is bundle weight. Both are
 * refused here, and the order that keeps the launch hand-over gapless is read off the layout.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nativeFaces } from '@irodora/design-tokens';
import { FONT_ASSETS } from '../src/fonts';

// jest transpiles to CJS, where `import.meta.url` is null; the runner's cwd is the package root.
const APP = process.cwd();
const FONTS_SOURCE = readFileSync(join(APP, 'src', 'fonts.ts'), 'utf8');
const LAYOUT_SOURCE = readFileSync(join(APP, 'app', '_layout.tsx'), 'utf8');

/** What the manifest names that nothing loads, and what is loaded that the manifest does not name. */
function unmatched(families: readonly string[], loaded: readonly string[]) {
  return {
    unloaded: families.filter((f) => !loaded.includes(f)).sort(),
    unnamed: loaded.filter((f) => !families.includes(f)).sort(),
  };
}

const FAMILIES = Object.values(nativeFaces).map((f) => f.family);

describe('the faces the manifest names are the faces the app loads', () => {
  it('reads three faces — an empty list would agree with anything', () => {
    expect(FAMILIES).toHaveLength(3);
  });

  it('loads every named face, and nothing else', () => {
    expect(unmatched(FAMILIES, Object.keys(FONT_ASSETS))).toStrictEqual({
      unloaded: [],
      unnamed: [],
    });
  });

  it('DECOY — a face the manifest adds without an asset is named', () => {
    expect(unmatched([...FAMILIES, 'Missing-Regular'], Object.keys(FONT_ASSETS))).toStrictEqual({
      unloaded: ['Missing-Regular'],
      unnamed: [],
    });
  });

  it.each(Object.values(nativeFaces))(
    'imports $family from the file it is cut to ($file)',
    (face) => {
      expect(FONTS_SOURCE).toContain(`'../assets/fonts/${face.file}'`);
      expect(existsSync(join(APP, 'assets', 'fonts', face.file))).toBe(true);
    },
  );
});

describe('the first frame waits for every face (criterion 4)', () => {
  it('hands the whole map to useFonts', () => {
    expect(LAYOUT_SOURCE).toContain('useFonts(FONT_ASSETS)');
  });

  it('draws nothing until they have loaded, so the native splash stays up across the gap', () => {
    // The splash is held by preventAutoHideAsync and hidden only once the overlay is shown
    // (launch.test.tsx); an early return while loading is what keeps any frame from being drawn
    // in the platform face first.
    expect(LAYOUT_SOURCE).toContain('SplashScreen.preventAutoHideAsync()');
    expect(LAYOUT_SOURCE).toMatch(/if \(!loaded\) return <><\/>;/u);
  });
});
