/**
 * The Wear page says only true things, and every action 07 draws works (F-248, criteria 2 and 5).
 *
 * - **No sample content.** 07 prints a colour, three garments, three pills, four figures and four
 *   occasions that are not this corpus's or this person's. None of it reaches the page, in either
 *   language or theme (R9 §4 E1, E2).
 * - **Every drawn action, by the control a person touches**: each occasion re-ranks, each Swap steps,
 *   Lock toggles and is announced, a pill substitutes, a tile opens its sheet, the sheet's three
 *   actions, the save, the export and the back each fire their handler with the right colour — and an
 *   absent handler is an absent control.
 * - **No profile** (E-101, ADR-0150): no fit figure, no reasons, the save disabled with its note.
 * - **The route** sends each action where ADR-0152 says, and the Lab takes the hand-off once.
 * - **The absent colour**: the back and 00's caption, and nothing else.
 */

const DEFAULT_LANGUAGE_TAG = 'en-GB';
let mockLanguageTag = DEFAULT_LANGUAGE_TAG;

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageTag: mockLanguageTag }],
}));

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { PersonalProfile } from '@irodora/recommendation';
import { ActionBar, Card, ThemeProvider } from '@irodora/ui';
import type { TestNode } from '@irodora/ui/testing';
import { allEntries, type PublishedEntry } from '../src/corpus';
import { t as message, type MessageKey } from '../src/i18n';
import { Wear, type WearProps } from '../src/screens/Wear';
import { rankingContext } from '../src/wardrobe/coverage';
import {
  contrastLine,
  fitLine,
  OCCASION_KEYS,
  pillLabel,
  RESTING_WEAR,
  separationLine,
  slotName,
  swap,
  wearCombination,
  type RankedSlot,
  type WearCombination,
  type WearState,
} from '../src/wear';

// The slot sheet's mapper ticks after a render; nothing here is about a frame (F-158).
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

const WEARER: PersonalProfile = {
  lightness: { min: 0.3, max: 0.8 },
  temperatureBias: -0.4,
  chroma: { min: 0.02, max: 0.12 },
  contrast: 'medium',
  confidence: { temperature: 0.8, lightness: 0.8, chroma: 0.7, contrast: 0.6 },
};
const CONTEXT = rankingContext(null);
const say = (key: MessageKey): string => message('en', key);

/**
 * What 07 prints that is its own and not this corpus's or this person's: the sample colour and its
 * slots' colours, the garment and material words, the pills' garments and their missing axis, the
 * card's figures and claims, and the occasions no weighting is published for (R9 §4 E1, E2).
 */
const SAMPLE = [
  'Ai-nezumi',
  '藍鼠',
  '#5B6B78',
  'Rikyu-shira-cha',
  '#D1C7BD',
  'Kuro-tetsu',
  '#1C2024',
  'Shinshu-sabi',
  '#343D46',
  'Linen',
  'Wool Slacks',
  'Derby',
  'Trench',
  'Ochre Cardigan',
  'Off-White',
  'Slate Trousers',
  'Analogous Tonal Kasane',
  'Kasane',
  '94%',
  '98%',
  '6.2:1',
  'Cool-Muted',
  'Match',
  'Safe',
  'APCA Passed',
  'Minimalist',
  'Japanese Classic',
  'Evening',
  'Monochrome',
];
const leaks = (text: string): readonly string[] => SAMPLE.filter((s) => text.includes(s));

/** Every word a combination can put on the page, with or without a profile. */
const wordsOfCombination = (shown: WearCombination): string =>
  [
    shown.anchor.entry.name.kanji,
    shown.anchor.entry.name.romaji,
    shown.anchor.entry.name.en,
    shown.anchor.derived.hex,
    ...shown.slots.flatMap((s) =>
      s.entry === null ? [] : [slotName(s.entry, false), s.entry.derived.hex],
    ),
    ...shown.alternatives.map((a) => pillLabel(a, 'trouser', say)),
    fitLine(shown.intelligence.fit, say, 'latin'),
    separationLine(shown.intelligence.separation, say, 'latin'),
    contrastLine(shown.intelligence.contrast) ?? '',
  ].join('\u0000');

/**
 * THE FIXTURE, CHOSEN SO THE CHECKS CAN FAIL. 07's sample colours may be corpus colours the engine
 * ranks honestly, and 94% may be a real figure; a colour whose page shows any of 07's words would make
 * the leak check report the engine's answer as sample content. So the colour is the first whose page
 * shows none of them, with a profile and without — and whose slot-2 pick differs between Office and
 * Casual, so the occasion test can tell a re-rank from a page that ignored the control.
 */
const ANCHOR: PublishedEntry = (() => {
  const found = allEntries().find((e) => {
    const slug = e.entry.slug;
    const at = (state: WearState, profile: PersonalProfile | null) =>
      wearCombination(slug, state, profile, CONTEXT)!;
    const office = at(RESTING_WEAR, WEARER);
    const casual = at({ ...RESTING_WEAR, occasion: 'casual' }, WEARER);
    return (
      leaks(wordsOfCombination(office)).length === 0 &&
      leaks(wordsOfCombination(at(RESTING_WEAR, null))).length === 0 &&
      office.slots[0]?.entry?.entry.slug !== casual.slots[0]?.entry?.entry.slug
    );
  });
  if (found === undefined) throw new Error('no corpus colour can stand as the fixture');
  return found;
})();
const SLUG = ANCHOR.entry.slug;
const SHOWN = wearCombination(SLUG, RESTING_WEAR, WEARER, CONTEXT)!;
const at = (state: Partial<WearState>, profile: PersonalProfile | null = WEARER) =>
  wearCombination(SLUG, { ...RESTING_WEAR, ...state }, profile, CONTEXT)!;
const slotOf = (shown: WearCombination, key: RankedSlot) => shown.slots.find((s) => s.key === key)!;

/** Every handler a jest mock, so a test reads what was called and with what. */
const handlers = () => ({
  onBack: jest.fn(),
  onSaveToLab: jest.fn(),
  onExport: jest.fn(),
  onOpenColour: jest.fn(),
  onShopFor: jest.fn(),
  onAddToWardrobe: jest.fn(),
});

const drawPage = (
  props: Partial<WearProps> = {},
  { tag = DEFAULT_LANGUAGE_TAG, theme = 'dark' }: { tag?: string; theme?: 'dark' | 'light' } = {},
) => {
  mockLanguageTag = tag;
  try {
    return render(
      <ThemeProvider theme={theme}>
        <Wear slug={SLUG} profile={WEARER} {...props} />
      </ThemeProvider>,
    );
  } finally {
    mockLanguageTag = DEFAULT_LANGUAGE_TAG;
  }
};

/** Every paragraph and every accessible name on a tree. */
function wordsOf(node: TestNode | null, out: string[] = []): string[] {
  if (node === null) return out;
  for (const child of node.children ?? []) {
    if (typeof child === 'string') out.push(child);
    else wordsOf(child, out);
  }
  const label: unknown = node.props['accessibilityLabel'];
  if (typeof label === 'string') out.push(label);
  return out;
}
const words = (tree: ReturnType<typeof render>): string =>
  wordsOf(tree.toJSON() as TestNode | null).join('\u0000');

/** A control's announced state. */
const stateOf = (node: { readonly props: Readonly<Record<string, unknown>> }) =>
  (node.props['accessibilityState'] ?? {}) as {
    readonly selected?: boolean;
    readonly disabled?: boolean;
  };

/** A tile's words are read through its press target, so they are reached as hidden elements. */
const hidden = { includeHiddenElements: true } as const;
const nameIn = (key: RankedSlot): unknown =>
  screen.getByTestId(`wear.slot.${key}.name`, hidden).props['children'];

/* ----------------------------------------------------------------------------- sample content */

describe('no sample content from 07 reaches the page (§4 E1, E2)', () => {
  it.each([
    ['en-GB', 'dark'],
    ['en-GB', 'light'],
    ['ja-JP', 'dark'],
    ['ja-JP', 'light'],
  ] as const)('in %s, %s', (tag, theme) => {
    expect(leaks(words(drawPage(handlers(), { tag, theme })))).toStrictEqual([]);
  });

  it('nor without a profile, nor with a slot’s sheet open', () => {
    expect(leaks(words(drawPage({ ...handlers(), profile: null })))).toStrictEqual([]);
    expect(leaks(words(drawPage({ ...handlers(), initialSheet: 'shoe' })))).toStrictEqual([]);
  });

  it('DECOY: a planted sample name is found', () => {
    expect(leaks(`${words(drawPage(handlers()))}\u0000Kuro-tetsu`)).toStrictEqual(['Kuro-tetsu']);
  });
});

/* ----------------------------------------------------------------------------- the actions */

describe('every action 07 draws works, by the control a person touches (ADR-0152)', () => {
  it('each occasion re-ranks the unlocked slots under its own weighting', () => {
    drawPage(handlers());
    expect(nameIn('trouser')).toBe(slotName(slotOf(SHOWN, 'trouser').entry!, false));
    fireEvent.press(screen.getByRole('radio', { name: say('wear.occasion.casual') }));
    const casual = at({ occasion: 'casual' });
    expect(nameIn('trouser')).toBe(slotName(slotOf(casual, 'trouser').entry!, false));
    // DECOY: the fixture's two picks differ, so the assertion above saw a re-rank.
    expect(slotOf(casual, 'trouser').entry!.entry.slug).not.toBe(
      slotOf(SHOWN, 'trouser').entry!.entry.slug,
    );
    // And every other occasion, by its own segment: each of the three slots is that weighting's.
    for (const occasion of ['office', 'japanese-inspired', 'formal'] as const) {
      fireEvent.press(screen.getByRole('radio', { name: say(OCCASION_KEYS[occasion]) }));
      const shown = at({ occasion });
      for (const key of ['trouser', 'shoe', 'outer'] as const)
        expect({ [occasion]: nameIn(key) }).toStrictEqual({
          [occasion]: slotName(slotOf(shown, key).entry!, false),
        });
    }
  });

  it('each Swap steps its own slot to the next colour its ranking offers that no slot shows', () => {
    drawPage(handlers());
    let state: WearState = RESTING_WEAR;
    for (const key of ['trouser', 'shoe', 'outer'] as const) {
      const now = at(state);
      const before = now.placed[key];
      fireEvent.press(screen.getByTestId(`wear.slot.${key}.swap`));
      state = swap(state, key, now.rankings[key].ranked, now.placed);
      const after = at(state);
      const next = allEntries().find((e) => e.entry.slug === after.placed[key])!;
      expect({ [key]: nameIn(key) }).toStrictEqual({ [key]: slotName(next, false) });
      // It moved, and the page still shows four colours.
      expect(after.placed[key]).not.toBe(before);
      expect(new Set([SLUG, ...Object.values(after.placed)]).size).toBe(4);
    }
  });

  it('Lock toggles, reads Locked, is announced as selected, and holds the slot', () => {
    drawPage(handlers());
    const lock = () => screen.getByTestId('wear.slot.trouser.lock');
    expect(stateOf(lock()).selected).toBe(false);
    fireEvent.press(lock());
    expect(stateOf(lock()).selected).toBe(true);
    expect(screen.getAllByText(message('en', 'lab.locked')).length).toBeGreaterThan(0);
    // A locked slot's Swap and pills are unavailable, and its colour does not move.
    expect(stateOf(screen.getByTestId('wear.slot.trouser.swap')).disabled).toBe(true);
    const pill = screen.getByTestId(`wear.pill.${SHOWN.alternatives[0]!.axis}`);
    expect(stateOf(pill).disabled).toBe(true);
    fireEvent.press(screen.getByRole('radio', { name: say('wear.occasion.casual') }));
    expect(nameIn('trouser')).toBe(slotName(slotOf(SHOWN, 'trouser').entry!, false));
  });

  it('in Japanese, Lock’s word changes with its state, so the state is not only announced (S3)', () => {
    drawPage(handlers(), { tag: 'ja-JP' });
    const word = () =>
      screen
        .getByTestId('wear.slot.trouser.lock')
        .findAll((n) => typeof n.props['children'] === 'string')
        .map((n) => n.props['children'] as string)
        .join('');
    expect(word()).toContain(message('ja', 'wear.lock'));
    fireEvent.press(screen.getByTestId('wear.slot.trouser.lock'));
    expect(word()).toContain(message('ja', 'wear.locked'));
    // DECOY: the two words differ, so the change is visible.
    expect(message('ja', 'wear.locked')).not.toBe(message('ja', 'wear.lock'));
  });

  it('each tile is one stop for a screen reader: its colour named once, its words not read again (S4)', () => {
    drawPage(handlers());
    const tiles = [
      slotName(SHOWN.anchor, true),
      ...SHOWN.slots.map((s) => slotName(s.entry!, false)),
    ];
    for (const name of tiles) {
      // The words drawn over the sample are hidden from a reader…
      expect({ [name]: screen.queryAllByText(name).length }).toStrictEqual({ [name]: 0 });
      // …because the sample's own node names the colour, once.
      const named = screen.getAllByLabelText(name, { exact: false });
      expect({ [name]: named.length }).toStrictEqual({ [name]: 1 });
    }
    // DECOY: hidden, the words are still drawn.
    expect(screen.queryAllByText(tiles[1]!, { includeHiddenElements: true }).length).toBe(1);
  });

  it('DECOY: unlocked, the Swap and the pills are available', () => {
    drawPage(handlers());
    expect(stateOf(screen.getByTestId('wear.slot.trouser.swap')).disabled).toBeFalsy();
    const pill = screen.getByTestId(`wear.pill.${SHOWN.alternatives[0]!.axis}`);
    expect(stateOf(pill).disabled).toBeFalsy();
  });

  it('a pill puts its colour in the slot in hand', () => {
    drawPage(handlers());
    const [first] = SHOWN.alternatives;
    fireEvent.press(screen.getByTestId(`wear.pill.${first!.axis}`));
    const chosen = allEntries().find((e) => e.entry.slug === first!.candidate.id)!;
    expect(nameIn('trouser')).toBe(slotName(chosen, false));
  });

  it('a tile’s words put that slot in hand and open its sheet, whose actions carry its colour', () => {
    const on = handlers();
    drawPage(on);
    fireEvent.press(screen.getByTestId('wear.slot.outer.open'));
    // The slot in hand moved: Swap and Lock are the outer layer's now, and slot 2 shows its compact Swap.
    expect(screen.getByTestId('wear.slot.outer.lock')).toBeTruthy();
    expect(screen.queryByTestId('wear.slot.trouser.lock')).toBeNull();
    const outer = slotOf(SHOWN, 'outer').entry!;
    expect(screen.getAllByText(slotName(outer, false)).length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        `${say('wear.rank')} ${String(slotOf(SHOWN, 'outer').rank)} / ${String(SHOWN.rankings.outer.ranked.length)}`,
      ).length,
    ).toBeGreaterThan(0);
    fireEvent.press(screen.getByRole('button', { name: say('wear.openColour') }));
    fireEvent.press(screen.getByRole('button', { name: say('wear.shopFor') }));
    fireEvent.press(screen.getByRole('button', { name: say('wear.addToWardrobe') }));
    expect(on.onOpenColour).toHaveBeenCalledWith(outer.entry.slug);
    // The outer layer is ranked, and shopped for, as a top.
    expect(on.onShopFor).toHaveBeenCalledWith(outer.entry.slug, 'top');
    expect(on.onAddToWardrobe).toHaveBeenCalledWith(outer.entry.slug);
  });

  it('save hands over the combination as shown, export its four colours, back goes back', () => {
    const on = handlers();
    drawPage(on);
    fireEvent.press(screen.getByRole('button', { name: say('wear.saveToLab') }));
    fireEvent.press(screen.getByRole('button', { name: say('wear.exportTokens') }));
    fireEvent.press(screen.getByRole('button', { name: new RegExp(say('wear.back')) }));
    const slug = (key: RankedSlot) => slotOf(SHOWN, key).entry!.entry.slug;
    expect(on.onSaveToLab).toHaveBeenCalledWith({
      top: SLUG,
      trouser: slug('trouser'),
      shoe: slug('shoe'),
    });
    expect(on.onExport).toHaveBeenCalledWith([SLUG, slug('trouser'), slug('shoe'), slug('outer')]);
    expect(on.onBack).toHaveBeenCalledTimes(1);
  });

  it('DECOY: an absent handler is an absent control', () => {
    drawPage({ initialSheet: 'shoe' });
    for (const key of [
      'wear.saveToLab',
      'wear.exportTokens',
      'wear.openColour',
      'wear.shopFor',
    ] as const)
      expect({ [key]: screen.queryByRole('button', { name: say(key) }) }).toStrictEqual({
        [key]: null,
      });
    expect(screen.UNSAFE_queryAllByType(ActionBar)).toHaveLength(0);
    expect(screen.queryByRole('button', { name: new RegExp(say('wear.back')) })).toBeNull();
  });
});

/* ----------------------------------------------------------------------------- no profile */

describe('without a profile there is no fit, no reason, and no Lab (E-101, ADR-0150, ADR-0152 D5)', () => {
  it('the fit row says so with no figure, the sheet names the missing half, the save says why', () => {
    drawPage({ ...handlers(), profile: null, initialSheet: 'trouser' });
    const fit = screen.getByTestId('wear.intelligence.fit');
    // The row's own words: its label and its value, and no figure among them.
    const read = fit
      .findAll((n) => typeof n.props['children'] === 'string')
      .map((n) => n.props['children'] as string)
      .join(' ');
    expect(read).toContain(say('wear.fit'));
    expect(read).toContain(say('wear.fit.none'));
    expect(read).not.toMatch(/%|\d/);
    expect(screen.getAllByText(say('wear.noProfile')).length).toBeGreaterThan(0);
    expect(screen.getAllByText(say('wear.pairing')).length).toBeGreaterThan(0);
    const save = screen.getByRole('button', { name: say('wear.saveToLab') });
    expect(stateOf(save).disabled).toBe(true);
    expect(screen.getByText(say('wear.saveNeedsProfile'))).toBeTruthy();
  });

  it('DECOY: with a profile the fit has its figure, the sheet its reasons, and the save no note', () => {
    drawPage({ ...handlers(), initialSheet: 'trouser' });
    expect(
      screen.getAllByText(fitLine(SHOWN.intelligence.fit, say, 'latin')).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(say('wear.noProfile'))).toBeNull();
    expect(screen.getAllByText(say('wear.overall')).length).toBeGreaterThan(0);
    expect(screen.queryByText(say('wear.saveNeedsProfile'))).toBeNull();
    const save = screen.getByRole('button', { name: say('wear.saveToLab') });
    expect(stateOf(save).disabled).toBeFalsy();
  });
});

/* ----------------------------------------------------------------------------- the absent colour */

describe('a colour this corpus does not hold (F-236, E4)', () => {
  it('draws the back and 00’s caption, and no card, tile or bar', () => {
    const on = handlers();
    drawPage({ ...on, slug: 'no-such-colour' });
    expect(screen.getByText(say('detail.notFound'))).toBeTruthy();
    expect(screen.UNSAFE_queryAllByType(Card)).toHaveLength(0);
    expect(screen.UNSAFE_queryAllByType(ActionBar)).toHaveLength(0);
    expect(screen.queryByTestId('wear.slot.top', hidden)).toBeNull();
    fireEvent.press(screen.getByRole('button', { name: say('detail.backToAtlas') }));
    expect(on.onBack).toHaveBeenCalledTimes(1);
  });
});

/* ----------------------------------------------------------------------------- the route */

/*
 * WHERE EACH DRAWN ACTION GOES (ADR-0152 D5, D6, E-221), read from the route's source: a test may not
 * import a route, and each target is a route another feature rebuilds, so its name is held here.
 */
describe('the route sends each drawn action where ADR-0152 says (E-221)', () => {
  const APP = join(__dirname, '..', 'app', '(tabs)');
  const ROUTE = readFileSync(join(APP, 'atlas', 'wear', '[slug].tsx'), 'utf8');
  const LAB = readFileSync(join(APP, 'wardrobe', 'outfit.tsx'), 'utf8');

  /** Each handler's own body, by its prop name: from its name to the next prop the screen takes. */
  const bodies = (source: string): ReadonlyMap<string, string> => {
    const out = new Map<string, string>();
    const props = [...source.matchAll(/\n\s+(on[A-Z]\w+|slug|profile)=\{/gu)];
    props.forEach((m, i) => {
      const end = props[i + 1]?.index ?? source.length;
      out.set(m[1]!, source.slice(m.index, end));
    });
    return out;
  };

  const EXPECTED: readonly (readonly [string, readonly string[]])[] = [
    ['onBack', ["router.navigate(entryBySlug(slug) === null ? '/atlas' : `/atlas/${slug}`)"]],
    ['onSaveToLab', ['offerCombination(combination)', "router.push('/wardrobe/outfit')"]],
    ['onExport', ['router.push(`/profile/export?colours=${colours.join(COLOURS_SEPARATOR)}`)']],
    ['onOpenColour', ['router.push(`/atlas/${s}`)']],
    ['onShopFor', ['router.push(`/wardrobe/shopping?slug=${s}&type=${wordForSlot(slot)}`)']],
    ['onAddToWardrobe', ["offerCorpusColour(s, 'wardrobe')", "router.push('/wardrobe/add')"]],
  ];

  const sendsEveryAction = (source: string): boolean => {
    const by = bodies(source);
    const save = by.get('onSaveToLab') ?? '';
    return (
      EXPECTED.every(([name, targets]) => targets.every((x) => (by.get(name) ?? '').includes(x))) &&
      // The combination is offered before the Lab opens, so the Lab finds it waiting.
      save.indexOf('offerCombination(') < save.indexOf("router.push('/wardrobe/outfit')")
    );
  };

  it('each control sends its own target, and the save offers before it opens the Lab', () => {
    expect(sendsEveryAction(ROUTE)).toBe(true);
    // The stack's header is off: 07 draws its own bar.
    expect(ROUTE).toContain('<Stack.Screen options={{ headerShown: false }} />');
  });

  it('DECOY: a back that only pops, swapped targets, or opening the Lab before the offer each fail', () => {
    const back = bodies(ROUTE).get('onBack') ?? '';
    expect(
      sendsEveryAction(
        ROUTE.replace(back, '\n        onBack={() => {\n          router.back();\n        }}'),
      ),
    ).toBe(false);
    const swapped = ROUTE.replace("router.push('/wardrobe/outfit')", '@@')
      .replace("router.push('/wardrobe/add')", "router.push('/wardrobe/outfit')")
      .replace('@@', "router.push('/wardrobe/add')");
    expect(sendsEveryAction(swapped)).toBe(false);
    const save = bodies(ROUTE).get('onSaveToLab') ?? '';
    const labFirst = save
      .replace('offerCombination(combination);', '')
      .replace(
        "router.push('/wardrobe/outfit');",
        "router.push('/wardrobe/outfit');\n          offerCombination(combination);",
      );
    expect(sendsEveryAction(ROUTE.replace(save, labFirst))).toBe(false);
  });

  /** Whether a Lab route takes the hand-off in a state initialiser and opens with its draft. */
  const takesOnce = (source: string): boolean =>
    /useState\(\(\) => \{\s*const handed = takeCombination\(\);/u.test(source) &&
    source.includes('labDraftFrom(handed, wardrobe)') &&
    source.includes('{...(initialDraft === undefined ? {} : { initialDraft })}');

  it('the Lab takes the hand-off once, in an initialiser, and opens with its draft', () => {
    expect(takesOnce(LAB)).toBe(true);
  });

  it('DECOY: a take in the render body, or a draft never passed on, is refused (F-248’s review, M1)', () => {
    // The take moved out of the initialiser, into the render body: re-run on every render.
    const inBody = LAB.replace(
      'const [initialDraft] = useState(() => {\n    const handed = takeCombination();',
      'const handed = takeCombination();\n  const [initialDraft] = useState(() => {',
    );
    expect(inBody).not.toBe(LAB);
    expect(takesOnce(inBody)).toBe(false);
    // The draft built, and never handed to the Lab.
    const dropped = LAB.replace('{...(initialDraft === undefined ? {} : { initialDraft })}', '');
    expect(dropped).not.toBe(LAB);
    expect(takesOnce(dropped)).toBe(false);
  });
});
