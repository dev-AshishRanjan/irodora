# ADR-0131 — The CVD preview is Machado at full severity on every token and sample, and is never stored

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-09 |
| **Feature** | F-240 |
| **Builds on** | [ADR-0009](0009-cvd-is-an-engine-concern-not-a-ui-filter.md) (CVD is an engine concern), [ADR-0062](0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md) (colour reaches a component through `style`), [ADR-0116](0116-text-on-a-sample-and-a-samples-edge-move-the-e3-way-per-sample.md) (a sample's ink and edge are derived from it) |
| **Applies** | R9-MOCKUP-FIDELITY §4 E2 and E4; golden rules 11, 13 and 14; NFR-10, FR-5 |
| **Decided on** | F-240's plan (D1–D12); the delegation of 2026-10-05 (*"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."*) |

---

## Context

Mockup `15`, section 2, draws four pills under *2. Accessibility & Colour-Vision Deficiency (CVD)
Mode*: **Standard**, **Protanopia**, **Deuteranopia** and **Tritanopia**. F-240 asks that choosing
one re-render every token and every sample through `@irodora/cvd-engine`: one simulation, the
engine's, never a second implementation. It also asks that the mode be labelled on screen while it
is on, and that it never change a stored value or an exported file.

Three facts shape the answer.

- **The engine refuses tritan dichromacy.** `simulateDichromacy` implements Viénot's (1999)
  single-plane matrices for protan and deutan only. It throws for tritan, deliberately: Viénot's
  plane is not accurate for it, and the Brettel (1997) anchors could not be verified (F-008's
  attested criterion). `simulateAnomalous` (Machado, Oliveira and Fernandes 2009) covers all three
  deficiencies at severities 0 to 1. It applies its matrices to encoded sRGB (`machado.ts`).
- **React Native has no whole-screen colour filter.** RN's `filter` style offers brightness and
  opacity, not a colour matrix. So a preview has to simulate the colours themselves, where they
  enter the tree: the token layer (`useTheme().colors`) and the sample family.
- **Colour enters the tree in exactly two ways.** The colour-literal lint and the conformance rule
  that every painted colour resolves to a token or a declared sample already make it so.

## Decisions

### 1. One simulation for all three modes: Machado at severity 1.0 (D1)

Each mode runs `simulateAnomalous(rgb, deficiency, CVD_SEVERITY)` with `CVD_SEVERITY = 1`:
`protan`, `deutan` or `tritan`. `simulateDichromacy` is never called by the preview, so the engine's
tritan refusal is never reached and never bypassed.

- **Severity 1.0 is the model's dichromacy case.** The authors' page: *"1.0 represents the highest
  severity or a case of dichromacy"* (Machado et al., the CVD simulation page at inf.ufrgs.br).
  DaltonLens's review of open-source CVD simulations says Machado is very similar to Brettel 1997
  for dichromacy, because the authors tuned their scaling parameters to match it.
- **Browsers ship these matrices under these words.** Chrome's *Simulating CVD in Blink* gives its
  deuteranopia matrix and sources it to Machado, Oliveira and Fernandes. Its values equal the
  engine's `MACHADO_DEUTAN` at 1.0 to the three decimals Chrome prints, in every row:
  `0.367 0.861 −0.228 / 0.280 0.673 0.047 / −0.012 0.043 0.969`. Chrome states no severity and no
  colour space. DaltonLens says Chromium and Mozilla now rely on the Machado approach. A test in
  F-240's increment 2 holds the equality.
- **It is the only order that is honest on a token layer.** A matrix applied to encoded values is
  linear in encoded values, so it commutes with alpha compositing in encoded space: simulating each
  translucent token and then compositing equals compositing and then simulating, up to clipping and
  8-bit rounding. Viénot is a projection in linear light and does not commute, so a token-layer
  Viénot preview would misstate every translucent paint. The property is held by a test, with
  Viénot as its decoy.

### 2. The chips keep 15's words; the strip qualifies them (D2)

The pills say **Standard · Protanopia · Deuteranopia · Tritanopia**, as `15` draws them. In
Japanese they say 標準 · 1型2色覚 · 2型2色覚 · 3型2色覚. Kotobank's table of current ophthalmological
terms lists these three, and an MLIT document cites the Japanese Ophthalmological Society's 2005
material for colour-vision terms. That 2005 document itself was not read; F-265 confirms the terms.

No copy claims to show what a person sees. The strip (§5) says the screen is *simulated*, and names
the model and the severity. **For Tritanopia it says the simulation is approximate.** DaltonLens
reports that Machado's authors did no experimental validation with tritanopes, and quotes the paper
as restraining the model from modelling tritanopia: tritanomaly is simulated by the shift paradigm
*"only as an approximation to the actual phenomenon"*. That is a second-hand quotation (the full
paper was not read here). The authors' own page covers tritanomaly in its table and describes no
tritan validation. This is an E2 row: the drawn word stays, and the strip carries the qualification.

The colour detail's vision block calls the same output *Red-weak (protan)*: two names for one
simulation. Recorded as F-326, not changed here.

### 3. Where it is computed, and in which order (D3, D4)

- `@irodora/design-tokens/src/preview.ts` holds `PREVIEW_MODES`, `simulatePaint(css, mode)` and
  `simulatePalette(colors, mode)`. It is pure, it reads the package's own token formats, and its only
  arithmetic is the engine's. `@irodora/ui`'s `ThemeProvider` applies it.
- **Simulate the render, never render the simulation.** Every value derived from colours (the ink on
  a sample, a sample's edge) is derived from the palette as declared (`ThemeValue.source`) and then
  painted. Printed values (hex text, accessible names, figures) never change. The other order would
  show an app that had re-solved its ADR-0116 moves for simulated colours: a screen that never
  exists, and one that overstates legibility.

### 4. What it covers, and what it does not (D5)

**Covered:** the token layer in every palette that paints (Sumi, Washi, Slate, Obsidian and the
runtime device palette), the sample family, and the colour card's display.

**The paint audit (F-240 increment 1).** HeroUI paints some parts through its own CSS classes, which
read Uniwind variables and would escape a token-layer preview. So the audit asked whether any such
paint is visible:

- A scan of HeroUI's component stylesheets listed every rule declaring a colour (71 across the
  components `@irodora/ui` wraps).
- A probe rendered every subject of the component registry in every required state and listed each
  HeroUI class that reached the tree, with the colours its node's `style` sets.

Every colour-declaring HeroUI class that renders has that colour overridden by our `style`, or
declares only `transparent`. Its shadow variables (`--surface-shadow`, `--overlay-shadow`,
`--field-shadow`) are transparent. The one HeroUI surface no subject renders, the toast, is drawn by
`useConfirm` as a custom component with our tokens, and HeroUI renders a custom toast as given, with
no root of its own. So no Uniwind variable needs simulating.

**Outside, and the strip says so:** photographs (the avatar, wardrobe photos, the Lens's held photo),
the camera viewfinder, and surfaces the OS draws (status bar, keyboard, alerts, permission prompts,
share sheet, photo picker, native splash). None is painted from a token or a sample. An image could
only be recoloured by the renderer's arithmetic, which is not the engine's (criterion 1).

### 5. Session-only, labelled while on (D6, D7)

- **The mode is held in memory at the root and never written.** It is not a display setting.
  Nothing to undo, nothing in an archive, and no relaunch into a simulated app behind a native splash
  that cannot be simulated.
- **A strip directly above the tab bar** says it is on, on every route (the tab bar is on every
  route: FR-71, F-145). It is `15`'s badge vocabulary: a `surface.2` pill with the `contrast` glyph in
  one ink naming the mode, and one caption line with the model, the severity, the tritan
  qualification where it applies, and what is not simulated. The words carry the mode (rule 13). It
  is not interactive: the way back is section 2. A sheet or dialog covers it while open. This is an
  E4 surface: no mockup draws it.

### 6. The control, the gates and the cost (D8–D12)

- **The control** is `ChoiceGroup`'s pill form, with radio-group semantics, in F-232's choice-pill
  tone (`SelectionDot`, `surface.2`, the `foreground` edge for the chosen pill). `15.cvd.badge`
  (`engine:corpus.separation`) is F-262's.
- **Gates 9 and 10 keep measuring the declared palettes.** A census measures the simulated ones,
  pinned and recorded, with no threshold: a failure in a model's output could only be fixed by
  moving a declared token, and a threshold is a person's decision.
- **A preview sweep** renders each registered subject in Standard and in each mode, and asserts every
  painted value is `simulatePaint` of its Standard value and nothing else changed.
- **The painted palette is memoised** per source palette and mode. A mode switch is instantaneous,
  with no haptic and no animation.

## Consequences

**Good.**

- One simulation, the engine's, everywhere a colour is painted, including the device palette.
- The tritan refusal stands, and tritan is labelled as the approximation it is.
- Nothing is stored and nothing exported changes, by construction.

**Bad.**

- **Two names for one simulation** until F-326: *Protanopia* here, *Red-weak (protan)* on the
  colour detail.
- **Photographs, the camera and what the OS draws are not simulated.** The strip says so, in those
  words (*anything the system draws*, F-240’s review S1); a person can still compare a photograph
  with the simulated chrome around it and be misled about the chrome.
- **A sheet covers the strip** while it is open.
- **The detail block's simulated swatches are simulated again** when a mode is on. That is correct
  for "what this screen shows", but it is not idempotent.

**Neutral.** The scoring use of the engine (ADR-0009) is unchanged; the preview reads the same
function and changes nothing it computes.

## Alternatives considered

- **Viénot for protan and deutan, Machado for tritan.** Two simulations, against criterion 1, and
  Viénot does not commute with compositing on a token layer.
- **Disable Tritanopia.** Against criterion 1 and rule 14: `15` draws it.
- **Implement Brettel's tritan.** F-008's open decision: its anchors could not be verified, and the
  CIE colour-matching functions it needs are a content and licensing question. Even verified, it
  would not commute.
- **A severity below 1.0.** No drawn word names a severity, and 1.0 is the model's dichromacy case.
- **A native or SVG `feColorMatrix` filter over the screen.** RN has none for views, and an SVG filter
  is the renderer's arithmetic (in linearRGB by default): a second implementation.
- **Relabel the chips *-anomaly* or *red-weak*.** Departs from `15` with no rule forcing it.
- **Persist the mode beside F-239's switches.** A stored preview relaunches simulated behind a splash
  that cannot be simulated.
- **A top banner, or one per app bar.** The top inset is `Screen`'s, and not every route has an app
  bar yet.

## Revisit when

- Brettel's tritan is implemented and verified (F-008): the Tritanopia label may lose its
  qualification, though a token layer would still need a commuting model.
- F-262 composes Preferences, or F-267 judges the strip or the labels wrong by eye.
- React Native gains a whole-view colour-matrix filter that runs the engine's arithmetic.
