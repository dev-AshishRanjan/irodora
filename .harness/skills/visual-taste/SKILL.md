---
name: visual-taste
description: Avoid generic AI-looking design — infer the register from the subject, audit before redesigning, and run the pre-flight check before calling any surface done.
---

# Skill: visual-taste

> Adapted (MIT) from **taste-skill** (© 2026 Leonxlnx, `github.com/Leonxlnx/taste-skill`) and
> informed by Emil Kowalski's writing on agents with taste. See
> [`NOTICE.md`](../../../NOTICE.md). **Key adaptation:** the generic-output problem is bound to
> *this* product's constraints, so the escape from generic is not "add more visual interest" —
> it is "let the subject decide", and here the subject forbids decoration.

## The failure this exists to prevent

AI-generated UI converges on a small set of looks. Warm cream with a serif display and a
terracotta accent. Near-black with one acid-green pop. A purple-to-blue gradient hero.
Inter everywhere. Emoji as section markers. Everything centred, everything `rounded-lg`, an
accent bar on every card.

**This has already happened once on this project.** The first wireframe pass produced a
correct-but-lifeless spec document, because "the interface must not decorate with colour"
was read as a licence to be austere rather than as a design direction. See
[[the-constraint-and-the-taste-usually-agree]].

## Before designing anything

### 1. Infer the register from the subject

Not from the component library. Ask: what industry, what audience, what does this thing
*feel* like in the world?

For Irodora the answer is **fashion retail** — and that is load-bearing. SSENSE,
Net-a-Porter, COS and Aesop are near-monochrome *because the clothes carry the colour*. An
entire industry independently arrived at our constraint. So the reference set is retail
editorial, not developer dashboards.

**The subject's own world is where distinctive choices come from.** Indigo vats, undyed
cloth, layered garment hems, 間 as interval. Not a component gallery.

### 2. Audit before you redesign

If a surface already exists, say what is wrong with it *specifically* before proposing
anything. "It lacks design thinking" is not an audit. "The chrome is denser than the
content it frames, the type scale has no contrast, and the swatch is competing with four
borders" is.

An audit you cannot state is a redesign you cannot justify.

### 3. Calibrate deliberately

Three dials, set consciously per surface rather than inherited:

| Dial | For Irodora |
|---|---|
| **Variance** — centred/uniform ↔ asymmetric/editorial | High on the colour page and Atlas; low on the Lens, which is a task surface |
| **Motion** — none ↔ orchestrated | Low throughout. Motion may never alter a colour |
| **Density** — spacious ↔ dense | Spacious on public surfaces; dense is permitted only in Pro |

A dial set by default is a dial nobody chose.

## While designing

**Spend boldness in one place.** Here it is the swatch at photograph scale. Everything else
holds still. A page with three bold moves has none.

**Type scale needs real contrast.** A page earns its calm from the gap between the largest
thing and the smallest. 72px against 10px is a decision; 24px against 16px is a default.

**Structure must encode something true.** Numbered markers only where the content is
genuinely a sequence. An eyebrow only where it names a real category. Dividers only where
something actually divides.

**Both themes get the same care.** Not an inversion — dark and light are two designs that
share a token contract. Check the harder one, which for this product is light.

## The pre-flight check

Before calling any surface done:

- [ ] Could this be any other product? If yes, it is generic. **Name what makes it this one.**
- [ ] Does it match anything on the cliché list above?
- [ ] Is there real type-scale contrast, or is everything one or two steps apart?
- [ ] Is every structural device carrying information?
- [ ] Is the boldness in exactly one place?
- [ ] Both themes designed, not inverted?
- [ ] Every state present — hover, focus-visible, active, disabled, loading, error, empty?
- [ ] **No placeholder content, no half-finished sections, no "TODO" in a deliverable.**
- [ ] Contrast and CVD checked against the manifest, not eyeballed.

## The Irodora-specific test

> **Put a real garment colour on screen inside this interface. Can you judge it accurately?**

If the chrome interferes — a tint, an adjacent accent, a shadow, a gradient, a rounded
corner on the sample — the surface has failed at the one thing this product exists to do,
however good it looks.

## What taste is not

It is not more visual interest. On this product, taste is knowing that the restraint **is**
the design, and then executing that restraint with enough craft — type scale, spacing,
proportion, material — that it reads as deliberate rather than as unfinished.

The distance between austere and elegant is entirely in the execution.
