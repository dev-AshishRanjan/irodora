---
kind: effect
title: The generated stylesheet is only as authoritative as the notation it is written in
category: convention
confidence: 1.0
created: 2026-08-24
scope: [apps/mobile, packages/design-tokens]
links: [[a-component-styled-by-a-bundler-plugin-is-invisible-to-the-gate-that-reads-it]] [[a-gate-that-errors-is-failing-open]]
---

# E-019 — `apps/mobile/global.css` is generated, and what it may contain is a decision

**The link:** `apps/mobile/global.css` → `design-system.manifest.json`, `emit/heroui.ts`, its
test, and [ADR-0063](../../../docs/adr/0063-culori-ships-in-the-app-bundle-and-the-generated-stylesheet-emits-hex-only.md).

The file carries all 64 of HeroUI's theme values. Two distinct failures ride on it.

## 1. Twenty-nine values HeroUI would otherwise compute at runtime

HeroUI derives every hover state and every `-soft` variant with
`color-mix(in oklab, …)`. **Four of them carry text** — `Alert` tints its title with
`--color-success-soft-foreground`.

A colour the stylesheet computes is a colour the `contrast` gate never measured. So the
generator computes them from the manifest instead, runs the text-carrying ones against their
own fill composited over each ground, and `emitHeroui` **refuses to emit** on a failure.

Three of the declarations sum to less than 100 %. Under CSS Color 5 that scales the result's
*alpha* rather than the ratio — reading `90%, 2%` as a 90/2 blend instead of a 92-scaled one is
a quiet transparency bug.

## 2. The half that is easy to miss: a notation is an authority

`uniwind` normalises **every** CSS variable through `culori.parse` → `formatHex` **on device**,
and implements `colorMix` with `culori.interpolate`.

So a non-hex value in this file hands the OKLCh → sRGB conversion that
[ADR-0043](../../../docs/adr/0043-the-oklch-field-is-authoritative-and-srgb-is-derived.md)
makes ours to a third party — while the gate holds a number our own implementation derived.
Two implementations of one conversion, disagreeing in the fifth decimal place, invisible until
someone photographed two devices side by side.

**The general shape:** a generated artefact consumed by a dependency's *runtime* is only as
authoritative as the notation it is written in. Expressiveness in the file is authority handed
away. Writing `oklch()` would have been more readable and strictly worse.

## The guard, and it is proven

`emitHeroui` scans its own output and **throws** on any declaration carrying `oklch(`,
`color-mix(`, `rgb(`, `hsl(`, `lab(` or `lch(`. Hex, or it does not build.

Comments are stripped first and stay exempt — they carry each value's token name and OKLCh
source, which is the only thing that makes a page of hex readable.

The pairing check has its own decoy: it drives `status.ok` onto the background and asserts the
finding names `--color-success-soft-foreground` **before** asserting the throw, so the test
cannot pass because something else broke. The hex check is exported and tested against a
crafted string, because the emitter has no branch that could produce a colour function — a
guard whose failing path is unreachable from its own caller is one nobody has watched fail.

## Not covered

- **Values HeroUI reads that we do not override.** The 35 base and 29 derived are enumerated by
  hand from its stylesheet; a HeroUI release that adds a variable adds one we do not set.
  Transcribed rather than parsed on purpose — a colour changing under us without a diff is the
  failure this whole file exists to prevent.
- **A future Uniwind feature that only accepts a colour function**, which would force ADR-0063
  open again.
