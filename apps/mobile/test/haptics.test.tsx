/**
 * A haptic on a commit, and on nothing else (F-206, NFR-8).
 *
 * **A haptic on a scroll is why people turn haptics off.** So the assertions that matter here
 * are the negative ones: the decoys are the feature.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import { noHaptics, type Haptics } from '../src/haptics';
import { Preferences, type PreferenceStore } from '../src/screens/Preferences';
import { en } from '../src/i18n/en';

/** The two methods Preferences reads, and nothing else. */
const store: PreferenceStore = {
  listPreferences: () => [],
  resetPreferences: () => {
    /* nothing is reset in this file */
  },
};

/** A port that counts. */
function counting(): Haptics & { readonly fired: () => number } {
  let n = 0;
  return {
    commit: () => {
      n += 1;
    },
    fired: () => n,
  };
}

describe('the port has one verb', () => {
  it('exposes commit and nothing else', () => {
    /*
     * A module that cannot express "buzz on scroll" is one nobody can use to buzz on scroll.
     * `light()`, `selection()` and `impact(style)` are each an invitation to fire on something
     * that is not a commit, and this is what stops one being added without a conversation.
     */
    expect(Object.keys(noHaptics)).toEqual(['commit']);
  });

  it('does nothing by default, so an unwired screen is a silent screen', () => {
    expect(() => {
      noHaptics.commit();
    }).not.toThrow();
  });
});

describe('nothing imports the library except the port', () => {
  /**
   * The same shape as the Lens's exit table (F-178): one place calls the native module, so the
   * one-verb rule cannot be bypassed by importing around it.
   */
  const sources = ['src/screens', 'src/lens', 'app'].flatMap((dir) =>
    walk(join(__dirname, '..', dir)),
  );

  it('finds files to check, so a clean result is not an empty scan', () => {
    expect(sources.length).toBeGreaterThan(0);
  });

  it('has no import of expo-haptics outside src/haptics.ts', () => {
    const offenders = sources.filter((f) =>
      readFileSync(f, 'utf8').includes("from 'expo-haptics'"),
    );
    expect(offenders).toStrictEqual([]);
  });

  it("DECOY — the scan does find the port's own import when pointed at it", () => {
    // Otherwise "no offenders" could mean the scan reads nothing at all.
    const port = readFileSync(join(__dirname, '..', 'src', 'haptics.ts'), 'utf8');
    expect(port).toContain("import('expo-haptics')");
  });
});

describe('a commit fires exactly one, and nothing else fires any', () => {
  it('choosing a theme fires one', () => {
    const h = counting();
    const tree = render(
      <ThemeProvider>
        <Preferences store={store} haptics={h} onChooseAppearance={() => undefined} />
      </ThemeProvider>,
    );
    const target = tree.queryAllByText(en['appearance.mode.dark'])[0];
    expect(target).toBeDefined();
    fireEvent.press(target!);
    expect(h.fired()).toBe(1);
  });

  /**
   * THE DECOY THIS FILE EXISTS FOR.
   *
   * "Fires on a commit" is satisfied by an implementation that fires on everything. Rendering
   * the screen, and re-rendering it, must fire none — those are the moments a person is reading
   * rather than deciding.
   */
  it('rendering and re-rendering fire none', () => {
    const h = counting();
    const tree = render(
      <ThemeProvider>
        <Preferences store={store} haptics={h} onChooseAppearance={() => undefined} />
      </ThemeProvider>,
    );
    tree.rerender(
      <ThemeProvider>
        <Preferences store={store} haptics={h} onChooseAppearance={() => undefined} />
      </ThemeProvider>,
    );
    expect(h.fired()).toBe(0);
  });
});

/** Every `.ts`/`.tsx` under a directory. */
function walk(dir: string): string[] {
  const out: string[] = [];
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) out.push(...walk(path));
    else if (/\.tsx?$/u.test(path)) out.push(path);
  }
  return out;
}
