/**
 * Which keyline tone touches the sample.
 *
 * The gamut proof in `packages/design-tokens/test/swatch-edge.test.ts` has always been about the
 * BETTER of the two tones — `worstCase([tone, inverse])` takes the best against each sample and
 * asserts the worst such best clears the floor. The component drew them in a fixed order anyway,
 * so on the dark theme, where `swatch.hairline` is near-white, every pale sample was ringed in
 * white. Reported as *"a white border/outline … around colors"*.
 *
 * This asserts the component now does what the proof assumed.
 */

import { keylineTones } from '../src/Swatch.js';
import { nativeColors } from '@irodora/design-tokens';

const DARK = '#131110';
const LIGHT = '#F6F5F3';

describe('keylineTones', () => {
  it('puts the DARK tone against a pale sample', () => {
    // The reported case: a near-white garment on the dark theme used to get a white ring.
    for (const pale of ['#FFFFFF', '#F2EFE9', '#E8E4DC'])
      expect(`${pale}: ${keylineTones(pale, LIGHT, DARK).inner}`).toBe(`${pale}: ${DARK}`);
  });

  it('puts the LIGHT tone against a dark sample', () => {
    for (const dark of ['#000000', '#101418', '#2B2A28'])
      expect(`${dark}: ${keylineTones(dark, LIGHT, DARK).inner}`).toBe(`${dark}: ${LIGHT}`);
  });

  it('always uses the other tone outside, so both are still drawn', () => {
    // THE HALF THAT KEEPS F-068. Choosing which tone is adjacent must not become choosing to
    // draw one — the second tone is what guarantees an edge when the first fails.
    for (const sample of ['#FFFFFF', '#000000', '#7F7F7F', '#526A6B']) {
      const { inner, outer } = keylineTones(sample, LIGHT, DARK);
      expect(`${sample}: ${inner === outer ? 'same' : 'both'}`).toBe(`${sample}: both`);
      expect([LIGHT, DARK]).toContain(outer);
    }
  });

  it('decides by contrast rather than by theme', () => {
    // DECOY. A component that just read the theme would pass the two cases above on one theme
    // and fail on the other; the arguments are the same here and the answers differ by SAMPLE.
    const paleInner = keylineTones('#FFFFFF', LIGHT, DARK).inner;
    const darkInner = keylineTones('#000000', LIGHT, DARK).inner;
    expect(paleInner).not.toBe(darkInner);
  });

  it('works with the tokens as they actually ship, in both themes', () => {
    for (const theme of ['light', 'dark'] as const) {
      const tone = nativeColors[theme]['swatch.hairline'];
      const inverse = nativeColors[theme]['swatch.hairline.inverse'];
      // A white sample must not get a white-ish ring in EITHER theme, which is the whole
      // complaint. Asserted against the shipped values rather than the constants above.
      const { inner } = keylineTones('#FFFFFF', tone, inverse);
      expect(`${theme}: ${inner}`).toBe(`${theme}: #131110`);
    }
  });
});
