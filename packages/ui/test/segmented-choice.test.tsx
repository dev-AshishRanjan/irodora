/**
 * ChoiceGroup's segmented row (F-232): one row inside a container, as board 00 and the screens draw a
 * single choice. It still announces as a radio group.
 *
 * The defaults are recomputed from the inventories. The drawing is checked part by part: the
 * container, the chosen segment's fill and its dot, the dividers, the hit area and the focus ring.
 * The `segment` treatment is held by a decoy: a chosen segment with no fill is reported.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react-native';
import { Pressable, Text as RNText, View } from 'react-native';
import { nativeColors, type Theme } from '@irodora/design-tokens';
import {
  ChoiceGroup,
  FOCUS_RING,
  SEGMENT_INSET,
  SEGMENTED_HEIGHT,
  SelectionDot,
  ThemeProvider,
  type Segmented,
} from '../src/index.js';
import {
  checkSubject,
  flattenStyle,
  tapTargetReach,
  type ConformanceSubject,
  type TestNode,
} from '../src/testing/index.js';

const INVENTORY = join(__dirname, '..', '..', '..', 'mockups', 'inventory');

interface Element {
  readonly id: string;
  readonly parent: string | null;
  readonly component: string | null;
  readonly box: { readonly y: number; readonly h: number };
  readonly dp: { readonly h: number } | null;
  readonly tokens?: Readonly<Record<string, string>>;
}
const elements: readonly Element[] = readdirSync(INVENTORY)
  .filter((f) => /^\d\d\.json$/u.test(f))
  .flatMap(
    (f) =>
      (JSON.parse(readFileSync(join(INVENTORY, f), 'utf8')) as { elements?: readonly Element[] })
        .elements ?? [],
  );
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[m] ?? NaN) : ((s[m - 1] ?? NaN) + (s[m] ?? NaN)) / 2;
};
const half = (v: number): number => Math.round(v * 2) / 2;

/** The screens' segmented groups: a ChoiceGroup with a scale and a filled (chosen) child. */
const groups = elements
  .filter((g) => g.component === 'ui:ChoiceGroup' && g.dp !== null)
  .map((g) => ({
    group: g,
    chosen: elements.find((k) => k.parent === g.id && k.tokens?.['bg'] !== undefined),
  }))
  .filter((x) => x.chosen !== undefined);

describe('the defaults are the inventories’, recomputed', () => {
  it('records the leading dot on every screen that draws one (02 07 10 12, F-232’s review)', () => {
    const dotted = groups
      .filter(({ chosen }) =>
        elements.some((k) => k.parent === chosen?.id && k.id.endsWith('.dot')),
      )
      .map((x) => x.group.id)
      .sort();
    expect(dotted).toStrictEqual([
      '07.occasion',
      '10.source',
      '12.form.category',
      '12.source.method',
    ]);
  });

  it('reads the six segmented rows the screens draw', () => {
    expect(groups.map((x) => x.group.id).sort()).toStrictEqual([
      '02.modes',
      '07.occasion',
      '10.source',
      '12.form.category',
      '12.source.method',
      '24.scope',
    ]);
  });

  it('SEGMENTED_HEIGHT is their median height', () => {
    expect(half(median(groups.map((x) => x.group.dp?.h ?? NaN)))).toBe(SEGMENTED_HEIGHT);
  });

  it('SEGMENT_INSET is their median inset of the chosen segment, in dp', () => {
    const insets = groups.map(({ group, chosen }) => {
      const dpPerPx = (group.dp?.h ?? NaN) / group.box.h;
      return ((chosen?.box.y ?? NaN) - group.box.y) * dpPerPx;
    });
    expect(half(median(insets))).toBe(SEGMENT_INSET);
  });
});

const dark = nativeColors.dark;
const OPTIONS = [
  { value: 'lens', label: 'Lens' },
  { value: 'photo', label: 'Photo' },
  { value: 'atlas', label: 'Atlas pick' },
  { value: 'hex', label: 'Hex' },
] as const;

function row(segmented: Segmented, value: string | null = 'lens', focused?: string) {
  return render(
    <ThemeProvider theme="dark">
      <ChoiceGroup
        label="Colour source"
        options={OPTIONS}
        value={value}
        onChange={() => undefined}
        segmented={segmented}
        focused={focused}
        testID="g"
      />
    </ThemeProvider>,
  );
}

/** Every host view's flattened style, in tree order. */
const styles = (): Record<string, unknown>[] =>
  screen
    .getByTestId('g')
    .findAll((n) => typeof n.type === 'string')
    .map((n) => flattenStyle((n.props as { style?: unknown }).style));

describe('the drawing', () => {
  it('draws 00’s form: an accent segment in a border.strong outline, with no dot', () => {
    const { UNSAFE_getAllByType } = row({
      mark: 'fill',
      selectedFill: 'accent',
      edge: 'border.strong',
    });
    const all = styles();
    expect(all.some((s) => s['borderColor'] === dark['border.strong'])).toBe(true);
    expect(all.some((s) => s['backgroundColor'] === dark.accent)).toBe(true);
    expect(
      UNSAFE_getAllByType(SelectionDot).filter((d) => (d.props as { visible: boolean }).visible),
    ).toHaveLength(0);
  });

  it('draws the screens’ form: a filled segment led by a dot, in a border outline', () => {
    const { UNSAFE_getAllByType } = row({ selectedFill: 'surface.3' });
    const all = styles();
    expect(all.some((s) => s['borderColor'] === dark.border)).toBe(true);
    expect(all.filter((s) => s['backgroundColor'] === dark['surface.3'])).toHaveLength(1);
    expect(
      UNSAFE_getAllByType(SelectionDot).filter((d) => (d.props as { visible: boolean }).visible),
    ).toHaveLength(1);
  });

  it('draws no caption: the group’s name is announced, not shown', () => {
    row({});
    expect(screen.queryByText('Colour source')).toBeNull();
    const group = screen
      .getByTestId('g')
      .findAll(
        (n) => (n.props as { accessibilityLabel?: string }).accessibilityLabel === 'Colour source',
      );
    expect(group.length).toBeGreaterThan(0);
  });

  it('rules a divider only between two unchosen segments (02)', () => {
    row({ dividers: true }, 'lens');
    // lens (chosen) | photo — atlas — hex: two dividers, none beside the chosen segment.
    expect(
      styles().filter((s) => s['width'] === 1 && s['backgroundColor'] === dark.border),
    ).toHaveLength(2);
  });

  it('DECOY — draws no dividers unless the screen draws them', () => {
    row({}, 'lens');
    expect(styles().filter((s) => s['width'] === 1)).toHaveLength(0);
  });

  it('draws each segment inside the container by the inset, and reaches the target', () => {
    row({ height: 31 });
    const segments = screen
      .getByTestId('g')
      .findAll(
        (n) =>
          typeof n.type === 'string' &&
          (n.props as { accessibilityState?: { selected?: boolean } }).accessibilityState
            ?.selected !== undefined,
      );
    expect(segments.length).toBeGreaterThan(0);
    for (const s of segments) {
      const style = flattenStyle((s.props as { style?: unknown }).style);
      expect(style['height']).toBe(31 - 2 * SEGMENT_INSET);
      const reach = tapTargetReach(style, (s.props as { hitSlop?: never }).hitSlop);
      expect(reach.height).toBeGreaterThanOrEqual(44);
    }
  });

  it('rings the focused segment, and nothing else', () => {
    row({}, 'lens', 'photo');
    const rings = styles().filter((s) => s['borderColor'] === dark.ring);
    expect(rings).toHaveLength(1);
    expect(rings[0]?.['borderWidth']).toBe(FOCUS_RING);
  });

  it('keeps its labels on one line, in the chosen ink and the rest secondary', () => {
    const { UNSAFE_getAllByType } = row({ selectedFill: 'surface.3' });
    const colours = UNSAFE_getAllByType(RNText).map(
      (t) => flattenStyle((t.props as { style?: unknown }).style)['color'],
    );
    expect(colours).toStrictEqual([
      dark.foreground,
      dark['foreground.2'],
      dark['foreground.2'],
      dark['foreground.2'],
    ]);
  });
});

describe('the segment treatment', () => {
  /** A segmented subject whose chosen segment is filled, or not. */
  const subject = (filled: boolean): ConformanceSubject => ({
    name: filled ? 'filled' : 'bare',
    kind: 'interactive',
    selectable: true,
    treatment: 'segment',
    render: (state: string, theme: Theme): TestNode => {
      const selected = state === 'active';
      const rendered = render(
        <View>
          <Pressable
            accessibilityRole="radio"
            accessibilityLabel="Lens"
            accessibilityState={{ selected, disabled: state === 'disabled', busy: false }}
            style={{
              minWidth: 44,
              minHeight: 44,
              backgroundColor:
                selected && filled ? nativeColors[theme]['surface.2'] : 'transparent',
            }}
          />
        </View>,
      );
      const json = rendered.toJSON() as TestNode;
      rendered.unmount();
      return json;
    },
  });
  const treatment = (s: ConformanceSubject): number =>
    checkSubject(s, ['dark']).filter((f) => f.rule === 'selection-treatment').length;

  it('passes a chosen segment that is filled, with no dot', () => {
    expect(treatment(subject(true))).toBe(0);
  });

  it('DECOY — reports a chosen segment with no fill', () => {
    expect(treatment(subject(false))).toBe(1);
  });

  it('DECOY — reports a chosen segment filled in its own ground, which no one can see', () => {
    // F-232's review: surface.2 on surface.2 passed the first version of the rule.
    const hidden: ConformanceSubject = {
      name: 'fill-in-own-ground',
      kind: 'interactive',
      selectable: true,
      treatment: 'segment',
      render: (state: string, theme: Theme): TestNode => {
        const r = render(
          <ThemeProvider theme={theme}>
            <ChoiceGroup
              label="Colour source"
              options={OPTIONS}
              value={state === 'active' ? 'lens' : null}
              onChange={() => undefined}
              segmented={{ mark: 'fill', ground: 'surface.2', selectedFill: 'surface.2' }}
              disabled={state === 'disabled'}
              loading={state === 'loading'}
              testID={state}
            />
          </ThemeProvider>,
        );
        const json = r.toJSON() as TestNode;
        r.unmount();
        return json;
      },
    };
    expect(treatment(hidden)).toBe(1);
    // and the same row with a fill it does not rest in passes
    expect(
      treatment({
        ...hidden,
        name: 'fill-in-accent',
        render: (state: string, theme: Theme): TestNode => {
          const r = render(
            <ThemeProvider theme={theme}>
              <ChoiceGroup
                label="Colour source"
                options={OPTIONS}
                value={state === 'active' ? 'lens' : null}
                onChange={() => undefined}
                segmented={{ mark: 'fill', ground: 'surface.2', selectedFill: 'accent' }}
                disabled={state === 'disabled'}
                loading={state === 'loading'}
                testID={state}
              />
            </ThemeProvider>,
          );
          const json = r.toJSON() as TestNode;
          r.unmount();
          return json;
        },
      }),
    ).toBe(0);
  });
});
