# A second technology, a second blind spot

**Effect:** [E-081](../../state/effects.json) · `packages/ui/src/NavIcon.tsx` →
`testing/tree.ts`, `apps/mobile/src/card.ts` · **high**

## What happened

`paintedColors` — the scan behind the contrast and colour-literal rules — read five properties out
of `style`, because that is where React Native paints.

**SVG paints through props.** `<Path stroke="#131110" />` is a colour on the screen and it is not
in `style`. So the first component drawn as SVG was reported as painting **no colour at all**.

The registry offers an escape hatch for exactly that report — `paintsNoColour`, with a reason.
Taking it would have been the easy move, and **the product would have gained a colour surface no
gate measures.**

## The same family as E-067, one technology along

There, reanimated made the motion gate blind by writing worklets where the scan expected JSX style
literals. Here, react-native-svg makes the colour scan blind by writing props where it expects
styles.

> A checker is correct about the technology it was written against. A second technology expressing
> the same thing differently is a blind spot that **arrives with no failure**.

Adopting a rendering library is therefore the moment to ask what each existing gate can still see —
and nothing prompts that, because every gate keeps passing.

## It arrives parsed, which is what took longest

```json
{"stroke": {"type": 0, "payload": 4279439632}}
```

react-native-svg resolves the colour before the tree is built. `4279439632` is `0xFF131110`. So
even a scan looking at the right property finds an object rather than a string, and reports
nothing.

## The first thing it found was not the new code

`ColourCard` renders the exported card through `SvgXml`, and the `<svg>` root declared **no fill** —
so the library injected `#000000` on the group. Every shape happened to set its own fill, so
nothing looked wrong; **any element added later without one would have painted solid black.**

## A limit recorded rather than worked around

A `TSpan` gets a hard black default from the parser regardless of its `<text>` parent, an enclosing
group, or a root `fill`. All three were tried, and wrapping the content in an explicit
`<tspan fill>` produced a *nested* tspan with the same black.

That node is excluded, with the reason written where the exclusion is: the colour a person sees is
on the `RNSVGText` above it, and the exported SVG string — which is what a card **is** — has
correct fills and ordinary inheritance.

**Contorting a shared, exported artefact to satisfy a preview renderer would have been the worse
trade**, and knowing which of the two is the artefact is what makes that call decidable.

Related: [[a-new-engine-can-make-an-old-gate-blind]],
[[a-component-can-satisfy-the-letter-of-its-own-proof]]
