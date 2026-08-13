# Frontend Rules

`apps/web`, `apps/admin`, `packages/ui`. See also
[`contrast.md`](contrast.md) · [`motion.md`](motion.md) ·
[`../../../docs/design/ACCESSIBILITY.md`](../../../docs/design/ACCESSIBILITY.md).

---

## Server by default

Server Components unless interaction requires otherwise. `'use client'` is a decision with
a bundle cost, and a misplaced one pulls the colour engine into a page that should ship
none.

**The Atlas ships no engine code.** It is server-rendered and static per corpus version. If
engine code appears in the Atlas bundle, a `'use client'` is in the wrong place — which is
exactly the regression the route-level budget exists to catch.

---

## Tokens, never literals

```tsx
// No. Lint-enforced.
<div style={{ color: '#26282C' }} />
<div className="text-[#26282C]" />

// Yes.
<div className="text-primary" />
```

A colour literal in a component is a token that was never defined. Same for spacing, radii,
motion durations and z-index — the z-scale is named and enumerated, with no arbitrary
numbers.

**The exception, and it is the important one:** a colour being *examined* — a corpus entry,
a Lens result, a wardrobe garment — is **data**, not a token. It is rendered from a `Color`
value with its provenance, never from a hard-coded string.

---

## Accessibility is a gate

- **Radix primitives** for anything with interaction semantics. Style them; do not
  reimplement their focus management, keyboard handling or ARIA — reimplementation is how
  accessibility regressions get introduced.
- **Every interactive element** has an accessible name, a visible focus indicator, and
  keyboard operation.
- **Never colour alone.** Every meaning carried by colour also carries text, icon, shape or
  pattern.
- **Every swatch has an accessible name and its numeric value.** A swatch without a name is
  an empty box to a screen reader and to a CVD user, and it is the most common failure in
  colour tooling.
- axe assertions in component tests, not only at the route level.

---

## Colour rendering — specific to this product

**A colour under examination must not be adjacent to a decorative colour without a neutral
separator.** Simultaneous contrast is not a subtlety here; it is the difference between a
correct and an incorrect reading, and it is the reason `swatch.separator` exists as its own
token.

- **No gradient, glow or shadow on or near a swatch.** They alter the perceived colour of
  what they surround.
- **`radius.swatch` is 0** and stays 0. A rounded swatch changes perceived area, and
  therefore perceived colour.
- **No cross-fade between swatches.** Motion must never alter a colour mid-transition.
- **Provenance renders with the colour**, always — never behind a tap or a tooltip.

---

## Internationalisation

- **No hard-coded user-facing string.** Every one is a message key. Lint-enforced.
- The catalogue is **enumerated**: a missing translation fails the build, rather than
  rendering a key name in production.
- **Design for both text lengths.** Japanese and English differ in both directions.
- Japanese needs its own line-height scale and correct kinsoku line breaking.
- **Never localise a colour value.** `#263B3C` and `L 22 C 0.03 H 195°` are the same
  everywhere, and localising them would be actively harmful.

---

## Performance

- Route-level first-load JS budgets ([`slo.md`](../../../docs/operations/slo.md)),
  gated.
- The colour engine is imported only where it is used.
- Images: `next/image`, explicit dimensions, modern formats.
- Fonts: self-hosted, subset, `font-display: swap`.
- **No layout shift.** CLS budget is 0.05, and a swatch grid that reflows is both a
  performance and a perception failure.

---

## State

- Server state via the generated SDK, cached at the query layer.
- Client state local by default; lift only when genuinely shared.
- **URL state for anything shareable** — a filtered Atlas view, a comparison, a palette.
  These are things people send to each other.
- No global store for what a URL or a server can hold.

---

## Never

- A colour literal outside the token layer.
- A hard-coded user-facing string.
- `dangerouslySetInnerHTML` without sanitisation and a recorded reason.
- A `useEffect` that fetches what the server could have rendered.
- An interactive element without a focus indicator.
- A meaning carried only by colour.
