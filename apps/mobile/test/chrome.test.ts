/**
 * The chrome the mockups draw once and every screen shares (F-234).
 *
 * **One tab bar** (criterion 1, ADR-0117). `01` governs the tab bar (R9 §6 C1), and there is one:
 * one file builds the tab navigator, and one file draws `@irodora/ui`'s `TabBar` — the adapter the
 * navigator hands its bar to. A second navigator, or a screen drawing its own bar, would be a
 * second tab bar whatever it looked like, and nothing but this would notice.
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
