# A shared channel widens by type, or it widens by lie

**Effect:** [E-105](../../state/effects.json) · **Feature:** F-199 · **Date:** 2026-09-09

`AddGarment` accepted a `LensReading` — a measurement, with `usableSamples`, `variance`,
`illumination` and a `confidence`. F-199 needed it to also accept a colour somebody **chose** off
a combination.

The cheap wiring is obvious and it is a lie: build a `LensReading` for the chosen colour. It
type-checks. It renders. And every field in it is invented — the app would then hold a
"measurement" of a garment nobody photographed, and `confidence` would be a number with nothing
behind it. That is ADR-0005 broken for the convenience of reusing a field that was already there.

## What widening by type looks like

```ts
type Offer =
  | { kind: 'reading'; reading: LensReading }
  | { kind: 'corpus';  slug: string }
```

These are exactly the two `ColourOrigin` members the receiving end already had. **The channel
was narrower than the thing it delivered into** — which is why the lie was tempting: the
destination could always express both, only the pipe could not.

## The half that is easy to miss

`takeReading` had to keep returning **only** a reading, because profile setup can only use a
measurement — a colour somebody liked says nothing about the person holding it. And it had to
**leave a corpus offer in place** rather than consume and discard it, since the wardrobe may
still be on its way to collect it. That is F-043's original finding — *neither screen can tell
"nobody scanned" from "somebody else took it"* — reappearing the moment a second kind arrived.

A widened channel inherits every addressing bug the narrow one ever had.

## What must not travel

A **generated** colour has no slug and no capture. It is deliberately not offerable, and that is
an answer rather than a gap: giving it an origin means deciding what provenance an engine-derived
colour has, which is ADR-0005's question and F-207's, not something to settle while wiring a
button. [[a-tested-module-nobody-wired-up-passes-every-test-it-has]]

## The lesson

**When a channel cannot carry the new thing, check whether the destination already can.** If it
can, the channel is the narrow part and it widens by type. If you find yourself filling in fields
nobody measured so the old shape fits, you are not adapting — you are fabricating, and the type
system will help you do it.

[[a-screen-shaped-around-its-first-caller-excludes-the-second]]
