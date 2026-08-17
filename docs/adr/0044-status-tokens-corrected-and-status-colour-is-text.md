# ADR-0044 — The status tokens are corrected to pass their own gates, and status colour is classified as text

## Status

Accepted

## Date

2026-08-15

## Context

The `contrast` gate (gate 9) and the design-system half of the `cvd` gate (gate 10) were
built in F-003 and run for the first time against `design-system.manifest.json`, which had
been **approved on 2026-08-14**. The approved values failed both.

**Five WCAG 2.2 AA failures**, all light theme, all on the status trio:

| Pairing | Ratio | Required |
|---|---|---|
| `status.ok` / `background` | 4.49 | 4.5 |
| `status.ok` / `surface.2` | 4.26 | 4.5 |
| `status.warn` / `background` | 3.92 | 4.5 |
| `status.warn` / `surface.1` | 4.04 | 4.5 |
| `status.warn` / `surface.2` | 3.72 | 4.5 |

**Five CVD separation failures** against the manifest's own `minSeparation: 60`, at severity
1.0:

| Pair | Deficiency | Dark | Light |
|---|---|---|---|
| `status.ok` / `status.warn` | protan | 50.3 | 55.7 |
| `status.ok` / `status.bad` | deutan | 52.7 | 47.8 |
| `status.warn` / `status.bad` | tritan | 67.2 | 44.4 |

The cause of the second group is ordinary and worth naming: three chromatic tokens separated
by **hue** and packed into a 0.11-wide band of **lightness**. When hue collapses, nothing is
left. `ACCESSIBILITY.md` §3 says our own interface is held to the standard the product
applies to outfits; this is what that promise costs when it is first measured.

[`.harness/rules/frontend/contrast.md`](../../.harness/rules/frontend/contrast.md) is
explicit that a failure is fixed by changing the colour or adding a channel — **never** by
widening a tolerance, adding an unexplained exception, or disabling the rule. So the values
changed.

## Decision

### 1. `status.*` is classified `usage: "text"`, and that is the decision that mattered

This is recorded first because it is the real content of this ADR and it is easy to miss
underneath the numbers. Classifying the status tokens as `text` sets their bar at **4.5:1**.
Classifying them as `nonText` — legitimate if status colour only ever paints an icon glyph
and a chip border — would set it at **3:1**, and almost every lightness move below would
shrink to nothing.

They are `text` because the product tints the label. A status in this product is a sentence
("Estimated, 81 % confidence", "Could not read this colour"), not a dot, and the colour is on
the words. If that ever stops being true, this classification is the thing to revisit, and
changing it is a decision with an ADR rather than a field edit.

### 2. The corrected values

Hue and chroma held where possible; every value engine-derived per ADR-0043.

| Token | Theme | Approved 2026-08-14 | **Shipped** |
|---|---|---|---|
| `status.ok` | dark | L 0.760 C 0.090 H 158 | **L 0.730** C 0.090 H 158 → `#75B992` |
| `status.warn` | dark | L 0.810 C 0.100 H 78 | **L 0.770 C 0.130 H 70** → `#E9A44E` |
| `status.bad` | dark | L 0.700 C 0.140 H 26 | **L 0.640** C 0.140 H 26 → `#D4665E` |
| `status.ok` | light | L 0.550 C 0.100 H 158 | **L 0.530 C 0.090** H 158 → `#387B58` |
| `status.warn` | light | L 0.600 C 0.110 H 70 | **L 0.540** C 0.110 H 70 → `#976213` |
| `status.bad` | light | L 0.550 C 0.160 H 26 | **L 0.400 C 0.150** H 26 → `#861116` |

Result: every declared pairing passes in both themes, and the worst separation — across both
simulation models, all eleven tabulated severities and every ground — is **64.1** dark and
**63.2** light, against a required 60.

> **This table was wrong once, and the way it was wrong is worth keeping.** It first recorded
> an intermediate correction (dark warn C 0.125, light ok C 0.100, light bad L 0.410 C 0.160)
> and was not updated when the colour-science review forced a third pass. Because the
> manifest's `valuesChangedSinceApproval` names this ADR as *the* record for exactly these six
> tokens, the one machine-readable pointer to the decision led to superseded numbers. Caught
> by the F-003 evaluation, not by any check — **a decision record has no gate, so its numbers
> go stale silently.** Anything quoting values here should quote the manifest instead.

**The margin is deliberate.** A minimum-drift solution exists that clears 60 by about one
point; it was rejected, because a design-system value sitting on a gate threshold is a value
the next person re-breaks with any nudge.

### 3. `status.warn` in the dark theme moved on hue and chroma, not lightness

The first correction took dark warn to L 0.880 (`#FCD08B`). Design review rejected it, and
was right: at that value caution sat **1.32:1** from the primary foreground with only **7°**
of hue between them, distinguished from body text by chroma alone — so it read as *emphasis*,
not as caution. It was also 2.5× louder than error.

The replacement takes L back to 0.770 and buys the separation from hue (78 → 70) and chroma
(0.100 → 0.125, and then → 0.130 after the colour-science review forced a third pass).
Caution now sits **1.93:1** from the foreground. The hue change also **unifies warn across the
themes** — light was already 70, and a semantic colour whose hue changes with the theme is two
colours.

The general lesson, which came out of that review: **in this system lightness is
triple-booked** — it sets WCAG contrast, salience rank against the ground, and gamut
headroom. Hue is booked for nothing and chroma for one thing. Spend the CVD margin on the
axes that are free.

### 4. The chroma ceiling now governs every token, and `ring` gets a recorded exception

The ceiling was written as applying to "any surface or text token". Under that wording `ring`
(chroma 0.075 / 0.080) escaped it by being classified `nonText` — an exemption by
classification, with nothing recorded, beside three `status.*` tokens that each carry an
entry. The rule now governs **every** token, and `ring` has an exception like the others.

An exception list is only worth having if its count is the real count.

## Consequences

**Good.** The design system passes the gates it declares, measurably, in both themes, with
the evidence in the gate output rather than in a review note. The status trio is now
separable under all three deficiencies at full severity, which is the property
`ACCESSIBILITY.md` promises and nothing previously checked. Every exception to the chroma
ceiling is countable.

**Bad.** **Approved values changed without a human designer in the loop.** The change was
reviewed by the `designer` and `color-scientist` subagents rather than by the person who
approved the palette, and `light.status.bad` in particular is a visibly different colour — a
deep oxblood where a brick red was signed off. That is a real cost and it is not softened
here: what makes it defensible is that the approved values could not ship, not that the
replacements are better taste.

`light.status.bad` at L 0.40 C 0.15 also sits close to the sRGB gamut boundary — its green
channel is a low **encoded byte**, and correspondingly near zero in linear terms. It is in
gamut and the gate proves it, but there is little room left in that direction, and clipping
would be a silent hue shift that the authoritative OKLCh no longer describes.

**Neutral.** Dark and light still assert *opposite* salience hierarchies — measured against
each theme's own ground, dark says caution is loudest and error quietest, light says error is
loudest by nearly 2×. That inversion **pre-dates this change** and is not introduced by it,
so it is recorded as its own question (F-067) rather than resolved here under a different
feature's name.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Record `exceptions[]` entries and keep the approved values** | The mechanism exists and is legitimate — but for a colour product's own success and error states failing AA, an exception is a written admission that the interface does not meet the standard the product sells. The rules say fix the colour |
| **Lower `minSeparation` from 60** | Tuning a threshold so a check passes is the anti-pattern the harness exists to prevent. The number is a claim about what "distinguishable" means, not a dial |
| **Classify `status.*` as `nonText` (3:1)** | Would make almost all of this unnecessary. Rejected because the product tints the label, not just a glyph — see §1. Recorded as the revisit point |
| **Adopt the full re-solve the design review implied** | A jointly feasible solution exists that also equalises salience rank across themes, but it inverts the dark theme's lightness hierarchy wholesale — `bad` becomes the lightest token. That is a larger redesign than the defect, and it belongs to the pre-existing question in F-067, decided by a person |
| **Take the minimum-drift values** | Clears the CVD minimum by ~1 point. Stays closest to what was approved, and re-breaks on the next nudge |

## Revisit when

- Status colour stops being applied to label text, which would make `nonText` correct and
  relax every value here.
- F-067 decides the cross-theme salience question, which may move these tokens again.
- A human designer reviews the rendered result. This ADR should be read as "the gates now
  pass and here is exactly what changed", not as design approval.
