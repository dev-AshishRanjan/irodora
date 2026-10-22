# E-215 — 06's drawn actions open routes other features rebuild

**Link:** `app/(tabs)/atlas/[slug].tsx` (the colour page's route) → `/atlas/wear/[slug]` (`07`, F-248),
`/atlas/card/[slug]` (`20`, F-253), `/profile/export?slug=` (`18`, F-263) through `exportSubjectFor`,
`/lens` (`04`, F-245), `/wardrobe/with/[id]`, `/wardrobe/add`
**Guard:** `colour-detail-states.test` (each control fired, each handler's argument read; an absent
handler an absent control; the route's push targets read from its source); `export-subject.test`;
`verify-route-targets` and `verify-reachability` in lint **Severity:** high **Feature:** F-247

---

## Why B changes when A does

`06` draws seven actions, and ADR-0147 D3 sends each to a route this feature does not own:

| control | goes to | rebuilt by |
|---|---|---|
| *Wear It* | `/atlas/wear/[slug]` | F-248 (`07`) |
| share | `/atlas/card/[slug]` | F-253 (`20`) |
| export | `/profile/export?slug=` | F-263 (`18`) |
| *Hold as Target* | arm, then `/lens` | F-245 (`04`) |
| a garment | `/wardrobe/with/[id]` | F-259 (`24`) |
| the second empty card | `/wardrobe/add` | F-256 (`12`) |

A rebuild of any of those surfaces is tested against its own mockup, and every one of its tests can stay
green while the route this page pushes is renamed or dropped. The export route is the subtle one: it
takes an optional `slug`, and opened bare it exports the latest palette — so if a rebuild stops reading
the parameter, *Export this colour* silently exports something else.

## What it does not guard

- **What the destination shows.** Each route's own feature holds that.
- **A device.** A push that type-checks and resolves can still fail in the navigator; the attested
  device check opens each one.

Related: [[a-route-moves-to-the-app-bar-with-its-screen-feature]].
