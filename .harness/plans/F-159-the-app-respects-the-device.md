# F-159 — The app respects the device, not the simulator

**Status:** in_progress · **Release:** R6 · **Blocked by:** nothing

---

## Three defects, all measured rather than suspected

### 1. Nothing in the app handles insets

```
grep -rn "SafeArea|useSafeAreaInsets" apps/mobile packages/ui/src   →   nothing
```

Not in the screens, not in the layout primitives, not in either `_layout`.

It worked before F-145 because the root `<Stack>` **showed a header**, and react-navigation
insets a header for you. F-145 set `headerShown: false` on the tab group — correctly, because a
navigation bar above a tab bar is two headers for one page — and removed the only thing that was
providing top inset. The reporter's *"we were not having this issue previously"* names the commit.

`react-native-safe-area-context@~5.7.0` is already a declared dependency of `apps/mobile`, and
its provider is already in every rendered tree. **The machinery is installed and nothing consumes
it.**

### 2. The tab bar assumes an inset instead of measuring one

```ts
// The bar is taller than the default to fit the indicator above the label without
// crowding either. iOS adds its own safe-area inset below this.
height: Platform.OS === 'ios' ? 88 : 68,
```

That comment is an assumption, and it is the shape of assumption this repository keeps getting
caught by. An explicit `height` is what stops react-navigation applying the inset itself, and
Android with gesture navigation has a bottom inset that `68` knows nothing about.

### 3. Fixed pixel widths overflow narrow phones — and the arithmetic is not close

| constant | needs | 320pt (SE) | 360pt (common Android) | 390pt |
| --- | --- | --- | --- | --- |
| Wardrobe: two `CELL_PHOTO` cells + `md` gap | 332 | **264** ✗ | **304** ✗ | 334 ✓ |
| Colour page: `HERO` inside `padding="xs"` | 320 | **312** ✗ | 352 ✓ | 382 ✓ |

The wardrobe grid overflows on **every phone narrower than about 390pt**, which is most Android
hardware. Both constants are mine — `HERO` from F-148, `CELL_PHOTO` from F-150 — and both are the
same mistake: a pixel size chosen against one imagined screen.

---

## What gets built

### The insets are consumed once, in `Screen`

Top, left and right, added to the token padding rather than replacing it — a screen still has its
own rhythm, and the inset is what keeps that rhythm clear of the hardware.

**Not bottom.** Every screen in this app sits inside the tab navigator, which occupies the bottom
edge; adding a bottom inset in `Screen` as well would double-count it. The tab bar owns that edge
and takes the inset itself.

Criterion 3 says the treatment is expressed once rather than per screen, so this is the only place
that reads insets and a check enforces it. A per-screen inset is a per-screen decision, and the
next screen forgets.

### The tab bar derives its height

`height: BASE + insets.bottom` and `paddingBottom: insets.bottom`, on both platforms. No
`Platform.OS` branch, because the inset already differs per device — branching on the platform is
guessing at the thing the API reports.

### The two fixed widths become proportional

The hero and the gallery cell size from the window rather than from a number. A cell in a
two-column grid is `(width − insets − padding − gap) / 2` by construction, which cannot overflow
because it is derived from what it has to fit in.

### A gate: `verify-viewport.mjs`

Criterion 4. It fails on:

- a screen or component reading insets **anywhere but `Screen`** — the "expressed once" half
- a numeric `width` / `height` / `size` literal in a screen that exceeds what the narrowest
  supported viewport can hold

The narrowest supported width is declared **once**, with its reason: 320pt is the iPhone SE and
the smallest thing worth supporting. Both halves get `--prove` decoys in both directions — a check
that rejected every numeric size would ban `BAR = 10` and be switched off within a week.

---

## Risks

**`useSafeAreaInsets` needs a provider, and the conformance harness must supply one.** If it does
not, every subject throws. The rendered trees already show `RNCSafeAreaProvider`, which suggests
`@testing-library/react-native` or jest-expo supplies one — to be confirmed by running it rather
than by reading, because "it appeared in a tree once" is not the same as "it is always there".

**Insets are zero in jest.** So a rendered test cannot prove the inset is applied unless the
provider's value is driven. `SafeAreaProvider` takes `initialMetrics`, which is exactly the seam —
and if it turns out not to work, the honest position is that the check is a source check and the
inset itself is a device criterion.

**The tab bar's `BASE` is still a chosen number.** Deriving the inset does not derive the bar
height, and 68 was picked to fit an indicator above a label. That is a design value, not a
measurement, and it stays one.

---

## Definition of done

- [ ] Every screen clears the status bar and the home indicator, from one place
- [ ] The tab bar's height is derived from the reported inset on both platforms
- [ ] No fixed pixel width in a screen can exceed the narrowest supported viewport
- [ ] `verify-viewport` fails both a stray inset read and an oversized constant, with decoys
- [ ] `pnpm verify:ci` green
- [ ] Effects traced; the device half attested rather than claimed
