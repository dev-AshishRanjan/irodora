# E-061 — A peer that resolves by luck is not a dependency

**Link:** `pnpm peers check` → `scripts/verify-peer-deps.mjs` → what may be wrapped in
`packages/ui/src/overlay.tsx` **Guard:** `gate:lint` **Severity:** high **Feature:** F-143

---

## What it found

`react-native-gesture-handler` **3.2.1** installed against `heroui-native@1.0.8`'s declared
`^2.28.0` — a major version apart, under every gesture-driven component in the library. Expo SDK
57 ships v3; HeroUI has not caught up.

Nothing in the repository had noticed, because nothing had asked. Every gate was green: the
component library imports fine, typechecks fine, and renders fine under jest, which has no
native module to disagree with.

## Why the first version of the check was wrong, and that is the useful part

The first `verify-peer-deps.mjs` walked `node_modules/.pnpm` and decided for itself what
"satisfied" meant. It reported nine problems and **two of its three headline findings were
false**:

- `tailwind-merge` looked undeclared because it was resolved from `packages/ui`, which does not
  declare it — while `apps/mobile`, the package that actually bundles, does.
- `expo-blur` and `@gorhom/bottom-sheet` looked missing when `heroui-native` declares both
  **optional**.

`pnpm peers check` already answers this, understands optionality and ranges, and is maintained by
the people who wrote the resolver. The rewrite parses pnpm's output and adds only the thing pnpm
lacks: **a register of accepted mismatches, each with a reason and an owner, checked in both
directions.**

[[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]] — and this one did not manage
day one.

## What it changed about the feature that found it

F-143 was going to wrap Dialog, Popover, Tabs and a Sheet. It wrapped **Popover and Tabs**.

The line was drawn by measurement, not by assumption, and the first draft of the acceptance got
it wrong too: it claimed Dialog was safe because it is "portal-and-press". Grepping the built
library says otherwise — `lib/module/components/dialog/dialog.js` imports `GestureDetector`,
because `Dialog.Content` supports drag-to-dismiss. Popover and Tabs import nothing from
gesture-handler.

So the two that ship are the two that provably do not touch the broken stack, and Dialog joins
BottomSheet, Slider and Menu behind F-157.

## Why the mismatch is accepted rather than fixed here

Pinning back to v2 is not available: Expo versions gesture-handler as a unit with Reanimated,
Worklets and Screens, and `pnpm-workspace.yaml` already carries overrides for two of those pinned
to what VisionCamera resolves (ADR-0062, F-087). The last time this tree was resolved by taking
the newest of three opinions, **three copies of a native module** ended up installed.

The acceptance is therefore bounded and stated: nothing in the product runs on the gesture path,
and the feature that would (F-157) has to resolve the version question first.

## The trap this leaves

An acceptance in `unsatisfied-peers.json` silences a real warning. It is checked in both
directions — an entry matching nothing pnpm reports fails — but nothing checks that the *reason*
is still true. The `react-dom` entry says "this product has no web surface"; the day a web target
is considered, that sentence is wrong and the gate will still be green.

## Related

- [[an-exemption-that-names-no-owner-turns-unfinished-into-passing]] — the same register shape,
  for tokens, and the same trap.
