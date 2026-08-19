# ADR-0018 — Next.js App Router, React 19, Tailwind v4, Radix primitives

## Status

**Superseded by
[ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md).** There is no
web surface. The first release is a mobile application only.

Previously: the primitive choice had been superseded by
[ADR-0034](0034-base-ui-over-radix-for-headless-primitives.md) (Base UI, not Radix). Both
records are retained for the reasoning; neither describes anything we now build.

**What survives into the mobile app** is the layer this record chose *below* the framework:
we own the token layer, and component behaviour comes from a headless primitive rather than
a styled kit ([ADR-0033](0033-frontend-foundation-own-the-token-layer-headless-primitives.md)).
The React Native equivalent of that choice is made when `@irodora/ui` is built.

## Date

2026-08-13

## Context

Web is the first surface (roadmap R1), and it carries four jobs that pull in different
directions:

1. **The Colour Atlas must be indexable.** It is the organic-acquisition surface — hundreds
   of colour pages that should rank for "藍鼠 hex" and "muted indigo". That requires server
   rendering.
2. **The Lens must run heavy client-side code** — camera access, per-frame pixel sampling,
   the colour engine.
3. **Accessibility is a gate, not a goal** (NFR-8). Component primitives must have correct
   keyboard, focus and ARIA behaviour by default, because we will be running axe against
   every route on every build.
4. **Performance is budgeted** (NFR-5), so the engine must load on the routes that use it,
   not globally.

## Decision

**Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · Radix UI primitives · TypeScript.**

1. **Server Components by default.** The Atlas, colour detail pages and palette pages are
   server-rendered and statically generated per corpus version — which makes them
   indexable and effectively free to serve.
2. **Client Components only where interaction requires it**, and the colour engine is
   imported only in those. The Atlas pages ship no engine code.
3. **Tailwind v4 consuming `@irodora/design-tokens`.** Tailwind v4's native OKLCH support
   matters here specifically: our tokens *are* OKLCH
   ([ADR-0020](0020-design-tokens-are-oklch-native.md)), and a framework that forced them
   through hex would defeat the point.
4. **Radix primitives** for dialogs, popovers, menus, tabs and selects — unstyled, with
   focus management, keyboard interaction and ARIA already correct. We style them; we do
   not reimplement their behaviour, because reimplementing it is how accessibility
   regressions get introduced.
5. **No component library with opinions about colour.** A colour product cannot inherit
   someone else's palette semantics.
6. **`next-intl` with an enumerated message catalogue** for en/ja
   ([ADR-0028](0028-i18n-en-ja-from-day-one.md)). Enumerated, so a completeness check can
   fail the build on a missing translation.
7. **Motion is used sparingly and honours `prefers-reduced-motion`.** For a product about
   precise colour perception, animation that shifts colours during a transition is actively
   harmful.

## Consequences

**Good.** Atlas pages are indexable and cacheable at the version-keyed edge. Route-level
code splitting keeps the engine off pages that do not need it. Radix gives correct
accessibility behaviour before we style anything, which meaningfully lowers the cost of
passing the `a11y` gate. Tailwind v4 speaks our token language natively.

**Bad.** Next.js has a fast release cadence and a real upgrade tax; App Router patterns are
still less settled than the pages model was. The server/client boundary is a genuine source
of confusion, and a misplaced `'use client'` can pull the engine into a page that should
ship none — which is exactly why the first-load budget is gated. Tailwind's class-heavy
markup is a readability trade some reviewers dislike.

**Neutral.** No CSS-in-JS. Tokens plus Tailwind cover the need without a runtime style cost.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Remix / React Router** | Excellent data loading and a simpler mental model. Weaker static generation for a large catalog, which is precisely the Atlas's shape |
| **Astro** | Ideal for the content-heavy Atlas — minimal JS by default. But the Lens, Palette Studio and Outfit Lab are genuinely application-shaped, and running two frameworks is worse than one imperfect fit |
| **SvelteKit** | Smaller bundles, excellent DX. The engine is framework-agnostic so it would work, but React is where the mobile surface already is and shared UI thinking has real value |
| **shadcn/ui wholesale** | Fast, good defaults, built on Radix anyway. Its colour semantics are opinionated in a way a colour product cannot inherit; we take the Radix layer beneath it instead |
| **MUI / Chakra** | Comprehensive and mature. Bring a full design language and a colour system we would fight constantly |

## Revisit when

- The first-load budget cannot be met within the App Router model.
- The Atlas and the application surfaces diverge enough that splitting them into two
  deployments is genuinely cheaper than one framework serving both.
