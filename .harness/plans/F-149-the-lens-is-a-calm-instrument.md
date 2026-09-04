# F-149 — The Lens is a calm instrument

**Status:** in_progress · **Release:** R6 · **Blocked by:** F-143, F-144, F-158 (all done)

---

## The dials, set before anything is drawn

[`R6-EDITORIAL-DIRECTION.md`](../../docs/design/R6-EDITORIAL-DIRECTION.md) sets them per surface,
and this one is deliberately **not** the Atlas:

| Variance | Motion | Density |
| -------- | ------ | ------- |
| **low** — a task surface | **minimal** | medium |

The editorial treatment that suits a corpus of 120 colours is wrong here. Somebody using the Lens
is holding a phone up to a garment and wants an answer; asymmetry and generous rhythm are noise
in that moment. **Nothing on this screen competes with the frame.**

---

## What is actually wrong, read from the source rather than assumed

### 1. FR-18's quality classification is computed and never shown

`LensReading` carries `quality: 'excellent' | 'good' | 'fair' | 'poor'`, from
`packages/color-sampling`. `grep -rn '\.quality' apps/mobile/src --include=*.tsx` returns
**nothing**.

FR-18 says the classification is the thing that *"blocks a confident claim and returns a specific,
actionable instruction"*, and criterion 2 names it as one of the three facts the readout must
carry. The screen shows the other two — illumination and capture space — and a bare
`confidence.toFixed(2)`.

**So the one honest word the engine produces is discarded, and a number nobody can interpret is
shown in its place.** `0.87` looks like a probability; the type's own comment says *"Never a
probability"*.

### 2. Three separate elements, one of them styled as a warning

- `Status kind="warn"` carrying the instruction, on the screen
- a "Conditions" block: illumination · space
- a "Confidence" label with a raw decimal

Criterion 2 asks for **one calm readout**. Amber is the loudest thing on a screen whose only
bright element is supposed to be the reticle, and an instruction is guidance about the *next*
capture — not a fault report.

### 3. The reticle is a closed grey square, and both halves are wrong

```tsx
borderWidth: 2, borderColor: colors['border.strong']
```

**A single tone has no guaranteed contrast over a live camera image.** This is the same problem
`Swatch` solves with a two-tone keyline, and for the same reason: the other side of the line is an
arbitrary colour. Over a pale garment `border.strong` is nearly invisible — on the one surface
where the marker must always be findable.

**And a closed border around the sampled region changes how the enclosed colour reads.**
Simultaneous contrast is the entire reason `swatch.well` exists; framing the sample in a hard
2px rule on all four sides is that same hazard, applied to the live subject the person is judging.

---

## What gets built

### The reticle: two-tone corner brackets

Four L-shaped marks at the corners of the sample region, each drawn as the `Swatch` keyline is —
an outer dark stroke and an inner light one — so it is legible against any content the camera
sees, which is the only guarantee that matters here.

**Brackets rather than a box**, and the reason is colour science rather than taste: corners mark
the region without enclosing it, so the sample stays surrounded by the scene rather than by our
rule. It is also, precisely, criterion 1's *"the only bright element"* — nothing else on this
screen carries a light tone.

### One readout, replacing three elements

A single block, in FR-17's order — **conditions before value**:

| line | source |
| ---- | ------ |
| quality | `reading.quality`, the engine's own word (FR-18) |
| light | `ILLUMINATION_KEYS[reading.illumination]` |
| space | `SPACE_KEYS[reading.space]` |
| confidence | the number, subordinate, with its scale stated |
| what to do next | `reading.instruction`, when there is one |

No `Status`, no amber. A `poor` reading says **Poor**, which is a word, not a colour — NFR-9 is
satisfied by there being no colour channel to depend on at all.

The number stays. It is the honest ceiling and FR-15 produces it; what changes is that it stops
being the headline and starts being a footnote to a word a person can act on.

### The copy (criterion 4)

Every instruction must say **what to do next**, and no string may overstate. The claims lint is
binding and `pnpm verify:claims` is the check. New keys for the four quality bands, in both
locales.

---

## What this feature does NOT do

**The sheet is F-158's and it stays as it is.** Criterion 3 — *"the result arrives in a sheet that
can be acted on without losing the frame"* — was discharged there: the reading, the nearest names
and both offers are already in one. Re-opening it here would be doing the same work twice.

**The viewfinder does not go full-bleed.** F-148's `padding` prop makes it possible, and E-065
records the latent hazard: a screen that keeps the `Screen` default *and* pads its body insets
twice, silently, with two legal tokens. That note says the second call site is the signal the
pattern needs *a rule rather than a prop* — so taking it here would mean writing that rule, which
is a different piece of work. A task surface does not need the bleed; the colour page did.

---

## Risks

**Dropping `Status` removes a channel.** If a poor reading turns out to need more than a word, the
answer is one status inside the readout — not three elements back. Stated so the next person can
see which way the decision went.

**The bracket geometry is unverifiable here.** Whether a 10 % region with corner marks reads as
"point this at the thing" needs a phone. What a test can hold is that both tones are present, that
they come from tokens, and that the sample region is not enclosed.

**`foreground.3` is `largeText`.** Gate 9 refused a pairing for it in F-148; it may not carry small
type. The readout's subordinate lines use `foreground.2`.

---

## Definition of done

- [ ] `reading.quality` is rendered — FR-18's word reaches the screen for the first time
- [ ] Illumination, quality and confidence are one block, in FR-17's order, with no `Status`
- [ ] The reticle is two-tone and does not enclose the sample region
- [ ] Every new string passes `verify-claims`, in both locales
- [ ] Conformance covers the Lens in both themes, with a reading and without
- [ ] `pnpm verify:ci` green
- [ ] Effects traced; the visual judgement attested rather than claimed
