# ADR-0096 — A theme is a hue on the chrome, and never touches the ground a colour is judged against

## Status

**Accepted** — F-153.

## Date

2026-09-07

## Context

Requested, referencing an app that ships Material You with preloaded themes. FR-70 asks for
light, dark, system, and a set of themes, with the choice persisted.

The opportunity is specific to this product and worth naming: it already contains a complete
OKLCh, contrast, CVD and gamut-mapping engine with **zero runtime dependencies**, so it can
derive a theme and *prove* the result accessible — which a fixed tonal palette cannot.

The risk is equally specific. This is a colour-measurement app. A theme that tints the surface a
sample is read against changes what the sample looks like, which is the one thing the product may
not do.

### What the palette actually is, measured before anything was proposed

| | chrome | `swatch.*` | `chart.*` | `status.*` · `ring` |
|---|---|---|---|---|
| light | C 0.003–0.008, H 70–85 | C 0.004–0.005 | C 0 | C 0.08–0.15 |
| dark | C 0.004–0.006, H 70–85 | C 0.003–0.004 | C 0 | C 0.075–0.15 |

The whole interface is a **warm near-neutral**. That is what makes this tractable: a theme does
not repaint the product, it moves that trace of hue.

## The decision

**A theme is a hue applied to the neutral chrome. It never moves lightness, and it never touches
the ground a colour is judged against.**

```
tint(token, recipe) =
  neutral by name   → unchanged   swatch.well · swatch.hairline(.inverse) · chart.1–5
                                  status.ok · status.warn · status.bad · ring
  c === 0           → unchanged   border · backdrop · surface.1
  otherwise         → { l, c: min(c · scale, ceiling, gamut(l, h)), h: recipe.hue }
```

### L is preserved exactly, and that is the load-bearing part

Contrast is dominated by lightness. Preserving it means a derived theme **starts from a palette
that already passes**, and the only open question is whether the added chroma cost anything —
which gate 9 then measures over the derived values rather than over a promise.

It also makes a theme reviewable in one sentence: *the hue moved, and nothing else did.*

### What is never tinted, and why the two lists are different

**The sample's furniture** — `swatch.well` and the two-tone keyline. This is what a colour is read
against, and a hue behind every sample would change what every sample looks like. FR-70's fourth
criterion asks for exactly this, and here it falls out of the derivation rather than being checked
afterwards.

**The signals** — the chart ramp, the three status colours, the focus ring. These are not chrome.
`chart.*` is greyscale precisely so hue is not the channel; a status says something is wrong; a
ring says where the cursor is. **A signal that changes colour with the decoration is a signal that
has to be relearned**, and a person who picks a green theme has not asked for "wrong" to look
different.

### The strength is bounded by a rule that already existed

The manifest has carried a chroma ceiling of 0.01 since before this feature, with its own reason:

> *"The interface is near-achromatic by rule so that the garment colour is the only chroma
> competing for the eye."*

That is a product rule, and a theme does not get to argue with it. So a tint may lift chroma
toward the ceiling and never past it — which means **no theme adds a chroma exception**, and the
near-achromatic guarantee holds in all eight palettes rather than in the two somebody authored.

**This makes the themes subtler than a Material You palette, deliberately.** The hue is what
carries them, and a cool grey and a warm grey are immediately distinguishable across a whole
screen. That is the same effect that makes people particular about white balance.

## The hue comes from the corpus, pinned by slug

| family | entry | | hue |
|---|---|---|---:|
| `fuka` | `fuka-mizu` | 深水 Deep Water | 240 |
| `yama` | `yama-moe` | 山燃 Burning Hill | 40 |
| `aota` | `ao-ta` | 青田 Green Paddy | 130 |

Not invented. `themes.test.ts` reads the published entry and fails if the declared hue has drifted
— the same pin `generate-brand-assets.mjs` puts on the icon's five petals, so a republished corpus
that moves a colour is a decision somebody makes rather than a silent redraw.

## Appearance is two choices, not one

```
family : base | fuka | yama | aota
mode   : system | light | dark
```

Choosing a theme and choosing light or dark are independent — somebody can want the blue theme
*and* want it to follow the phone. Collapsing them would mean eight entries where half differ only
in a way the system can already answer.

The palette name is `<family>.<resolved mode>`, with the base pair keeping the names `light` and
`dark` so nothing downstream changed meaning.

## Consequences

- **Eight palettes, derived at parse time.** Every gate reads the parsed manifest, so contrast and
  CVD run over the values a device will actually paint. That is FR-70's third criterion, met by
  where the derivation happens rather than by an extra check.
- **`THEMES` widened and nothing broke**, because the gates, the four emitters and the conformance
  suite all iterate it. Measured before proposing: there was exactly one exhaustive
  `Record<Theme, …>` in the repository, and one screen typing a card's theme as the old pair.
- **The HeroUI stylesheet emits the base pair only**, and that costs something worth stating:
  anything HeroUI paints for itself and we do not override keeps the base ground under a tinted
  theme. Our components pass their own background and foreground, so what a person sees is ours —
  but that is a claim about today's components, not a guarantee.
- **The conformance suite runs the base pair plus one tinted theme.** It checks structure and
  token resolution, and a hue changes neither; running all eight would make it four times slower
  to learn nothing.
- **A `setting` table** — the first thing in the database that is not the person's data. Not in
  `SYNC_TABLES`: an export is what somebody made, and their choice of theme is not part of it.

## Alternatives considered

**Author each theme by hand.** Twenty-five tokens times eight palettes, all of it hand-checked, and
every future token needing eight edits. The reason to reject it is not effort — it is that
hand-authored palettes drift, and nothing would have been able to say what a theme is *allowed* to
change.

**Derive from a runtime seed.** That is F-154, and it is a different problem: a seed unknown until
runtime means the contrast and CVD checks have to run on the device. Doing it at build time first
is what makes that feature about the runtime and not about the derivation.

**Tint the statuses too, for a more coherent palette.** More coherent and less usable. An error
colour that shifts with the decoration is a signal a person has to relearn each time they change
their mind about the theme.

**Raise the chroma ceiling for themed palettes.** This was the tempting one, and refusing it is
the decision. The ceiling exists so the garment colour is the only chroma competing for the eye,
and a theme is decoration — the one thing that should not be what wins that competition.
