/**
 * The selection treatment, checked as decisions rather than as values.
 *
 * Every assertion below corresponds to a numbered decision in `selection.tsx`'s docblock. The
 * point is not that the edge is 2 px — that is a design value and it may move. The point is
 * that it is **the same in every state**, which is the property the layout depends on and the
 * one the two components got wrong independently.
 */

import { render } from '@testing-library/react-native';
import { nativeColors, THEMES as ALL_THEMES } from '@irodora/design-tokens';
import {
  currentTone,
  SelectionMark,
  selectionStyle,
  selectionTone,
  SELECTION_EDGE,
} from '../src/selection.js';
import { SearchField } from '../src/SearchField.js';
import { Swatch } from '../src/Swatch.js';
import { TextField } from '../src/TextField.js';
import { ThemeProvider } from '../src/theme.js';
import { fromSpace } from '@irodora/color-core';

/** A colour with provenance, because `Swatch` cannot be constructed without one (ADR-0005). */
const SAMPLE = fromSpace('oklch', [0.42, 0.09, 264], { source: 'declared', confidence: 1 });

const THEMES = ['dark', 'light'] as const;

describe('decision 1 — the edge is reserved, so selection never moves anything', () => {
  it.each(THEMES)('has the same border width in every state (%s)', (theme) => {
    const colors = nativeColors[theme];
    const widths = [
      { selected: false, focused: false },
      { selected: true, focused: false },
      { selected: false, focused: true },
      { selected: true, focused: true },
    ].map((s) => selectionTone(s, colors).borderWidth);

    expect(new Set(widths)).toEqual(new Set([SELECTION_EDGE]));
  });

  it.each(THEMES)('draws a transparent edge when nothing is on (%s)', (theme) => {
    const tone = selectionTone({ selected: false, focused: false }, nativeColors[theme]);
    expect(tone.borderColor).toBe('transparent');
    // And no ground of its own — the caller keeps whatever it was painting.
    expect(tone.background).toBeUndefined();
  });
});

describe('a selected swatch is the same size as an unselected one (F-187)', () => {
  /**
   * The property F-176 established as a rule, asserted here against the RENDERED component
   * rather than against the tone that feeds it.
   *
   * `selectionTone` returning a constant width is necessary and not sufficient: a component
   * could take the tone and then add its own conditional border, which is what `Swatch` and
   * `Chip` each did independently before F-176. The tone test says the rule is right; this
   * says the component follows it.
   */
  it.each(THEMES)('declares the same border width chosen or not (%s)', (theme) => {
    const widthOf = (selected: boolean): unknown => {
      const { getByRole } = render(
        <ThemeProvider theme={theme}>
          <Swatch
            name="Ai-nezumi"
            hex="#526A6B"
            color={SAMPLE}
            selected={selected}
            onPress={() => undefined}
          />
        </ThemeProvider>,
      );
      const style = getByRole('button').props['style'] as { readonly borderWidth?: number };
      return style.borderWidth;
    };
    expect(widthOf(true)).toBe(widthOf(false));
  });
});

describe('decision 2 — focus takes the edge, and selection keeps the fill and the mark', () => {
  it.each(THEMES)('selected alone: accent edge, accent.muted fill, marked (%s)', (theme) => {
    const colors = nativeColors[theme];
    const tone = selectionTone({ selected: true, focused: false }, colors);
    expect(tone.borderColor).toBe(colors.accent);
    expect(tone.background).toBe(colors['accent.muted']);
    expect(tone.mark).toBe(true);
  });

  it.each(THEMES)('focused alone: ring edge, no fill, no mark (%s)', (theme) => {
    const colors = nativeColors[theme];
    const tone = selectionTone({ selected: false, focused: true }, colors);
    expect(tone.borderColor).toBe(colors.ring);
    expect(tone.background).toBeUndefined();
    expect(tone.mark).toBe(false);
  });

  /**
   * THE LIVE DEFECT THIS FEATURE FIXES, asserted directly.
   *
   * `Swatch` wrote `borderColor: focused ? colors.ring : colors['border.strong']` on one
   * border, so a selected swatch that was focused showed ONLY focus. Selection disappeared for
   * exactly the person navigating by keyboard or Switch Control.
   */
  it.each(THEMES)(
    'selected AND focused: the ring shows and selection survives it (%s)',
    (theme) => {
      const colors = nativeColors[theme];
      const tone = selectionTone({ selected: true, focused: true }, colors);
      expect(tone.borderColor).toBe(colors.ring);
      expect(tone.background).toBe(colors['accent.muted']);
      expect(tone.mark).toBe(true);
    },
  );

  it.each(THEMES)('the two states never resolve to the same edge colour (%s)', (theme) => {
    const colors = nativeColors[theme];
    expect(colors.accent).not.toBe(colors.ring);
  });
});

describe('decision 4 — navigation is not selection', () => {
  it.each(THEMES)('currentTone never marks, in any state (%s)', (theme) => {
    const colors = nativeColors[theme];
    for (const selected of [true, false])
      for (const focused of [true, false])
        expect(currentTone({ selected, focused }, colors).mark).toBe(false);
  });

  it.each(THEMES)(
    'and is otherwise identical, so the colour language is one thing (%s)',
    (theme) => {
      const colors = nativeColors[theme];
      const state = { selected: true, focused: false };
      const selection = selectionTone(state, colors);
      const current = currentTone(state, colors);
      // Every field but `mark`. Named rather than destructured-and-discarded, so the assertion
      // says which fields it is holding equal instead of leaving that to a rest spread.
      expect({ ...current, mark: selection.mark }).toEqual(selection);
    },
  );
});

describe('selectionStyle', () => {
  it('omits backgroundColor rather than painting undefined over the caller', () => {
    const style = selectionStyle(
      selectionTone({ selected: false, focused: false }, nativeColors.dark),
    );
    expect('backgroundColor' in style).toBe(false);
  });

  it('sets it when the state is on', () => {
    const style = selectionStyle(
      selectionTone({ selected: true, focused: false }, nativeColors.dark),
    );
    expect(style.backgroundColor).toBe(nativeColors.dark['accent.muted']);
  });
});

describe('the mark', () => {
  it('renders nothing when it is not visible, so a call site can be unconditional', () => {
    /*
     * QUERIED BY ID RATHER THAN ASSERTED ON THE WHOLE TREE. `toJSON()` is never null here —
     * `ThemeProvider` mounts HeroUI's provider, which mounts a SafeAreaProvider, so the root
     * exists whatever its children do. The first draft asserted the tree was null and failed on
     * the harness rather than on the component, which is the shape of test that passes for the
     * wrong reason as soon as somebody "fixes" it.
     */
    const { queryByTestId } = render(
      <ThemeProvider theme="dark">
        <SelectionMark visible={false} testID="mark" />
      </ThemeProvider>,
    );
    expect(queryByTestId('mark')).toBeNull();
  });

  it('is absolutely positioned, so it costs no layout', () => {
    const { getByTestId } = render(
      <ThemeProvider theme="dark">
        <SelectionMark visible testID="mark" />
      </ThemeProvider>,
    );
    // Narrowed rather than reached through: a test node's props are `any`, and reading a
    // field off one is the unsafe access the linter flags. The cast states what is being
    // assumed, in one place, where a reviewer can see it.
    const style = getByTestId('mark').props['style'] as { readonly position?: string };
    expect(style.position).toBe('absolute');
  });

  /**
   * A DECOY IN THE OTHER DIRECTION. The badge must NOT be announced: the selection is already
   * in the accessible name and in `accessibilityState.selected`, and a third announcement makes
   * every chosen item say so three times.
   */
  it('is not announced — the name and the state carry the words', () => {
    const { getByTestId } = render(
      <ThemeProvider theme="dark">
        <SelectionMark visible testID="mark" />
      </ThemeProvider>,
    );
    const node = getByTestId('mark');
    expect(node.props['accessible']).not.toBe(true);
    expect(node.props['accessibilityLabel']).toBeUndefined();
  });
});

describe('focus is `ring` wherever it is drawn, in every theme (F-225, ADR-0111)', () => {
  /**
   * `border.strong` became DECORATIVE in F-225 — the mockups draw it where a label already names
   * the component — and `ring` took the state. The text fields drew focus in `border.strong` until
   * then, and nothing held them to it: the tone tests above cover `selectionTone`, which neither
   * field uses. So they are rendered here, focused and not, in every palette.
   */
  const fields = [
    [
      'TextField',
      'Name',
      () => <TextField label="Name" value="" onChangeText={() => undefined} focused />,
      () => <TextField label="Name" value="" onChangeText={() => undefined} />,
    ],
    [
      'SearchField',
      'Search',
      () => <SearchField label="Search" value="" onChangeText={() => undefined} focused />,
      () => <SearchField label="Search" value="" onChangeText={() => undefined} />,
    ],
  ] as const;

  const edge = (
    theme: (typeof ALL_THEMES)[number],
    label: string,
    field: () => React.JSX.Element,
  ) => {
    const { getByLabelText } = render(<ThemeProvider theme={theme}>{field()}</ThemeProvider>);
    return getByLabelText(label).props['style'] as {
      readonly borderColor?: string;
      readonly borderWidth?: number;
    };
  };

  it.each(
    ALL_THEMES.flatMap((t) =>
      fields.map(([name, label, on, off]) => [t, name, label, on, off] as const),
    ),
  )('%s — %s draws focus in ring, and no edge without it', (theme, _name, label, on, off) => {
    const colors = nativeColors[theme];
    expect(edge(theme, label, on).borderColor).toBe(colors.ring);
    expect(edge(theme, label, on).borderColor).not.toBe(colors['border.strong']);
    expect(edge(theme, label, off).borderWidth).toBe(0);
  });
});
