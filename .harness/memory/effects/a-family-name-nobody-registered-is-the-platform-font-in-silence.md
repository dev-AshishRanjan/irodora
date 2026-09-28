---
kind: effect
title: A family name nobody registered is the platform font, in silence
category: contract
confidence: 0.9
created: 2026-09-28
scope: [packages/design-tokens, packages/ui, apps/mobile]
links: [[a-pinned-font-is-a-measured-font]]
---

# E-154 — `nativeFaces` → `fonts.ts` → `useFonts` → the first frame

**`packages/design-tokens/src/generated/native.ts#nativeFaces` → `apps/mobile/src/fonts.ts` ·
`app/_layout.tsx` · `packages/ui/src/Text.tsx` · `fonts.test.ts`**

## Why this is a link

React Native takes ONE `fontFamily` and has no cascade. A name nothing registered does not error and
does not log: the text renders in the platform face, and it looks like a design choice rather than a
bug. Three places state one fact:

- the name a component sets (`nativeFaces`, from the manifest);
- the name the app registers (`fonts.ts`, the map handed to `useFonts`);
- the file on disk.

## The guard

- `fonts.ts`'s map `satisfies Record<Family, number>`, so a face without an asset does not compile.
- `fonts.test.ts` holds the families to the loaded keys in both directions, with a decoy, and checks
  each import against its file.
- `text-face.test.tsx` checks what each face resolves to on the rendered node.

## The first frame

The root layout draws nothing until every face has loaded, and the native splash covers the gap. That
is the no-gap launch F-226's criterion 4 asks for. Every face added is one more thing the first frame
waits for. A face that fails to load currently waits for ever: F-302 and OQ-42 record that.
