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
 *
 * And the lockup reads two faces' metrics as constants (F-230): they are read again here from the
 * faces' own tables.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { useEffect } from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { nativeFaces } from '@irodora/design-tokens';
import { GELASIO, GOTHIC } from '@irodora/ui';
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

/**
 * The tables a lockup's arithmetic reads, from a bundled face's bytes (F-230).
 *
 * Just enough TrueType for the numbers `GELASIO` and `GOTHIC` carry: `head`'s units per em,
 * `hhea`'s ascender and descender, `OS/2`'s typographic pair and its USE_TYPO_METRICS bit, a word's
 * advance and ink box (`cmap` format 4, `hmtx`, and each glyph's box from `loca`/`glyf`), and `BASE`'s
 * ideographic character face. Read independently of the constants, so the constants are checked
 * against the font rather than against themselves.
 */
function faceTables(file: string) {
  const bytes = readFileSync(join(APP, 'assets', 'fonts', file));
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tables = new Map<string, number>();
  for (let i = 0; i < view.getUint16(4); i += 1)
    tables.set(bytes.toString('latin1', 12 + 16 * i, 16 + 16 * i), view.getUint32(20 + 16 * i));
  const at = (tag: string): number => {
    const offset = tables.get(tag);
    if (offset === undefined) throw new Error(`${file} has no ${tag}`);
    return offset;
  };
  const head = at('head');
  const hhea = at('hhea');
  const os2 = at('OS/2');

  // cmap format 4: Unicode (BMP) to glyph.
  const cmap = at('cmap');
  let format4 = -1;
  for (let i = 0; i < view.getUint16(cmap + 2); i += 1) {
    const sub = cmap + view.getUint32(cmap + 8 + 8 * i);
    if (view.getUint16(sub) === 4) format4 = sub;
  }
  const glyphOf = (codePoint: number): number => {
    const segments = view.getUint16(format4 + 6) / 2;
    const ends = format4 + 14;
    const starts = ends + 2 * segments + 2;
    const deltas = starts + 2 * segments;
    const ranges = deltas + 2 * segments;
    for (let s = 0; s < segments; s += 1) {
      if (codePoint > view.getUint16(ends + 2 * s)) continue;
      const start = view.getUint16(starts + 2 * s);
      if (codePoint < start) return 0;
      const delta = view.getInt16(deltas + 2 * s);
      const range = view.getUint16(ranges + 2 * s);
      if (range === 0) return (codePoint + delta) & 0xffff;
      const glyph = view.getUint16(ranges + 2 * s + range + 2 * (codePoint - start));
      return glyph === 0 ? 0 : (glyph + delta) & 0xffff;
    }
    return 0;
  };
  const longLoca = view.getInt16(head + 50) === 1;
  const loca = at('loca');
  const offsetOf = (glyph: number): number =>
    longLoca ? view.getUint32(loca + 4 * glyph) : 2 * view.getUint16(loca + 2 * glyph);
  const metrics = view.getUint16(hhea + 34);
  const advanceOf = (glyph: number): number =>
    view.getUint16(at('hmtx') + 4 * Math.min(glyph, metrics - 1));

  return {
    unitsPerEm: view.getUint16(head + 18),
    ascender: view.getInt16(hhea + 4),
    descender: view.getInt16(hhea + 6),
    typo: { ascender: view.getInt16(os2 + 68), descender: view.getInt16(os2 + 70) },
    useTypoMetrics: (view.getUint16(os2 + 62) & (1 << 7)) !== 0,
    /** A word set at no tracking: its advance and its ink, from the first glyph's origin, y up. */
    word(text: string) {
      let pen = 0;
      const ink = {
        inkLeft: Infinity,
        inkRight: -Infinity,
        inkTop: -Infinity,
        inkBottom: Infinity,
      };
      for (const character of text) {
        const glyph = glyphOf(character.codePointAt(0) ?? 0);
        if (glyph === 0) throw new Error(`${file} has no glyph for ${character}`);
        if (offsetOf(glyph + 1) > offsetOf(glyph)) {
          const box = at('glyf') + offsetOf(glyph);
          ink.inkLeft = Math.min(ink.inkLeft, pen + view.getInt16(box + 2));
          ink.inkBottom = Math.min(ink.inkBottom, view.getInt16(box + 4));
          ink.inkRight = Math.max(ink.inkRight, pen + view.getInt16(box + 6));
          ink.inkTop = Math.max(ink.inkTop, view.getInt16(box + 8));
        }
        pen += advanceOf(glyph);
      }
      return { advance: pen, ...ink };
    },
    /** The default script's baseline coordinates in `BASE`'s horizontal axis, by tag. */
    baselines(): Readonly<Record<string, number>> {
      const base = at('BASE');
      const axis = base + view.getUint16(base + 4);
      const tagList = axis + view.getUint16(axis);
      const tags = Array.from({ length: view.getUint16(tagList) }, (_, i) =>
        bytes.toString('latin1', tagList + 2 + 4 * i, tagList + 6 + 4 * i),
      );
      const scripts = axis + view.getUint16(axis + 2);
      const script = scripts + view.getUint16(scripts + 6);
      const values = script + view.getUint16(script);
      return Object.fromEntries(
        tags.map((tag, k) => [tag, view.getInt16(values + view.getUint16(values + 4 + 2 * k) + 2)]),
      );
    },
  };
}

describe('the lockup’s metrics are the bundled faces’ (F-230, ADR-0123)', () => {
  const gelasio = faceTables('Gelasio-Regular.ttf');
  const gothic = faceTables('NotoSansJP-Subset.ttf');

  it('carries Gelasio’s em, its line metrics and the name’s extent as the font declares them', () => {
    expect({
      unitsPerEm: gelasio.unitsPerEm,
      ascender: gelasio.ascender,
      descender: gelasio.descender,
      name: gelasio.word('Irodora'),
    }).toStrictEqual(GELASIO);
    // The face sets USE_TYPO_METRICS and its typographic pair is hhea's, so both platforms lay the
    // line out from the same two numbers.
    expect(gelasio.useTypoMetrics).toBe(true);
    expect(gelasio.typo).toStrictEqual({
      ascender: GELASIO.ascender,
      descender: GELASIO.descender,
    });
  });

  it('carries Noto Sans JP’s em, its line metrics and its ideographic character face', () => {
    const baselines = gothic.baselines();
    expect({
      unitsPerEm: gothic.unitsPerEm,
      ascender: gothic.ascender,
      descender: gothic.descender,
      faceTop: baselines['icft'],
      faceBottom: baselines['icfb'],
    }).toStrictEqual(GOTHIC);
    // 14's tagline, as drawn, fills the character face within five units. Its 知 is not in the
    // subset until the splash's copy is (F-231), so the drawn line is read without it.
    const drawn = gothic.word('彩り・色の性');
    expect(Math.abs(drawn.inkTop - GOTHIC.faceTop)).toBeLessThanOrEqual(5);
    expect(Math.abs(drawn.inkBottom - GOTHIC.faceBottom)).toBeLessThanOrEqual(5);
  });

  it('DECOY — Noto Sans JP’s typographic pair is not its line: the face does not set USE_TYPO_METRICS', () => {
    expect(gothic.useTypoMetrics).toBe(false);
    expect(gothic.typo).not.toStrictEqual({
      ascender: GOTHIC.ascender,
      descender: GOTHIC.descender,
    });
  });

  it('DECOY — another word is another extent, so the reader is not agreeing with anything', () => {
    expect(gelasio.word('irodora')).not.toStrictEqual(GELASIO.name);
  });
});
