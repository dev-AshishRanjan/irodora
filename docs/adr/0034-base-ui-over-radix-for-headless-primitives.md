# ADR-0034 — Base UI, not Radix, for headless primitives

## Status

Accepted

## Date

2026-08-14

## Context

[ADR-0033](0033-frontend-foundation-own-the-token-layer-headless-primitives.md) settled that
we own the token layer and take component *behaviour* from a headless primitive library,
leaving the choice between Radix and Base UI open with a note to settle it before F-017.
[ADR-0018](0018-web-nextjs-react-tailwind-radix.md) had named Radix, written before Base UI
was a serious option.

Both are headless, accessible, and would work. The question is which one this product should
be standing on in three years.

What changed since ADR-0018:

- **Base UI shipped stable v1.0.0 in December 2025** and is at 1.7.0 with 6M+ weekly
  downloads.
- **It is built by the people who built Radix**, together with the MUI and Floating UI teams —
  Colm Tuite, Jenna Smith and others who authored Radix are now authoring this.
- **shadcn/ui switched its default primitive to Base UI on 3 July 2026.** New shadcn projects
  now choose Base UI over Radix roughly two to one.
- **Radix's release cadence slowed markedly after the WorkOS acquisition.** It is stable and
  maintained; it is not where new capability is landing.

## Decision

**Base UI (`@base-ui/react`) is the headless primitive library.** ADR-0018's naming of Radix
is superseded on this point; everything else in it stands.

Three reasons, in order of weight.

### 1. Radix has no combobox, and we need one

The Colour Finder is an R1 surface (F-021). Its search is a combobox over hundreds of corpus
entries — filterable, keyboard-navigable, with an interpretation panel attached.

Radix does not ship a combobox or a multi-select. Building an accessible one by hand is a
well-known way to produce something that *nearly* works: type-ahead, virtual focus,
`aria-activedescendant`, and screen-reader announcement of a filtered result count are all
easy to get subtly wrong, and our `a11y` gate blocks the build.

**Base UI ships both Combobox and Autocomplete.** That is not a convenience; it removes the
single most likely source of an accessibility defect in R1.

### 2. Our reference material is converging on it

Our token names are shadcn-compatible on purpose, so that tweakcn, efferd and coss blocks stay
usable as reference. **shadcn now defaults to Base UI**, and coss.com/ui — one of the
references that shaped this design system — is already built on it.

Choosing Radix would mean our reference material and our primitives drift apart over time, and
every borrowed block would need translating.

### 3. Where the maintenance is going

Radix is stable, which is genuinely valuable. But a design system is a decade-long commitment,
and the team that built Radix is now building Base UI with, in shadcn's phrasing, everything
they learned the first time. For a library we intend to build every surface on, that matters
more than current parity.

### What this changes in practice

| | |
|---|---|
| Composition | Base UI's explicit `render` prop replaces Radix's `asChild`. **We prefer this** — `asChild` silently forwards props to an unknown child, and an explicit render target is easier to reason about and to type |
| Components gained | Combobox, Autocomplete, Multi-select, Form, Toast — none of which Radix ships |
| `@irodora/ui` | Composes Base UI primitives; our tokens, our styling, our four compile targets. Unchanged by this decision |
| Mobile | Unaffected. Base UI is web-only, as Radix is; React Native takes its own primitives and shares only the token layer |

## Consequences

**Good.** Combobox and Autocomplete arrive accessible rather than hand-built, removing the
most likely `a11y` gate failure in R1. Our primitives and our reference material stay aligned
as shadcn, efferd and coss move to Base UI. Explicit `render` composition is easier to type
and to reason about than `asChild`. And we are on the library the Radix authors are actively
developing.

**Bad.** Base UI is younger — stable for roughly eight months against Radix's years in
production, so there is less accumulated edge-case hardening and a smaller body of
Stack Overflow answers. Migrating later would be real work, since primitives touch every
interactive component. Some existing shadcn examples in the wild are still Radix-shaped and
need translating. And we are changing a decision from ADR-0018 before writing a line of code
against it — which is the right time to change it, but is still churn.

**Neutral.** Both libraries are headless and unstyled, so this decision does not touch the
token layer, the design system, or anything in the manifest.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Radix** (as ADR-0018 named) | Battle-tested over years, enormous production usage, and entirely capable of everything except the two components we need most. No combobox is the specific problem; slowing cadence and diverging from our reference material are the general ones |
| **Radix + a separate combobox** (Downshift, Ariakit) | Keeps Radix's maturity and fills the gap. Two primitive libraries with two composition models and two focus-management philosophies in one component library is a seam we would maintain forever |
| **Build the combobox ourselves** | Full control. Type-ahead, virtual focus, `aria-activedescendant` and filtered-result announcement are exactly the things that look finished and fail a screen-reader test |
| **Wait and decide at F-017** | Deferring costs nothing today. But F-003 (design tokens) and F-002 (contracts) both benefit from knowing the target, and the evidence is already decisive |

## Revisit when

- Base UI's release cadence or maintenance materially changes.
- A required interaction pattern is absent from Base UI and present in Radix — the reverse of
  today's situation.
