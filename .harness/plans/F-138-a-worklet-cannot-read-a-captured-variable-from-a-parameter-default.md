# Plan: F-138 — A worklet cannot read a captured variable from a parameter default

| | |
|---|---|
| **Feature** | F-138 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-15 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `scripts/` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

The Lens throws on **every frame**: *"the frame processor threw: Property
`MAX_SAMPLES_PER_FRAME` doesn't exist"*, over a live preview, with no reading. FR-15 asks for a
sampled colour and the frame processor cannot produce one.

To a person: point the Lens at something and get a colour, instead of an error message under a
picture of their sofa.

## Approach

### The root cause, from the plugin's output rather than from reasoning

The first hypothesis — *the babel plugin does not capture identifiers in parameter defaults* —
was **wrong**, and reading `getClosure` in the installed plugin disproved it: it calls
`funPath.traverse`, which visits params. The constant is captured.

Transforming `camera.ts` with the real plugin shows what actually ships:

```js
"(function sampleStride_cameraTs1(regionPixels,max=MAX_SAMPLES_PER_FRAME){
    const{MAX_SAMPLES_PER_FRAME}=this.__closure;
    if(regionPixels<=max)return 1; … })"
```

**The closure is unpacked as the first statement of the body. A parameter default is evaluated
before the body runs**, in the parameter scope, which cannot see a body-level `const`. The
lookup falls through to the worklet runtime's global object, where nothing of that name exists.

So the rule is: **a worklet may reference a captured variable only from its body.**

### Why nothing caught it

It throws only when the default is *used*. `sampleFrame` calls `sampleStride(size * size)` with
one argument, so it fires on every frame — but every test calls `sampleStride` directly on the
JS thread, where the real module binding exists, and all of them pass.

This is F-116's shape one layer in. That feature made the `'worklet'` **directive** checkable;
this is about what a correctly-marked worklet may then *reference*.
[[a-worklet-may-only-call-worklets-and-jest-has-one-runtime]]

**Reused:** the installed `react-native-worklets/plugin` itself as the oracle — the check reads
the plugin's emitted `code` string rather than re-deriving what it would do. That is the same
instinct as `verify-worklet-reach.mjs` but with a stronger source of truth: the plugin cannot
disagree with itself.

**New:**

- `scripts/verify-worklet-defaults.mjs` — transforms each app source that contains a
  `'worklet'` directive and refuses any emitted worklet whose parameter list reads a name the
  body unpacks from `__closure`. With `--prove`.

**Increments:**

1. Fix `sampleStride`: move the constant out of the signature into the body.
2. Confirm against the plugin's output that the emitted worklet no longer reads it from a param.
3. The static check, and its proof.
4. Record.

## Files to touch

```
apps/mobile/src/lens/camera.ts        — sampleStride reads the cap in its body
apps/mobile/test/lens.test.ts         — the default still behaves, and the body path is covered
scripts/verify-worklet-defaults.mjs   — new. The check + --prove.
package.json                          — it joins the lint chain
.harness/state/{feature_list,progress}
```

## Anticipated effects

| Contract | Dependents | Guard |
|---|---|---|
| **`sampleStride`'s signature** — `max` becomes optional rather than defaulted | `sampleFrame` (one arg, unchanged), `lens.test.ts` (both arities) | `gate:typecheck` + `gate:test` |
| **A new rule about worklet source** | every `'worklet'` function in `apps/mobile` | `gate:lint` — the new check, which is the point |

No engine change, no corpus change, no schema change. **E-050** is the relevant link (a worklet
may only call worklets, and jest has one runtime) and this widens what it covers.

## Test plan

- **Unit:** `sampleStride(pixels)` and `sampleStride(pixels, max)` both behave — the default
  path must keep working on the JS thread, since that is where every caller in tests lives.
- **Golden:** none.
- **E2E:** none that can run here. **The real verification is a device**, and it is the reason
  this was found at all — F-040's attestation.
- **Negative, with a decoy rather than an empty fixture:** `--prove` transforms a fixture that
  reintroduces the defect and requires it to be refused, **and** a control worklet that reads
  the same captured name from its **body**, which must stay green. Without the control, a check
  that refused every worklet with any default parameter would pass the negative case and be
  worse than the hole it fills.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-worklet-defaults.mjs --prove
pnpm typecheck && pnpm lint && pnpm test && pnpm format:check
```

`color-golden`, `cvd`, `a11y`, `contrast`: nothing they cover changes. `e2e`: gate 7 pending.

## Risks and open questions

- **The check depends on the plugin's emitted shape.** If a future version unpacks the closure
  differently — say into the parameter scope — the check's premise changes. It reads the real
  output rather than assuming, so it would start reporting nothing rather than lying; that is
  the failure mode to watch, and the `--prove` control is what would notice.
- **It cannot see worklets in `packages/`.** Only `apps/mobile/src` is scanned, because that is
  where worklets live today. If one ever appears in a package, the scan must widen.
- **No open questions.**

## Out of scope

- **Any other frame-processor work.** F-135 owns multi-region sampling; this restores the
  single-region reading the Lens is supposed to produce today.
- **Verifying the fix on a device.** That is F-040's attestation and it belongs to whoever has
  the phone.
