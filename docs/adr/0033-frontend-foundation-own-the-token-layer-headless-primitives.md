# ADR-0033 — We own the token layer; primitives stay headless; Astryx is not adopted

## Status

Accepted

## Date

2026-08-14

## Context

Meta open-sourced **Astryx** (July 2026) — a React design system with 150+ accessible
components, seven themes, a CLI and an MCP server, built on StyleX, MIT-licensed, eight
years internal at Meta powering 13,000+ apps. It was proposed as the frontend foundation,
with Next.js and Tailwind, and the question was put as a decision to reason about rather <!-- retired-ok: Describes the starting point the decision was made from. -->
than accept.

It deserves a serious answer, because the case for it is genuinely strong:

- 150+ components that are already accessible, against an `a11y` gate that blocks the build.
- **An MCP server** letting agents browse components, generate themes and pull structured
  docs — directly relevant to a product built by agents.
- The Tailwind integration is better engineered than expected: Astryx ships **pre-compiled
  CSS**, so StyleX's build plugin is not required, explicit `@layer` ordering lets Tailwind
  utilities win, and a `tailwind-theme.css` bridge registers Astryx tokens as native Tailwind
  utilities. That removes the "two styling engines fighting" objection almost entirely.
- Meta-scale battle testing, MIT, active.

Three objections survive that examination. One is decisive.

## Decision

**Do not adopt Astryx as the frontend foundation. Own the token layer completely, and keep
component primitives headless.**

### 1. The decisive objection: Astryx is web-only

[ADR-0020](0020-design-tokens-are-oklch-native.md) compiles one token manifest to **four
targets** — CSS custom properties, TypeScript, React Native, and a Tailwind theme —
specifically so that web and mobile cannot drift.

Astryx has no React Native story. Adopting it means the web app's components derive from
Astryx's token system while mobile derives from ours. **That is precisely the drift ADR-0020
exists to prevent**, and it would run down the middle of the product — mobile is where the
Lens is best ([ADR-0006](0006-camera-capture-vision-camera-and-getusermedia.md)), so the
split would put our most important surface on the far side of it.

### 2. Colour semantics are the product, and cannot be inherited

Astryx themes are npm packages supplying **all** design tokens — colour, spacing, radius,
typography — as CSS custom properties.

Irodora needs to own colour completely and in ways a general-purpose system has no reason to
support:

- a `swatch.*` token layer held to a **stricter neutrality ceiling** than general UI surfaces,
  because chrome adjacent to a sample changes how the sample reads;
- `--radius-swatch: 0` as an inviolable rule while every other radius is generous;
- `cvdPairs` asserted by our own `cvd` gate;
- a `contrast` gate reading our own manifest, in both themes.

We could author a custom Astryx theme package. Then we maintain that **plus** our manifest
**plus** the React Native target — cost rises, and what we get back is components we largely
do not need.

### 3. Beta at the foundation layer

CLI 0.1.6, beta. Breaking changes in a design system are expensive because they touch every
screen at once. R0's exit criteria include booting the full stack on a real VPS; taking a
beta dependency at the foundation is not where that risk belongs.

### What we do instead

| Layer | Choice |
|---|---|
| **Tokens** | Ours. OKLCh-native, shadcn-compatible **names** (`--background`, `--card`, `--muted-foreground`, `--border`, `--ring`, `--chart-1…5`, `--sidebar-*`) so the wider ecosystem's tooling — tweakcn, shadcn blocks, efferd blocks — remains usable as reference and as a starting point |
| **Primitives** | Headless. **Evaluate Base UI against Radix before F-017** — Base UI is the Radix / MUI Base / Floating UI convergence and is what coss.com/ui is built on. Either is acceptable; the decision is recorded when made |
| **Composition** | Ours, in `@irodora/ui`, from the component specification in the design brief |
| **Styling** | Tailwind v4 reading our token manifest |

### What we take from Astryx anyway

**Its best idea, which is not its components.** An MCP server that lets an agent browse the
design system, retrieve component documentation and generate a theme is directly aligned
with a repository whose harness is built for agents.

Recorded as a candidate for the backlog: expose `@irodora/design-tokens` and `@irodora/ui`
over MCP, so an agent building a surface queries the real system instead of inferring it from
examples. That is worth more to us than 150 components we would restyle.

### The counting argument

Components Astryx would give us that we actually need: buttons, inputs, tabs, dialogs,
tables, navigation, popovers — roughly fifteen, all available headless.

The four components that carry this product — **the swatch-in-well, the provenance pill, the
confidence meter, the separation readout** — exist in no library, because no other product
needs them.

## Consequences

**Good.** One token system serves web, mobile, and every export format. Colour semantics stay
ours, including the rules a general system would have no reason to encode. No beta dependency
at the foundation. shadcn-compatible naming keeps the ecosystem's tooling available — efferd
and coss blocks remain usable as reference material. Headless primitives are lighter against
a hard first-load budget.

**Bad.** We build and maintain more component surface than adopting Astryx would require, and
we forgo 150 pre-built accessible components — a real cost against a blocking `a11y` gate,
mitigated but not erased by taking behaviour from headless primitives rather than
reimplementing it. We give up Astryx's MCP server unless we build our own equivalent. If
Astryx adds React Native support and a documented full-palette replacement path, objections
1 and 2 both weaken and this should be revisited.

**Neutral.** shadcn-compatible token naming is deliberate compatibility, not adoption of
shadcn as a dependency.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Adopt Astryx fully** | Best components-per-effort of any option, genuinely good Tailwind integration, and an MCP server we want. Web-only, so it splits the design system down the middle of a product whose most important surface is mobile; and its theme packages own the colour semantics that are this product's substance |
| **Astryx for web, our tokens for mobile** | Keeps the components. Two token systems is the drift ADR-0020 exists to prevent, and the drift would be invisible until someone compared the same colour on two devices |
| **Astryx as headless primitives only** | Would work. Wastes most of what Astryx is, while adding StyleX as a peer dependency — Radix or Base UI does the same job lighter |
| **MUI (Material 3)** | Comprehensive, mature, and M3's tonal-elevation model is genuinely well-suited here. But M3's **dynamic colour derives a UI palette from a source colour** — which for a colour product would tint the entire interface from the content being examined. Fatal, and not a setting we would want to spend the rest of the project defending |
| **shadcn/ui wholesale** | Fast, good defaults, Radix underneath. Its colour semantics are opinionated in a way a colour product cannot inherit — so we take the token *naming* and the primitives, and leave the palette |

## Revisit when

- Astryx ships React Native support **and** a documented path to full palette replacement.
- Astryx reaches 1.0 with a stability commitment.
- Maintaining `@irodora/ui` measurably slows delivery against a component set we could have
  adopted.
