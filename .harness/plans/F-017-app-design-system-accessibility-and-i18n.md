# Plan: F-017 — App design system, accessibility and i18n

| | |
|---|---|
| **Feature** | F-017 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-9, NFR-11 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `@irodora/ui` · `@irodora/design-tokens` |
| **Author** | planner subagent, reviewed and owned by the implementing session |
| **Date** | 2026-08-20 |

---

## Intent

Give the app a component layer that cannot express an inaccessible interface, and a message
catalogue that cannot ship a missing translation. To a user: every control has a name a screen
reader announces, every status is colour **and** icon **and** word, the interface reads in
Japanese as a Japanese interface rather than English with different glyphs, and both themes are
equally finished.

To the repository: three debts that have printed *"lands with F-017"* on every gate run since
F-003 stop printing, because the thing they needed — a rendered tree — now exists.

## The contract was rewritten before this plan was written

F-017's acceptance criteria named Next.js 16, Server Components, axe, and a `web-perf` gate
absent from [`gates.json`](../verification/gates.json) — all retired by
[ADR-0051](../../docs/adr/0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md).
They are rewritten in increment 1. `docs/PRD.md` FR-20 and FR-50 were corrected in the same
sweep, and F-074 records the guard that should have caught it.

**`e2e` is removed from `verification`.** `pnpm test:e2e` exits 1 by design while no surface
declares the script — verified by running it. Leaving it listed makes the feature uncloseable.

## Three readings chosen where the requirement is ambiguous

1. **"Every component defines default, focus, active, disabled, loading, error and empty
   states."** Applied literally to `Text`, five of seven are meaningless. Read as: each
   component declares a **kind** — `interactive` · `data` · `static` — and the required state
   set derives from the kind. The kind is the only lever, so a component cannot shorten its
   list, only claim a kind, which is reviewable and printed by the conformance registry.
2. **"Zero violations on every screen."** There is one screen. Read as an invariant over
   whatever screens exist, enforced by a scope reporter that **fails on zero subjects** and
   prints what it covered — the shape of [`e2e-scope.mjs`](../../scripts/e2e-scope.mjs).
   A gate that passes over an empty set is failing open.
3. **"Font fallback declared."** React Native has no font fallback chain; `fontFamily` takes
   one family and there is no cascade. Read as: bundle a font whose coverage we can check, or
   name the platform font and make coverage a device attestation. **ADR-0057 decides which,
   and that choice decides whether criterion 4a is gated or attested.**

## Approach

**Reused — this section is most of the design.**

| Exists | What it does for F-017 |
|---|---|
| `design-system.manifest.json` | The single source. Nothing here declares a value; everything derives. |
| `emit/react-native.ts` + `generated/native.ts` | The RN target exists and is byte-compared. F-017 **extends** it with typography, elevation, motion, `defaultTheme` — it does not add a target. |
| `TEXT_TOKENS` / `LARGE_TEXT_TOKENS`, `TextToken` / `LargeTextToken` | Derived from the manifest's `usage`. Raw material for making `foreground.3` on small text a **typecheck** error, not only a runtime finding. |
| `statusPresentation()` (`status.ts`) | NFR-9 already structural — three channels or it does not compile, throws on a whitespace label. `Status` composes it rather than re-deriving the rule. |
| `test/status-types.test.ts` | The existing pattern for asserting something **fails `tsc`**. The `Text` size×token negative case reuses it. |
| `verify-contrast.mjs` + `verify-contrast-proof.mjs` | Gate 9 and its mutation proof. The two debts extend them. |
| `verify-claims.mjs` | Copy lint already covers `.ts/.tsx`. New strings pass through free. |
| `verify-guards.mjs` | The mechanism for proving a new ESLint rule fires. Every new rule gets a guard — a rule nobody has watched fail is configuration that parses. |
| `@irodora/color-difference` | WCAG + APCA. The rendered checks compute through the same functions gate 9 uses. No second contrast implementation. |

**New:** `@irodora/ui` retargeted to React Native (`ThemeProvider`/`useTheme`, `Text`, `Icon` +
registry, `Status`, `Surface`, `Button`, `Swatch` — seven, with a stated reason for stopping) ·
`@irodora/ui/testing`, the conformance suite, exported so `apps/mobile` runs the *same* suite ·
`apps/mobile/src/i18n/` · `scripts/a11y-scope.mjs`, `verify-a11y-proof.mjs`,
`verify-font-coverage.mjs` · ADRs 0054–0057.

### Decisions that need an ADR

- **ADR-0054 — React Native primitives; what `@irodora/ui` is now.** ADR-0034 chose Base UI,
  which is web-only; ADR-0033's argument for headless was ARIA and focus management, neither of
  which exists on RN, where the accessibility tree *is* the platform's. Take seriously: RN core
  primitives · `@rn-primitives/*` · Tamagui/gluestack (they own the token layer — the objection
  ADR-0033 already sustained against Astryx, verbatim) · `@expo/ui` (best accessibility story,
  worst styling story, since our design is a token contract platform widgets will not honour).
  Settles `packages/ui` vs `apps/mobile/src/ui` — the same question. Must correct
  `packages/ui/package.json`, which says "composed over Base UI" and `private: false`.
- **ADR-0055 — what satisfies the `a11y` gate with no DOM and no device.** RNTL under Vitest via
  a bridge plugin (beta — exactly what ADR-0033 §3 objected to at the foundation, mitigated by
  it being a harness devDependency) · `jest-expo` + a second runner · a hand-rolled Babel/Vite
  plugin · `react-test-renderer` snapshots (**rejected**: deprecated in React 19, and
  `testing.md` bans snapshots — a wrong implementation snapshots its wrongness and defends it) ·
  `eslint-plugin-react-native-a11y` (a fast net, **not** a gate: static analysis cannot see
  composition) · Maestro/Detox (the only thing that sees focus order under a real screen reader
  — needs a device, therefore **attested**). The ADR must state the honest boundary: **it proves
  the accessibility tree, not the pixels.** There is no Yoga layout in a JS render tree, so
  overflow, occlusion and measured tap-target size are invisible. That sentence goes in the
  gate's own output on every run.
- **ADR-0056 — the message catalogue is enumerated TypeScript, not a runtime i18n framework.**
  ADR-0028 forbids fallback and i18next's core behaviour *is* fallback — turning it off is
  configuration, and configuration can be turned back on. `ja` typed
  `Record<MessageKey, string>` with `MessageKey` derived from `en` makes a missing **or extra**
  key a typecheck failure, which is stronger than any script. Alternatives: i18next · Lingui
  (compile-time extraction and real ICU — the best argument against hand-rolling, since English
  plurals are what we lose) · FormatJS · `i18n-js`. Also owes ADR-0028's post-ADR-0051
  amendments: §2 (server responses carry keys) retired, §5 `Accept-Language` → device locale via
  `expo-localization`, §6 locale-in-cache-key moot. Records that persistence is F-041's, so
  F-017 ships device-locale + in-session override.
- **ADR-0057 — Japanese type: bundled subset vs platform font.** A **licensing** decision (Noto
  Sans JP is OFL; `content/AGENTS.md` governs recording it), an **app-size** decision (full CJK
  is megabytes per weight), and decisively it decides whether **criterion 4a is gated or
  attested**: bundled ⇒ parse the font `cmap` and assert coverage over the corpus kanji;
  platform font ⇒ verifiable only on a device, on every OS version, forever. Also settles the
  Latin face — DESIGN-SYSTEM.md still says "Geist … licensing and self-hosting to confirm",
  which nobody has confirmed.

### Increments

Each leaves the build green at its boundary. Two go deliberately red mid-increment; that red run
is the evidence and is captured before the fix.

1. **Decisions and corrections. No source touched.** Four ADRs; rewrite `acceptance`; declare
   `attested`; drop `e2e` from `verification`; correct the stale design contracts listed below.
   → `node scripts/verify-state.mjs && pnpm format:check` + a full gate sweep proving nothing
   moved.
2. **Typography, elevation, motion, `defaultTheme` reach React Native (E-007).** `parseManifest`
   gains four blocks it ignores entirely; `emitReactNative` emits them. **The unitless CSS
   line-height cannot be copied across** — RN's `lineHeight` is absolute points, so `1.65` means
   1.65 pixels and produces silently unreadable text. The emitter computes absolute line heights
   per (scale step × script) and converts `-0.04em` tracking to points. Tests: emit byte-compare;
   ja line-height strictly greater than latin at every step; the `letterSpacing` conversion
   asserted against the em value, not against itself.
   → `pnpm --filter @irodora/design-tokens test && pnpm test:contrast && pnpm build`
3. **The render harness, proven before any component exists.** `packages/ui` retargeted; the
   bridge; tree walkers (`resolveTextNodes` modelling RN text-style inheritance,
   `resolveColor -> token | UNRESOLVED`, `pressableNodes`); fixtures — one compliant, four decoys
   — and the assertions that separate them. → `pnpm --filter @irodora/ui test`
4. **`ThemeProvider`, `Text`, `Icon` + registry, `Status`.** `Text` takes `size` and `color`
   under a conditional type so `<Text size="small" color="foreground.3">` **does not compile**.
   The icon registry must cover every `iconToken` in the manifest, asserted **in both
   directions** — today `icon.check`, `icon.alert`, `icon.cross` resolve to nothing.
   `ThemeProvider` falls back to the manifest's `defaultTheme` (`dark`), not `'light'` as
   `_layout.tsx` does today. → `pnpm --filter @irodora/ui test && pnpm typecheck`
5. **`Surface`, `Button`, `Swatch`, and the state conformance suite.** The assertion that earns
   the suite: **rendered trees must differ between declared states.** A component returning the
   same tree for `default` and `disabled` has defined the state in name only, and a decoy that
   declares every state and renders identically must be rejected.
   → `pnpm --filter @irodora/ui test`
6. **The two contrast debts land; the app screen goes red, then green.** `packages/ui` and
   `apps/mobile` declare `test:contrast`, so `turbo run test:contrast` picks the rendered half
   up with no root-script change. Run it: **`apps/mobile/app/index.tsx` fails immediately** —
   `styles.mono` is `fontSize: 13` with `theme['foreground.3']` and `styles.body` is
   `fontSize: 14` with the same token, against a `largeText` token restricted to >= 18.66 px.
   Capture that output; then rebuild the screen on the library. Permanent decoys stay in
   fixtures so the check keeps being exercised after the real defect is gone.
   → `pnpm test:contrast && node scripts/verify-contrast-proof.mjs`
7. **i18n.** Catalogue, resolver, completeness, unused-key scan, ja review-status record, the
   raw-string lint + guards, every string migrated.
   → `pnpm lint && node scripts/verify-guards.mjs && pnpm test && pnpm typecheck`
8. **The colour-literal lint** (+ the "no animated colour" rule from `motion.md` if it survives
   scope pressure; if not, it is **filed as a feature**, not left as a note).
   → `pnpm lint && node scripts/verify-guards.mjs`
9. **Japanese typography and the font.** Per ADR-0057. `verify-font-coverage.mjs` with a decoy
   codepoint; `lineBreakStrategyIOS` / `textBreakStrategy` asserted as passed; visual result
   attested. → `node scripts/verify-font-coverage.mjs && pnpm test:a11y`
10. **Gate 8 activates, last.** `a11y-scope.mjs`; `gates.json` → `active` **with `ciStep: true`**
    and a real step in `ci.yml`; `verify-a11y-proof.mjs` plants violations and watches each fail;
    `pnpm verify:mirror` watched removing the new step and failing gate 0. **A gate activates
    after it has been executed and seen to fire, never before.**
11. **Record and close.** `effects.json` + memory notes; `progress.md`; `feature_list.json`;
    move `claims.json`'s `provenanceLanguage.activatesWith` to F-040 with its reason.

## Files to touch

```
docs/adr/0054..0057-*.md                        NEW — the four decisions
docs/adr/README.md                              index (the state gate compares it to the files)

docs/design/DESIGN-SYSTEM.md                    component contract names hover/focus-visible and
                                                "Radix or Base UI" and "ship with axe assertions";
                                                verification table names the absent `web-perf`
                                                gate and "axe on every route"; "Still open:
                                                Primitives — settle before F-017"; "Fonts: Geist
                                                ... licensing to confirm"; "Default theme on first
                                                visit" is decided in code, unrecorded, and
                                                decided WRONG (`?? 'light'` vs defaultTheme dark)
docs/design/ACCESSIBILITY.md                    A1 "every route, web and mobile"/axe; A4 "every
                                                journey completes by KEYBOARD alone" — there is
                                                no keyboard on a phone, and it will be dropped
                                                rather than met unless rewritten; A6
                                                prefers-reduced-motion -> AccessibilityInfo; A8
                                                NVDA (no Windows surface); section 5's
                                                `<div role="img">` example; section 6 arrow keys;
                                                section 7 axe + keyboard e2e
docs/design/DESIGN-BRIEF.md                     web-first surfaces; "Priority 3 — R3 mobile";
                                                ~1200px content max; hover in the state list
docs/design/design-system.manifest.json         typography.families are CSS stacks (unusable on
                                                RN); swatch.hairline.role says the two-tone
                                                treatment is "F-017 work" while its own
                                                uncheckedReason says F-068 — two owners, one
                                                obligation, same token (F-068 owns correcting it)

packages/design-tokens/src/manifest.ts          parse typography, elevation, motion, defaultTheme
packages/design-tokens/src/emit/react-native.ts absolute line-heights; tracking in points
packages/design-tokens/src/generated/native.ts  regenerated, never hand-edited
packages/design-tokens/test/*.test.ts           inline fixtures gain the new required fields —
                                                their breaking is the guard working

packages/ui/package.json                        private:true; react/react-native peer deps;
                                                description still claims Base UI
packages/ui/src/**                              the seven components + theme
packages/ui/src/testing/**                      the conformance suite, exported at ./testing
packages/ui/test/fixtures/**                    the decoys (allowlisted for the colour-literal
                                                lint by explicit path, never by glob)

apps/mobile/app/_layout.tsx                     ThemeProvider; defaultTheme fallback
apps/mobile/app/index.tsx                       rebuilt on the library; the foreground.3 defect
apps/mobile/src/i18n/**                         NEW — en, ja, keys, resolver
apps/mobile/package.json                        test:a11y, test:contrast, expo-localization
apps/mobile/vitest.config.ts                    NEW — the RN bridge

eslint.config.mjs                               NEW zones for packages/ui and apps/mobile.
                                                REPEAT no-restricted-imports in each — a later
                                                flat-config object REPLACES a rule per key
scripts/verify-guards.mjs                       one guard per new rule
scripts/verify-contrast.mjs                     "apps/web is a stub until F-017" names a
                                                directory that no longer exists; the
                                                "NOT CHECKED HERE" line must say what covers it
scripts/verify-contrast-proof.mjs               cases for both new checks
scripts/a11y-scope.mjs                          NEW
scripts/verify-a11y-proof.mjs                   NEW
scripts/verify-font-coverage.mjs                NEW
.harness/verification/gates.json                gate 8 -> active, ciStep true; description still
                                                says "asserted inside the app e2e run"
.github/workflows/ci.yml                        the Gate 8 step, replacing the comment saying it
                                                deliberately has none
.harness/verification/claims.json               provenanceLanguage.activatesWith -> F-040
.harness/rules/common/testing.md                e2e section: "real browser", "axe on every route"
.harness/rules/frontend/motion.md               the CSS reduced-motion block; CLS budget
.harness/skills/build-ui/SKILL.md               "Radix or Base UI"; text-wrap: balance; 65ch
                                                measure; "44px, on web too"; `pnpm test:perf`,
                                                which is not a script that exists
```

## Anticipated effects

**E-007 — the manifest now reaches components.** F-017 adds four blocks to the parser and the RN
target, so a token edit changes five things. **`@irodora/ui` must be added to E-007's `to`
list**: a token *rename* now breaks components with no import edge to show it. Guards:
`gate:contrast` (the parser must load the manifest for gate 9 to run at all),
`packages/design-tokens/test/emit.test.ts` (byte comparison — a skipped regenerate is loud), and
the new rendered-surface checks.

> The design constraint that makes the last guard real: **the rendered checks read
> `LARGE_TEXT_TOKENS` and `statusPairing` from the generated exports, never a hard-coded
> `'foreground.3'` or the three status names.** A hard-coded list means the next `largeText`
> token is unchecked and nothing says so — precisely the defect DESIGN-SYSTEM.md records
> against the first `foreground.3` attempt.

**NEW — E-016: the catalogue's key set is a contract with every render site.**
`apps/mobile/src/i18n/en.ts` -> `ja.ts`, every call site, the completeness test, **and the font
coverage check** — a new Japanese string can introduce a kanji the bundled subset lacks, and the
failure is a tofu box on a device with every gate green. Guards: `gate:typecheck` (the key
union), `apps/mobile/test/i18n.test.ts`, `script:verify-font-coverage.mjs`. Severity: high.

**NEW — E-017: the bundled Japanese font is a contract with the corpus.** `content/colors` -> the
font asset, the ja catalogue, the coverage check. A corpus publish adding a rare kanji (蘇芳, 纁)
silently produces tofu in exactly the product's most important content, for exactly the audience
whose endorsement matters most. Guard: `script:verify-font-coverage.mjs`, run inside
`gate:content` because its trigger is a corpus change. **If ADR-0057 chooses the platform font,
this link's guard is `none` and the honest move is to file the feature that adds one** — not to
downgrade the severity. That consequence is an argument inside ADR-0057.

**Watch, not yet a link:** `statusPairing.iconToken` -> the icon registry. Those three strings
point at nothing today. Once the registry exists, the both-directions completeness test is the
guard; fold it into E-007 rather than minting a link for a check one function away.

## Test plan

- **Conformance (load-bearing).** One suite, exported from `@irodora/ui/testing`, run over every
  component × every declared state × both themes × both locales. Asserts: an accessible name
  that is non-empty and is **not the component's own type name** ("swatch" is what
  ACCESSIBILITY.md section 5 exists to forbid); `accessibilityRole` on anything pressable;
  `accessibilityState.disabled`/`.busy` matching the declared state; declared tap-target style
  >= 44; no `allowFontScaling={false}`; every rendered colour resolving to a manifest token;
  **and the rendered trees for two different declared states differing.** The suite carries a
  broken fixture it must reject.
- **Property:** the cross-product is small enough to **enumerate**, which is stronger than
  sampling it.
- **Golden:** none new. WCAG/APCA come from `@irodora/color-difference`, already golden-checked.
  The corpus kanji are the font check's data — a *coverage* set, and it must refuse to pass over
  an empty one while F-012 is blocked.
- **E2E:** none. Gate 7's subject is journeys; its charter items belong to F-018/F-040.
- **Negative, each with a decoy rather than an empty fixture:** a status with no icon; with an
  icon and no text; with a whitespace label; **`foreground.3` at 13 px, which exists in the
  repository right now** — so the first run is a real red on real code, with a synthetic decoy
  kept behind; a component declaring all states and rendering identically; a ja string equal to
  its English value (a copy-paste placeholder); a key declared and never referenced; a codepoint
  absent from the font subset; a colour literal at each new lint's target path.

**Assertions that would pass whether or not the code is right — reject these in review:**

1. `expect(Object.keys(en)).toEqual(Object.keys(ja))` where `ja: Record<keyof typeof en, string>`.
   The type makes them equal by construction; the runtime test **cannot fail**. What
   discriminates: no ja value identical to its en value outside a short explicit list (`"OKLCh"`),
   and every declared key referenced at a call site.
2. A colour-only-status scan that looks for a marker prop the component supplies. Self-fulfilling
   — a component that forgets the marker is invisible to the check. What discriminates: scanning
   for *resolved colour values equal to a `status.*` token*, so a component cannot opt out.
3. A rendered-contrast check that **skips** a colour it cannot resolve. That fails open on
   exactly the case the colour-literal lint exists to catch. Unresolved must be a failure.
4. "Every component declares its states", read from a self-declared array.
5. `toBeDefined()`/`toBeTruthy()` on a render result; any component snapshot (`testing.md` bans
   the latter outright).
6. An a11y walk over a tree with no interactive nodes. Hence the minimum-subject assertion.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:contrast && node scripts/verify-contrast-proof.mjs
pnpm test:a11y   && node scripts/verify-a11y-proof.mjs
node scripts/verify-font-coverage.mjs
node scripts/verify-guards.mjs && pnpm verify:mirror
```

**Evidence to capture:** the gate sweep; the red run of the small-text check against
`apps/mobile/app/index.tsx` **before** the fix, quoted verbatim; each planted a11y violation and
the rule it fired; the mirror check failing when the Gate 8 step is deleted; the font coverage
count printed beside the authored-corpus-entry count, so a green run over an empty corpus cannot
be read as coverage.

### Gated versus attested (ADR-0038)

| Criterion | Kind | Proof / activity |
|---|---|---|
| 1 — components consume tokens; lint fails on a raw colour | **Gated** | `lint` + a guard |
| 2 — all states; platform a11y props not reimplemented | **Gated** | conformance suite + rejected fixture; a lint ban on `PanResponder`/`onResponder*` in `packages/ui` |
| 3 — enumerated catalogue; missing/extra fails the build; hard-coded string fails lint | **Gated** | `typecheck` + i18n test + `lint` + guard |
| 3b — **the Japanese is written, not machine-translated** | **Attested** | review by a competent speaker against a roster id (ADR-0047). **Blocked on OQ-5**, as F-012 is |
| 4a — Japanese line-height scale applied; font coverage | **Gated** *if ADR-0057 bundles* | render test + `verify-font-coverage.mjs` |
| 4b — **on-device kinsoku line breaking** | **Attested** | a device run on iOS and Android against a fixed string set (a line ending in a Japanese comma; a small kana at a line start) |
| 5 — a11y gate, zero violations on every screen | **Gated** | gate 8 |
| 5b — VoiceOver/TalkBack; text at 200 % without loss | **Attested** for layout. The gated part: no component disables font scaling, and every text declares a multiplier >= 2 — the render tree has no Yoga layout, so clipping is invisible to it |
| 6 — the two contrast debts | **Gated** | gate 9's new half + its mutation proof |

## Risks and open questions

**OQ-5 blocks part of this feature.** "Japanese editorial reviewer — engagement model" is open,
dated R1, and already blocks F-012. The catalogue *mechanism* is buildable and gateable now; the
*quality* of ~100 Japanese strings is not, and ADR-0028 plus `i18n-copy` forbid shipping machine
translation without review. Handling: build the mechanism, ship draft ja, record
`reviewedBy: null` machine-readably, print the unreviewed count on every run, declare 3b attested
against the release. What must **not** happen is *"a missing translation fails the build"*
quietly becoming *"an unreviewed translation passes silently"*.

**Testing a component library with no device.** The gate sees the accessibility tree, not pixels,
layout, focus order under a real screen reader, or text clipped at 200 % — roughly the half
ACCESSIBILITY.md section 7 already says automated tools miss. Mitigation: print the boundary on
every run and keep the device half attested and visible, rather than letting a green gate imply
coverage it does not have.

**A beta dependency at the foundation.** ADR-0033 section 3 rejected Astryx partly for this. The
bridge is a harness devDependency; if it breaks we lose a gate, not the app — but a gate we
cannot run is a gate failing open, so the harness must fail loudly rather than skip, and the
`jest-expo` fallback must be named in ADR-0055 *before* it is needed.

**`packages/ui` vs `apps/mobile/src/ui`.** With one surface the package's original justification
is gone. It still buys a lint zone where "no colour literal" and "no user-facing string" are
*total* bans rather than judgement calls, an enforced dependency direction, and a home for a
conformance suite the app also runs. Recommendation: keep it and say why in ADR-0054 — moving it
into the app later is cheaper than the reverse. **Standing hazard: `@irodora/ui` today has zero
consumers**, and this repository has already lost six increments to that shape. Mitigation is
structural: every component shipped is consumed by the one real screen or registered in the
conformance registry, and the scope reporter prints any that are not.

**How much is honestly buildable before F-018.** Seven components and the foundation.
DESIGN-BRIEF section 5 lists ~22, and the ten colour-specific ones — CVD preview, confidence
meter, separation readout, palette strip, delta display — are shaped by screens that do not
exist. Built now they will be rebuilt, and it is scope past the acceptance list, which is as much
a failure as missing scope.

**A process gap.** ADR-0032 requires wireframes -> visual design -> code, each approved by a
person. There is **no approved mobile component design**; DESIGN-BRIEF section 3 is web-first and
lists mobile at R3. The defensible reading: these seven are mechanically derived from an approved
token manifest and a platform-dictated structure, so stage 2 is satisfied by the manifest, and
**screen** design remains F-018's stage 1. Run the `designer` subagent and `visual-taste`'s
pre-flight before closing — including the one test that matters: put a real garment colour on
screen inside this chrome and see whether you can still judge it.

**Two of the manifest's four targets have no consumer.** `tokens.css` and the Tailwind theme are
emitted, byte-compared and imported by nobody — the same shape F-039 found in `nativeColors`. Not
F-017's decision, but the sentence in DESIGN-SYSTEM.md justifying four targets no longer
describes anything, and the owner should decide whether to retire them or record why they stay.

**Recorded, not fixed here:** `gates.json` says gate 7 (`e2e`) activates with F-039; F-039's own
plan says F-018/F-040 and shipped without changing it. No gate fails on that; it is a false
statement sitting in state, and F-017 is editing the file next door to it.

## Out of scope

The Atlas (F-018) · Compare (F-019) · Palette Studio (F-020) · Finder (F-021) · cards (F-023) ·
the Lens (F-040) · persisted locale and theme preference (F-041 owns storage) · the swatch
two-tone edge treatment (**F-068**, notwithstanding the manifest's `swatch.hairline.role`
sentence claiming it is F-017 work — that sentence contradicts the same token's own
`uncheckedReason`, and F-068 owns correcting it) · `border.strong` at 3:1 (F-070) · activating
the `e2e` or `perf` gates · the CVD preview, confidence meter, separation readout, palette strip
and delta display components · the provenance-conditional half of the claims lint (moves to
F-040 — the rule is conditional on `Provenance.source`, and no surface renders anything other
than `declared` until the Lens exists) · retiring the CSS and Tailwind targets · a manual theme
toggle (the app follows the OS; the manifest's `defaultTheme` is the no-signal fallback).
