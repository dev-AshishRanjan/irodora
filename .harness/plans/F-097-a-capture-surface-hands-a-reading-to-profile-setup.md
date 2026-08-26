# Plan: F-097 — The photo path has no producer: a capture surface hands a reading to profile setup

| | |
|---|---|
| **Feature** | F-097 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-13, FR-27 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-08-26 |

---

## Intent

`read()` has existed since F-040 and `estimateFromReading` since F-027, and **nothing in the
app constructs a `LensReading`**. This builds the producer: a Lens a person can reach, which
reads a colour under a crosshair (FR-13) and can hand that reading to profile setup (FR-27).

## The constraint that shapes the architecture

A VisionCamera surface **cannot be rendered by jest**. `scripts/a11y-scope.mjs` scans
`apps/mobile/src/screens/*.tsx` and fails on any exported component the conformance registry
does not reach — so a `Lens.tsx` dropped in there would either fail the scope reporter or be
registered with a render that cannot run.

**So the surface splits, the way the repository already splits.** `app/profile.tsx` imports
`deviceRepository` in the *route* precisely so the screen stays renderable; the same reasoning
applies one step further out:

| file | zone | rendered by jest |
|---|---|---|
| `src/screens/Lens.tsx` | scanned, registered, conformance-checked | **yes** — it takes a `LensReading \| null` and a `viewfinder` node |
| `src/lens/viewfinder.tsx` | not a scanned zone | no — permission hook, `<Camera>`, frame processor |
| `app/lens.tsx` | route | no — composes the two |

This is not a workaround for the checker. It puts **every pixel the conformance suite can check
under the suite** and isolates the native seam to one file that has no layout in it.

## Approach

### The reading crosses in memory, not in a route parameter

`src/lens/handoff.ts` — `offerReading(r)` and `takeReading()`, one-shot. `app/profile.tsx`
calls `takeReading()` and passes the result to `ProfileSetup`'s existing `reading` prop, which
F-027 already built and tested twelve ways.

Not a router parameter. A `LensReading` is all numbers and enums so it would serialise, but a
route parameter is a URL, and a reading is a measurement about the person using the app.
One-shot because it is an **offer**: navigating back must not re-propose an estimate the person
already declined.

### `profile.privacy` is currently a claim that would stop being true

```
'profile.privacy': 'No camera. Everything stays on this device.'
```

The moment a camera reading can reach that screen, the first sentence is false whenever it does.
It becomes conditional: the guided path keeps *"No camera"*, and the photo path says what is
actually true of it — the frame was analysed and discarded and nothing left the device, which is
the claim `app.config.ts` already makes in `NSCameraUsageDescription`.

**This is the sharpest thing in the feature**, because a privacy claim that quietly becomes
false is worse than never having made it, and nothing would have failed.

### What the Lens shows, and what it must never say

FR-13: continuous colour under a crosshair, with name, hex and OKLCh. The name comes from
`@irodora/color-naming`, the same path the Finder uses.

Every reading carries `confidence`, `illumination`, `quality` and `instruction`, and the surface
shows all four — `instruction` is the reading's own words for what to change, and F-040 built it
so that a poor capture returns an actionable sentence rather than a number nobody can act on.

**Never a measurement claim.** `NSCameraUsageDescription` says *"reads colour"*, and the copy
lint (NFR-21, ADR-0031) binds permissible language to provenance: an `estimated` reading may not
appear near the word "measured". The screen states the capture space and the confidence
**before** the value, which is FR-17's rule.

### Nothing on this surface looks at a person

ADR-0010 is unambiguous about why a skin sample is refused, and this surface inherits it
structurally rather than by copy: it reads **a colour under a crosshair** and has no idea what
is in front of it. There is no face detection, no region-of-interest guidance toward a person,
and no vocabulary for one. `scripts/verify-no-inference.mjs` scans this code like any other.

## Files to touch

```
apps/mobile/src/screens/Lens.tsx        — NEW. The pure surface: readout, crosshair, actions
apps/mobile/src/lens/viewfinder.tsx     — NEW. VisionCamera, permission, frame processor
apps/mobile/src/lens/handoff.ts         — NEW. One-shot reading hand-off
apps/mobile/app/lens.tsx                — NEW. The route
apps/mobile/app/profile.tsx             — takes the offered reading
apps/mobile/src/screens/Home.tsx        — an entry point a person can reach
apps/mobile/src/i18n/{en,ja}.ts         — the copy, including the privacy rewording
apps/mobile/test/screens.test.tsx       — Lens registered, three states
apps/mobile/test/lens.test.ts           — the hand-off, both directions
apps/mobile/assets/fonts/               — regenerated subset if new ja characters appear
```

## Anticipated effects

| Change | Reaches | Guard |
|---|---|---|
| A new screen in `src/screens` | the a11y scope reporter | `gate:a11y` fails if it is not registered |
| `profile.privacy` becomes conditional | the claim the profile screen makes | `gate:lint` (claims), and the i18n suite |
| New Japanese copy | the bundled font subset | `gate:content` font coverage — a missing glyph fails |
| A reading reaches `ProfileSetup` from the app | FR-27's whole path | `gate:e2e` — **pending on F-091** |
| VisionCamera composed into a route | the app's startup graph | `typecheck`; **nothing else here** |

## Test plan

- **The hand-off is one-shot:** a second `takeReading()` returns `null`. Asserted, because the
  back-navigation case is the one nobody would find by hand.
- **`Lens` renders in all three permission states** — granted, denied, undetermined — and in
  both themes, through the same conformance suite the other eight screens use.
- **A `null` reading renders the surface with no value**, rather than a zero, an empty string or
  a placeholder colour that looks like a reading.
- **The privacy string is asserted per path**: the guided path says no camera, and the photo
  path does not say it. A test that only checked the key exists would pass on the wrong one.
- **No new key is untranslated**, and no Japanese value equals its English — the existing i18n
  suite enforces both.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-claims.mjs && node scripts/verify-no-inference.mjs
node scripts/a11y-scope.mjs
node scripts/verify-content.mjs        # font coverage over any new ja copy
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test:a11y && pnpm test:e2e
```

**NOT RUNNABLE ON THIS WORKSTATION, and it is most of the interesting half:**

| | why |
|---|---|
| **jest, in either zone** | `packages/ui` has no `react-native-worklets`; `apps/mobile` has no `@babel/runtime`. Both are partial-install symptoms of `pnpm install` never having run |
| **gate 7 `e2e`** | `pending`, on F-091, which is itself blocked on tooling that cannot install |
| **a device** | no emulator, no JDK, no phone |

So the conformance registration and the render tests will be **written and not run here**; CI
runs them. Criterion 3 cannot be demonstrated at all and is recorded as an attestation.

## Risks and open questions

- **Criterion 3 — *"a person can complete photo-assisted setup end to end without a test
  harness"* — is unmeetable here** and becomes an attested criterion blocking release, the way
  F-040 recorded its four device criteria. Claiming it on the strength of a typecheck would be
  the exact overstatement golden rule 11 forbids.
- **NFR-23 gates this feature specifically.** *"A held-out validation set stratified by ITA°
  covers every band... a band that underperforms blocks release of that feature."* That study is
  F-037's outstanding attestation and has not run. Building the surface is not releasing it, but
  **the two must not be confused**, and F-097 carries its own attestation saying so.
- **The frame processor is written blind.** Whether `@irodora/color-sampling` is reachable from
  a worklet is F-040's open question and needs a device. The seam is drawn so that both answers
  fit; what cannot be checked here is whether the code inside it runs at all.

## Out of scope

The e2e harness (F-091) · the bias study (F-037) · garment-scan and precision modes as separate
surfaces — `read()` already carries all four modes and this ships the live one · storing an
image, which nothing in the app can do.
