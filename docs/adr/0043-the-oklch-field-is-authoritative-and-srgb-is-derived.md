# ADR-0043 — The `oklch` field is authoritative; `srgb` is derived output, not an input

## Status

Accepted

## Date

2026-08-15

## Context

`design-system.manifest.json` records each token twice: an `oklch` object and an `srgb`
string. [ADR-0020](0020-design-tokens-are-oklch-native.md) calls the second one "the sRGB
fallback" and notes that "the manifest records both", but nothing in the file, the schema or
any tool said which of the two wins when they disagree.

They disagree almost everywhere. Converting each token's `oklch` through the engine
(`oklchToXyz → xyzToSrgb`) reproduces its declared hex for **1 of 38** opaque tokens —
`light.surface.1`, which is `#FFFFFF`:

| Token | declared `srgb` | from its own `oklch` | ΔE00 |
|---|---|---|---|
| `dark.background` | `#141312` | `#090807` | 2.22 |
| `dark.status.bad` | `#DE8874` | `#E97970` | 5.61 |
| `light.status.warn` | `#96703A` | `#AA732B` | 5.58 |
| `light.status.bad` | `#A64B37` | `#BD413D` | **6.09** |

The ΔE00 column is computed in **CIELAB at D65**, per ADR-0003. `colorjs.io` defaults to D50
Lab and reports the same column up to 0.3 lower — definitional, not an error, and worth
stating because this table is the kind of thing that gets quoted against another tool.

`dark.background` differs by more than a factor of two in luminance. These are not rounding
residuals — 6 ΔE00 is roughly three times a just-noticeable difference.

**The disagreement has no single cause to correct.** It is not an OKLab/CIELAB `L` confusion
(`|L*/100 − oklch.l|` reaches 0.116 and is not monotone in `L`), not a constant offset, and
not a whitepoint mismatch — the engine agrees with `colorjs.io` bitwise on this conversion
(F-006). The two columns were simply produced by different means, and the hexes were chosen
by eye.

This had to be settled **before** the contrast gate was written, because the gate reads this
file: whichever field it reads, the other one is wrong, and the gate would have quietly
certified a palette nobody had approved. Reading the hexes instead of the OKLCh does not
even fail in the same places — it produces 8 WCAG failures rather than 5, including
`dark: ring / surface.3` at 4.47:1.

## Decision

**`oklch` is the authoritative field. `srgb` is derived from it by the engine and written
back into the manifest by a generator. A hand-edited hex is a gate failure.**

1. **Nobody types a hex.** `pnpm --filter @irodora/design-tokens generate` recomputes every
   `srgb` value from its `oklch` and rewrites the manifest in place.
2. **The contrast gate recomputes and compares.** If a stored hex does not match what the
   engine derives from that token's `oklch`, gate 9 fails and names the token. The check is
   exact for opaque tokens and componentwise for translucent ones.
3. **All 38 opaque hexes are regenerated in the commit that carries this ADR**, so the
   manifest stops carrying two answers from the moment the rule exists.
4. **`srgb` stays in the file.** It is the fallback older browsers need and the value a
   designer can paste into a tool that does not speak OKLCh. It is output that happens to be
   committed — the same status as a generated OpenAPI document. <!-- retired-ok: An analogy to a retired artefact, explaining why a derived file is committed. The comparison still lands. -->

This is the rule the corpus already lives under (F-011: "derived values computed from `xyz`
by the engine at build time, never typed"). The design system was the one place where a
colour value could still be hand-written, and it drifted, which is the argument.

## Consequences

**Good.** One source of truth, and the class of defect is gone rather than fixed: a
disagreement cannot recur because the second value is no longer authored. The contrast gate
now checks the palette that was actually designed. `@irodora/design-tokens` gains a real
reason to depend on the engine, which is what makes it a colour product's token layer rather
than a JSON file with a build step.

**Bad.** The regenerated hexes are visibly different from the approved ones — `dark.background`
moves from `#141312` to `#090807`, which is darker than the design review saw on screen. **The
approved artefact was internally inconsistent, so some visible change was unavoidable**; this
decision chooses the field the design system's own rules are written in (the tonal ladder, the
chroma ceiling, the derived dark theme) over the field a screenshot was taken from. If the
review's intent was the hexes, that is recoverable — convert them to OKLCh once, deliberately,
and the ladder and the ceiling have to be re-derived with them. This ADR does not close that
door; it closes the door on *not knowing which one is live*.

A designer working in a hex-native tool now has an extra round trip, and their pasted hex will
be silently corrected by the generator rather than honoured.

**Neutral.** The manifest grows a generated region. Reviewers of a token change will see two
hunks — the `oklch` edit and the regenerated hex — and the second one is noise that has to be
read anyway to confirm it is only noise.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **`srgb` is authoritative; regenerate the `oklch`** | Defensible if the design review approved screenshots rendered from the hexes. But it inverts ADR-0020 — a colour product would be defining its interface in hex and deriving the perceptual coordinates — and every rule in the manifest (the `L` ladder, `chromaCeiling`, the derived dark theme) is expressed in OKLCh and would have to be re-expressed as eyeballed values |
| **Keep both authored; make the gate assert they agree** | Simplest to implement and keeps whatever a designer intended in both columns. It converts a silent drift into a loud one, which is better — but it still requires a human to resolve 37 conflicts by hand, and to keep resolving them forever. The disagreement is a *shape* problem, not a data problem |
| **Delete `srgb` entirely** | Tempting, and it makes the rule unbreakable. Rejected because the fallback is genuinely needed for older browsers and for tools that cannot read OKLCh, and because a committed derived value is greppable — a token can be found by its hex |
| **Have the gate read `oklch` and ignore `srgb`** | The one-line fix, and the worst option: the file would keep publishing 37 wrong hexes that no check ever looks at, with a gate passing beside them |

## Revisit when

- A design review is run against rendered output from this manifest and rejects the
  regenerated values. That is a decision about *which palette*, and it belongs in its own ADR
  rather than reopening this one.
- CSS Color 5 relative colour syntax lands widely enough that the sRGB fallback stops being
  needed, at which point the field can be dropped and the whole question disappears.
