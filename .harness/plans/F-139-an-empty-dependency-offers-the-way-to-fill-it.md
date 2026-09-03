# Plan: F-139 — An empty dependency offers the way to fill it

| | |
|---|---|
| **Feature** | F-139 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-41, NFR-8 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `packages/ui` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

**You cannot add a garment.** `/wardrobe/add` exists as a route and the only thing linking to it
is the Lens, after a successful camera reading. Open the wardrobe directly and there is no way
to put anything in it — and while the frame processor was throwing on every frame (F-138), there
was no way at all.

Three more screens tell you to go and do something and then give you no way to get there.

To a person: an empty screen that names an action should let you take it.

## Approach

### The rule, and the line it turns on

**When a screen depends on data that lives elsewhere and that data is empty, the empty state
must offer the route to go and create it.**

The distinction is *where the action lives*, not *whether the screen is empty*:

| screen | empty text | action lives |
|---|---|---|
| Wardrobe | "Add a garment and it appears here…" | **elsewhere** — `/wardrobe/add` |
| OutfitBuilder | "Nothing in your wardrobe fits a slot yet." | **elsewhere** — `/wardrobe/add` |
| Shopping | "Add something to your wardrobe first…" | **elsewhere** — `/wardrobe/add` |
| Export | "Build a palette first…" | **elsewhere** — `/palettes` |
| Atlas · Finder · Palette Studio · Measure | "Clear them…", "Type something…" | **here** — already correct |

`Wardrobe.tsx` already argues this in a comment — *"one is 'add a garment', the other is 'clear
a filter'"* — and only the filter case got a button.

### Structural, because a documented rule is one the next screen forgets

`EmptyState` in `@irodora/ui` takes a **discriminated union**:

```ts
type Resolution =
  | { readonly action: EmptyAction; readonly resolvedHere?: never }
  | { readonly resolvedHere: true; readonly action?: never };
```

There is no way to render an empty state without saying which kind it is. That is
[ADR-0005](../../docs/adr/0005-measurement-provenance-is-a-type.md)'s move applied to a product
rule: the careless object is unbuildable, and **`tsc` is the guard** rather than a script that
reads prose — which this repository has now watched fail five times.

`resolvedHere: true` is deliberately not a default. A default is a thing people accept without
reading, and accepting it is exactly the mistake.

### The gap the reported rule does not cover

An empty-state button adds the **first** garment and not the second. So the wardrobe also gets a
**persistent** add action, outside the empty branch — criterion 1 is separate from criterion 2
for that reason.

**Reused:** the established navigation convention — screens take optional `onOpenX?: () => void`
and the *route* wires it to `router.push`. `Home.tsx` does this for ten destinations and
`Atlas`/`Finder`/`ColourDetail` for selection. Nothing new is invented; the four screens simply
join it. `Button` and `Text` from `@irodora/ui`. The screen conformance registry for the
branches.

**New:**

- `packages/ui/src/EmptyState.tsx` — the component and its union.
- `browse.add` and `export.buildPalette` in **both** catalogues.
- `onAddGarment` on `Wardrobe`, `Shopping`, `OutfitBuilder`; `onBuildPalette` on `Export`; wired
  in the four routes.

**Increments:**

1. `EmptyState`, exported, with its union.
2. The four screens' empty branches converted; the props added.
3. The routes wired; the persistent wardrobe action.
4. Catalogue keys, both locales.
5. Registry entries so `a11y` and `contrast` see the new controls.

## Files to touch

```
packages/ui/src/EmptyState.tsx          — new
packages/ui/src/index.ts                — export it
apps/mobile/src/i18n/{en,ja}.ts         — browse.add, export.buildPalette
apps/mobile/src/screens/Wardrobe.tsx    — empty branch + persistent add
apps/mobile/src/screens/Shopping.tsx    — empty branch + prop
apps/mobile/src/screens/OutfitBuilder.tsx — empty branch + prop
apps/mobile/src/screens/Export.tsx      — empty branch + prop
apps/mobile/app/wardrobe/index.tsx · shopping.tsx · outfit.tsx · export.tsx — the wiring
apps/mobile/test/screens.test.tsx       — registry entries for the new branches
```

## Anticipated effects

| Contract | Dependents | Guard |
|---|---|---|
| **`@irodora/ui` gains a component** | every screen that renders an empty state | `gate:typecheck` — the union is the point |
| **The message catalogue gains two keys** | `ja` is `Record<MessageKey, string>`, so both must exist | `gate:typecheck` — **E-016**, and the completeness mechanism is the compiler |
| **Four screens gain optional props** | their four routes | `gate:typecheck`; optional, so no caller breaks |
| **New rendered controls** | the a11y tree and the contrast pairings | `gate:a11y` + `gate:contrast` — which is why the registry entries are part of the work, not after it |

## Test plan

- **Unit:** `EmptyState` renders the action when given one, and renders no control when
  `resolvedHere`. The accessible name is the label.
- **Conformance:** registry entries that render each converted empty branch, so `a11y` and
  `contrast` cover them. **An unrendered branch is one whose contrast nothing has checked** —
  that is why the registry is in scope rather than a follow-up.
- **i18n:** both catalogues, asserted by the existing key-set test; the Japanese strings carry
  Japanese script, which `i18n.test.ts` already checks.
- **Negative, with a decoy rather than an empty fixture:** a screen test that asserts the
  wardrobe's empty branch renders a control **and** that the *nothing-matches-a-filter* branch
  does **not** offer "add a garment" — two different situations with two different actions, and
  conflating them is the failure the existing comment already warns about.
- **E2E:** none that can run here.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm test && pnpm test:a11y && pnpm test:contrast
pnpm format:check
```

`color-golden`, `cvd`: no colour maths changes. `e2e`: gate 7 pending.

## Risks and open questions

- **The Japanese strings are mine, and F-017's attested criterion asks that a competent speaker
  read them.** Two short button labels, written to match the register of the existing
  catalogue — flagged rather than assumed correct.
- **The union catches an empty state written with `EmptyState`.** A screen that renders bare
  `<Text>` for an empty branch bypasses it entirely. `tsc` cannot see that, and the honest
  answer is that the four known sites are converted and the component is the obvious thing to
  reach for next — not that the bypass is impossible.
- **No open questions.**

## Out of scope

- **The four screens whose action is already on the screen** — Atlas, Finder, Palette Studio,
  Measure. Converting them to `EmptyState` with `resolvedHere` would be tidy and is not what was
  asked; it is a follow-up if the component proves itself.
- **Any new destination.** Every route this points at already exists.
- **Verifying on a device.** F-040's attestation.
