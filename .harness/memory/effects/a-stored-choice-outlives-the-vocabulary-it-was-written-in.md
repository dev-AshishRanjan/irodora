---
kind: effect
title: A stored choice outlives the vocabulary it was written in
category: contract
confidence: 0.9
created: 2026-09-25
scope: [packages/ui, apps/mobile]
links: [[a-rule-that-already-existed-was-the-answer-to-a-question-nobody-had-asked-it]]
---

# E-150 — `parseAppearance` → every appearance value a shipped build wrote

**`packages/ui/src/theme.tsx#parseAppearance` → `apps/mobile/src/appearance.tsx` · Preferences ·
the root layout · `appearance.test.tsx`**

## What changed

Until F-225 the appearance setting was a family crossed with a mode: `fuka:dark`, `aota:light`,
`device:dark`. F-225 replaced that with the six choices mockup `15` and FR-70 give: Sumi, Slate,
Obsidian, Washi, system and device. The recipes were removed.

The values already on phones are **not rewritten**. The parser is the migration: an old
`family:mode` reads as the mode's drawn theme (dark → Sumi, light → Washi), and `device:mode` reads
as device. Anything unknown falls back to the default and never throws. The person sees the theme
their old choice meant, and nothing is announced.

## Why it is a link and not a detail

The setting is written by one build and read by every later one. Any future rename of a theme, or
any removal, is this change again. The parser has to keep reading every value any shipped build
could have written, or a person's choice silently resets. `appearance.test.tsx` round-trips every
current choice and maps every legacy one.

## How to apply

Never remove a legacy branch from `parseAppearance` because "nobody has that value any more". A
phone that has not opened the app since that release still does. Add the new vocabulary, map the
old one, and extend the test.
