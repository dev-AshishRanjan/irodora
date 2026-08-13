# Irodora — Glossary

Terms whose meaning is *specific* here. Where a word has a loose everyday sense and a
precise technical one, this file records the precise one — that is the one the code uses.

Durable, evolving domain knowledge lives in
[`.harness/memory/glossary/`](../.harness/memory/glossary/); this file is the stable
reference.

---

## Colour science

**CIE XYZ** — The device-independent tristimulus space that anchors all our colour maths.
Irodora's canonical internal representation, at the D65 white point
([ADR-0003](adr/0003-canonical-colour-representation-xyz-d65.md)). Everything else is
derived from it.

**CIELAB (L\*a\*b\*)** — Perceptually-intended opponent space: lightness, green–red,
blue–yellow. The basis for ΔE00 and the language professionals already speak.

**LCh** — CIELAB expressed as lightness, chroma, hue angle. What people mean when they say
"more muted" (lower C) or "lighter" (higher L).

**OKLab / OKLCh** — Björn Ottosson's improved perceptual space (2020). Better hue
uniformity than CIELAB, especially in blues, which matters for a product built on indigo.
Used for manipulation, interpolation and gamut mapping. Standardised in CSS Color 4.

**Linear RGB** — RGB with the transfer function removed. Averaging pixels in
*non*-linear sRGB is a real and common bug: it produces a colour that is too dark. All
pixel averaging in the Lens happens in linear light.

**sRGB / Display-P3** — Encoding spaces for capture and display. **Input and output only**
— never the canonical representation. P3 covers a wider gamut and most current phone
cameras can capture in it.

**ΔE (Delta E)** — Perceived colour difference.
- **ΔE76** — Euclidean distance in Lab. Simple, and wrong in known ways.
- **ΔE00 (CIEDE2000)** — The accurate one, with lightness, chroma and hue weightings plus
  a hue-rotation term. **Our default.** Rules of thumb: < 1 imperceptible · 1–2 perceptible
  on close inspection · 2–10 perceptible at a glance · > 10 distinct colours.
- **ΔEok** — Euclidean distance in OKLab. Cheap and good enough for ranking; never for a
  professional claim.

**Chroma** — Colourfulness. Distinct from **saturation**, which is chroma relative to
lightness. Irodora says chroma and means chroma.

**Gamut mapping** — Bringing an out-of-range colour into a displayable one. We reduce
chroma in OKLCh while preserving lightness and hue, because changing someone's hue to make
it fit a screen is a lie about the garment.

**White point / illuminant** — The colour of "white" under a given light. D65 ≈ average
daylight. The reason the same shirt is a different measured colour indoors.

**Chromatic adaptation** — The transform accounting for a change of illuminant
(we use CAT16/Bradford). What makes an indoor measurement comparable to a daylight one.

**ITA° (Individual Typology Angle)** — A standard, non-racial numeric classification of
skin lightness derived from L\* and b\*. Used **only** to stratify the bias-validation set
so we can prove the profile engine works across the full range (NFR-23). It is not a user
attribute and never appears in a user-facing surface.

---

## Colour-vision deficiency

**CVD** — Colour-vision deficiency. Affects roughly 1 in 12 men and 1 in 200 women. The
term "colour blind" is imprecise (total absence of colour vision is rare) and we do not
use it in the product.

**Protanopia · Deuteranopia · Tritanopia** — Absence of the long-, medium- and
short-wavelength cone response respectively. Protan and deutan reduce red–green
discrimination; tritan reduces blue–yellow.

**Anomalous trichromacy** — Protanomaly, deuteranomaly, tritanomaly: the cone is present
but shifted. Far more common than the -opias, and modelled at variable severity via
Machado et al. (2009).

**Confusion line** — A set of colours that project to the same point for a given
dichromat. Two colours on one confusion line are indistinguishable no matter how far apart
they look to a trichromat.

**Separation score** — Irodora's [0,100] measure of how distinguishable two colours remain
after CVD simulation, from post-simulation ΔE00 and lightness difference (FR-5). One
definition, used identically by the UI and the recommendation engine.

---

## Measurement and provenance

**Measurement source** — The provenance class every colour value carries (FR-9):

| Class | Meaning |
|---|---|
| `reference` | From a published standard or a controlled instrument. Ground truth. |
| `calibrated` | Camera capture corrected against a known reference card in frame. |
| `estimated` | Ordinary camera capture. **The default, and the honest label.** |
| `declared` | Entered by a human — typed hex, chosen swatch. Precise, but only as true as the person. |

**Confidence** — A [0,1] value derived from capture conditions (FR-18). Not a probability
of correctness; a bounded quality signal with stated inputs.

**Reproducibility envelope** — The version tuple `{engine, corpus, rules, profile}` stored
with every result (FR-10). Replaying an envelope reproduces the result exactly. Without
it, "why did it recommend that six months ago" is unanswerable.

**Golden dataset** — Committed input/expected pairs from published reference sources.
Changing a golden value is changing our claim about physical reality and requires an ADR.

---

## Japanese colour

**色 (iro)** — Colour. **彩り (irodori)** — The arrangement of colours; the product's name
derives from it.

**伝統色 (dentōshoku)** — Traditional Japanese colours. Names typically derive from the
plant, animal, mineral or dye that produced them, so the *name* often records a material
process rather than a coordinate.

**襲の色目 (kasane no irome)** — The Heian-period system of seasonal colour combinations
formed by layered garments — the historical precedent for exactly what Irodora does.

**藍 (ai)** — Indigo, and the dye tradition around it. Its many named gradations
(藍鼠 *ai-nezumi*, 褐色 *kachi-iro*, 納戸色 *nando-iro*) are a large part of why a naive
"navy" label is inadequate.

**Colour classification** (FR-23) — Irodora keeps these strictly apart and never lets one
be displayed as another:

| Class | Meaning |
|---|---|
| Historical colour | Attested in a dated source with a documented material or dye |
| Japanese traditional colour | An established named colour in the received canon |
| Modern Japanese palette | Contemporary usage documented in current practice |
| Japanese-inspired palette | **Our editorial work**, acknowledged as such |
| Editorial fashion palette | Curated for use, no historical claim at all |

**Sanzo Wada (1883–1967)** — Artist and colour theorist whose *Haishoku Sōkan* (1933–34)
documented systematic colour combinations. **Inspiration, not ingestion**: we do not copy
his data. See [`content/licensing-and-provenance.md`](content/licensing-and-provenance.md).

---

## Product

**Colour Lens** — The capture surface. Four modes: live pick, garment scan, precision
pick, calibrated scan (FR-13…16).

**Colour Atlas** — The browsable, provenanced corpus (FR-20).

**Personal Colour Profile** — A multidimensional set of ranges with per-dimension
confidence — *never* a single skin RGB value
([ADR-0010](adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md)).

**Coverage score** — Valid outfits a wardrobe produces, and outfits per garment (FR-42).

**Capsule** — The smallest garment subset producing the most valid outfits (FR-45). A
combinatorial optimisation problem, not a machine-learning one.

**Slot** — An outfit position: top, bottom, outerwear, shoes, accessory.

**Explanation object** — Structured reasons behind a score (FR-11): factor, direction,
magnitude. Data, rendered by the UI — never prose generated at display time.

---

## Harness

**Harness** — Everything outside the model weights that determines how much of a capable
agent's ability actually reaches the work: instructions, state, verification, scope,
lifecycle. See [`AGENTS.md`](../AGENTS.md).

**Effect link** — A recorded causal dependency: *if A changes, B must change too.*
Machine-readable in [`effects.json`](../.harness/state/effects.json), explained in
[`memory/effects/`](../.harness/memory/effects/).

**Guard** — The automated check that catches a violation of a specific effect link. Every
effect link must name one; `guard: "none"` on a critical link fails the `state` gate. This
is what makes the effect graph a work list rather than a wiki.

**Gate** — An ordered verification step with a command and a pass condition
([`gates.json`](../.harness/verification/gates.json)). A gate that cannot fail is not a
gate.

**Reproducibility envelope** — See above. The same idea applied to the harness: a feature
is done when someone else can reproduce the evidence.
