# The icon registry is keyed by the inventories

**Effect:** [E-134](../../state/effects.json) · `mockups/inventory` ↔ `Glyph` → `NavIcon`, `Icon`,
`IconButton` · gates 4 and 8 · **high**

## Why the link exists

Every icon a mockup draws is one entry in `Glyph`, named exactly as F-220's inventory binds it, so a
surface feature writes the name its inventory records and nothing translates it. That makes the
inventories an INPUT to `@irodora/ui` — a test there reads `mockups/inventory/*.json` — and it makes
three components draw through one drawing:

- `NavIcon` — the tab bar's five glyphs are ordinary entries.
- `Icon` — the status `check` is the drawn `check`, the status `cross` the drawn `close`. The alert
  triangle has no drawn counterpart and is still its own.
- `IconButton` — a glyph that is the whole of a control, whose `label` is required by type.

**High, because it reaches every icon in the product at once and in both directions.** Rename an icon
in an inventory and a surface asks for a glyph that does not exist; add a glyph nobody drew and the
set holds a design nobody made. Neither shows up as a colour, a contrast or a layout failure.

## What holds it

- `glyphs.test.tsx` reads the inventories and asserts both directions, with a decoy each way
  (`calendar`, drawn nowhere; `share`, dropped). Also: no two glyphs one shape, only the given ink,
  every shape declaring its fill, filled drawings solid, and the glyph hidden from a screen reader.
- `mockups/inventory/**` is a turbo global dependency, so an inventory edit reruns that test rather
  than replaying a cached pass — `verify-cache-scope` was watched failing without the entry.
- `components.test.tsx`: `icon.check` and `icon.cross` render the registry's paths, with a decoy.
- `icon-button.test.tsx`: three `@ts-expect-error` refusals with compiling decoys; the conformance
  suite registers `IconButton` (role, name, target, both themes).

## What it does not hold

That a glyph looks like its drawing. The shapes were made against magnified crops and compared on one
sheet (the plan's *Evidence* table names each source element); a person comparing F-221's captures is
where the fine points get settled. Nor does it decide how an icon-only control's plate is drawn — that
is F-232's, and the inventories record it as `ui:Button` with no copy.
