# The icon registry is keyed by the inventories

**Effect:** [E-134](../../state/effects.json) · `mockups/inventory` ↔ `Glyph` → `NavIcon`, `Icon`,
`IconButton` · gates 4 and 8 · **high**

## Why the link exists

Every icon a mockup draws is one entry in `Glyph`, named exactly as F-220's inventory binds it, so a
surface feature writes the name its inventory records and nothing translates it. That makes the
inventories an INPUT to `@irodora/ui` — a test there reads `mockups/inventory/*.json` — and it makes
three components draw through one drawing (65 names, after the review split eight that two
governing elements drew differently):

- `NavIcon` — the tab bar's five glyphs are ordinary entries.
- `Icon` — the status `check` is the drawn `check`, the status `cross` the drawn `close`. The alert
  triangle has no drawn counterpart and is still its own.
- `IconButton` — a glyph that is the whole of a control, whose `label` is required by type.

**High, because it reaches every icon in the product at once and in both directions.** Rename an icon
in an inventory and a surface asks for a glyph that does not exist; add a glyph nobody drew and the
set holds a design nobody made. Neither shows up as a colour, a contrast or a layout failure.

## What holds it

- `glyphs.test.tsx` reads the inventories and asserts both directions, with a decoy each way
  (`calendar`, drawn nowhere; `share`, dropped). Also: no two drawings one shape — filled ones
  included, with the one declared identity (`lens` filled IS `camera`) named rather than skipped; a
  line in every glyph whose element is drawn in line and none in the thirteen drawn solid, both
  directions; only the given ink; every shape declaring its fill; and the glyph hidden.
- `mockups/inventory/**` is a turbo global dependency, so an inventory edit reruns that test rather
  than replaying a cached pass — `verify-cache-scope` was watched failing without the entry.
- `components.test.tsx`: `icon.check` and `icon.cross` render the registry's paths, with a decoy.
- `icon-button.test.tsx`: the refusals, each beside a compiling decoy — no label, a second name in
  four spellings, a role, a state or a hiding, an undrawn glyph — and a render test that a cast
  smuggling those props past the type still cannot change what the native views announce; the
  conformance suite registers `IconButton` (role, name, target, both themes).

## What it does not hold

**That a glyph looks like the element it was drawn against — and the F-228 review found nine that did
not.** The first draft drew every glyph as an outline, which is a style of its own: `00` draws a solid
pencil, `02` and `03` a solid sun, `13` a solid eye, figure and scales. Both directions were green
throughout, because a name having a drawing says nothing about WHICH drawing. The comparison is a
person reading a contact sheet, so it does not survive the session that made it: **F-281** is the gap,
and F-221's device captures are the other half. Nor does it decide how an icon-only control's plate is drawn — that
is F-232's, and the inventories record it as `ui:Button` with no copy.
