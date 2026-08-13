# Motion Rules

---

## The constraint that overrides everything

> **Motion must never alter a colour mid-transition.**

The product asks people to judge colour accurately. Animating a colour makes that
impossible for the duration of the animation, and worse, the intermediate frames are
*plausible* — a user reads a colour that never existed.

| Never | Instead |
|---|---|
| Cross-fade between two swatches | Replace instantly, or move the swatch |
| Animate a colour value | Animate position, opacity of surrounding chrome, or size |
| Fade a swatch in from transparent | Fade in the container, not the colour |
| Transition a background colour behind a sample | Do not |

Motion may move things, reveal things, and change opacity **of chrome**. It may not change
what colour something appears to be.

---

## `prefers-reduced-motion` is honoured completely

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Every duration token collapses to 0. **Reduced motion is a state the product genuinely
ships**, not a test-only mode — the performance gate measures under it, so it is exercised
on every build.

---

## Restraint

Motion is used to:

- show where something came from or went;
- indicate that something is loading;
- confirm an action registered.

That is the list. Motion is not used to decorate, to demonstrate craft, or to fill time.

| Purpose | Duration |
|---|---|
| Micro-feedback (button press) | 100–150 ms |
| Local transition (panel, popover) | 150–250 ms |
| Page or view transition | 250–400 ms |
| Anything longer | Needs a reason |

Ease-out for entering, ease-in for exiting. Springs only where a physical metaphor is real
(a drag), never for a fade.

---

## Performance

- **Compositor properties only:** `transform` and `opacity`. Animating `width`, `height`,
  `top` or `left` forces layout on every frame.
- No animation on a list of more than ~20 items.
- No `requestAnimationFrame` loop that is not cancelled on unmount.
- No parallax. No scroll-jacking.

---

## Loading

- Skeletons that **match the final layout**, so nothing shifts when content arrives. CLS
  budget is 0.05.
- **A skeleton for a swatch is a neutral grey rectangle** — never a coloured placeholder,
  which primes the user's perception of the colour that replaces it.
- Spinners only for genuinely indeterminate waits over ~400 ms.

---

## Accessibility

- **No flashing.** Nothing above 3 flashes per second, ever.
- **No motion required to understand content.** If an animation carries meaning, that
  meaning is also available statically.
- Live regions announce state changes to screen readers; the animation is not the
  announcement.
- The Lens preview must not produce rapid luminance change — photosensitivity is a real
  constraint on a live camera view.
