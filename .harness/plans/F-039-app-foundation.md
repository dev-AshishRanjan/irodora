# Plan: F-039 — App foundation: Expo shell, navigation, and offline as the only mode

| | |
|---|---|
| **Feature** | F-039 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-12, FR-55, NFR-17 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `mobile` — `apps/mobile` |
| **Author** | Claude Opus 5 |
| **Date** | 2026-08-20 |

---

## Intent

R0 and R1 built an engine nobody can use. This is the first feature that produces something a
person can hold: an Expo app that starts, navigates, and **runs the colour engine on the
device**, with no account, no network, and no server behind it.

Done, to a user, means: install it, open it in airplane mode on a phone that has never been
online, and see a real colour computed by the real engine.

## What can be proven here, and what cannot

**This is the first feature whose acceptance genuinely needs hardware**, and saying so up front
is the honest version of [ADR-0038](../../docs/adr/0038-every-acceptance-criterion-names-its-check.md):
every criterion names its check, and external verification is *attested*, not silently skipped.

| Criterion | How it is verified |
|---|---|
| Expo SDK 57 / RN 0.86 on the New Architecture | **Gated** — the manifest pins them and `typecheck`/`build` run over the app |
| No account prompt exists anywhere | **Gated** — a lint rule; there is no auth dependency to import |
| The engine runs on device and reproduces the identity digest | **Attested** — needs Hermes. The Node and Chromium legs are already gated by F-006; Hermes is the interesting one and it needs a device |
| Core journeys complete in airplane mode from a cold start | **Attested** — needs a device, *and* needs journeys, which arrive with F-018/F-040 |
| The app opens no socket during any core journey | **Attested** — same, and the e2e suite that would assert it activates with this feature's successors |
| EAS Build produces installable builds from a Windows workstation | **Attested** — already recorded as such |

**Three of six are attested.** That is a lot, and it is why this plan says so in its own section
rather than burying it: a reader should not have to reconstruct which half of this feature is
actually checked.

What is NOT deferred: the engine must be **wired and demonstrably executing** in the app, not
merely listed as a dependency. A dependency nobody imports passes every gate and ships nothing
[[a-tested-module-nobody-wired-up-passes-every-test-it-has]].

## Approach

**Reused:** the whole engine, unmodified — that is the point of NFR-3 and of the purity gate.
`@irodora/design-tokens` already emits React Native styles; this consumes them rather than
restating any colour.

**New:** `apps/mobile` becomes a real Expo app — `app.config.ts`, Expo Router, an entry point,
and one screen that computes a colour through `@irodora/color-core` and renders it with tokens.

**Deliberately NOT here:** SQLite (F-041), the design system proper (F-017), the Lens (F-040),
any surface. This feature is the floor, and a floor that quietly grows a wardrobe is scope creep
past a `wip_limit` of 1.

### Increments

1. Expo dependencies pinned at SDK 57 / RN 0.86, New Architecture on, dev-client rather than
   Expo Go (VisionCamera is a native module — F-040 needs it and the decision belongs here).
2. `app.config.ts`, Expo Router entry, TypeScript wired to the app's own tsconfig.
3. **One screen that proves the engine runs**: convert a colour through the real engine, name it
   against a corpus fixture, render with design tokens. Not a placeholder.
4. A test that imports the app's own engine surface and reproduces the identity digest under
   Node — proving the *wiring*, while the Hermes leg stays attested.
5. Gate wiring: `typecheck`, `lint`, `build` over the app; `e2e` and `a11y` stay `pending` with
   their `activatesWith` pointing here, and flip when the first journey exists.

## Files to touch

```
apps/mobile/package.json          Expo 57, RN 0.86, expo-router, react 19.2.3
apps/mobile/app.config.ts         NEW — New Architecture, dev client, no network permissions
apps/mobile/app/_layout.tsx       NEW — Expo Router root
apps/mobile/app/index.tsx         NEW — the screen that runs the engine
apps/mobile/src/engine.ts         NEW — the app's engine surface, so one import site is testable
apps/mobile/test/engine.test.ts   NEW — the identity digest through the app's own surface
apps/mobile/tsconfig.json         React Native + JSX
apps/mobile/AGENTS.md             what is gated here and what is attested
eslint.config.mjs                 a zone for apps/mobile — no auth import, no network primitive
.harness/verification/gates.json  e2e/a11y activatesWith, and what F-039 does and does not prove
```

## Anticipated effects

**E-002** — the `Color` type reaches every surface. This is the first surface. Guard: `typecheck`.
**E-008** — sampling lives in the engine, not the platform. Not exercised until F-040, but the
app is now a place where someone could put sampling in the wrong layer; the scoped `AGENTS.md`
says so.

**The engine purity closure (F-073) now matters in practice.** `apps/mobile` is not a package,
so it is outside the zone — but anything it pulls into `packages/` is not. Adding a convenience
helper that reads a file, in a package the engine also uses, is now a gate failure rather than
an accident.

**Risk worth naming:** installing Expo adds a very large dependency tree to a repository whose
central claim is that the engine has none. The engine keeps zero runtime dependencies; the
*app* does not, and cannot. The purity gate is what keeps that boundary honest, and it now has
its first real reason to exist.

## Test plan

- **Unit:** the app's engine surface reproduces the committed identity digest under Node. This
  proves the wiring, not Hermes.
- **Typecheck/lint/build:** over the app, with a lint zone forbidding an auth or network import.
- **Attested, recorded on the feature:** the Hermes execution, the airplane-mode journey, the
  no-socket assertion, and EAS Build from Windows.

## Gates

`state` · `typecheck` · `lint` · `build` · `test`

`e2e` and `a11y` are `pending` and stay pending: their subject is a journey, and this feature
ships a floor. They activate with F-018/F-040, and `gates.json` says so rather than leaving the
`activatesWith` pointing at a feature that does not deliver them.
