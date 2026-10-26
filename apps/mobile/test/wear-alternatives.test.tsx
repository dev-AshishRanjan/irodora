/**
 * The alternatives reach the screen (F-208), as `07`'s pills (F-248, ADR-0152 D3).
 *
 * ## What was wrong, and what `07` changed
 *
 * `alternativesFor` ran inside every `recommendForSlot` call from F-030, and the only screen that
 * asked for a ranking threw every object it produced away; F-208 drew them as cards under each slot.
 * `07` draws them as pills in the card, for ONE slot — the one in hand — relative to the colour it
 * SHOWS (`alternativesAround`), so a pill reading *Make Warmer* is warmer than the colour beside it
 * after a Swap too. Every slot's alternatives stay one interaction away: put the slot in hand.
 *
 * ## Why the omission case is not here
 *
 * Criterion 2 — *an axis with no candidate stays omitted* — is a property of the ENGINE, exercised
 * where a starved pool can be built (`packages/recommendation/test/outfit.test.ts`). What is asserted
 * here is the half the screen owns: it draws **exactly** what the engine returned for the slot in
 * hand, no axis added and none dropped, and the count is read off the engine rather than written
 * down, so the day the corpus starves an axis this follows it instead of turning red.
 */

import { fireEvent, render, screen } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import { Wear } from '../src/screens/Wear';
import {
  ALTERNATIVE_MESSAGE_KEYS,
  pillLabel,
  RESTING_WEAR,
  wearCombination,
  type RankedSlot,
  type WearState,
} from '../src/wear';
import { allEntries } from '../src/corpus';
import { en } from '../src/i18n/en';
import type { MessageKey } from '../src/i18n';
import { rankingContext } from '../src/wardrobe/coverage';

// The slot sheet's mapper ticks after a render; nothing here is about a frame (F-158).
beforeEach(() => {
  jest.useFakeTimers();
});
afterEach(() => {
  jest.useRealTimers();
});

const SLUG = allEntries()[0]!.entry.slug;
const CONTEXT = rankingContext(null);
const t = (key: MessageKey): string => en[key];

/** What the engine returns for the slot in hand, under a state, with nobody to score against. */
const offered = (state: WearState) => {
  const shown = wearCombination(SLUG, state, null, CONTEXT);
  if (shown === null) throw new Error(`the fixture slug ${SLUG} stopped resolving`);
  return shown.alternatives;
};

const draw = (initial?: Partial<WearState>): ReturnType<typeof render> =>
  render(
    <ThemeProvider theme="light">
      <Wear slug={SLUG} profile={null} {...(initial === undefined ? {} : { initial })} />
    </ThemeProvider>,
  );

/** The pills drawn, by test id, in order. */
const pills = (): readonly string[] =>
  screen
    .queryAllByTestId(/^wear\.pill\./, { includeHiddenElements: true })
    .filter((n) => typeof n.type === 'string')
    .map((n) => String(n.props['testID']));

describe('the slot in hand’s alternatives are drawn, each labelled with its axis', () => {
  it.each(['trouser', 'shoe', 'outer'] as const)(
    'with %s in hand, one pill per alternative the engine returns, in its order',
    (inHand: RankedSlot) => {
      /*
       * COUNTED, NOT SPOT-CHECKED: a screen that drew the first pill and dropped the rest would pass
       * a `getByText` on one label. The expected number and order come from the engine.
       */
      const expected = offered({ ...RESTING_WEAR, inHand });
      expect(expected.length).toBeGreaterThan(0);
      draw({ inHand });
      expect(pills()).toStrictEqual(expected.map((a) => `wear.pill.${a.axis}`));
    },
  );

  it('names each pill in WORDS — its axis, the colour and the slot — because a swatch cannot say "warmer"', () => {
    const expected = offered(RESTING_WEAR);
    draw();
    for (const a of expected)
      expect(screen.getAllByText(pillLabel(a, 'trouser', t)).length).toBeGreaterThan(0);
  });

  it('after a pill, the slot shows that colour and the pills move around it', () => {
    const [first] = offered(RESTING_WEAR);
    draw();
    fireEvent.press(screen.getByTestId(`wear.pill.${first!.axis}`));
    const moved = offered({
      ...RESTING_WEAR,
      shown: { ...RESTING_WEAR.shown, trouser: first!.candidate.id },
    });
    expect(pills()).toStrictEqual(moved.map((a) => `wear.pill.${a.axis}`));
    for (const a of moved)
      expect(screen.getAllByText(pillLabel(a, 'trouser', t)).length).toBeGreaterThan(0);
  });

  it('DECOY — a name no axis carries is NOT drawn, so the queries above can fail', () => {
    draw();
    expect(screen.queryAllByText(/Sideways/).length).toBe(0);
    expect(ALTERNATIVE_MESSAGE_KEYS).not.toContain('alt.sideways');
  });
});
