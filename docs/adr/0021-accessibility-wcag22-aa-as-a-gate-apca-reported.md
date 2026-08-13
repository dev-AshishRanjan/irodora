# ADR-0021 — WCAG 2.2 AA is a build gate; APCA is reported alongside

## Status

Accepted

## Date

2026-08-13

## Context

Accessibility commitments that live in a style guide decay. Someone ships a subtle grey on
a slightly-off-white background, it looks fine on their calibrated monitor, and it stays
there for a year. Nobody decided to make it inaccessible.

For this product the stakes are higher than usual. Irodora is explicitly built for people
with colour-vision deficiency (personas §3, NFR-10). An inaccessible interface would not be
merely a failure — it would be an argument that we do not believe our own product thesis.

There is a genuine technical complication. WCAG 2.x contrast ratio is known to be a poor
model of perceived contrast: it over-rewards some dark-on-dark pairings and under-rewards
some light ones. APCA (in development for WCAG 3) models perception considerably better.
But APCA is not yet a normative standard, and "we used a better algorithm" is not a defence
in a procurement questionnaire or a legal complaint.

## Decision

**WCAG 2.2 AA is the enforced gate. APCA Lc is computed and reported alongside, never
substituted.**

1. **`a11y` gate** — axe-core against every route on every build, asserting zero WCAG 2.2
   A and AA violations. Not a warning. A failure.
2. **`contrast` gate** — reads `design-system.manifest.json`
   ([ADR-0020](0020-design-tokens-are-oklch-native.md)) and asserts every declared
   foreground/background pairing meets AA, plus a scan of rendered surfaces for pairings
   the manifest does not describe.
3. **APCA Lc is computed and reported for every pairing.** Where APCA and WCAG disagree,
   the pairing is flagged for design review — a disagreement is usually a real perceptual
   issue that one of the two models is describing correctly.
4. **Keyboard-only completion of J1–J4 is asserted in e2e.** Not a checklist item; a test.
5. **NFR-9 — colour is never the only channel.** Every meaning carried by colour is also
   carried by text, shape, icon or pattern. A scan for colour-only status indicators fails
   the `contrast` gate.
6. **Every colour swatch has an accessible name and its numeric value.** For a CVD user, a
   swatch without a name is an empty box.
7. **Simulated-CVD e2e** over every critical path, plus real CVD user testing before each
   major release.
8. **Mobile**: platform accessibility APIs, Dynamic Type, VoiceOver and TalkBack verified
   on the reference device set.

**Why AA and not AAA.** AAA contrast (7:1) would constrain the palette so severely that
the muted, low-contrast Japanese aesthetic the product is built around becomes
unexpressible. We meet AA everywhere and exceed it where it costs nothing — rather than
claiming AAA and quietly excepting the surfaces where it was inconvenient.

## Consequences

**Good.** Accessibility regressions are caught by the build, not by a user. The commitment
is structural rather than cultural, so it survives team changes. Reporting APCA gives
early warning of pairings that pass AA but read poorly, which is exactly the class of
problem a colour product should be catching. Legal and procurement defensibility.

**Bad.** The gate will occasionally block a design that is genuinely fine but that axe
flags — and the correct response is to fix the markup or record a reviewed exception, not
to disable the rule. Palette freedom is constrained, and some muted combinations we would
like are unavailable. Two contrast algorithms means two sets of numbers, which is more to
explain. Real CVD user testing costs money and scheduling.

**Neutral.** APCA is advisory now. If it becomes normative in WCAG 3, the reporting
infrastructure is already in place and only the gate's threshold changes.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **WCAG AA as a guideline, reviewed manually** | Preserves design freedom, no build friction. This is exactly how accessibility decays — a guideline has no failure mode |
| **APCA as the gate instead of WCAG** | Better perceptual model, and arguably the more honest choice technically. Not normative, so it provides no compliance defence, and an auditor testing against WCAG would find failures |
| **WCAG AAA** | Strongest commitment. Makes the muted low-contrast aesthetic the product is built on impossible, and would push us toward claiming AAA with undisclosed exceptions |
| **Automated checks only, no user testing** | Cheaper and faster. Automated tools catch perhaps half of real accessibility problems, and none of the ones about whether a CVD user can actually complete the task |

## Revisit when

- APCA becomes normative in a published WCAG 3, at which point it becomes the gate and
  WCAG 2.2 becomes the reported comparison.
- Real CVD user testing shows a pairing that passes AA but fails users — which would mean
  the gate needs supplementing, not relaxing.
