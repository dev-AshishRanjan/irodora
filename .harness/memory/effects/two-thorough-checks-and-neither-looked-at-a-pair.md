# Two thorough checks, and neither of them looked at a pair

**Effect:** [E-086](../../state/effects.json) · `packages/ui/src/testing/conformance.ts` →
`@irodora/design-tokens`, gate 8, gate 9 · **high**

## What happened

Reported from a device: *"There is some color contrast issue in the app, in many places."*

Gate 9 was green. It is a serious check — every pairing the manifest declares, in both themes,
against WCAG and APCA, across eleven Machado severities plus Vienot dichromacy, with translucent
tokens composited over every ground they name and judged on the worst.

The conformance suite was green too. It asserts that **every colour a component paints resolves
to a token**, with an exemption that has to be declared in the registry rather than on the
component.

**Neither of them had ever looked at a pair on a screen.**

Gate 9's subject is a JSON file. The suite's subject is one colour at a time. So a component
could draw `foreground` on `swatch.well` — two tokens, each individually correct, a combination
the manifest never declared — and both checks stayed green over a combination nothing had
measured. `Swatch` does exactly that, and the audit counted it **546 times across the screens**.

The sharpest part: **gate 9's own charter already says a used-but-undeclared pairing is a
failure.** Nothing could detect *used*, because nothing read what the components render. The rule
existed as a sentence for a year.

## The part worth keeping

**Two checks that are each thorough about their own subject can leave the space between them
completely unmeasured**, and both will report green while they do it. Neither is wrong. Neither
is incomplete on its own terms. The gap is not inside either scope — it is the join.

That is a different failure from the blind spots recorded before it
([[a-second-technology-a-second-blind-spot]], where a checker was correct about the technology it
was written against). Here nothing new arrived. The hole was there from the day the second check
was written, and being green is what kept it invisible.

**The question to ask of a pair of checks is not "is each one thorough" but "what is true of the
product that neither one is a statement about".**

## What the audit actually found, which is why this is not a fix

**Nothing was failing.** Every rendered text pair — across every component and all twenty-odd
screens, in both themes — clears its WCAG floor:

| | lowest measured | floor |
|---|---:|---:|
| light | 3.35 (`foreground.3` on `background`, 34 px) | 3.0 |
| dark | 5.08 (same pair) | 3.0 |
| normal text, worst | 6.32 (`foreground.2` on `surface.2`) | 4.5 |

The one undeclared pairing measures **13.06** and **15.28**.

So the rule went in **while it was green**, which is the only time a check is cheap to add — and
the reporter's problem is somewhere else. Saying that plainly is better than changing colours
until something looks different.

## What still has no check, stated so a green run is not read as more than it is

- **A placeholder.** It is a prop, not a text child, so no walk of the tree sees it as a pair.
  Both fields set it to `foreground.2` and it happens to pass; nothing enforces that.
- **Text over an arbitrary sample colour.** A garment colour is not a token by construction, so
  no pairing can be declared for it. The `Swatch` keyline exists for this and is measured against
  its own worst case (F-068), which is a different guarantee from a contrast ratio.
- **Every non-text mark** — `border`, `ring`, `backdrop`, the chart series. Each carries an
  `uncheckedReason` in the manifest and each reason is a correct reading of WCAG 1.4.11. Worth
  re-reading anyway: `border` is 8 % alpha, which is *invisible* rather than *sufficient*, and
  "WCAG does not require it" and "a person can see it" are not the same claim.
- **Anything HeroUI paints through `className`.** Uniwind resolves classes in Metro and jest
  never runs Metro [[a-style-engine-that-resolves-in-metro-is-invisible-to-jest]]. Our own
  wrappers route every colour through `style` and say so in their headers; HeroUI's internals are
  its own business and this repository cannot see them.

## The smaller thing the gate caught on the way

`DECLARED_PAIRINGS` is emitted for the suite to read, and gate 8 immediately reported it as a
token no component reaches. Correct — and it belongs with `TEXT_TOKENS` and the others under
*emitted to constrain, not to paint*. A component reading it would be a component deciding
whether its own colours are allowed.

Related: [[an-unreached-token-is-unfinished-work]] ·
[[a-derived-check-catches-the-change-a-written-down-one-waves-through]]
