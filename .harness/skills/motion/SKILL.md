---
name: motion
description: Add motion that feels intentional — correct easing, duration by interaction class, compositor properties only, and never on a colour.
---

# Skill: motion

Rules: [`motion.md`](../../rules/frontend/motion.md) ·
tokens in [`design-system.manifest.json`](../../../docs/design/design-system.manifest.json).

> Craft guidance adapted from **Emil Kowalski's** published work on web animation
> (`emilkowal.ski`) — see [`NOTICE.md`](../../../NOTICE.md). **Key adaptation:** his principle
> that motion should be fast, purposeful and physically plausible is kept intact; the product
> constraint that motion may never alter a colour is ours and overrides it wherever they meet.

## The constraint that overrides everything

> **Motion must never alter a colour mid-transition.**

The intermediate frames of a colour animation are *plausible* — a user reads a colour that
never existed, and cannot tell that they did. Everything below is subordinate to this.

| Never | Instead |
|---|---|
| Cross-fade two swatches | Replace instantly, or move the swatch |
| Animate a `background-color` on a sample | Animate the container's opacity |
| Fade a swatch in from transparent | Fade in the well, not the colour |
| Animate a colour-valued CSS variable | Do not |

## Duration by interaction class

The single most common motion mistake is one duration for everything. Distance and
significance set the number:

| Class | Duration | Example |
|---|---|---|
| **Micro** | 120 ms | Button press, checkbox, hover |
| **Local** | 180 ms | Popover, tooltip, accordion, chip appear |
| **View** | 260 ms | Sheet, dialog, route transition |
| Anything longer | Needs a reason | — |

**Exits are faster than entrances** — roughly 0.8×. A user leaving has already decided; an
element that lingers on the way out feels like lag rather than polish.

## Easing

```
--ease-out:    cubic-bezier(0.16, 1, 0.3, 1)     /* entering, expanding, revealing */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)    /* moving between two positions */
```

**Never `linear`** for anything a human perceives as physical — it reads mechanical because
nothing in the world moves that way. Linear is correct only for continuous indeterminate
motion, such as a spinner.

**Ease-out is the default.** It starts fast and settles, which is what makes an interface
feel responsive: the element commits immediately and then arrives.

**Springs only where a physical metaphor is real** — a drag, a pull, a swipe-dismiss. A
spring on a fade is decoration pretending to be physics.

## Compositor properties only

```
✓ transform, opacity        — GPU, no layout, no paint
✗ width, height, top, left, margin, padding  — layout on every frame
```

Animating layout properties forces reflow at 60 Hz. It is the difference between motion
that feels designed and motion that feels broken on a mid-range phone.

**Transform origin matters.** A popover scaling from its centre reads as an object appearing
from nowhere; scaling from the control that opened it reads as that control expanding. Set
`transform-origin` to the source.

## Reduced motion is a shipped state

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

Every duration token collapses to 0. **This is a state the product genuinely ships** — the
`web-perf` gate measures under it, so it is exercised on every build rather than only when
someone remembers to test it.

**Motion may never be the only carrier of meaning.** If an animation communicates a state
change, that state is also available statically.

## Restraint

Motion is used to show where something came from, indicate loading, or confirm an action
registered. That is the list. Not to decorate, not to demonstrate craft, not to fill time.

**Scattered micro-effects are the signature of generated design.** One orchestrated moment
lands harder than six hover flourishes — and on this product, closer to zero is usually
right.

## Before you finish

- [ ] Nothing animates a colour
- [ ] `transform` and `opacity` only
- [ ] Duration matches the interaction class; exits are faster
- [ ] `transform-origin` set to the source where an element expands from a control
- [ ] `prefers-reduced-motion` collapses it to nothing
- [ ] No `requestAnimationFrame` loop left uncancelled on unmount
- [ ] Nothing flashes more than 3× per second
- [ ] A swatch skeleton is a **neutral** grey, never a coloured placeholder — a tinted
      placeholder primes the perception of the colour that replaces it
