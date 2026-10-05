# ADR-0117 — The tab bar is `01`'s, drawn by our own component, and its words return

| | |
|---|---|
| **Status** | Accepted; the glyph of an active tab other than Home is OQ-47, and what a label does when it does not fit is OQ-49 — both a person's |
| **Date** | 2026-09-30 |
| **Feature** | F-234 |
| **Applies** | R9-MOCKUP-FIDELITY §6 C1 (P5 → `01`); the 2026-09-24 delegation, for the measured inset |
| **Supersedes** | F-168 (the bar is glyphs alone); F-163's criterion 3, for the tab bar only (no rule above it); F-175's accent indicator, for the tab bar only |

---

## Context

The mockups draw the tab bar nine ways (C1). `01` governs: Home · Atlas · Lens · Wardrobe · Profile,
each a glyph **and** a word, with a short indicator on a rule over the active tab. The shipped bar was
none of that:

- **Glyphs alone (F-168).** F-162 put a word under each glyph; on a real phone five uppercase labels
  at the 10 px step with 0.16 em tracking wrapped to a second line, and F-168 removed the words.
- **No rule (F-163)**, because a `border.strong` line on the lifted `surface.1` read as an outline.
- **An `accent` indicator (F-175)** above a 26 dp glyph, on a 56 dp bar plus the device inset.

React Navigation's own bar cannot draw `01`. It wraps the icon slot in its own spacing and its own
label layout, pitches items in equal fifths of the screen where `01` pitches them inside a side inset,
and puts labels beside the icon on wide screens.

## Decision

1. **A component of ours, handed the whole bar.** `app/(tabs)/_layout.tsx` passes `tabBar`, and
   `apps/mobile/src/tabBar.tsx` (the adapter) draws `@irodora/ui`'s `TabBar`. `TabBar` is
   presentational — items, the active key, callbacks, the bottom inset and the labels' script — so it
   is a conformance subject in all four palettes. The adapter reads the navigator through a
   structural type, emits `tabPress` (preventable) and `tabLongPress`, and navigates only to a tab that
   is not already active when nobody prevented it: React Navigation's own contract. It lives in
   `src/`, so a test drives it with plain objects and never boots a navigator (E-099).
2. **Every drawn value is `01`'s**, and `packages/ui/test/tab-bar.test.tsx` recomputes each from
   `mockups/inventory/01.json`, with the value it replaced as a decoy:

   | | value | from `01` | replaced |
   |---|---|---|---|
   | ground | `background` | the page's own ground | `surface.1` |
   | rule | 1 dp of `border` | `raw.rulePx` 2 at 2 px/dp | none (F-163) |
   | content height | 41.5 dp | rule to the labels' bottom | 56 dp |
   | side inset | 37.3 dp | the five glyph centres, evenly pitched | equal fifths |
   | indicator | 47.5 × 2.5 dp in `foreground`, on the rule | `01.tabs.indicator` | 16 × 2 in `accent` |
   | glyph | 24 dp, top at 7.5 dp | median drawn glyph over the grid's 18-unit live area | 26 dp |
   | label | `caption`, weight 500, one line, top at 30 dp | the drawn labels' centre | none (F-168) |

3. **The height absorbs the device inset.** The bar is `41.5 + max(35.5, inset)`: `01` draws
   35.5 dp under its labels, and the device's bottom inset is laid into that space where it fits. On an
   iPhone (34 dp) the bar is exactly `01`'s 77 dp, not 56 + 34. Where the inset is larger, only the
   excess grows the bar. `25`, drawn in a device frame with its status bar, leaves 41.7 dp under its
   labels, and the superseded bars leave 6–10, so the space is drawn, not incidental. It is a measured
   inset, so it falls under the 2026-09-24 delegation and closes here.
4. **The active tab carries three channels**, as `01` draws them: the indicator, its word and glyph in
   `foreground` where the others are `foreground.2`, and `accessibilityState.selected`. None is colour
   alone. The conformance suite's `indicator` treatment reads the first two off the rendered tree, and
   a tab that changes only its ink is reported.
5. **The glyph's shape is data.** `01` draws only Home active, and its glyph filled. `TABS[].activeGlyph`
   records that (`home` filled, the other four outline) and `apps/mobile/test/tab-bar.test.tsx` holds it
   to `01`'s `raw.filled`. What an active Atlas, Lens, Wardrobe or Profile tab draws is **OQ-47**; until
   a person answers it each keeps the only drawing `01` gives it, and no superseded bar sets a shape.
6. **The words return (F-168 reversed)** in `01`'s type: the caption step, weight 500, without the
   uppercase and the 0.16 em tracking that made them wrap. The part of F-168 that is kept is the one
   that mattered: a label is one line and never wraps. A Japanese label is set in the Japanese scale,
   its taller line moved up so its centre stays at `01`'s. **What a label does when it does not fit**
   — at larger text, or in Japanese on a narrower phone — is undrawn, and it trades `01`'s one line
   against A7's "200 % without loss of content": that is **OQ-49**, a person's (F-234's review, B1).
   Until it is answered the label truncates, which keeps the drawing and loses the end of the word on
   screen, and the accessible name keeps the whole word.
7. **The rule returns (F-163's criterion 3 reversed, for the tab bar only)**, in `border` on the page's
   own ground, not the `border.strong` on `surface.1` F-163 removed. **The indicator is `foreground`**,
   not F-175's `accent`, because `01` draws it in the ink colour.
8. **The conformance suite gains a `navigation` kind.** A tab bar has no disabled or loading form —
   none is drawn, and the navigator has neither — and the suite derives what a subject owes from its
   kind, never per component. So `navigation` owes default, focus and active; it keeps the
   `interactive` rules (something responds, every target reaches the tap target); and it is earned by
   the tree, which must draw a tablist of tabs. A button calling itself `navigation` is reported.
9. **There is one tab bar.** `apps/mobile/test/chrome.test.ts` finds one file building the tab
   navigator and one file drawing `TabBar`, with a planted second of each as the decoy. `@irodora/ui`'s
   in-page `Tabs` on the colour detail moves nobody anywhere; it is named there with that reason, and
   its drawing is F-247's under `06`.

## Consequences

**Good.**
- The bar is `01`'s in every number, and a change to any of them fails a test that reads `01`.
- A sighted person who does not recognise a glyph has the word again, which was F-168's stated cost.
- The height is the drawing's on the phones the mockups draw, and still clears the device inset on
  every other.
- Nothing about the bar is set through React Navigation's options, so nothing is drawn in a colour
  the contrast gate did not measure.

**Bad.**
- **Labels truncate, and earlier than this ADR first said** (corrected after F-234's review). An item is
  (width − 2 × 37.3) / 5: 61.9 dp on a 384 dp phone, 57.1 dp on a 360 dp one. `プロフィール` at the
  caption step is about 61.8 dp, so it **truncates at 1× on a 360 dp phone**. By arithmetic with the
  system font's widths (inferred, not measured), *Wardrobe* truncates from roughly 130 % text and
  *Profile* near 200 %. A7 asks for 200 % without loss of content: the accessible name keeps the whole
  word, so a screen reader loses nothing, but a sighted reader sees `プロフィ…` or `Wardr…`. Whether to
  keep truncating, shrink the word to fit, let it wrap and grow the bar, or shorten the copy is
  OQ-49. Where each label truncates, in both locales at 360 and 384 dp and at 1× to 200 %, is owed as
  an attestation on a device.
- **Four active glyphs are an outline beside Home's fill** until OQ-47 is answered. That is what `01`
  draws; it is not a choice made here.
- **The bar no longer follows React Navigation's layout** — a landscape label beside its glyph, or a
  platform-specific height. The app is portrait-only (`app.config.ts`), and `01` draws no other form.

## Alternatives rejected

- **React Navigation's bar with `tabBarIcon`, `tabBarLabel` and styles.** Its item layout is its own:
  equal fifths, its label spacing, labels beside icons on wide screens. The indicator on the rule over
  the item and the side inset cannot be drawn through it faithfully.
- **Keeping the glyphs alone.** C1 resolves the conflict to `01`, which draws words; F-168's reason
  was a wrap, and `01`'s type does not wrap.
- **56 dp plus the inset.** It stacks the device inset under a bar that already draws space under its
  labels, so the bar grows 34 dp taller than `01` on the phone `01` is drawn for.
- **A per-subject exemption for the missing states.** It would let any interactive component declare
  its way out of `disabled` and `loading`; a kind the tree must earn cannot be claimed.
