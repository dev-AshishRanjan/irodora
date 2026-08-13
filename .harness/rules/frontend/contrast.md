# Contrast Rules

Gated. Per
[ADR-0021](../../../docs/adr/0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md).

---

## The standard

**WCAG 2.2 AA is the gate. APCA Lc is reported alongside, never substituted.**

| Content | Minimum |
|---|---|
| Normal text (< 18.66 px, or < 24 px bold) | **4.5:1** |
| Large text | **3:1** |
| UI components, focus indicators, graphical objects | **3:1** |
| Decorative, or genuinely invisible to all users | exempt |

**AA and not AAA.** AAA (7:1) would make the muted, low-contrast Japanese aesthetic the
product is built around unexpressible. We meet AA everywhere and exceed it where it costs
nothing — rather than claiming AAA and quietly excepting the inconvenient surfaces.

---

## Declare pairings

Every intended foreground/background combination is declared in
[`design-system.manifest.json`](../../../docs/design/design-system.manifest.json):

```jsonc
"surface.base": {
  "oklch": { "l": 0.985, "c": 0.004, "h": 85 },
  "pairsWith": ["text.primary", "text.secondary", "border.subtle"]
}
```

The `contrast` gate checks the pairings that actually occur, rather than the cartesian
product of every token. **A pairing used in a component but absent from `pairsWith` is a
gate failure** — the declaration is how the gate knows what to check.

---

## Where contrast is easy to lose

**Focus indicators.** Must be 3:1 against **every** surface they can appear on, not just the
page background. Checked against all `surface.*` tokens.

**Disabled states.** Genuinely exempt from the contrast requirement — and that is routinely
used as licence to make them illegible. If a disabled control cannot be read, the user
cannot tell what they are being prevented from doing.

**Text over an image or a colour sample.** The background is variable, so a static token
pairing proves nothing. Use a solid scrim, and check against the worst case.

**Placeholder text.** `text.tertiary` meets AA at large sizes only. **Never use it for
essential information** — a placeholder that is the only label is a label nobody with low
vision can read.

**Borders that carry meaning.** A border distinguishing a selected state is a UI component:
3:1, and it needs a non-colour indicator as well.

**Dark theme.** Derived, but derivation does not guarantee contrast — pairings are checked
independently in both themes.

---

## APCA

Computed and reported for every pairing. **Where APCA and WCAG disagree, the pairing is
flagged for design review.**

A disagreement is usually real: WCAG 2.x over-rewards some dark-on-dark pairings and
under-rewards some light ones. For a product about colour perception, that disagreement is
information worth acting on — even though the gate remains WCAG.

---

## Never colour alone (NFR-9)

Enforced structurally: every `status.*` token pairs with an icon token in the manifest, so a
status expressible only as colour cannot be constructed.

| No | Yes |
|---|---|
| A red border for an invalid field | Red border **+ error icon + error text** |
| Green and red status dots | Dots **+ icons + labels** |
| A colour-coded score | Score **+ number + label** |
| A highlighted selected row | Highlight **+ checkmark + `aria-selected`** |
| Colour-coded chart series | Colours **+ direct labels + distinct markers** |

The `contrast` gate scans for colour-only status indicators.

---

## And the tokens themselves face the CVD gate

`cvdPairs` in the manifest declares the semantic pairs that must remain distinguishable
under simulated protan, deutan and tritan vision. Success and error must be separable at
severity 1.0.

**Our own interface is held to the standard the product applies to outfits.** An interface
that fails its own accessibility engine would be an argument against the product.

---

## On a failure

Fix the colour, or add the non-colour channel. **Never**: widen a tolerance, add an
exception without a recorded reason, or disable the rule.

A genuine exception is recorded in the manifest's `exceptions` array, with a reason and an
owner — visible, reviewable, and countable.
