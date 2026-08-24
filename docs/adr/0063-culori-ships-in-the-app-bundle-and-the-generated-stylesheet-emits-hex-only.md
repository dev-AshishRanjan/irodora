# ADR-0063 — `culori` ships in the app bundle, and the generated stylesheet emits sRGB hex only

## Status

Accepted

## Date

2026-08-24

## Context

[ADR-0062](0062-heroui-native-is-the-component-foundation-behind-the-irodora-ui-boundary.md)
adopted HeroUI Native, which styles through Uniwind. The
[F-087 plan](../../.harness/plans/F-087-heroui-native-foundation-and-the-token-bridge.md)
flagged a risk and refused to wave it through:

> `uniwind` pulls `culori`, which ADR-0004 designates a test *oracle* and deliberately not a
> runtime dependency. The spike indicates it is reached through `uniwind/metro` (build-time)
> rather than the runtime entry — **but this is not yet proven.**

**It is now proven, and the indication was wrong.** `uniwind`'s `react-native` export condition
resolves to `src/index.ts`, which re-exports `useCSSVariable` from `./hooks`, which reaches
`src/core/native/native-utils.ts`, whose first line is unconditional:

```ts
import { formatHex, formatHex8, interpolate, parse } from 'culori'
```

Metro bundles it. **`culori` is in the app.**

Confirmed by bundling rather than by reading the import chain. `expo export --platform android`
produces a 5.0 MB Hermes bundle of 2453 modules, and its string table carries `culori`,
`modeOklab`, `modeLrgb`, `useMode` and `formatHex`. An inference about a module graph is not
the same claim as a measurement of what shipped, and this ADR rests on the second.

### The supply-chain half is the smaller half

[ADR-0004](0004-own-the-colour-engine-culori-as-test-oracle.md) says *"`culori` and
`colorjs.io` as development-time oracles, never as runtime dependencies"*, and its numbered
decision scopes the hard rule precisely: *"`packages/color-*` have **zero runtime
dependencies**."* That rule is untouched — the engine still depends on nothing, and
`verify-engine-purity.mjs` still proves it. What is breached is the broader sentence, by a
styling library in the app tier rather than by the engine.

Read against ADR-0004's four stated constraints, three do not apply here at all: this is not
engine code, it does not need to port to WASM, and it is not the product's most
correctness-critical surface.

**The third constraint does apply, and more sharply than the supply-chain one.** ADR-0004:

> Depending on someone else's rounding decisions, cutoff handling and matrix precision means
> our central claim rests on a version bump we do not control.

`native-utils.ts` does two things that are exactly that:

```ts
// every CSS variable colour, normalised on device
const parsedColor = parse(value)
… formatHex(parsedColor)

// and colour mixing, at runtime
export const colorMix = (color, weight, mixColor) =>
  formatHex(interpolate([mixColor, color])(parsedWeight))
```

So if the generated stylesheet emitted `oklch(0.968 0.005 85)`, **`culori` would perform the
OKLCh → sRGB conversion that [ADR-0043](0043-the-oklch-field-is-authoritative-and-srgb-is-derived.md)
makes ours and that the `contrast` gate measured with our implementation.** Two
implementations of one conversion, disagreeing in the fifth decimal place, with the gate
holding a number the device does not render. That is not a hypothetical: it is what the code
above does to any non-hex value it is given.

## Decision

**Accept `culori` in the app bundle as a transitive of the styling engine, and remove every
path by which it can compute a colour we display.**

1. **`packages/color-*` remain zero-dependency.** ADR-0004's operative rule stands unchanged
   and stays lint-enforced. `culori` enters the *app* tier through `uniwind`, never the engine.

2. **The generated `global.css` emits sRGB hex and nothing else.** No `oklch()`, no
   `color-mix()`, no `rgb()`, no named colour. Our engine performs every conversion, from the
   authoritative OKLCh field, exactly as ADR-0043 requires — so `culori`'s `parse` → `formatHex`
   is an **identity on a value we derived** rather than a second opinion about it.

   This costs nothing that the web emitter's `@supports` upgrade buys, because there is no
   wide-gamut CSS pipeline on this path: Uniwind converts to hex regardless. Emitting OKLCh
   would hand over the conversion and gain no fidelity.

3. **`color-mix` is evaluated by the generator, never by the runtime.** ADR-0062 already
   required this so the `contrast` gate could see the derived colours; this ADR gives it a
   second reason. `uniwind`'s `colorMix` is culori's `interpolate`, and a colour it computes on
   device is a colour no gate ever measured.

4. **Colour that a gate must measure never travels through Uniwind at all.** ADR-0062's rule —
   resolved tokens through `style`, never `className` — means the colours that matter bypass
   this code path entirely. This ADR is about the chrome that remains.

5. **A guard, not an intention — in the emitter itself.** `emitHeroui` scans its own output
   and **throws** if any declaration carries `oklch(`, `color-mix(`, `rgb(`, `hsl(`, `lab(` or
   `lch(`. Hex, or it does not build — which is stronger than a separate script reporting on an
   artefact already written to disk, and it needs no second place to remember the rule.

   Comments are stripped before the scan and are deliberately exempt: they carry each value's
   token name and OKLCh source, and that provenance is the only thing that makes a page of hex
   readable.

   The check is exported and tested against a crafted string, because `emitHeroui` has no
   branch that could produce a colour function — a guard whose failing path is unreachable from
   its own caller is a guard nobody has watched fail.

`culori` is additionally recorded in [`NOTICE.md`](../../NOTICE.md) as a shipped dependency,
which it previously was not.

## Consequences

**Good**

- The number the `contrast` gate measured is the number the device renders, because only one
  implementation ever performs the conversion.
- The rule is narrow, mechanical and checkable — "the stylesheet contains hex or it does not
  build" — rather than a caution someone has to remember while writing an emitter.
- ADR-0004's real content survives intact and is now *more* precisely scoped: the engine's
  zero-dependency guarantee was never a claim about the whole application, and pretending
  otherwise would have meant either abandoning HeroUI or quietly breaking the rule.

**Bad**

- **`culori` is in the shipped bundle**, and that is a genuine reduction in supply-chain
  surface discipline. It is a dependency we do not control, reached through a dependency we do
  not control, and we accepted it for styling convenience. If `uniwind` is ever removed, this
  should be revisited rather than inherited.
- We lose the OKLCh-in-CSS expressiveness on this target. The stylesheet is less readable than
  the web one, and a human reading `#F6F4F1` cannot see the chroma the manifest constrains.
  Mitigated by a generated header comment naming each value's token and OKLCh source.
- A future Uniwind feature that only accepts a CSS colour function would force this decision
  open again.

**Neutral**

- Bundle size. `culori` is tree-shakeable and four functions are reached; against an app that
  already carries VisionCamera and SQLCipher this is not the consideration.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Emit OKLCh and accept culori's conversion** | Far more readable, keeps the stylesheet honest about the authoritative colour space, and culori is a genuinely excellent implementation — it is one of our two oracles precisely because we trust it. But it makes a third party the author of every displayed colour value while our gate holds a different number, and ADR-0043 exists specifically to say which field is authoritative. A disagreement here would be invisible until someone photographed two devices. |
| **Patch or fork `uniwind` to drop culori** | Removes the dependency outright. It is four functions doing ordinary parsing, and `@irodora/color-spaces` could supply all of them. But a patched foundation dependency is a permanent merge burden on a library releasing weekly, and it puts our engine on the runtime path of every style resolution — which is a performance surface we have not measured and a coupling ADR-0062 deliberately avoided. Worth reconsidering if `uniwind` accepts a pluggable colour backend. |
| **Drop Uniwind; style HeroUI entirely through `style`** | Tempting, because ADR-0062 already routes every gate-visible colour that way. But HeroUI's own components style themselves through `className` internally — the classes are theirs, not ours — so Uniwind is not optional while HeroUI is. This is really the "do not adopt HeroUI" alternative, already decided in ADR-0062. |
| **Treat this as an ADR-0004 amendment rather than a new decision** | Tidier index. But ADR-0004's decision is not changing — the engine rule stands exactly as written — and editing an accepted ADR to absorb a consequence discovered two hundred days later is how a record stops explaining why the code looks the way it does. |

## Revisit when

- **`uniwind` is removed or replaced**, at which point `culori` should leave the bundle with it
  rather than being inherited by whatever comes next.
- **`uniwind` gains a pluggable colour backend**, which would let `@irodora/color-spaces` serve
  it and close this entirely.
- **The generated stylesheet needs a value hex cannot express** — a wide-gamut token, or a
  colour function Uniwind resolves natively. That is the condition under which decision 2 stops
  being free.
