# A tap and a frame are two different rectangles

**Effect:** [E-088](../../state/effects.json) · `apps/mobile/src/lens/camera.ts` →
`viewfinder.tsx`, `screens/Lens.tsx`, `scripts/verify-worklet-reach.mjs` · **high**

## What happened

*"In lens, add feature to change the position of crosshair, like we change in normal camera."*

Most of it was consolidation — F-166 had already built `pointFrom`, `reticleBox` and the clamp,
pure and tested against a four-quadrant fixture. The live viewfinder still hard-centred:

```ts
const left = Math.floor((frame.width - size) / 2);
```

The part that was **not** consolidation is the geometry nobody had needed while the crosshair
could not move:

- A tap lands on the **preview** — a fixed 3:4 box.
- The region is read from the **frame** — whatever aspect the device negotiated.
- `resizeMode` is `cover`, so the frame is scaled to fill the box and **cropped equally on the
  long axis**.

**A preview fraction is therefore not a frame fraction.** Reading the region at the raw tap
fraction would have put the marks somewhere the engine is not looking — the failure
`viewfinder.tsx` already names in its own words: *a reticle that lies about where the colour is
read is worse than none.*

## The part worth keeping

**The conversion belongs where the numbers are.** Only the frame thread knows `frame.width` and
`frame.height`, so `framePoint` runs there, on four numbers, and returns a fraction of the frame.

Two alternatives were available and both are worse for reasons worth writing down:

- **`resizeMode="contain"`** shows the whole frame and letterboxes it — and then the bars are
  part of the mapping, so nothing is simpler and one more thing can be wrong.
- **Report the frame's aspect back to JS and reshape the box.** Wrong at exactly the moment
  somebody aims: in still mode the first frame arrives *after* the shutter, so the box would be
  the wrong shape for every tap that precedes the first capture.

And `resizeMode` is now **set explicitly rather than inherited**. It is VisionCamera's default and
the arithmetic assumes it; left implicit, a change in the library would move every tap silently
and nothing in this repository could see it.

## The guard fired twice, on my own code, and the second time on itself

**First**, `verify-worklet-reach.mjs` reported both new inner `clamp` helpers as reached from a
worklet with no directive. That is F-116's crash one function deeper — a worklet may only call
other worklets, and *the caller is marked* is not enough. The check exists because that took the
app down as soon as the Lens opened.

**Then its own proof went stale.** The plant strips the `'worklet'` directive from `sampleFrame`
by finding the first `{` after the function header — and a parameter with an inline object *type*
puts a brace there first:

```ts
function sampleFrame(frame: Frame, space: CaptureSpace, at: { readonly x: number; … })
```

It **refused loudly** — *"the plant is stale … there is nothing here to remove and this case can
no longer test what it claims to"* — which is the property that matters, and it refused about the
wrong thing, which is the defect. A named `FramePoint` type fixes the code; walking past the
parameter list fixes the trap for whoever writes the next signature.

**A proof that refuses rather than planting nothing is worth more than a proof that is never
wrong.** This one was wrong and said so, which is why it cost twenty minutes instead of shipping.

## And the reticle came up out of the file jest cannot render

It was drawn twice — once in `viewfinder.tsx` for the camera, once in `screens/Lens.tsx` for a
photograph — saying the same thing, and **only the photograph's was ever checked**, because the
camera's lives in a module that imports a native binding.

One component in the screen means the marks reach the conformance registry for the first time,
and a person tapping a photograph and tapping the camera sees the same thing **because it is the
same thing**.

The preview box had to move with it: its aspect ratio is what the conversion reads, and two files
owning one rectangle is two places for the marks and the reading to disagree.

Related: [[a-worklet-cannot-read-a-captured-variable-from-a-parameter-default]] ·
[[a-second-technology-a-second-blind-spot]]
