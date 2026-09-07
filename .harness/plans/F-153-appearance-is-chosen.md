# Plan: F-153 — Appearance is chosen: light, dark, system, and a set of themes

|                       |                                                            |
| --------------------- | ---------------------------------------------------------- |
| **Feature**           | F-153 — [`feature_list.json`](../state/feature_list.json)   |
| **Requirements**      | FR-70, NFR-8, NFR-9                                         |
| **Service / package** | `packages/design-tokens` · `packages/ui` · `apps/mobile`    |
| **Author**            | Claude Code (generator)                                     |
| **Date**              | 2026-09-07                                                  |

---

## Intent

Requested, referencing an app that ships Material You with preloaded themes. The opportunity is
real and specific to this product: it already contains a complete OKLCh, contrast, CVD and
gamut-mapping engine with **zero runtime dependencies**, so it can derive a theme and *prove* the
result accessible — which a fixed tonal palette cannot.

## What the palette actually looks like, measured first

| | chrome tokens | `swatch.*` | `chart.*` | `status.*` · `ring` |
|---|---|---|---|---|
| light | C 0.003–0.008, H 70–85 | C 0.004–0.005 | **C 0** | C 0.08–0.15 |
| dark | C 0.004–0.006, H 70–85 | C 0.003–0.004 | **C 0** | C 0.075–0.15 |

The whole chrome is a **warm near-neutral** — a hue and a trace of chroma. That is what makes this
feature tractable: a theme does not repaint the product, it moves that trace.

## The decision: a theme is a tint on the neutral chrome, and it never moves lightness

**L is preserved exactly, for every token, in every theme.**

Contrast is dominated by lightness. Preserving it means a derived theme starts from a palette that
already passes, and the only thing left to check is that the added chroma did not cost anything —
which the gate then measures rather than us asserting. It also makes the derivation trivially
reviewable: *the theme changed the hue, and nothing else moved.*

```
tint(token, recipe) =
  neutral-by-name        → unchanged      swatch.well · swatch.hairline(.inverse) · chart.1–5
  functional signal      → unchanged      status.ok · status.warn · status.bad · ring
  c === 0                → unchanged      border · backdrop · surface.1 (white)
  otherwise              → { l, c: min(c · recipe.scale, gamut(l, h)), h: recipe.hue }
```

**Criterion 4 falls out of the first two lines** rather than being checked afterwards — the well,
the two-tone keyline and the chart ramp are on the excluded list by name, and a test asserts they
are byte-identical to the base in every theme.

`ring` and `status.*` are excluded for a reason worth stating: they are not chrome. A focus ring
and an error colour are **signals**, and a signal that changes colour with the decoration is a
signal that has to be relearned. `chart.*` is already at C 0 by an earlier decision that Bands
records — the greyscale ramp exists precisely so hue is not the channel.

## The hue comes from the corpus, pinned by slug

Not invented. Each theme's hue is a **corpus entry's hue**, verified against the published bundle
at generation time — the same move `generate-brand-assets.mjs` makes for the icon's five petals,
so a republished corpus that moves a colour is a decision rather than a silent redraw.

| theme | entry | | hue |
|---|---|---|---:|
| `fuka` | `fuka-mizu` | 深水 Deep Water | 240 |
| `yama` | `yama-moe` | 山燃 Burning Hill | 40 |
| `aota` | `ao-ta` | 青田 Green Paddy | 130 |

The base warm neutral stays as it is and is not a recipe.

## Appearance is a family and a mode

Criterion 1 asks for *light, dark, system, or one of several preloaded themes* — which is two
choices, not one:

```
family : base | fuka | yama | aota
mode   : system | light | dark      (system follows the platform)
```

The palette name is `<family>.<resolved mode>`, with the base pair keeping the names `light` and
`dark` so nothing downstream changes meaning. Eight palettes; `THEMES` lists them and a recipe the
list does not name is a parse error, so the type stays exact and every gate and emitter picks the
new themes up without being told — they all already iterate `THEMES`.

## Approach, in increments

1. **The recipes and the derivation**, in `parseManifest`, so every downstream reader — gates 9
   and 10 included — sees complete derived themes and never a promise. That is criterion 3: the
   check runs over the derived values because the derivation happens before any check does.
2. **`THEMES` widens.** One exhaustive `Record<Theme, …>` in the repository, and everything else
   iterates — measured before proposing this.
3. **Persistence.** An appearance row in the store, read by the root layout.
4. **The picker**, in Preferences — F-152 left the space for it deliberately.
5. **The tests**: neutrality by name, L preserved to the digit, gamut, and every theme through the
   conformance suite.

**Reused:** the manifest parser, `tokenRgb`, the gamut check, `checkStructure`, gates 9 and 10,
the conformance registry, `ThemeProvider`. This feature adds no colour maths — it rearranges
values the engine already produces.

## Files to touch

```
docs/design/design-system.manifest.json     — the recipes
packages/design-tokens/src/manifest.ts      — THEMES, the derivation, the refusals
packages/design-tokens/test/                — neutrality, L-preservation, gamut
packages/ui/src/theme.tsx                   — family + mode, not one name
apps/mobile/src/store/                      — the appearance row
apps/mobile/src/screens/Preferences.tsx     — the picker
apps/mobile/app/_layout.tsx                 — read it at the root
apps/mobile/src/i18n/{en,ja}.ts             — the picker's copy
docs/adr/0096-*.md                          — the tint rule and what it refuses to tint
```

## Anticipated effects

- **Eight themes instead of two** ⇒ gate 9 measures every declared pairing in all of them, gate 10
  every CVD severity. Expect the run to grow four-fold; expect findings, because that is the point
  of deriving rather than authoring.
- **`Theme` widens** ⇒ one exhaustive `Record<Theme, …>`; every other consumer iterates `THEMES`.
- **The conformance suite** renders each subject per theme — currently two, and eight would make
  the app suite four times slower. It runs the **base pair plus one tinted theme**, and the reason
  is stated rather than assumed: the suite checks structure and token resolution, which a hue
  cannot change; contrast across every theme is gate 9's job and gate 9 is exhaustive.
- **A stored preference** ⇒ the store's migration path, and a value that no longer names a theme.

## Test plan

- **Neutrality, by name and by value.** `swatch.well`, both hairlines and all five chart steps are
  byte-identical to their base in every derived theme. The decoy: a chrome token that *is* tinted,
  so "nothing changed" cannot pass.
- **L is preserved exactly** for every token in every theme — asserted against the base rather
  than against a recorded number.
- **Every derived token is in gamut**, which is what the chroma cap is for, and a recipe whose
  scale would leave sRGB fails to parse rather than clipping.
- **A recipe naming a slug the corpus does not carry fails**, and a hue that has drifted from the
  entry fails — the F-165 pin, applied here.
- **The stored appearance round-trips**, and an unknown family falls back to base rather than
  throwing.

## Risks and open questions

- **Eight themes may not all pass gate 9.** The tint adds chroma at fixed lightness, which moves
  contrast very little — but "very little" is a prediction, and the gate is the measurement. If a
  theme fails, the scale comes down or the theme does not ship; the floor does not move.
- **`ring` untinted may look wrong** against a strongly tinted chrome. That is a judgement nobody
  here can make, and it joins the queue of things a person has to look at.
- **The picker is the first surface with more than two of anything to choose from.** F-156's Select
  is not built yet, so this uses `Chip`s, which is a defensible interim and worth saying so.

## Out of scope

- **A theme from a runtime seed** — that is F-154, and the whole reason this one is build-time.
- Changing any base value. F-174 owes two status colours; this feature must not quietly ride along
  with them.
- Per-screen or per-component theming.
