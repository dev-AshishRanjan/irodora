---
name: build-ui
description: Build a surface that meets the accessibility gates, respects colour perception, and executes the type, spacing and proportion craft that separates designed from generated.
---

# Skill: build-ui

Rules: [`frontend.md`](../../rules/frontend/frontend.md) ·
[`contrast.md`](../../rules/frontend/contrast.md) ·
[`motion.md`](../../rules/frontend/motion.md) ·
Manifest: [`design-system.manifest.json`](../../../docs/design/design-system.manifest.json) ·
Taste: [`visual-taste`](../visual-taste/SKILL.md).

> Typography, spacing and proportion guidance is informed by the **Impeccable** design skill
> and **shadcn/ui** conventions — see [`NOTICE.md`](../../../NOTICE.md). Token *names* are
> shadcn-compatible; the values are ours ([ADR-0033](../../../docs/adr/0033-frontend-foundation-own-the-token-layer-headless-primitives.md)).

## Before

**Is there an approved design?** Surfaces are designed first, then built. Building ahead of
the design means building twice.

**Does the component exist** in `@irodora/ui`? Extend rather than duplicate.

**Which tokens?** If a value is not a token, it does not go in — that is a token nobody
defined. Read the manifest, not another component.

## Craft: the things that separate designed from generated

### Type

- **Scale contrast is the whole game.** A surface earns its calm from the gap between the
  largest thing and the smallest. `display.1` (72) against `label` (10) is a decision; two
  adjacent steps is a default.
- **Stay on the scale.** Seven steps exist. An eighth needs a reason recorded in the manifest.
- **`text-wrap: balance` on every heading.** A two-word orphan on line two is the most visible
  tell of unconsidered type.
- **Body measure ~65 characters.** Wider is unreadable; much narrower fragments.
- **Tighten tracking as size grows.** −0.04em at display, 0 at body. Large type set at default
  tracking reads loose and amateur.
- **Uppercase micro-labels need +0.16em**, or the letterforms collide.
- **`tabular-nums` on every number.** Mandatory, not stylistic — columns of ΔE values must align.
- **Japanese needs its own line-height** (1.85 vs 1.65). One value for both is a layout that
  was only ever checked in one language.

### Spacing

- **Let layout do the spacing.** Flex/grid with `gap`, not per-element margins that collapse
  or double.
- **Space belongs to the group, not the element.** A component should not carry outer margin;
  its parent decides.
- **Related things are closer than unrelated things.** Most hierarchy failures are proximity
  failures, not size failures.
- **The larger steps carry the editorial rhythm.** 間 is a design element; reaching for 8px
  everywhere produces density nobody asked for.

### Proportion and surface

- **Tonal elevation, never shadow.** Surfaces lift by tint. A shadow tints what it surrounds,
  which disqualifies it near a sample.
- **Hairline borders are translucent overlays**, never solid greys — depth reads as lift.
- **44px minimum tap target**, on web too.
- **Radius from the scale**: 10 / 14 / 20 / 28 / pill. **Swatch is 0.**

## Colour rendering — the rules unique to this product

- **A sample sits in a `swatch.well`**, always. A neutral inset, mandatory at every size.
  Simultaneous contrast is the difference between a correct and an incorrect reading.
- **No gradient, glow, shadow or translucency on or near a sample.** Vibrancy tints what
  shows through it.
- **`radius.swatch` is 0** at every size, forever.
- **No cross-fade between swatches.** Motion never alters a colour.
- **Provenance renders with the colour**, always — never behind a tap.
- **A colour under examination is data**, rendered from a `Color` value with its provenance.
  Never a hard-coded string.

## Accessibility is a gate, not a review

- **Headless primitives** (Radix or Base UI) for anything with interaction semantics. Style
  them; do not reimplement focus management, keyboard handling or ARIA.
- Every interactive element: accessible name, **visible focus indicator**, keyboard operation.
- **Never colour alone.** Every status is colour **+ icon + word** — enforced by the manifest's
  status pairing.
- **Every swatch has an accessible name and its numeric value.** A swatch without a name is an
  empty box to a screen reader and to a CVD user, and it is the most common failure in colour
  tooling.
- `foreground.3` is **large-text-only**. Micro-labels use `foreground.2`. The manifest says so;
  the gate enforces it.

## Verifying

```bash
pnpm test:a11y && pnpm test:contrast && pnpm test:cvd && pnpm test:e2e && pnpm test:perf
```

By hand: keyboard · screen reader · 200% text · reduced motion · **both themes** · both
locales · simulated CVD.

Then [`visual-taste`](../visual-taste/SKILL.md)'s pre-flight check — including:

> **Put a real garment colour on screen inside this surface. Can you judge it accurately?**

If the chrome interferes, the surface has failed at the one thing this product exists to do.

## Never

A colour literal outside the token layer · a hard-coded user-facing string · an interactive
element without a focus indicator · a meaning carried only by colour · an animation that
changes a colour · a swatch without a name · a rounded swatch · `foreground.3` on small text.
