/**
 * The chrome the mockups draw once and every screen shares (F-234).
 *
 * **One tab bar** (criterion 1, ADR-0117). `01` governs the tab bar (R9 §6 C1), and there is one:
 * one file builds the tab navigator, and one file draws `@irodora/ui`'s `TabBar` — the adapter the
 * navigator hands its bar to. A second navigator, or a screen drawing its own bar, would be a
 * second tab bar whatever it looked like, and nothing but this would notice.
 *
 * **The routes still on the platform header** (criterion 2, ADR-0118) are a ratchet. `AppBar` draws
 * the mockups' headers, and each pushed route moves to it when its screen feature rebuilds it, so the
 * bar's elements sit in the tree that feature's conformance sweep reads. Until then the route keeps
 * the stack's header, and this list says which routes those are and which feature owes each. It may
 * only shrink: a new route on the platform header, or a listed one that has moved, is reported.
 *
 * The sources are read as text and never executed (E-099).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const MOBILE = join(__dirname, '..');

function sources(dir: string): readonly string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/u.test(name) ? [path] : [];
  });
}

/**
 * A source with its comments removed. The scans below read code: a comment quoting an import (as
 * `src/tabs.ts`'s does, to explain E-099) builds nothing.
 */
export function code(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//gu, '').replace(/^\s*\/\/.*$/gmu, '');
}

/** Every app source's code, keyed by its path under `apps/mobile`, with `/` separators. */
const APP: ReadonlyMap<string, string> = new Map(
  ['app', 'src']
    .flatMap((d) => sources(join(MOBILE, d)))
    .map(
      (p) => [relative(MOBILE, p).split('\\').join('/'), code(readFileSync(p, 'utf8'))] as const,
    ),
);

/** The names a source imports at runtime from `from`, over every import statement. */
function imported(source: string, from: string): readonly string[] {
  const escaped = from.replace(/[/.]/gu, (c) => `\\${c}`);
  const pattern = new RegExp(`import\\s+(?!type\\b)\\{([^}]*)\\}\\s*from\\s*'${escaped}'`, 'gu');
  return [...source.matchAll(pattern)].flatMap((m) =>
    (m[1] ?? '')
      .split(',')
      .map((n) => n.trim())
      .filter((n) => n !== '' && !n.startsWith('type ')),
  );
}

/** Whether a source builds a tab navigator: `expo-router`'s `Tabs`, or React Navigation's own. */
export function buildsTabNavigator(source: string): boolean {
  return (
    imported(source, 'expo-router').includes('Tabs') ||
    imported(source, '@react-navigation/bottom-tabs').length > 0
  );
}

/** Whether a source draws `@irodora/ui`'s `TabBar`. */
export function drawsTabBar(source: string): boolean {
  return /<TabBar\b/u.test(source);
}

const where = (test: (source: string) => boolean): readonly string[] =>
  [...APP].filter(([, source]) => test(source)).map(([path]) => path);

describe('one tab bar (F-234, ADR-0117)', () => {
  it('one file builds the tab navigator', () => {
    expect(where(buildsTabNavigator)).toStrictEqual(['app/(tabs)/_layout.tsx']);
  });

  it('one file draws the bar: the adapter the navigator hands it to', () => {
    expect(where(drawsTabBar)).toStrictEqual(['src/tabBar.tsx']);
  });

  it('DECOY: a planted second navigator or bar is found', () => {
    expect(buildsTabNavigator("import { Stack, Tabs } from 'expo-router';")).toBe(true);
    expect(
      buildsTabNavigator(
        "import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';",
      ),
    ).toBe(true);
    expect(drawsTabBar('return <TabBar items={items} />;')).toBe(true);
    // A type import builds nothing, and neither does a comment naming the import.
    expect(
      buildsTabNavigator("import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';"),
    ).toBe(false);
    const quoted = "/** its first line is `import { Tabs } from 'expo-router'` */";
    expect(buildsTabNavigator(quoted)).toBe(true);
    expect(buildsTabNavigator(code(quoted))).toBe(false);
  });

  it('names the one in-page tab set, which is not a navigation bar', () => {
    /*
     * `@irodora/ui`'s `Tabs` switches between two panels of one colour's detail (06), inside the
     * screen: it moves nobody anywhere, so it is not a second tab bar. Named rather than ignored, so
     * a second use is a decision somebody sees. Its drawing is F-247's, under 06.
     */
    expect(where((s) => imported(s, '@irodora/ui').includes('Tabs'))).toStrictEqual([
      'src/screens/ColourDetail.tsx',
    ]);
  });
});

/**
 * The pushed routes still on the stack's header, and the screen feature that moves each to `AppBar`.
 * `profile/measure` has no mockup; its header waits on OQ-7 with the rest of it.
 */
const PLATFORM_HEADER: Readonly<Record<string, string>> = {
  'atlas/[slug]': 'F-247 (06)',
  'atlas/card/[slug]': 'F-253 (20)',
  'atlas/compare': 'F-249 (08)',
  'atlas/find': 'F-250 (09)',
  'atlas/nearby/[slug]': 'F-254 (21)',
  'atlas/palettes': 'F-251 (10, 16)',
  'atlas/wear/[slug]': 'F-248 (07)',
  'atlas/with/[slug]': 'F-252 (19)',
  'atlas/with/reading/[id]': 'F-259 (24)',
  'profile/export': 'F-263 (18)',
  'profile/measure': 'F-261, no mockup (OQ-7)',
  'profile/preferences': 'F-262 (15)',
  'wardrobe/add': 'F-256 (12)',
  'wardrobe/outfit': 'F-257 (13)',
  'wardrobe/shopping': 'F-258 (22)',
  'wardrobe/with/[id]': 'F-259 (24)',
};

/**
 * The routes a stack draws its header over: every route file in a tab's stack, less the ones the
 * stack hides it for (`<Stack.Screen name="…" options={{ headerShown: false }} />`) and the ones that
 * hide it themselves. Keyed as `group/route`, from sources keyed by their path under `apps/mobile`.
 */
export function onPlatformHeader(files: ReadonlyMap<string, string>): readonly string[] {
  const TABS_DIR = 'app/(tabs)/';
  const hidden = /headerShown:\s*false/u;
  const out: string[] = [];
  for (const [path, source] of files) {
    const layout = /^app\/\(tabs\)\/([^/]+)\/_layout\.tsx$/u.exec(path);
    if (layout === null || !source.includes('<Stack')) continue;
    const group = layout[1] ?? '';
    if (/screenOptions=\{\{[^}]*headerShown:\s*false/u.test(source)) continue;
    const hiddenByStack = new Set(
      [
        ...source.matchAll(
          /<Stack\.Screen\s+name="([^"]+)"\s+options=\{\{[^}]*headerShown:\s*false[^}]*\}\}/gu,
        ),
      ].map((m) => m[1]),
    );
    for (const [route, code] of files) {
      if (!route.startsWith(`${TABS_DIR}${group}/`) || route.endsWith('/_layout.tsx')) continue;
      const name = route.slice(`${TABS_DIR}${group}/`.length).replace(/\.tsx$/u, '');
      if (!hiddenByStack.has(name) && !hidden.test(code)) out.push(`${group}/${name}`);
    }
  }
  return out.sort();
}

describe('the routes still on the platform header (F-234, ADR-0118)', () => {
  it('are exactly the ones listed, each with the feature that moves it', () => {
    expect(onPlatformHeader(APP)).toStrictEqual(Object.keys(PLATFORM_HEADER).sort());
  });

  const LAYOUT = `<Stack><Stack.Screen name="index" options={{ headerShown: false }} /></Stack>`;
  const ROUTE = `<Screen><Text>A</Text></Screen>`;

  it('DECOY: reports a new route on the platform header', () => {
    const files = new Map([
      ['app/(tabs)/atlas/_layout.tsx', LAYOUT],
      ['app/(tabs)/atlas/index.tsx', ROUTE],
      ['app/(tabs)/atlas/brand-new.tsx', ROUTE],
    ]);
    expect(onPlatformHeader(files)).toStrictEqual(['atlas/brand-new']);
  });

  it('DECOY: a route that hid the header itself is no longer on it, so its entry is stale', () => {
    const files = new Map([
      ['app/(tabs)/atlas/_layout.tsx', LAYOUT],
      ['app/(tabs)/atlas/compare.tsx', `<Stack.Screen options={{ headerShown: false }} />`],
    ]);
    expect(onPlatformHeader(files)).toStrictEqual([]);
    expect(Object.keys(PLATFORM_HEADER)).toContain('atlas/compare');
  });
});
