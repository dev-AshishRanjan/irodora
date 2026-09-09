/**
 * The alternatives reach the screen (F-208).
 *
 * ## What was wrong
 *
 * `alternativesFor` has run inside every `recommendForSlot` call since F-030 — careful work,
 * relative to the top pick rather than to the garment, `temperatureOf` rather than `hueBias`
 * (ADR-0076), one candidate to one axis after F-101 found three chips over a single swatch — and
 * the only screen that asks for a ranking threw every object it produced away.
 *
 * ## Why the omission case is not here
 *
 * Criterion 2 — *an axis with no candidate stays omitted* — is a property of the ENGINE, and it
 * is exercised where a starved pool can be built:
 * `packages/recommendation/test/outfit.test.ts` → *"OMITS an axis with no candidate rather than
 * filling it"*, which reduces the pool to two near-identical off-whites and asserts fewer than
 * four with no duplicate padding.
 *
 * The screen cannot reach that state: it reads the published corpus, which offers all four axes
 * for every slug and slot measured. So what is asserted here is the half the screen owns — that
 * it draws **exactly** what the engine returned, no axis added and none dropped — and the count
 * is read off the engine rather than written down, so the day the corpus starves an axis this
 * follows it instead of turning red.
 */

import { render } from '@testing-library/react-native';
import { ThemeProvider } from '@irodora/ui';
import { Wear } from '../src/screens/Wear';
import { ALTERNATIVE_MESSAGE_KEYS, wearWith, type OutfitSlot } from '../src/wear';
import { ruleSet } from '../src/rules';
import { allEntries } from '../src/corpus';
import { en } from '../src/i18n/en';
import { isMessageKey } from '../src/i18n/index';

const SLUG = allEntries()[0]!.entry.slug;
const SLOT: OutfitSlot = 'top';

const answer = (): NonNullable<ReturnType<typeof wearWith>> => {
  const a = wearWith(SLUG, SLOT, null, ruleSet());
  if (a === null) throw new Error(`the fixture slug ${SLUG} stopped resolving`);
  return a;
};

const draw = (): ReturnType<typeof render> =>
  render(
    <ThemeProvider theme="light">
      <Wear slug={SLUG} initialSlot={SLOT} profile={null} />
    </ThemeProvider>,
  );

/** The label the screen renders for an axis, read from the catalogue rather than restated. */
const nameOf = (axis: string): string => {
  const key = `alt.${axis}`;
  if (!isMessageKey(key)) throw new Error(`no catalogue entry for ${key}`);
  return en[key];
};

describe('every alternative the engine offers is drawn, labelled with its axis', () => {
  it('draws one label per alternative, and the engine says how many that is', () => {
    /*
     * COUNTED, NOT SPOT-CHECKED. `getByText` on one label would pass on a screen that drew the
     * first alternative and dropped the rest — which is the shape this feature is fixing, one
     * level down. The expected number comes from `wearWith`, so a corpus that starts starving
     * an axis moves both sides together.
     */
    const expected = answer().recommendations.flatMap((r) => r.alternatives);
    expect(expected.length).toBeGreaterThan(0);

    const { queryAllByText } = draw();
    // ONCE PER DISTINCT LABEL, summed. Every slot offers the same four axes, so counting
    // per ALTERNATIVE would ask for "Warmer" twice and count both slots each time.
    const axes = [...new Set(expected.map((a) => a.axis))];
    const drawn = axes.reduce((sum, axis) => sum + queryAllByText(nameOf(axis)).length, 0);

    expect(drawn).toBe(expected.length);
  });

  it('names the direction in WORDS, because a swatch cannot say "warmer"', () => {
    /*
     * ACCESSIBILITY.md: colour is never the only channel. Here it would be tempting to let the
     * swatch carry the axis, and it cannot — ADR-0076 had exactly this argument at the engine
     * level, where a grey whose hue angle sat at 66° was being offered as the warm one.
     */
    const axes = new Set(
      answer().recommendations.flatMap((r) => r.alternatives.map((a) => a.axis)),
    );
    const { queryAllByText } = draw();
    for (const axis of axes) expect(queryAllByText(nameOf(axis)).length).toBeGreaterThan(0);
  });

  it('puts the section under a heading that does not promise a replacement', () => {
    const { queryAllByText } = draw();
    expect(queryAllByText(en['wear.alternatives']).length).toBeGreaterThan(0);
  });

  it('DECOY — a name no axis carries is NOT drawn, so the queries above can fail', () => {
    /*
     * Without this, every assertion above would pass against a `queryAllByText` that matched
     * everything — and the count assertion would pass against one that matched nothing only if
     * the engine also returned nothing, which the first line of the first case rules out.
     */
    const { queryAllByText } = draw();
    expect(queryAllByText('Sideways').length).toBe(0);
    expect(ALTERNATIVE_MESSAGE_KEYS).not.toContain('alt.sideways');
  });
});
