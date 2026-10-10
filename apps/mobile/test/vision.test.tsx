/**
 * The colour-vision preview as the app holds it, and the label it carries (F-240, ADR-0131 §5).
 *
 * - **Never written.** Cycling every mode writes nothing to the device. The decoy is a display
 *   setting changed beside it, which writes exactly one row — so a store that recorded nothing
 *   cannot pass this by recording nothing at all.
 * - **Labelled exactly while on.** The strip is absent in Standard and present in each mode, above
 *   the tab bar, naming the mode in words; the tritan qualification appears for Tritanopia alone, in
 *   both languages.
 */

import { Text as NativeText } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { simulatePaint } from '@irodora/design-tokens';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider, VisionPreviewProvider, VISION_MODES, type VisionMode } from '@irodora/ui';
import { DisplayProvider, useDisplay, type DisplaySettingsStore } from '../src/displaySettings';
import { useVision, VisionProvider } from '../src/vision';
import { VisionStrip, VISION_STRIP_TEST_ID } from '../src/VisionStrip';
import { AppTabBar, type NavigatorTabBar } from '../src/tabBar';
import { TABS } from '../src/tabs';
import { ColourCard } from '../src/screens/ColourCard';
import { paintedCard } from '../src/card';
import { allEntries } from '../src/corpus';
import { en } from '../src/i18n/en';
import { ja } from '../src/i18n/ja';

const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));
afterEach(() => {
  mockLanguageTag = DEFAULT_LANGUAGE_TAG;
});

/** A device store that records every write and holds nothing. */
function recordingStore(): DisplaySettingsStore & { readonly writes: string[] } {
  const writes: string[] = [];
  return {
    writes,
    getSetting: () => undefined,
    putSetting: (key) => {
      writes.push(key);
    },
  };
}

describe('the preview is never written', () => {
  /** Presses through every mode, then — only for the decoy — one display setting. */
  function Probe({ alsoASetting }: { readonly alsoASetting: boolean }): React.JSX.Element {
    const { vision, choose } = useVision();
    const { change } = useDisplay();
    return (
      <NativeText
        testID="probe"
        onPress={() => {
          for (const mode of VISION_MODES) choose(mode);
          if (alsoASetting) change('tabularNumerals', false);
        }}
      >
        {vision}
      </NativeText>
    );
  }
  const run = (alsoASetting: boolean): readonly string[] => {
    const store = recordingStore();
    render(
      <DisplayProvider store={store} now={() => 0}>
        <VisionProvider>
          <Probe alsoASetting={alsoASetting} />
        </VisionProvider>
      </DisplayProvider>,
    );
    fireEvent.press(screen.getByTestId('probe'));
    // The last mode chosen is in force: the presses reached the provider.
    expect(screen.getByTestId('probe').props['children']).toBe('tritanopia');
    return store.writes;
  };

  it('choosing every mode writes nothing to the device', () => {
    expect(run(false)).toStrictEqual([]);
  });

  it('DECOY — a display setting changed the same way writes exactly one row', () => {
    expect(run(true)).toHaveLength(1);
  });

  it('starts in Standard, every launch', () => {
    function Shows(): React.JSX.Element {
      return <NativeText testID="mode">{useVision().vision}</NativeText>;
    }
    render(
      <VisionProvider>
        <Shows />
      </VisionProvider>,
    );
    expect(screen.getByTestId('mode').props['children']).toBe('standard');
  });

  it('refuses to be read outside its provider rather than guessing', () => {
    function Reads(): null {
      useVision();
      return null;
    }
    // React reports the thrown render on console.error; silenced for this test alone, and restored
    // so a later test's error is still seen (F-240's review, minor 7).
    const quiet = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      expect(() => render(<Reads />)).toThrow(/outside a <VisionProvider>/u);
    } finally {
      quiet.mockRestore();
    }
  });
});

describe('the strip labels the preview exactly while it is on', () => {
  const strip = (mode: VisionMode) =>
    render(
      <ThemeProvider theme="dark">
        <VisionStrip mode={mode} />
      </ThemeProvider>,
    );

  it('draws nothing in Standard', () => {
    strip('standard');
    expect(screen.queryByTestId(VISION_STRIP_TEST_ID)).toBeNull();
  });

  it.each([
    ['protanopia', en['vision.mode.protanopia']],
    ['deuteranopia', en['vision.mode.deuteranopia']],
    ['tritanopia', en['vision.mode.tritanopia']],
  ] as const)(
    '%s: names the mode in words, the model, and what it does not reach',
    (mode, name) => {
      strip(mode);
      expect(screen.getByTestId(VISION_STRIP_TEST_ID)).toBeTruthy();
      expect(screen.getByText(`${en['vision.strip.label']}: ${name}`)).toBeTruthy();
      expect(screen.getByText(en['vision.strip.model'], { exact: false })).toBeTruthy();
    },
  );

  it('qualifies Tritanopia as approximate, and only Tritanopia', () => {
    strip('tritanopia');
    expect(screen.getByText(en['vision.strip.tritan'], { exact: false })).toBeTruthy();
  });

  it.each(['protanopia', 'deuteranopia'] as const)(
    'DECOY — %s carries no tritan qualification',
    (mode) => {
      strip(mode);
      expect(screen.queryByText(en['vision.strip.tritan'], { exact: false })).toBeNull();
    },
  );

  it('says the same in Japanese, with its own separator', () => {
    mockLanguageTag = 'ja-JP';
    strip('tritanopia');
    expect(
      screen.getByText(`${ja['vision.strip.label']}：${ja['vision.mode.tritanopia']}`),
    ).toBeTruthy();
    expect(
      screen.getByText(`${ja['vision.strip.model']}${ja['vision.strip.tritan']}`),
    ).toBeTruthy();
  });

  /*
   * WHAT THE PREVIEW DOES NOT REACH IS NAMED, ALL OF IT (ADR-0131 §4, F-240's review S1). The caption
   * had named photographs and the camera only, so a status bar or a keyboard, drawn by the system and
   * never simulated, read as if it were. Rule 11: the strip claims no more than the preview does.
   */
  it.each([
    ['en', en['vision.strip.model'], [/Photographs/u, /camera/u, /anything the system draws/u]],
    ['ja', ja['vision.strip.model'], [/写真/u, /カメラ/u, /システムが表示する部分/u]],
  ] as const)(
    '%s: names photographs, the camera and what the system draws',
    (_lang, caption, names) => {
      for (const name of names) expect(caption).toMatch(name);
    },
  );
});

describe('the strip rides on the tab bar, on every route', () => {
  const bar = (mode: VisionMode): void => {
    const props: NavigatorTabBar = {
      state: { index: 0, routes: TABS.map((t) => ({ key: t.name, name: t.name })) },
      navigation: {
        emit: (event) => ({ type: event.type }),
        navigate: () => undefined,
      },
      insets: { bottom: 34 },
    };
    render(
      <VisionPreviewProvider mode={mode}>
        <ThemeProvider theme="dark">
          <AppTabBar {...props} />
        </ThemeProvider>
      </VisionPreviewProvider>,
    );
  };

  it('is above the bar while a mode is on', () => {
    bar('deuteranopia');
    const json = JSON.stringify(screen.toJSON());
    const strip = json.indexOf(`"testID":"${VISION_STRIP_TEST_ID}"`);
    const firstTab = json.indexOf(`"testID":"${TABS[0].testID}"`);
    expect(strip).toBeGreaterThan(-1);
    expect(firstTab).toBeGreaterThan(strip);
  });

  it('DECOY — and absent from the bar in Standard', () => {
    bar('standard');
    expect(screen.queryByTestId(VISION_STRIP_TEST_ID)).toBeNull();
  });
});

describe('the colour card: its display is painted, its document is not (F-240, ADR-0131 §3)', () => {
  /** The xml each SvgXml on the card screen is given, in one mode. */
  const shownIn = (mode: VisionMode, slug: string): string[] => {
    render(
      <VisionPreviewProvider mode={mode}>
        <ThemeProvider theme="dark">
          <ColourCard slug={slug} />
        </ThemeProvider>
      </VisionPreviewProvider>,
    );
    return screen.UNSAFE_getAllByType(SvgXml).map((n) => String(n.props['xml']));
  };
  // A sample that moves under protanopia, so its own fill tells the two orders apart.
  const entry = allEntries().find(
    (e) => simulatePaint(e.derived.hex, 'protanopia') !== e.derived.hex,
  );

  it('shows the declared document in Standard, and that document painted in a mode', () => {
    expect(entry).toBeDefined();
    const slug = entry?.entry.slug ?? '';
    const standard = shownIn('standard', slug);
    const preview = shownIn('protanopia', slug);
    expect(preview).toStrictEqual(
      standard.map((svg) => paintedCard(svg, (css) => simulatePaint(css, 'protanopia'))),
    );
    // DECOY — a document built from the PAINTED palette would leave the sample's own fill raw:
    // the preview shows it simulated.
    const sample = entry?.derived.hex ?? '';
    expect(preview[0]).toContain(`fill="${simulatePaint(sample, 'protanopia')}"`);
    expect(preview[0]).not.toContain(`fill="${sample}"`);
  });
});
