# Plan: F-145 — The app has an information architecture

| | |
|---|---|
| **Feature** | F-145 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, NFR-8 |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

[`_layout.tsx`](../../apps/mobile/app/_layout.tsx) is a bare `<Stack>` and `index.tsx` pushes ten
routes from a scrolling list of identical buttons. The whole product is push navigation over that
list, which is why every screen reads as a prototype however correct its contents are.

To a user: the app has a shape you can hold in your head, and the Lens is one tap away from
anywhere. To F-146 and after: a place for each screen to belong, so redesigning one does not mean
deciding where it lives.

## The architecture

Five tabs. Five is the ceiling at which a 44px target stays comfortable across the width of a
phone, and it is what the product's own vocabulary
([BRAND.md §8](../../docs/design/BRAND.md#8-naming-inside-the-product)) divides into cleanly.

| tab | root | pushed within it |
|---|---|---|
| **Home** | the front door | — |
| **Atlas** | browse the corpus | Finder, colour detail, card, Compare, Palette Studio |
| **Lens** | the camera | — |
| **Wardrobe** | the garments | Add garment, Outfit Lab, Shopping |
| **Profile** | the personal profile | Preferences, Measure, Export |

**Every existing route gets a tab that owns it.** That is criterion 2: today `/palettes` and
`/compare` are reachable *only* from Home's button list, so a person who scrolled past them would
never find them again.

**The Lens is reachable from every tab** because the tab bar is persistent — criterion 4 is
satisfied by construction rather than by adding a button to nine screens.

## The tab bar is typographic, and that is a decision

`@irodora/ui` has exactly three icons — `check`, `alert`, `cross` — drawn as `View`s because
[ADR-0057](../../docs/adr/0057-the-japanese-face-is-a-bundled-noto-sans-jp-subset-generated-from-the-corpus.md) refuses an icon font. A tab
bar needs five more, and inventing an icon language inside a navigation feature is how you get
five icons nobody designed.

So the tabs are **set in the `label` step** — 10px, uppercase, 0.16em tracking — which exists for
exactly this and is the bottom of the type scale the editorial direction is built on. Near-
monochrome retail apps navigate this way; it is the register, not a shortcut.

**The selected tab carries three channels** (NFR-9, golden rule 13): a heavier foreground token,
a visible indicator rule, and `accessibilityState.selected`. Colour alone would fail, and so
would weight alone for someone not looking.

> **Flagged for review rather than settled:** a text-only tab bar is unusual on mobile and Apple's
> HIG assumes icons. It is defensible here and it may read as unfinished on a device to somebody
> who did not choose the register. If it does, icons are a later feature and the lockup does not
> change — the labels stay.

## Approach

**Reused:** `Tabs` from `expo-router` (v6 file-based `(tabs)` group), `nativeColors`,
`nativeType.latin.label`, `nativeSpacing`, and the `Screen` primitive every route already renders.

**New:** `@react-navigation/bottom-tabs` — required by expo-router's `Tabs` and neither a
dependency nor a peer of it, so it has to be declared. Already installed and the peer gate stays
clean.

**Increments:**

1. `app/(tabs)/_layout.tsx` with the five tabs; move the five root routes in.
2. Move the secondary routes under the tab that owns them.
3. Fix every `router.push` target, and the e2e journey's route assertions.
4. Home stops being the only way anywhere — its buttons stay for now; F-146 replaces them.

## Files to touch

```
apps/mobile/app/(tabs)/_layout.tsx        — NEW: the tab bar
apps/mobile/app/(tabs)/index.tsx          — Home
apps/mobile/app/(tabs)/atlas/…            — atlas, [slug], find, compare, palettes, card
apps/mobile/app/(tabs)/lens.tsx
apps/mobile/app/(tabs)/wardrobe/…         — index, add, outfit, shopping
apps/mobile/app/(tabs)/profile/…          — profile, preferences, measure, export
apps/mobile/app/_layout.tsx               — Stack wrapping the group
apps/mobile/e2e/journeys/atlas.journey.json — route assertions follow the move
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| Every route path changes | `generate-e2e-flows.mjs` asserts each `route` is a file under `app/` | `lint` — E-055's guard, and it will fail first |
| `router.push` targets change | every screen that navigates | `typecheck` cannot see a bad string; `e2e` can, and gate 7 is pending — so this is the risk |
| A tab bar is added | the conformance registry covers screens, not the shell | **nothing covers the tab bar today**; a subject is added |

**The one that needs care:** route strings are not typed. `router.push('/palettes')` compiles
whether or not the route exists. expo-router generates `.expo/types/router.d.ts`, which *can* type
them — checking whether that is wired is part of increment 3, because without it this feature's
main risk has no guard at all.

## Test plan

- **The shell renders:** the tab layout mounts, declares five tabs, and each has an accessible
  name — asserted from the rendered tree, not from the config object.
- **Selected state:** the active tab reports `selected` and a different foreground token; an
  inactive one reports neither. The second half is the decoy.
- **Every route resolves:** a test walks the `app/` tree and asserts every `router.push` target in
  `src/` and `app/` corresponds to a real route file. That is the guard the type system does not
  give, and it is the thing most likely to break silently here.
- **Journey:** the e2e spec's route assertions follow the move, and `generate-e2e-flows --check`
  proves they were updated rather than deleted.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm test:a11y && pnpm test:contrast
```

`e2e` is in this feature's declared gates and **gate 7 is still pending repo-wide** — no runner
exists. That is pre-existing and is not discharged here; it is the reason the route test above is
worth writing.

## Risks and open questions

**Navigation is the least testable thing in this repository.** The conformance suite renders
screens outside a navigator on purpose — `Stack.Screen` throws otherwise — so the shell itself is
checked by almost nothing. A tab bar that mounts in jest can still be wrong on a phone in ways
only a phone shows.

**Deep links and back behaviour change.** Moving a route into a group changes its URL. `scheme:
irodora` is declared and nothing depends on a specific deep link yet, but this is the moment that
stops being true cheaply.

## Out of scope

Home's redesign — F-146. The tab bar's *appearance* beyond the type and the indicator: no icons,
no badges, no animation (F-144 owns motion). Anything that changes what a screen contains.
