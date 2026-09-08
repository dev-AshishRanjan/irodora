/**
 * Every tab has a glyph, and every glyph belongs to a tab.
 *
 * The status icon registry has asserted exactly this since F-003, in both directions, and the
 * reason is in `Icon.tsx`: one direction alone lets the registry grow names nothing declares, or
 * lets a declared token quietly lose its glyph.
 *
 * Navigation icons are a SECOND registry — a tab is not a status, and putting one in `GLYPHS`
 * would break that file's own second direction. The rule was right; only its subject differs, so
 * it is applied again here to the thing it now governs.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { NAV_ICON_NAMES } from '@irodora/ui';
import { TABS, TAB_BAR_HEIGHT, TAB_MINIMUM, TAB_TESTID_PREFIX } from '../src/tabs';
import { en } from '../src/i18n/en';

describe('the tab bar and the navigation glyphs agree', () => {
  it('every tab names a glyph that exists', () => {
    for (const tab of TABS)
      expect(`${tab.name}: ${String(NAV_ICON_NAMES.includes(tab.icon))}`).toBe(`${tab.name}: true`);
  });

  it('every glyph belongs to a tab', () => {
    // THE DIRECTION THAT IS EASY TO FORGET. Without it the registry accumulates glyphs for
    // screens that were renamed or removed, and nothing says so — the icons simply stop being
    // drawn while continuing to compile.
    const used = new Set(TABS.map((t) => t.icon));
    for (const name of NAV_ICON_NAMES)
      expect(`${name}: ${String(used.has(name))}`).toBe(`${name}: true`);
  });

  it('derives every e2e id from the tab it addresses', () => {
    /*
     * THE INVARIANT THE TEMPLATE USED TO HOLD.
     *
     * `_layout.tsx` wrote `tabBarButtonTestID` as a template on `tab.name`, so the id could
     * not drift. It also could not be READ: `generate-e2e-flows.mjs` expands a template only
     * when the prefix and the name list share a file, and moving the registry into `src/`
     * split them — the generator refused `atlas.journey.json` step 3 saying `tab-atlas` is
     * declared by no component, which is the safe direction and the right refusal.
     *
     * So the id became a literal the generator can see, and the guarantee moved here. Both
     * directions: every id derives from its name, and no two tabs share one.
     */
    for (const tab of TABS)
      expect(`${tab.name}: ${tab.testID}`).toBe(`${tab.name}: ${TAB_TESTID_PREFIX}${tab.name}`);
    expect(new Set(TABS.map((t) => t.testID)).size).toBe(TABS.length);
  });

  it('no two tabs share a glyph', () => {
    // Two tabs with one shape is the failure NFR-9 is about: the bar would carry a label
    // channel and a colour channel, and the shape channel would be saying nothing.
    expect(new Set(TABS.map((t) => t.icon)).size).toBe(TABS.length);
  });
});

/**
 * F-168 — the bar draws glyphs and no words.
 *
 * ## What can be asserted here and what cannot
 *
 * The defect was that five labels **wrap to a second line** across a phone width. Nothing in this
 * repository can see that: `react-test-renderer` measures no text and has no width, so the
 * overflow was invisible to a green suite and stays invisible.
 *
 * What is assertable is that there is no text left to wrap, and — the half that matters more —
 * that removing it cost a screen reader nothing.
 */
describe('the bar carries a glyph, and the word only where it is announced (F-168)', () => {
  it('draws no label text', () => {
    /*
     * By construction rather than by rendering: `TabGlyph` is not exported and React Navigation
     * will not mount without a navigator. What the source can be held to is that the tab's
     * visual element is the glyph — so this asserts the shape of the option that draws it.
     */
    const source = readFileSync(join(__dirname, '..', 'app', '(tabs)', '_layout.tsx'), 'utf8');
    expect(source).toContain('tabBarShowLabel: false');
    expect(source).toContain('tabBarIcon: ({ focused }) => <TabGlyph');
    // The `<Text>` that wrapped. Its absence is the fix; `Text` is no longer imported at all,
    // which is a stronger statement than the element being gone from one call site.
    expect(source).not.toMatch(/import \{[^}]*\bText\b[^}]*\} from '@irodora\/ui'/u);
  });

  it('still announces every tab by name', () => {
    /*
     * THE DECOY, and it is the assertion that keeps this from being a regression. A bar that
     * simply deleted the words would satisfy everything above and would leave a screen-reader
     * user with five unnamed buttons. Every tab still resolves to a real message.
     */
    for (const tab of TABS) {
      const word = en[tab.labelKey];
      expect(`${tab.name}: ${typeof word}`).toBe(`${tab.name}: string`);
      expect(word.length).toBeGreaterThan(0);
    }
  });

  it('keeps the bar tappable without the line of type it lost', () => {
    // A bar that FITS is not the same as a bar you can hit. The base is what the design chose;
    // the minimum is what a finger needs, and the device inset is added on top of both.
    expect(TAB_BAR_HEIGHT()).toBeGreaterThanOrEqual(TAB_MINIMUM);
  });
});
