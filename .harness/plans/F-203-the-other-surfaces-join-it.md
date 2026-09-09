# Plan: F-203 — The Atlas, the Lens, the Wardrobe and the Profile join it

| | |
|---|---|
| **Feature** | F-203 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-71, NFR-25 |
| **Service** | `apps/mobile` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## Measured first, because the criterion is measurable

Criterion 2 — *"no screen carries a layout primitive it invented for itself"* — is not an
aesthetic judgement. It is countable, and the count is **12 `flexDirection` declarations across 7
screens**:

```
Finder 2 · PaletteStudio 2 · Compare 2 · Contemporary 2 · ProfileSetup 2 · Lens 1 · ColourDetail 1
```

Every one is a `Row` somebody re-implemented. And the three screens built this release —
`Home`, `Combinations`, `Wear` — have **zero**, which is the control group that says the
vocabulary works when it fits.

## Why seven screens worked around it, and the finding that matters

**`Row` could not express what they needed.** Two gaps, both proven by the workarounds:

| gap | uses | what the screens wrote instead |
|---|---|---|
| `align="baseline"` | 5 | `alignItems: 'baseline'` — a number beside its unit, sitting on one line |
| vertical-only padding | 3 | `paddingVertical` — breathing room in a list row |

`ALIGN` has `start · center · end · stretch` and no `baseline`; `padding` applies to all four
sides. **This is not seven screens being careless — it is a primitive that was missing two values,
and a workaround is what a missing value looks like from the outside.**

So the primitive gains them, and only then is the criterion something the screens can meet.

## And a gate, or the thirteenth arrives next week

A refactor that nothing enforces is a refactor with a half-life. `scripts/verify-layout-primitives.mjs`
refuses `flexDirection` in `apps/mobile/src/screens/**`, and rides inside `lint` — the convention
`verify-route-targets`, `verify-motion`, `verify-reachability` and `verify-dead-exports` all
follow.

**It scans `screens/` only.** `packages/ui` is where a layout primitive is *supposed* to be
written, and a rule that refused it there would refuse `Row` itself. `src/lens/` is excluded for
the same reason the viewfinder is: it positions a reticle against a camera preview in absolute
coordinates, which is not a flow.

## Criterion 1, and what "the same vocabulary" already means

*"Every screen is composed from the same card, state, motion and selection vocabulary."*

**`Surface` is that vocabulary**, not a violation of it — `Card` is built on it. So a screen using
`Surface` is already compliant; what is not is the raw `View` doing a `Row`'s job.

The four screens the title names take the further step where a `Surface` plus a heading is
literally a card: they adopt `Card`, which gains them the header/footer/media slots and the
elevation levels rather than a hand-composed equivalent.

## Files to touch

```
packages/ui/src/layout.tsx                     — baseline alignment, vertical padding
packages/ui/test/layout.test.tsx               — both new values, with decoys
scripts/verify-layout-primitives.mjs           — new gate
package.json                                   — into `lint`
apps/mobile/src/screens/{Atlas,Lens,Wardrobe,ProfileSetup}.tsx  — Card where a Surface is one
apps/mobile/src/screens/{Compare,Contemporary,Finder,PaletteStudio,ColourDetail}.tsx — Row
```

## Test plan

- **The two new values render**, and a decoy proves the default did not silently become them —
  a `baseline` that was always applied would pass a one-sided check.
- **The gate fires:** a planted `flexDirection` in a screen is refused, and the same file without
  it passes. A gate nobody has watched fail is configuration that parses.
- **The gate's scope is asserted**, so `packages/ui` and `src/lens/` are excluded deliberately
  rather than by a glob nobody read.
- **The conformance suite is the regression net** for all nine screens: every one is already a
  registered subject in both themes, so a conversion that changed the tree fails there.

## Verification

`state · typecheck · lint · format · test · a11y · contrast · build`.

## Risks

- **Nine screens change layout with no visual check.** The conformance suite catches structural
  and contrast regressions; it cannot see that a row now sits four pixels lower. Attested, and it
  is the reason the primitive gains the exact values the workarounds used rather than an
  approximation of them.

## Out of scope

The evidence sweep (F-204), which is the feature that renders every screen under every condition
and records the result.
