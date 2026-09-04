# Plan: F-142 — The app has an icon and a splash screen, and the build proves it

| | |
|---|---|
| **Feature** | F-142 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-69 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `scripts/` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

`app.config.ts` has no `icon`, no `adaptiveIcon` and no `splash` — not misconfigured, absent.
The only `splashscreen_logo.png` files in the tree are Expo prebuild placeholders. So the app
currently ships whatever Expo defaults to, on both platforms.

To a user: the app has a face on the home screen and while it launches. To the build: a
placeholder cannot reach an artefact without a gate saying so.

## Approach

**The PNGs are generated, never drawn.** The mark is two axis-aligned rectangles on a flat
ground, so every pixel is computable — no rasteriser, no dependency, and `node:zlib` does the
rest. `scripts/generate-brand-assets.mjs` emits them from `MARK` and takes `--check`, which
regenerates and byte-compares. That is the token generator's arrangement (ADR-0043) applied to
images, and it means a hand-edited icon is a gate failure rather than a surprise.

**Reused:** `MARK` and `markSvg` from `@irodora/ui` (E-059 — one geometry, two renderers, now
three); `nativeColors` for every colour, so the icon introduces none; the zip reader and the
`--prove` harness already in `verify-apk.mjs`.

**Geometry, chosen so every number is an integer** — a fractional edge is a soft edge:

| asset | canvas | grid drawn at | unit | ink | why |
|---|---:|---:|---:|---:|---|
| `icon.png` | 1024 | 768 | 32 | 576 (56.25 %) | iOS squircle-masks; 56 % leaves the mark clear of the corners |
| `adaptive-icon.png` | 1024 | 576 | 24 | 432 | Android guarantees only a **66/108 circle**: Ø 625.8. The ink's diagonal is 610.9, so it fits with room |
| `splash-icon-*.png` | 1024 | 768 | 32 | 576 | composited over the theme background by Expo |

**Colour comes from the manifest.** The icon is the warm off-white `foreground` on the dark
`background` — sumi, the product's own palette. The two splash images are the light and dark
`foreground`, transparent, so Expo composites each over its theme's `background`.

**Increments:** the generator and its `--check`; the config; the artefact assertion.

## The artefact assertion, and why it is a shape rather than a hash

The criterion is *"fails if a default or placeholder asset reached it"*. Two obvious
implementations are both wrong:

- **Byte-compare the APK's icon against ours.** Android generates density variants, so the
  bytes legitimately differ and the check would fail on a correct build.
- **Hash Expo's placeholder and refuse that.** Refuses exactly one known-bad file. The next
  placeholder — a different SDK's default, a half-finished export — passes.

So the check decodes the PNG and asserts the **mark's shape signature**: across the middle
scanline the run lengths are ground · field · interval · field · ground in the mark's own
proportions. That is scale-invariant, so it survives density resizing, and it is a positive
assertion that *our* mark is there rather than a list of things that are not.

A PNG decoder is ~60 lines of `inflateSync` and un-filtering. `verify-apk.mjs` already parses
binary AXML by hand for the same reason: a gate must run where the Android SDK does not.

**Honest limit, decided now:** no APK can be built here — there is no Android SDK on this
machine. The decoder and the signature check are therefore proven **against the generated
files**, which exercises every line of them, and the APK path is wired for CI. That gap is
recorded as an attested criterion, not glossed.

## Files to touch

```
scripts/generate-brand-assets.mjs   — NEW: PNG encoder, the four assets, --check
scripts/png.mjs                     — NEW: encode + decode + the shape signature
scripts/verify-apk.mjs              — the launcher icon carries the mark
apps/mobile/assets/brand/*.png      — NEW, generated
apps/mobile/app.config.ts           — icon, adaptiveIcon, splash
package.json                        — the generator joins lint's --check sweep
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| `MARK` now decides a shipped icon | the store listing, every home screen | `generate-brand-assets --check` — E-059 already records this direction |
| New generated binaries in the tree | `.gitignore`, prettier | committed deliberately; `--check` is what keeps them honest |
| `app.config.ts` gains asset paths | `expo prebuild`, gate 16 | `build` + the new artefact assertion |

## Test plan

- **Encoder:** a generated PNG round-trips through the decoder to the pixels that were asked
  for. Without this the encoder could be subtly wrong and every other check would agree with it.
- **Signature:** the real icon passes; **a flat square fails**, and **a two-bar image with the
  wrong proportion fails**. Two decoys, because a signature that accepts anything rectangular
  asserts nothing.
- **Safe zone:** the adaptive icon's ink diagonal is asserted to fit inside the 66/108 circle —
  arithmetic, so it is a test rather than a screenshot.
- **`--check`:** mutating one generated byte fails it.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
node scripts/generate-brand-assets.mjs --check
```

## Risks and open questions

**Expo's splash configuration moved.** SDK 52 replaced the top-level `splash` key with the
`expo-splash-screen` plugin. `ExpoConfig` is typed, so `typecheck` decides which form this SDK
accepts rather than a guess — and whichever it is, the same generated images feed it.

**An icon cannot be verified by a gate for the thing that matters**, which is whether it looks
right on a home screen at 60 px beside other icons. The signature check proves the mark reached
the artefact, not that it reads well there. Attested.

## Out of scope

A dark-variant iOS icon (iOS 18's tinted/dark icons), a monochrome Android icon (Android 13
themed icons), and the store listing artwork. All three are real and none is needed to ship a
first build; each would be its own decision about a second identity asset.
