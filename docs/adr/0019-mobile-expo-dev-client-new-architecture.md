# ADR-0019 — Expo with a development client, on React Native's New Architecture

## Status

Accepted

## Date

2026-08-13

## Context

Mobile is where the Lens is best: real camera control, known capture colour space, and
enough compute headroom for per-frame sampling at 15 fps
([ADR-0006](0006-camera-capture-vision-camera-and-getusermedia.md)).

The tension is that VisionCamera is a native module, and native modules do not run in Expo
Go. That is often read as "Expo cannot do this", which has not been true for some years —
Expo's development client and prebuild give the managed workflow's ergonomics with
arbitrary native dependencies.

The alternative — bare React Native — means owning the iOS and Android project files, the
upgrade path, and the build infrastructure, for capability we would then have to rebuild.

## Decision

**Expo SDK 57 (React Native 0.86) with a development client and the New Architecture.**

1. **Development client, not Expo Go.** `expo-dev-client` plus `expo prebuild`, which
   allows VisionCamera and any other native dependency while keeping Expo's config plugins,
   OTA updates and build service.
2. **New Architecture (Fabric + TurboModules) enabled.** It is the default in this SDK
   range, and the frame processor path depends on the worklet integration it provides.
3. **`ios/` and `android/` are generated and gitignored.** Native configuration lives in
   `app.config.ts` and config plugins — a hand-edited native project is a merge conflict
   and an upgrade blocker waiting to happen.
4. **EAS Build** for CI builds and store submission. Building iOS locally requires macOS;
   the development machine here is Windows, so this is a hard requirement rather than a
   convenience.
5. **`expo-sqlite` with Drizzle** for offline storage (FR-56), sharing schema definitions
   with the server where shapes align.
6. **`expo-secure-store`** for tokens and keys. Never the app database.
7. **The colour engine is the same package the web imports.** Not a port, not a
   reimplementation — the same `@irodora/color-core`, which is what makes NFR-3 testable.

## Consequences

**Good.** Native capability with managed-workflow ergonomics. Upgrades stay tractable
because native projects are generated rather than maintained. EAS solves iOS builds from a
Windows machine. OTA updates ship JS-only fixes without app review. The engine is shared,
so a colour fix lands on every surface at once.

**Bad.** No Expo Go, so contributors need a development build before they can run anything
— a genuine onboarding cost. Prebuild regenerates native projects, so any native
customisation must be expressed as a config plugin, which is an extra concept to learn.
VisionCamera is a significant dependency whose compatibility with each React Native version
must be verified before an SDK upgrade. EAS is a paid dependency in the build path.

**Neutral.** Mobile ships at R3, after web has already proven the engine publicly.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Expo Go only, `expo-camera`** | Zero-friction onboarding, no build step. Cannot deliver per-frame pixel access, so the Lens's core modes are not implementable |
| **Bare React Native** | Total native control, no Expo dependency. We own two native projects, the upgrade path and build infrastructure, and then rebuild config plugins and OTA ourselves |
| **Native iOS + native Android** | Best possible camera and colour-space control. Two codebases, and the engine would need a second and third implementation — which directly breaks NFR-3, the one guarantee we cannot compromise |
| **Flutter** | Excellent performance and a single codebase. The engine is TypeScript; a Dart port would be a second implementation of the product's most correctness-critical code |
| **PWA only** | One codebase, no stores. Camera colour-space control on the web is materially weaker, background sync is unreliable, and iOS PWA capability remains constrained |

## Revisit when

- VisionCamera's maintenance status changes materially.
- Expo's release cadence stops tracking React Native closely enough to keep upgrades
  tractable.
