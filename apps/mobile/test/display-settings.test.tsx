/**
 * The three display settings `15` draws (F-239, FR-61, NFR-8).
 *
 * ## What only this layer can answer
 *
 * Not that tabular figures look different — `packages/ui` asserts what `Text` renders, and the
 * manifest owns the font feature. What is answerable *here* is whether a switch a person moved
 * survives the app being closed, whether a row written by a build that no longer exists stops it
 * opening, and whether the haptics switch reaches the one gesture it names without reaching a save.
 *
 * ## The asymmetry that is deliberate, and therefore tested from both sides
 *
 * `"false"` is the only value that turns anything off. Everything else — absent, empty, `"no"`,
 * `"0"`, a string from a future build — reads as on, which is what `15` draws. A setting whose OFF
 * state depended on parsing succeeding would silently turn itself back on after a bad write, so the
 * decoys below are as much the point as the round trip is.
 */

import { fireEvent, render } from '@testing-library/react-native';
import {
  DISPLAY_SETTING_KEYS,
  DisplaySettingsProvider,
  DRAWN_DISPLAY_SETTINGS,
  Swatch,
  swatchAccessibleName,
  ThemeProvider,
  useDisplaySettings,
  type DisplaySettingKey,
} from '@irodora/ui';
import { Text as RNText } from 'react-native';
import { fromSpace } from '@irodora/color-core';

import {
  DISPLAY_SETTING_STORE_KEYS,
  DisplayProvider,
  readDisplaySettings,
  useDisplay,
  writeDisplaySetting,
  type DisplaySettingsStore,
} from '../src/displaySettings';
import { noHaptics, selectionGated, type Haptics } from '../src/haptics';
import { Preferences, type PreferenceStore } from '../src/screens/Preferences';
import { en } from '../src/i18n/en';

/** An in-memory settings store — the two methods, and a record of what was written. */
function fakeSettings(
  initial: Readonly<Record<string, string>> = {},
): DisplaySettingsStore & { readonly rows: Map<string, string> } {
  const rows = new Map<string, string>(Object.entries(initial));
  return {
    rows,
    getSetting: (key) => rows.get(key),
    putSetting: (key, value) => {
      rows.set(key, value);
    },
  };
}

const preferenceStore: PreferenceStore = {
  listPreferences: () => [],
  resetPreferences: () => {
    /* nothing is reset in this file */
  },
};

describe('what is stored, and what is read back', () => {
  it('reads every setting as on when the device has no row for it', () => {
    // The state the product shipped in, and the state `15` draws. A person who has never opened
    // this screen must see exactly what they saw before the feature existed.
    expect(readDisplaySettings(fakeSettings())).toStrictEqual(DRAWN_DISPLAY_SETTINGS);
  });

  it('round-trips each setting through the store, one key at a time', () => {
    for (const key of DISPLAY_SETTING_KEYS) {
      const store = fakeSettings();
      writeDisplaySetting(store, key, false, 1);
      expect(readDisplaySettings(store)[key]).toBe(false);
      writeDisplaySetting(store, key, true, 2);
      expect(readDisplaySettings(store)[key]).toBe(true);
    }
  });

  /*
   * THE DECOY FOR A TYPO IN THE KEY TABLE.
   *
   * Three booleans behind three string keys is exactly the shape where one key answers for two
   * settings and everything still compiles: the round trip above would pass with all three keys
   * spelled the same. Turning ONE off has to leave the other two alone.
   */
  it('gives each setting its own row, so one switch never moves another', () => {
    for (const key of DISPLAY_SETTING_KEYS) {
      const store = fakeSettings();
      writeDisplaySetting(store, key, false, 1);
      const read = readDisplaySettings(store);
      for (const other of DISPLAY_SETTING_KEYS) expect(read[other]).toBe(other !== key);
      expect([...store.rows.keys()]).toStrictEqual([DISPLAY_SETTING_STORE_KEYS[key]]);
    }
  });

  it('spells the three keys distinctly', () => {
    const keys = DISPLAY_SETTING_KEYS.map((k) => DISPLAY_SETTING_STORE_KEYS[k]);
    expect(new Set(keys).size).toBe(keys.length);
  });

  /*
   * A ROW A PERSON — OR AN OLDER BUILD — PUT THERE. A preference that threw on the way in would
   * take the whole app down for a string, and the app is how somebody would fix the string.
   */
  it.each(['', 'no', '0', 'off', 'FALSE', 'False', 'true', 'yes', '{"on":false}'])(
    'reads %p as on, because only "false" is off',
    (raw) => {
      const store = fakeSettings({ [DISPLAY_SETTING_STORE_KEYS.tabularNumerals]: raw });
      expect(readDisplaySettings(store).tabularNumerals).toBe(true);
    },
  );

  it('reads exactly "false" as off', () => {
    const store = fakeSettings({ [DISPLAY_SETTING_STORE_KEYS.tabularNumerals]: 'false' });
    expect(readDisplaySettings(store).tabularNumerals).toBe(false);
  });
});

describe('the provider holds the choice and writes it once', () => {
  /** Renders what the two hooks report, so both halves are read from the same tree. */
  function Probe({ onChange }: { readonly onChange?: DisplaySettingKey }): React.JSX.Element {
    const { settings, change } = useDisplay();
    const read = useDisplaySettings();
    return (
      <RNText
        testID="probe"
        onPress={() => {
          if (onChange !== undefined) change(onChange, false);
        }}
      >
        {DISPLAY_SETTING_KEYS.map((k) => `${k}:${String(settings[k])}:${String(read[k])}`).join(
          ' ',
        )}
      </RNText>
    );
  }

  it('hands the ui provider the same values it holds', () => {
    const store = fakeSettings({ [DISPLAY_SETTING_STORE_KEYS.hapticOnSelection]: 'false' });
    const tree = render(
      <DisplayProvider store={store} now={() => 1}>
        <Probe />
      </DisplayProvider>,
    );
    expect(tree.getByTestId('probe')).toHaveTextContent(
      'tabularNumerals:true:true hapticOnSelection:false:false provenanceBadges:true:true',
    );
  });

  it('persists a change and shows it in the same frame', () => {
    const store = fakeSettings();
    const tree = render(
      <DisplayProvider store={store} now={() => 7}>
        <Probe onChange="provenanceBadges" />
      </DisplayProvider>,
    );
    fireEvent.press(tree.getByTestId('probe'));
    expect(store.rows.get(DISPLAY_SETTING_STORE_KEYS.provenanceBadges)).toBe('false');
    expect(tree.getByTestId('probe')).toHaveTextContent(
      'tabularNumerals:true:true hapticOnSelection:true:true provenanceBadges:false:false',
    );
    // And it survives the app being closed: a second provider over the same rows agrees.
    expect(readDisplaySettings(store).provenanceBadges).toBe(false);
  });

  it('throws outside the provider, because a writer that does nothing cannot be seen', () => {
    // `useDisplaySettings()` deliberately does NOT throw — the two hooks answer different
    // questions, and this asserts the difference rather than restating one of them.
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<Probe />)).toThrow(/useDisplay\(\) outside a <DisplayProvider>/u);
    quiet.mockRestore();
  });
});

describe('the rows 15 draws', () => {
  /**
   * The three strings READ OFF `mockups/15_settings_preferences.jpg`, at the crop
   * `x 20 y 740 w 730 h 220` scaled 2x — `15.engine.*.label`, top to bottom.
   *
   * ## Why they are written out here rather than taken from the catalogue
   *
   * F-239's review caught the first draft comparing each rendered label to `en['settings.tabular']`
   * and calling that *"named as 15 names them"*. It is not: it is the screen's own string compared
   * with itself, and a typo in `en.ts` passes it. Nothing in the repository holds drawn COPY — the
   * inventories record a box, a token and `copy.shape`, never the words — so this is the one place
   * the drawing's text exists as data, and it is a transcription a second person can check against
   * the image.
   *
   * The heading carries `15`'s leading ordinal for the same reason the catalogue does.
   */
  const DRAWN = {
    heading: '3. Professional Engine & Controls',
    tabularNumerals: 'Tabular Numeric Figures (ΔE / OKLCh)',
    hapticOnSelection: 'Haptic Feedback on Swatch Selection',
    provenanceBadges: 'Show Provenance Badges on Swatches',
  } as const;

  const LABELS = {
    tabularNumerals: en['settings.tabular'],
    hapticOnSelection: en['settings.haptics'],
    provenanceBadges: en['settings.provenance'],
  } as const satisfies Record<DisplaySettingKey, string>;

  it('renders the words the mockup draws, not a paraphrase of them', () => {
    // Rule 14: the drawing is the specification. This is the assertion that fails if somebody
    // tidies "Figures" to "figures" or drops the "(ΔE / OKLCh)" that says where they appear.
    expect(en['settings.engine']).toBe(DRAWN.heading);
    for (const key of DISPLAY_SETTING_KEYS) expect(LABELS[key]).toBe(DRAWN[key]);
  });

  function screen(
    display: Record<DisplaySettingKey, boolean>,
    onChange?: (key: DisplaySettingKey, value: boolean) => void,
  ) {
    return render(
      <ThemeProvider>
        <Preferences
          store={preferenceStore}
          display={display}
          {...(onChange === undefined ? {} : { onChangeDisplaySetting: onChange })}
        />
      </ThemeProvider>,
    );
  }

  it('draws all three, named as 15 names them, each announcing its state', () => {
    const tree = screen({
      tabularNumerals: true,
      hapticOnSelection: false,
      provenanceBadges: true,
    });
    for (const key of DISPLAY_SETTING_KEYS) {
      const node = tree.getByTestId(`display.${key}`);
      // The label is the accessible name, so the drawn word and the announced one cannot differ.
      expect(node.props['accessibilityLabel']).toBe(LABELS[key]);
      expect(node.props['accessibilityState']).toMatchObject({
        checked: key !== 'hapticOnSelection',
      });
    }
  });

  it('reports which switch moved, and to what', () => {
    const moves: [DisplaySettingKey, boolean][] = [];
    const tree = screen(
      { tabularNumerals: true, hapticOnSelection: true, provenanceBadges: true },
      (key, value) => moves.push([key, value]),
    );
    for (const key of DISPLAY_SETTING_KEYS)
      fireEvent(tree.getByTestId(`display.${key}`), 'onSelectedChange', false);
    expect(moves).toStrictEqual([
      ['tabularNumerals', false],
      ['hapticOnSelection', false],
      ['provenanceBadges', false],
    ]);
  });

  it('renders the three switches without a writer, which is what the conformance suite does', () => {
    const tree = screen(DRAWN_DISPLAY_SETTINGS);
    for (const key of DISPLAY_SETTING_KEYS)
      expect(() => {
        fireEvent(tree.getByTestId(`display.${key}`), 'onSelectedChange', false);
      }).not.toThrow();
  });
});

describe('the haptics switch gates the selection and nothing else', () => {
  /** A port that counts each verb separately. */
  function counting(): Haptics & {
    readonly commits: () => number;
    readonly selections: () => number;
  } {
    let c = 0;
    let s = 0;
    return {
      commit: () => {
        c += 1;
      },
      select: () => {
        s += 1;
      },
      commits: () => c,
      selections: () => s,
    };
  }

  it('fires a selection when the setting is on', () => {
    const h = counting();
    selectionGated(h, true).select();
    expect(h.selections()).toBe(1);
  });

  it('fires none when it is off', () => {
    const h = counting();
    selectionGated(h, false).select();
    expect(h.selections()).toBe(0);
  });

  /*
   * THE ASSERTION ADR-0104 IS ABOUT. The switch names SELECTION. Turning it off is not a request
   * to mute a saved garment, and a gate that silenced both would be a mute button wearing a
   * specific label — which is precisely the disagreement-with-the-platform failure F-206 named.
   */
  it('lets a commit through either way', () => {
    for (const on of [true, false]) {
      const h = counting();
      selectionGated(h, on).commit();
      expect(h.commits()).toBe(1);
    }
  });

  it('exposes the two verbs and no more, gated or not', () => {
    expect(Object.keys(selectionGated(noHaptics, false))).toStrictEqual(['commit', 'select']);
  });
});

describe('the provenance switch never reaches the provenance', () => {
  /*
   * THE HALF THIS FEATURE CAN ASSERT TODAY (ADR-0005, F-233).
   *
   * `15`'s third switch hides a BADGE. The chip it hides belongs to the sample family and lands
   * with F-233, which is blocked behind F-225 — so what is checkable here is the boundary itself:
   * the accessible name is composed from the colour's provenance and has no path to the setting
   * at all. A person using a screen reader is told where the colour came from whatever the switch
   * says, which is the rule a badge-hiding preference could plausibly break later.
   */
  const color = fromSpace('srgb', [0.18, 0.35, 0.53], { source: 'reference', confidence: 1 });

  /** What a screen reader is handed for this swatch, under a given setting. */
  function announced(provenanceBadges: boolean): string | undefined {
    const tree = render(
      <ThemeProvider>
        <DisplaySettingsProvider settings={{ ...DRAWN_DISPLAY_SETTINGS, provenanceBadges }}>
          <Swatch name="Konjo" hex="#2E5A88" color={color} />
        </DisplaySettingsProvider>
      </ThemeProvider>,
    );
    const node = tree.getByLabelText(/Konjo/u);
    const label: unknown = node.props['accessibilityLabel'];
    return typeof label === 'string' ? label : undefined;
  }

  it('says where the colour came from whichever way the switch is set', () => {
    /*
     * RENDERED BOTH WAYS, rather than asserting the function's arity.
     *
     * The first draft of this test asserted `swatchAccessibleName.length === 3` and claimed that
     * a future badge preference could not change the string without changing that line. F-239's
     * review was right that it cannot fail: `Function.length` does not count optional or
     * defaulted parameters, so a fourth `settings?` argument leaves it at 3 and the test stays
     * green. This renders the component under both settings instead, which is what F-233's chip
     * would have to change to break the rule.
     */
    expect(announced(true)).toBe(announced(false));
    expect(announced(false)).toContain('reference');
    expect(announced(false)).toContain('100 percent confidence');
  });

  it('DECOY — the name is the one the helper composes, not a string this test invented', () => {
    // Without this, "both settings agree" would also pass for a component that announced its
    // own name and nothing else, in both states, forever.
    expect(announced(true)).toBe(swatchAccessibleName('Konjo', '#2E5A88', color));
  });
});
