/**
 * Every bundled face is loaded before the first frame (F-226, criterion 4; ADR-0112).
 *
 * The manifest names the faces (`nativeFaces`), `src/fonts.ts` pairs each name with its file, and
 * `FontGate` hands that map to `useFonts` and draws nothing until it has loaded. A face the manifest
 * names and nobody loads is a `fontFamily` that resolves to the platform face on a device with every
 * test green; a face loaded under a name nothing sets is bundle weight. Both are refused here.
 *
 * The hold itself is RENDERED (F-226's review): `FontGate`, with the font loader held and released.
 * That the root layout wraps its whole tree in it, and holds the native splash at module scope, is
 * read off the route as text — a test may not import a route (E-099).
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useEffect } from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { nativeFaces } from '@irodora/design-tokens';
import { useFonts } from 'expo-font';
import { FONT_ASSETS } from '../src/fonts';
import { FontGate } from '../src/fontGate';

jest.mock('expo-font', () => ({ useFonts: jest.fn() }));

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
  const loader = useFonts as jest.MockedFunction<typeof useFonts>;

  /**
   * The app under the gate, standing in for the launch overlay: the overlay's FIRST FRAME is what
   * hides the native splash, so a child that records its own mount says whether any frame was drawn.
   */
  const mounted = jest.fn();
  function App(): React.JSX.Element {
    useEffect(() => {
      mounted();
    }, []);
    return <Text>the app</Text>;
  }

  beforeEach(() => {
    loader.mockReset();
    mounted.mockClear();
  });

  it('hands the whole map to useFonts', () => {
    loader.mockReturnValue([false, null]);
    render(
      <FontGate>
        <App />
      </FontGate>,
    );
    expect(loader).toHaveBeenCalledWith(FONT_ASSETS);
  });

  it('draws NOTHING while the faces load, so no frame can hide the splash over the gap', () => {
    loader.mockReturnValue([false, null]);
    const tree = render(
      <FontGate>
        <App />
      </FontGate>,
    );
    expect(tree.toJSON()).toBeNull();
    expect(mounted).not.toHaveBeenCalled();
  });

  it('DECOY — once they have loaded it draws the app, so the empty tree above is the hold', () => {
    loader.mockReturnValue([true, null]);
    const tree = render(
      <FontGate>
        <App />
      </FontGate>,
    );
    expect(tree.getByText('the app')).toBeTruthy();
    expect(mounted).toHaveBeenCalledTimes(1);
  });

  it('is what the root layout wraps its whole tree in, with the splash held at module scope', () => {
    // Read as text: a test may not import a route (E-099). The gate is the OUTERMOST element returned,
    // and the splash is held before any component renders.
    expect(LAYOUT_SOURCE).toMatch(/return \(\s*<FontGate>\s*<SafeAreaProvider>/u);
    expect(LAYOUT_SOURCE).toMatch(/^void SplashScreen\.preventAutoHideAsync\(\);$/mu);
    expect(LAYOUT_SOURCE).not.toContain('useFonts(');
  });
});
