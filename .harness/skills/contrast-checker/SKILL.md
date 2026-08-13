---
name: contrast-checker
description: Check contrast properly — declared pairings, both themes, the places it is usually lost, and APCA as the second opinion.
---

# Skill: contrast-checker

Rules: [`contrast.md`](../../rules/frontend/contrast.md) ·
[ADR-0021](../../../docs/adr/0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md).

## The standard

| Content | Minimum |
|---|---|
| Normal text (< 18.66 px, or < 24 px bold) | **4.5:1** |
| Large text | **3:1** |
| UI components, focus indicators, graphical objects | **3:1** |

WCAG 2.2 AA is the gate. **APCA Lc is reported, never substituted** — it is not normative,
so it provides no compliance defence.

## Running it

```bash
pnpm test:contrast
```

Reads
[`design-system.manifest.json`](../../../docs/design/design-system.manifest.json) and
checks every declared `pairsWith` combination, in **both themes**, plus a scan of rendered
surfaces.

**A pairing used in a component but absent from `pairsWith` is a gate failure.** The
declaration is how the gate knows what to check — an undeclared pairing is unchecked.

## Where contrast is usually lost

**Focus indicators.** Must be 3:1 against **every** surface they can appear on, not just the
page background.

**Disabled states.** Genuinely exempt — and that exemption is routinely used as licence to
make them illegible. If a disabled control cannot be read, the user cannot tell what they
are being prevented from doing.

**Text over an image or a colour sample.** The background is variable, so a static pairing
proves nothing. Solid scrim; check the worst case.

**Placeholder text.** `text.tertiary` meets AA at large sizes only. **Never for essential
information** — a placeholder that is the only label is a label nobody with low vision can
read.

**Borders that carry meaning.** A border marking a selected state is a UI component: 3:1,
plus a non-colour indicator.

**Dark theme.** Derived, but derivation does not guarantee contrast. Checked independently.

## Adding a token

1. Define it in OKLCh, with its sRGB fallback.
2. **Declare `pairsWith`** — every combination it is intended for.
3. Run the gate, both themes.
4. If it is a `status.*` token, **pair it with an icon token.** A status expressible only as
   colour cannot be constructed, by design.
5. If it is a semantic pair that must stay distinguishable, add it to `cvdPairs`.

## When APCA disagrees with WCAG

**Flag it for design review.**

A disagreement is usually real: WCAG 2.x over-rewards some dark-on-dark pairings and
under-rewards some light ones. For a product about colour perception, that disagreement is
information worth acting on — even though the gate remains WCAG.

## On a failure

Fix the colour, or add the non-colour channel.

**Never** widen a tolerance, add an undocumented exception, or disable the rule. A genuine
exception goes in the manifest's `exceptions` array with a reason and an owner — visible,
reviewable, and countable.
