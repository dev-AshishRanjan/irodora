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

import { NAV_ICON_NAMES } from '@irodora/ui';
import { TABS } from '../app/(tabs)/_layout';

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

  it('no two tabs share a glyph', () => {
    // Two tabs with one shape is the failure NFR-9 is about: the bar would carry a label
    // channel and a colour channel, and the shape channel would be saying nothing.
    expect(new Set(TABS.map((t) => t.icon)).size).toBe(TABS.length);
  });
});
