/**
 * The sheet's detents, asserted where a default could silently replace them.
 *
 * ## Why this tests the RENDERED tree and not the constants
 *
 * The defect F-177 fixes was not a wrong number. It was **the absence of one**: `Sheet` passed
 * gorhom no `snapPoints`, gorhom's `enableDynamicSizing` defaults to `true`, and a sheet with
 * one detent has nothing to be dragged to. A test that asserted our own constants would have
 * been green throughout — the constants did not exist, and nothing was wrong with the ones that
 * did.
 *
 * So every assertion below reads the props off the rendered gorhom sheet. If HeroUI stops
 * spreading `Partial<BottomSheetProps>`, or a future default starts winning, these go red.
 *
 * ## What is NOT tested here, stated rather than implied
 *
 * The drag. jest renders a tree; it runs no Yoga pass, no gesture handler and no reanimated UI
 * thread (ADR-0055). Whether two detents 10% apart *feel* right is a device judgement, and it is
 * attested against F-177 rather than claimed here.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { BottomSheetHandle } from '@gorhom/bottom-sheet';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';
import { nativeColors } from '@irodora/design-tokens';
import {
  resizeSheet,
  Sheet,
  SHEET_FORMS,
  SHEET_HANDLE,
  ThemeProvider,
  type SheetProps,
} from '../src/index.js';
import { flattenStyle, type TestNode } from '../src/testing/index.js';

/**
 * A node in the rendered tree.
 *
 * INFERRED from what `render` returns rather than imported. `react-test-renderer` ships no
 * types in this tree and RNTL does not re-export the instance type, so the two obvious imports
 * are a `TS7016` and a `TS2305`. Inferring it cannot drift from the harness by construction,
 * which is better than either.
 */
type Instance = ReturnType<typeof render>['UNSAFE_root'];

/**
 * FAKE TIMERS, AND THE REASON IS NOT TIDINESS — it is the same one `conformance.test.tsx` has
 * carried since F-158, re-derived here the expensive way.
 *
 * Reanimated installs a mapper for every animated component, and `extractInputs` recurses
 * through any PLAIN OBJECT among its inputs with `Object.values`. React Native's CommonJS
 * namespace is a plain object whose every export is a lazy getter, so that walk calls
 * `TurboModuleRegistry.getEnforcing` for each in turn and throws on the first native module the
 * harness lacks — `DevMenu`, then `SettingsManager`, then the next one. It fires on a TIMER
 * after the render, so it surfaces as an unattributable async failure rather than a render error.
 *
 * F-177 put a `BottomSheetScrollView` in the sheet, which adds an animated ScrollView, which
 * adds the mapper. Mocking the modules one at a time was tried and `jest.config.mjs` had already
 * written down why it fails: *"stubbing each module as it appears is a game with no end"*. It
 * lasted exactly one iteration.
 *
 * Fake timers stop the walk from ever running. Nothing here needs a timer to advance: every
 * assertion reads props off the tree the render produced.
 */
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

/**
 * The gorhom sheet in a rendered tree.
 *
 * Found by display name rather than by testID, because the node under test is the LIBRARY's —
 * the whole question is what reaches it, and a testID we placed would be on one of ours.
 */
function gorhomSheet(root: Instance): Instance {
  /*
   * MATCHED ON THE DISPLAY NAME, WITHOUT ASSUMING WHAT `type` IS.
   *
   * The first draft required `typeof n.type === 'function'` and found nothing: gorhom's sheet
   * is wrapped in `memo`/`forwardRef`, so its type is an OBJECT carrying a displayName. The
   * test failed for a reason that had nothing to do with the sheet — which is the shape of test
   * that gets "fixed" by softening the assertion.
   */
  const nameOf = (n: Instance): string => {
    const t = n.type as string | { displayName?: string; name?: string };
    return typeof t === 'string' ? t : (t.displayName ?? t.name ?? '');
  };
  const match = root.findAll((n) => nameOf(n) === 'BottomSheet');
  const found = match[0];
  if (found === undefined)
    throw new Error(
      'no gorhom BottomSheet in the tree — the sheet is not rendering, so nothing below means anything',
    );
  return found;
}

/** The props every sheet here takes but its form. */
const NAMED = {
  open: true,
  title: 'This reading',
  closeLabel: 'Close the reading',
  handleLabel: 'Reading',
  handleHint: 'Drag to resize the reading',
  onOpenChange: () => undefined,
} as const;

/**
 * ONE SHEET PER TEST. The sheet is portalled, and while two renders are mounted the portal holds
 * both: a second `open` in the same test would find the first sheet as well as its own (measured:
 * the second root lists the first render's sheets before its own). RNTL unmounts between tests, so
 * every test below opens exactly one.
 */
const open = (form: SheetProps = { form: 'floating', ...NAMED }, bottom = 0): Instance =>
  render(
    <SafeAreaInsetsContext.Provider value={{ top: 47, bottom, left: 0, right: 0 }}>
      <ThemeProvider theme="dark">
        <Sheet {...form}>
          <Text>body</Text>
        </Sheet>
      </ThemeProvider>
    </SafeAreaInsetsContext.Provider>,
  ).UNSAFE_root;

describe('the sheet has more than one detent (F-177)', () => {
  it('declares a snap point, so there is somewhere to drag to', () => {
    const props = gorhomSheet(open()).props as { snapPoints?: readonly string[] };
    expect(props.snapPoints).toBeDefined();
    expect(props.snapPoints?.length).toBeGreaterThan(0);
  });

  it('caps what the content alone may take, so it can never be the whole screen', () => {
    const props = gorhomSheet(open()).props as { maxDynamicContentSize?: number };
    expect(typeof props.maxDynamicContentSize).toBe('number');
    expect(props.maxDynamicContentSize).toBeGreaterThan(0);
  });

  /**
   * THE GAP IS THE POINT, not either number on its own.
   *
   * gorhom merges the content-derived detent into the same sorted list as the declared one. A
   * ceiling equal to the snap point produces two detents a rounding error apart, which drags
   * like a stutter rather than like a sheet — so the ceiling has to sit strictly below.
   */
  it('keeps the content ceiling strictly below the declared detent', () => {
    const props = gorhomSheet(open()).props as {
      snapPoints?: readonly string[];
      maxDynamicContentSize?: number;
    };
    const declared = props.snapPoints?.[0] ?? '';
    const fraction = Number.parseFloat(declared.replace('%', '')) / 100;
    // The window in the test environment, which is what the component divided.
    const windowHeight = (props.maxDynamicContentSize ?? 0) / 0.8;
    expect(props.maxDynamicContentSize).toBeLessThan(fraction * windowHeight);
  });

  it('never lets the declared detent reach the top of the screen', () => {
    const props = gorhomSheet(open()).props as { snapPoints?: readonly string[] };
    const fraction = Number.parseFloat((props.snapPoints?.[0] ?? '').replace('%', '')) / 100;
    expect(fraction).toBeLessThan(1);
  });

  it('still closes by dragging down', () => {
    const props = gorhomSheet(open()).props as { enablePanDownToClose?: boolean };
    expect(props.enablePanDownToClose).toBe(true);
  });

  /**
   * A DECOY, and it is about the MECHANISM rather than the values.
   *
   * Every assertion above reads a prop off the library's node. If `gorhomSheet` found the wrong
   * node — or found nothing and threw a helpful error somebody later softened into a skip —
   * they would all pass vacuously. This asserts the node is really gorhom's by checking a prop
   * we never set and gorhom always has.
   * A DECOY, and it is about the MECHANISM rather than the values — see the two tests at the
   * end of this block.
   */

  /**
   * THE CEILING IS ONLY SAFE BECAUSE THE CONTENT SCROLLS.
   *
   * Without a scrollable, capping the height would CROP the result — which is exactly the
   * failure F-158's docblock was right to be afraid of when it refused snap points.
   */
  it('puts the content in a scrollable, so the ceiling does not crop', () => {
    const nameOf = (n: Instance): string => {
      const t = n.type as string | { displayName?: string; name?: string };
      return typeof t === 'string' ? t : (t.displayName ?? t.name ?? '');
    };
    expect(open().findAll((n) => nameOf(n) === 'BottomSheetScrollView').length).toBeGreaterThan(0);
  });

  /**
   * THE DECOY. Every assertion above reads props off a node `gorhomSheet` located, so if that
   * finder could quietly return the wrong node — or nothing — they would all pass vacuously.
   *
   * That is not hypothetical: this file's first draft required `typeof type === 'function'`,
   * gorhom's sheet is wrapped in `memo`, and all seven tests failed for a reason that had
   * nothing to do with the sheet. The fix could equally have been to soften the finder.
   *
   * So this proves it REFUSES rather than returns nothing.
   */
  it('refuses a tree with no sheet in it, rather than reading nothing', () => {
    const empty = render(
      <ThemeProvider theme="dark">
        <Text>no sheet here</Text>
      </ThemeProvider>,
    ).UNSAFE_root;
    expect(() => gorhomSheet(empty)).toThrow(/no gorhom BottomSheet/u);
  });

  /** And the node it finds is the library's: it carries a prop HeroUI sets and we never do. */
  it('is reading the library sheet, not one of ours', () => {
    const props = gorhomSheet(open()).props as Record<string, unknown>;
    expect(props['backgroundStyle']).toBeDefined();
  });
});

/* ========================================================================= the forms (F-234) */

interface Box {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}
interface InventoryElement {
  readonly id: string;
  readonly dp: Box;
}
const element = (n: string, id: string): InventoryElement => {
  const j = JSON.parse(
    readFileSync(join(__dirname, '..', '..', '..', 'mockups', 'inventory', `${n}.json`), 'utf8'),
  ) as { readonly elements: readonly InventoryElement[] };
  const e = j.elements.find((x) => x.id === id);
  if (e === undefined) throw new Error(id);
  return e;
};

describe('each form is the drawing’s, recomputed (F-234)', () => {
  const FRAME = { w: 384, h: 688 };

  it('03 floats: its margins, its gap, its content inset and where its handle sits', () => {
    const sheet = element('03', '03.sheet').dp;
    const handle = element('03', '03.sheet.handle').dp;
    const card = element('03', '03.sample').dp;
    const chips = element('03', '03.chips.conditions').dp;
    expect(sheet.x).toBe(SHEET_FORMS.floating.side);
    expect(FRAME.w - sheet.x - sheet.w).toBe(SHEET_FORMS.floating.side);
    expect(FRAME.h - sheet.y - sheet.h).toBe(SHEET_FORMS.floating.below);
    expect(card.x - sheet.x).toBe(SHEET_FORMS.floating.inset);
    expect(handle.y - sheet.y).toBe(SHEET_FORMS.floating.handleTop);
    // DECOY: gorhom's own handle sits in a box padded 10 dp all round.
    expect(SHEET_FORMS.floating.handleTop).not.toBe(10);
    expect(chips.y - (handle.y + handle.h)).toBe(SHEET_FORMS.floating.contentTop);
  });

  it('04 docks: its content inset and where its handle sits', () => {
    const sheet = element('04', '04.sheet').dp;
    const handle = element('04', '04.sheet.handle').dp;
    const first = element('04', '04.sheet.tolerance').dp;
    const save = element('04', '04.sheet.save').dp;
    expect(save.x - sheet.x).toBe(SHEET_FORMS.docked.inset);
    expect(handle.y - sheet.y).toBe(SHEET_FORMS.docked.handleTop);
    expect(first.y - (handle.y + handle.h)).toBe(SHEET_FORMS.docked.contentTop);
  });

  it('the handle: 03’s, with 04’s within half a dp, and not gorhom’s', () => {
    const drawn = element('03', '03.sheet.handle').dp;
    const docked = element('04', '04.sheet.handle').dp;
    expect({ width: drawn.w, height: drawn.h }).toStrictEqual(SHEET_HANDLE);
    expect(Math.abs(docked.w - SHEET_HANDLE.width)).toBeLessThanOrEqual(0.5);
    expect(Math.abs(docked.h - SHEET_HANDLE.height)).toBeLessThanOrEqual(0.5);
    // DECOY: gorhom's indicator is 7.5 % of the window wide.
    expect(SHEET_HANDLE.width).not.toBe(0.075 * FRAME.w);
  });
});

describe('the floating and docked forms reach the library’s sheet', () => {
  it('floats detached, at 03’s margins, lifted off the frame by 03’s gap', () => {
    const flat = gorhomSheet(open({ form: 'floating', ...NAMED }, 0)).props as {
      detached?: boolean;
      bottomInset?: number;
      style?: unknown;
    };
    expect(flat.detached).toBe(true);
    expect(flat.bottomInset).toBe(SHEET_FORMS.floating.below);
    expect(flattenStyle(flat.style)['marginHorizontal']).toBe(SHEET_FORMS.floating.side);
  });

  it('lifts it by the device inset instead where that is larger, and not by both', () => {
    const notched = gorhomSheet(open({ form: 'floating', ...NAMED }, 34)).props as {
      bottomInset?: number;
    };
    expect(notched.bottomInset).toBe(34);
    // DECOY: the gap and the inset stacked.
    expect(notched.bottomInset).not.toBe(SHEET_FORMS.floating.below + 34);
  });

  it('docks to the bottom at the caller’s side inset, not detached', () => {
    const props = gorhomSheet(open({ form: 'docked', sideInset: 9.5, ...NAMED })).props as {
      detached?: boolean;
      bottomInset?: number;
      style?: unknown;
    };
    expect(props.detached).toBeUndefined();
    expect(props.bottomInset).toBeUndefined();
    expect(flattenStyle(props.style)['marginHorizontal']).toBe(9.5);
  });

  it('requires a form, and a docked sheet’s side inset, by type', () => {
    // @ts-expect-error — no board draws a sheet to default from.
    const formless: SheetProps = { ...NAMED };
    // @ts-expect-error — the docked sheet's side inset is OQ-16's, passed by its caller.
    const unplaced: SheetProps = { form: 'docked', ...NAMED };
    // @ts-expect-error — a floating sheet's margins are 03's.
    const placed: SheetProps = { form: 'floating', sideInset: 4, ...NAMED };
    expect([formless, unplaced, placed]).toHaveLength(3);
  });

  const ground = (form: SheetProps): Record<string, unknown> => {
    const { backgroundComponent: Background } = gorhomSheet(open(form)).props as {
      backgroundComponent: (p: { style: object }) => React.JSX.Element;
    };
    const tree = render(<Background style={{}} />).toJSON() as TestNode;
    return flattenStyle(tree.props['style']);
  };

  it('paints 03’s ground: background, a dp of border round it, every corner rounded', () => {
    const floating = ground({ form: 'floating', ...NAMED });
    expect(floating['backgroundColor']).toBe(nativeColors.dark.background);
    expect(floating['borderColor']).toBe(nativeColors.dark.border);
    expect(floating['borderBottomLeftRadius']).toBeGreaterThan(0);
  });

  it('paints 04’s ground: surface.1, no edge, the top corners only', () => {
    const docked = ground({ form: 'docked', sideInset: 9.5, ...NAMED });
    expect(docked['backgroundColor']).toBe(nativeColors.dark['surface.1']);
    expect(docked['borderWidth']).toBeUndefined();
    expect(docked['borderBottomLeftRadius']).toBeUndefined();
  });
});

describe('what a sheet draws, and what it only names (F-234)', () => {
  const hosts = (root: Instance): readonly Instance[] =>
    root.findAll((n) => typeof n.type === 'string');

  it('draws no title, and its content carries the name', () => {
    const root = open();
    const texts = hosts(root).filter((n) => String(n.type) === 'Text');
    // Only the content passed in: the sheet draws no words of its own.
    expect(texts.map((t): unknown => t.props['children'])).toStrictEqual(['body']);
    const named = hosts(root).filter((n) => n.props['accessibilityLabel'] === NAMED.title);
    expect(named.length).toBeGreaterThan(0);
  });

  /** Whether a dismiss layer dims what is behind it: it paints anything but nothing. */
  const dims = (style: unknown): boolean => {
    const painted = flattenStyle(style)['backgroundColor'];
    return painted !== undefined && painted !== 'transparent';
  };

  it('dims nothing, and the dismiss layer is still a named button', () => {
    const layer = hosts(open()).find((n) => n.props['accessibilityLabel'] === NAMED.closeLabel);
    expect(layer?.props['accessibilityRole']).toBe('button');
    expect(dims(layer?.props['style'])).toBe(false);
  });

  it('DECOY: the scrim the shipped sheet drew is reported as dimming', () => {
    expect(dims({ backgroundColor: nativeColors.dark.backdrop })).toBe(true);
  });

  /** Whether a handle is named and described in the caller's words, not the library's. */
  const speaksCallersWords = (props: Record<string, unknown>): boolean =>
    props['accessibilityLabel'] === NAMED.handleLabel &&
    props['accessibilityHint'] === NAMED.handleHint;

  it('DECOY: gorhom’s own handle, which reached the Lens before F-234, is reported', () => {
    const tree = render(
      <BottomSheetHandle animatedIndex={{} as never} animatedPosition={{} as never} />,
    ).toJSON() as TestNode;
    expect(tree.props['accessibilityLabel']).toBe('Bottom sheet handle');
    expect(speaksCallersWords(tree.props)).toBe(false);
  });

  it('the handle is the drawn bar, in border.indicator, named in the caller’s words', () => {
    const { handleComponent: Handle } = gorhomSheet(open()).props as {
      handleComponent: (p: object) => React.JSX.Element;
    };
    const tree = render(<Handle />).toJSON() as {
      props: Record<string, unknown>;
      children: readonly { props: Record<string, unknown> }[];
    };
    expect(tree.props['accessibilityRole']).toBe('adjustable');
    expect(speaksCallersWords(tree.props)).toBe(true);
    // An adjustable control must adjust (the review's S2): it offers both actions and handles them.
    expect(tree.props['accessibilityActions']).toStrictEqual([
      { name: 'increment' },
      { name: 'decrement' },
    ]);
    expect(typeof tree.props['onAccessibilityAction']).toBe('function');
    const bar = flattenStyle(tree.children[0]?.props['style']);
    expect({ width: bar['width'], height: bar['height'] }).toStrictEqual(SHEET_HANDLE);
    expect(bar['backgroundColor']).toBe(nativeColors.dark['border.indicator']);
    expect(flattenStyle(tree.props['style'])['paddingTop']).toBe(SHEET_FORMS.floating.handleTop);
  });

  const footerOf = (form: SheetProps): unknown =>
    (gorhomSheet(open(form)).props as { footerComponent?: unknown }).footerComponent;

  it('pins a footer when given one', () => {
    expect(typeof footerOf({ form: 'floating', footer: <Text>act</Text>, ...NAMED })).toBe(
      'function',
    );
  });

  it('pins nothing when given none', () => {
    expect(footerOf({ form: 'floating', ...NAMED })).toBeUndefined();
  });
});

describe('the handle adjusts, and the docked sheet clears the home indicator (F-234’s review)', () => {
  const sheetDouble = () => {
    const calls: string[] = [];
    return {
      calls,
      sheet: {
        expand: () => {
          calls.push('expand');
        },
        collapse: () => {
          calls.push('collapse');
        },
      },
    };
  };

  it('increment opens the sheet further, decrement returns it, and nothing closes it', () => {
    const { calls, sheet } = sheetDouble();
    resizeSheet('increment', sheet);
    resizeSheet('decrement', sheet);
    resizeSheet('activate', sheet);
    expect(calls).toStrictEqual(['expand', 'collapse']);
  });

  it('does nothing before the sheet is mounted', () => {
    expect(() => {
      resizeSheet('increment', null);
    }).not.toThrow();
  });

  const contentPadding = (form: SheetProps, bottom: number): unknown => {
    const content = open(form, bottom).findAll(
      (n) =>
        typeof n.type === 'string' &&
        n.props['accessibilityLabel'] === NAMED.title &&
        n.props['contentContainerStyle'] !== undefined,
    )[0];
    return flattenStyle(content?.props['contentContainerStyle'])['paddingBottom'];
  };

  it('ends a docked sheet’s content above the home indicator', () => {
    expect(contentPadding({ form: 'docked', sideInset: 9.5, ...NAMED }, 34)).toBe(
      SHEET_FORMS.docked.inset + 34,
    );
  });

  it('DECOY: the floating sheet is already lifted clear, so it adds nothing', () => {
    expect(contentPadding({ form: 'floating', ...NAMED }, 34)).toBe(SHEET_FORMS.floating.inset);
  });
});
