/**
 * A haptic on a commit and on choosing a swatch, and on nothing else (F-206, NFR-8, ADR-0104).
 *
 * **A haptic on a scroll is why people turn haptics off.** So the assertions that matter here
 * are the negative ones: the decoys are the feature.
 *
 * F-239 added the second verb, because `15` draws a switch that names selection and rule 14 makes
 * the drawing win. The count is now TWO, and this file is where that stops being three.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render } from '@testing-library/react-native';
import { DISPLAY_SETTING_KEYS, ThemeProvider } from '@irodora/ui';
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

/** A port that counts each verb separately — one number could not tell them apart. */
function counting(): Haptics & {
  readonly commits: () => number;
  readonly selections: () => number;
} {
  let c = 0;
  let sel = 0;
  return {
    commit: () => {
      c += 1;
    },
    select: () => {
      sel += 1;
    },
    commits: () => c,
    selections: () => sel,
  };
}

describe('the port has two verbs, and the count is the guarantee', () => {
  it('exposes commit and select, and nothing else', () => {
    /*
     * A module that cannot express "buzz on scroll" is one nobody can use to buzz on scroll.
     * `light()` and `impact(style)` are each an invitation to fire on something that is neither
     * a commit nor a choice, and this is what stops one being added without a conversation.
     *
     * IT WAS ONE UNTIL F-239, and the diff to this line is the whole visible cost of ADR-0104:
     * a second verb, named for the one gesture `15` draws a switch for. A third would have to
     * come through here too.
     */
    expect(Object.keys(noHaptics)).toEqual(['commit', 'select']);
  });

  it('does nothing by default, so an unwired screen is a silent screen', () => {
    expect(() => {
      noHaptics.commit();
      noHaptics.select();
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
    expect(h.commits()).toBe(1);
    expect(h.selections()).toBe(0);
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
    expect(h.commits()).toBe(0);
    expect(h.selections()).toBe(0);
  });

  /*
   * THE SETTINGS SWITCHES FIRE NOTHING, INCLUDING THE ONE ABOUT HAPTICS (F-239).
   *
   * F-206 names what a commit is — "a garment saved, a reading taken, a theme chosen" — and a
   * preference switch is not on that list. The haptics row makes the case on its own: a switch
   * that buzzed to confirm being turned off would answer with the thing it had just refused.
   */
  it('toggling any of the three display switches fires neither verb', () => {
    const h = counting();
    const tree = render(
      <ThemeProvider>
        <Preferences store={store} haptics={h} onChangeDisplaySetting={() => undefined} />
      </ThemeProvider>,
    );
    for (const key of DISPLAY_SETTING_KEYS) {
      fireEvent(tree.getByTestId(`display.${key}`), 'onSelectedChange', false);
    }
    expect(h.commits()).toBe(0);
    expect(h.selections()).toBe(0);
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
