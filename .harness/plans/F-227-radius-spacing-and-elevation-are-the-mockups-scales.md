# Plan: F-227 — Radius, spacing and elevation are the mockups' scales

| | |
|---|---|
| **Feature** | F-227 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-25 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `@irodora/design-tokens` · `@irodora/ui` · `apps/mobile` |
| **Author** | implementing session (no planner subagent — the scope is mechanical and fully specified) |
| **Date** | 2026-09-15 |

---

## Intent

The product's corners, whitespace and depth become the README's: radius `sm 6 · md 10 · lg 16 · pill`,
spacing `xs 4 · sm 8 · md 16 · lg 24 · xl 32 · xxl 48`, swatch corners at the steps F-220 measured and
bound in the inventories, and elevation the tonal levels — plus the one shadow a mockup draws, on
`25`'s light cards. Done, to a person: every screen's gaps and corners come from six and four numbers
the mockups use, and nothing is drawn at a value between them.

## Approach

**Reused:** the manifest and its emitters (`generate-design-tokens.mjs`), `nativeSpacing` /
`nativeRadius` / `nativeElevation`, `SpacingStep`, `swatchCorner` and its concentric keyline and well
arithmetic, `verify-spacing-scale.mjs` and `verify-token-reach.mjs` with their proofs (they read the
manifest, so they read the new scales without code changes), `unreached-tokens.json`.

**The hazard this plan is built around — F-103's, one level up.** The README's names collide with
today's: `md` is 12 now and 16 after; `lg` is 16 now and 24 after; radius `sm` is 10 now and 6 after.
About 200 JSX props (`gap="md"`, `padding="lg"`), 92 `nativeSpacing.*` reads, 26 `nativeRadius.*`
reads and 10 component defaults name a step, and **every one of them still compiles after the
rename** while meaning a different number. So the migration is table-driven and audited per call site:

| today | value | snaps to (§2) | new name |
|---|---|---|---|
| spacing `xs` | 4 | 4 | `xs` |
| spacing `sm` | 8 | 8 | `sm` |
| spacing `md` | 12 | 8 (tie → smaller) | `sm` |
| spacing `lg` | 16 | 16 | `md` |
| spacing `xl` | 20 | 16 (tie → smaller) | `md` |
| spacing `xl2` | 28 | 24 (tie → smaller) | `lg` |
| spacing `xl3` | 40 | 32 (tie → smaller) | `xl` |
| spacing `xl4` | 56 | 48 | `xxl` |
| spacing `xl5` | 96 | 48 (the top step) | `xxl` |
| radius `xs` | 6 | 6 | `sm` |
| radius `sm` | 10 | 10 | `md` |
| radius `md` | 14 | 16 | `lg` |
| radius `lg` | 20 | 16 | `lg` |
| radius `xl` | 28 | 16 (the top length) | `lg` |
| radius `pill` | 999 | 9999 | `pill` |

The snap rule is the contract's, not a new one: R9-MOCKUP-FIDELITY §2 — *"a measured value snaps to
the nearest step of the R9 scale; where two steps are equally near, the smaller is taken"*. Every
removed spacing step except 56 and 96 sits exactly between two new ones, so the tie rule decides most
of the table, and it is applied as written.

**New:**

- **A one-shot migration script, kept in the session scratchpad rather than committed.** It finds every
  step reference — member access on `nativeSpacing` / `nativeRadius`, and the step-typed props
  (`gap`, `padding`, `padY`, `radius`) as JSX props, object keys and parameter defaults — rewrites it
  through the table, and fails on any rewrite whose new value is not the snap of the old one or any
  reference it cannot classify. *Why not committed:* after it runs, the old names no longer exist, so a
  re-run would migrate the already-migrated names a second time; a committed script that must refuse
  to run is dead code. Its before-and-after report is quoted in progress.md, and the diff is
  reviewable line by line against the table above.
- `swatchCorner(size, step = 'sm')`: the sample's corner is the scale step, **held under ADR-0094's
  ratio ceiling** (`min(step, ⌊0.25 × size⌋)`), keyline and well concentric as today. `Swatch` gains
  `corner?: 'sm' | 'md'`. The default is `sm`, the step most drawn swatches carry in the inventories
  (42 `sm`, 25 `md`); surfaces set `md` where their inventory binds it (F-242 onward).
  `SWATCH_MAX_CORNER` goes: the top of the scale is no longer a sample's cap, the step is.
- `elevation.shadow` in the manifest: **light, level 1 only**, the one shadow any mockup draws — `25`'s
  cards, measured from the render (a falloff of about 10 px below the card and 5–7 px at the sides,
  darkest ≈ 3 % at the sides and ≈ 9 % below it against the washi ground). Its ink is the existing
  `foreground` token at a declared opacity, so the colour resolves to a token. The parser keeps
  refusing a shadow anywhere else. `Card` and `Surface` draw it through `boxShadow` when the theme's
  mode is light and the level is 1.
- **ADR-0103** amends ADR-0074 (the values; its four-point rule and named steps stand), ADR-0090 and
  ADR-0094 (a corner is a scale step, and the ratio becomes its ceiling rather than its value), and
  ADR-0044 (a shadow exists exactly where a mockup draws one: light, level 1).

**Increments** — each leaves the build green:

1. **Record before building**: ADR-0103 and its index row; the plan; the claim.
2. **The audit, before anything moves**: `scale-migration.mjs` in report mode over today's tree; its
   inventory of references committed as the plan's evidence of scope.
3. **The scales**: manifest radius and spacing; parser checks (steps multiples of the base, radius
   steps increasing, the swatch ratio still ≤ 0.25); regenerate; the migration applied; `--check`
   green; design-tokens, ui and app tests updated where they pin a step value.
4. **The swatch corner**: `swatchCorner(size, step)`, `Swatch.corner`, `swatch-corners.test.tsx`
   rewritten around the step and the ceiling, with decoys.
5. **The light shadow**: manifest, parser, emitter, `Card` / `Surface`, tests — dark stays shadowless,
   light level 2 and 3 stay shadowless, a decoy shadow on a dark card is refused.
6. **The scanners**: `verify-spacing-scale --prove`, `verify-token-reach --prove`; any new step no
   reference reaches (`lg` 24 is the likely one) declared in `unreached-tokens.json` with its reason.
7. **Effects and the record**: effect links, docs quoting the old scale, `progress.md`.

## Mockup fidelity

- **Governing mockups:** the README scales (all 28 images); `25` for the light shadow; the inventories'
  `tokens.radius` per element for which step each drawn element takes.
- **Inventory:** no element is placed here. The scales are what every surface feature builds from;
  `ui:Swatch` is bound `sm` (42) or `md` (25) across the inventories, `ui:Card` mostly `md`.
- **Bindings:** none — no value reaches a screen from here that a mockup prints.
- **Departures:** none. The migration moves today's (pre-R9) screens onto the scale by §2's own snap
  rule; those screens are rebuilt to their mockups by F-242 onward and removed by F-269.

## Files to touch

```
docs/adr/0103-*.md; docs/adr/README.md; ADR-0074, 0090, 0094, 0044 status lines
docs/design/design-system.manifest.json           radius, spacing, elevation.shadow
packages/design-tokens/src/manifest.ts; emit/*; generated/*   parse, emit
packages/design-tokens/test/*                      pinned values
packages/ui/src/Swatch.tsx, Card.tsx, Surface.tsx, feedback.tsx, layout.tsx; ui tests
apps/mobile/src/**                                 the migrated references
scripts/scale-migration.mjs                        new — migrate and audit
.harness/verification/unreached-tokens.json        a step nothing reaches yet
docs/design/R6-EDITORIAL-DIRECTION.md              quotes the old scale
.harness/state/effects.json; memory/effects/*; progress.md
```

## Anticipated effects

1. **The manifest's radius and spacing** → every emitter, `nativeSpacing` / `nativeRadius`, the CSS and
   Tailwind targets, every component and screen. Guards: `generate-design-tokens --check`, typecheck
   (renamed steps `xl2`–`xl5` and radius `xs`/`xl` fail to compile), `scale-migration --check` for
   the names that survive with new meanings, the spacing scanner.
2. **Swatch corners** → every sample in the product; the concentric keyline and well. Guard:
   `swatch-corners.test.tsx` (the ceiling at small sizes, the step at large ones, concentricity).
3. **A shadow where there was none** → `Card`, `Surface`, the conformance suite's colour check
   (`shadowColor` is read; a `boxShadow` ink is a token by construction). Guard: parser refusal
   elsewhere, component tests in both modes.
4. **Token reach** → a step with no reader fails gate 8. Guard: `verify-token-reach` and its proof.
5. **Snapshots and layout tests** that pin a pixel value. Guard: the test suite, each update read
   against the table rather than accepted wholesale.

## Test plan

- **Unit / property:** `scale-migration --check` over the tree (every reference's new value = snap of
  its old, none unclassified), with planted decoys — a reference left at `md` meaning 12, one renamed
  to the wrong step — watched failing; `swatchCorner` at every size 16–400 (step or ceiling, never
  above either, keyline and well concentric); parser refusals (a step off the base, radius steps out
  of order, a ratio above 0.25, a shadow on a dark theme or on level 2).
- **Golden / conformance:** the ui conformance suite in both themes; no colour maths changes.
- **E2E:** none — no journey changes.
- **Negative:** dark cards carry no shadow (asserted on the rendered tree); no spacing literal off the
  scale (scanner); no step unreached without a declaration (token reach).

## Verification

```
node scripts/verify-state.mjs
corepack pnpm typecheck && corepack pnpm lint && corepack pnpm format:check
corepack pnpm build && corepack pnpm test
corepack pnpm test:a11y && corepack pnpm test:contrast
node scripts/scale-migration.mjs --check
node scripts/verify-spacing-scale.mjs --prove && node scripts/verify-token-reach.mjs --prove
```

Each captured in its own variable, on the root commands
([[a-package-gate-is-not-the-repository-gate]]).

## Risks and open questions

- **The light shadow's numbers are read from a JPEG.** They are recorded as derived, with the pixel
  profile, the same way F-220 records its readings; a person comparing F-221's captures may refine them.
- **The old screens change visibly** — `gap="md"` tightens from 12 to 8 in 28 places. That is the scale
  applied by the contract's rule, to screens that are being rebuilt; it is recorded, not hidden.
- No open question blocks this feature.

## Out of scope

Component-by-component radius and padding choices for rebuilt surfaces (F-232–F-236 and the screen
features set them from their inventories); the colour tokens and themes (F-225, blocked on OQ-36);
motion (F-266).
