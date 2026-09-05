# Plan: F-168 — The tab bar is icons alone

| | |
|---|---|
| **Feature** | F-168 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-9, FR-71 |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-09-05 |

---

## Intent

*"In navbar, I told to use icons, but use only icons, no texts, text is overflowing to next
rows."*

Done, to a person: five glyphs across the bar, none of them wrapping, and the one they are on is
obviously the one they are on.

## Approach

**F-162 drew both deliberately and it was the wrong call twice over.** The argument was NFR-9 —
shape and word are two channels where the bar had one plus a colour — and the outcome is a bar
whose labels **wrap to a second line** on a real phone. Five words at the 10px label step with
0.16em tracking do not fit across a phone width, and putting a 20px glyph above each one made the
lockup taller and the words no narrower.

**A channel that overflows is not a channel.** That is the whole correction: the reasoning was
about information and the failure was about space, and space wins because a wrapped label is
worse than no label.

**What carries NFR-9 without the word.** Selection keeps two visual channels — the **indicator
rule** above the glyph and the **foreground token** — so colour is still not alone, which is what
golden rule 13 requires. `accessibilityState.selected` is the third, set by React Navigation.

**The word is not deleted, it moves.** `tabBarAccessibilityLabel` already carries it, so a screen
reader announces "Atlas" exactly as before. Nothing changes for anybody who cannot see the glyph.

**What is genuinely lost** is a sighted person who does not recognise a shape, and that is the
cost of the decision rather than an argument against it. It is what every navigation bar on a
phone does, and it puts the weight on the glyphs being legible — which F-162 already recorded as
an outstanding device attestation and which this makes load-bearing.

**Reused:** `NavIcon` and its registry, the indicator, `TABS`, the whole test in
`tab-icons.test.tsx`. Nothing new is drawn.

**Increments:**

1. `TabLabel` drops the `<Text>`; the glyph grows, because it is now the only visual identity.
2. `TAB_BAR_BASE` shrinks — it was sized for an indicator above a label.
3. The test asserts the word is absent from the drawn tree and present in the accessible name.

## Files to touch

```
apps/mobile/app/(tabs)/_layout.tsx   — the glyph alone, the size, the bar height
apps/mobile/test/tab-icons.test.tsx  — the assertions above
```

## Anticipated effects

- **The word leaves the rendered tree** ⇒ anything selecting a tab by its text. Guard: the flow
  already selects on `tabBarButtonTestID` (`tab-<route>`), added in F-145 precisely because a
  text selector was ambiguous — so the one consumer that would have broken was fixed before it
  existed.
- **`TAB_BAR_BASE` changes** ⇒ the tap target. Guard: an assertion that the bar's own height,
  before any inset, still clears `nativeTapTarget`.
- **Contrast** ⇒ the label was a checked pairing; the glyph takes the same tokens, so the pairing
  is unchanged. Guard: gate 9, and the conformance subject that draws all five.

## Test plan

- **Absence, with a decoy.** The five words must not appear in the drawn tree — and a bar that
  rendered *nothing* would satisfy that, so the paired assertion is that all five glyphs are
  present and distinct, which `tab-icons.test.tsx` already proves both ways.
- **The name survives:** each tab's accessible name is still the word, so nothing is lost where
  it matters most.
- **Height:** the bar's own base clears the minimum tap target without the device inset.

## Verification

```
node scripts/verify-state.mjs
pnpm verify:ci
```

## Risks and open questions

- **Legibility is still unverified and now matters more.** F-162 recorded it as an outstanding
  attestation with the wardrobe glyph named as the weakest; removing the word removes the thing
  that was covering for it. The attestation is restated rather than carried over quietly.
- **Nothing here can see the overflow that caused this.** `react-test-renderer` has no text
  measurement, so "it wraps on a phone" was invisible to the suite and stays invisible. What the
  test can assert is that there is no text to wrap.

## Out of scope

- Redrawing the glyphs. If one of them is unreadable that is a drawing problem and gets its own
  work; this feature is about what the bar contains.
