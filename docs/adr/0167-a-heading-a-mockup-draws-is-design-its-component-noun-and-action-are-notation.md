# ADR-0167: A heading slot a mockup draws is design; the component noun inside it, and "Action:" before a button's word, are notation

| | |
|---|---|
| **Status** | Accepted · **Date** 2026-11-04 · **Feature** F-252 |
| **Answers** | OQ-26 (19 and 21) |
| **Applies** | R9 §2 (07's and 08's *Card*; the leaked-label list), ADR-0163 (brackets), F-250's and F-251's kept headings, ADR-0142 D4 (en-GB) |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context
19 heads its two sections *Anchor Color Hero Card (HeroUI Card level="2")* and *Ranked Harmonic
Relationship Rows*, in the screen's heading style (label 500, `text.secondary`, re-measured in F-252's
increment 1). It labels each row's button *Action: Wear*. 21 heads its list *Ranked Nearest Corpus
Results List*. F-252's note, written before the delegation, read both of 19's headings as not design.

## Decision
- **D1.** A heading drawn at a section's head in the screen's heading style is design. Words in it that
  name a UI component — *Hero Card*, *Rows*, *List* — are notation, as R9 §2 already reads *Card* at the
  end of 07's and 08's card titles. The parenthetical and *100px* stay not design, as recorded.
- **D2. The words that ship:**
  - 19: *Anchor Colour* (基準色) and *Harmonic Relationships* (調和の関係). *Ranked* is not notation
    but a claim no computation supports, so it leaves under E2 (ADR-0170 D6, F-252's review).
  - 21: *Anchor Colour* and *Ranked Nearest Corpus Results*. F-252 rebinds 21's two headings to their
    keys, so its record waits on no closed question; F-254 boxes the nouns and builds the words.
- **D3.** *Action:* before a button's word names the control's type, which its outline already says. It
  is the same notation ADR-0163 reads in brackets around a button's words. 19's buttons read *Wear*
  (合わせて着る). Each is named *Wear ‹row› with ‹anchor›*, a name that begins with its label (WCAG 2.5.3).
- **D4.** In `19.mjs` each noun and each *Action:* is a `notDesign` box read from its own ink. The heading
  boxes stop where the noun begins.

## Alternatives, and what each costs
| Alternative | Cost |
|---|---|
| Verbatim | Component jargon shipped as copy; *Color* against the en-GB catalogue |
| Not design, space kept (F-252's note) | Two blank bands; the screen loses the two section headings a screen-reader user navigates by |
| New words chosen freely | Taste, not the drawing (rule 14) |
| *Action: Wear* verbatim | A wireframe annotation on every row |

## Consequences
- 09's *Perceptual Dimension Slider Matrix* and 16's *Live Scientific Harmony & Contrast Engine Matrix*
  stand as F-250 and F-251 kept them: neither ends in a component's noun.
- The A11 heading checks hold both of 19's headings.

## Evidence, and its limits
- R9 §2's precedent and 09's and 16's kept headings.
- WCAG 2.4.6 (headings describe topic or purpose) and 2.5.3 were cited from knowledge, not re-read.
- ⇄ The person can flip D1 to "not design, space kept" at the capture.
- The Japanese is unreviewed (F-265).
