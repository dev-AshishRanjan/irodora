# Plan: F-221 — Every route renders beside its mockup, so fidelity is a picture a person can check rather than a claim

| | |
|---|---|
| **Feature** | F-221 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-25, NFR-19 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` · `@irodora/ui/testing` · `scripts/` |
| **Author** | The planner subagent's design (read-only), decided and edited by the implementing session |
| **Date** | 2026-10-12 |
| **Decisions** | [ADR-0134](../../docs/adr/0134-fidelity-is-captured-from-the-running-app-beside-its-mockup-and-the-device-run-is-a-persons.md), D1–D7 (OQ-53 is D2) |

---

## Intent

Until now, "this screen matches its mockup" has been something an agent asserts. After this feature
it is something a person can look at.

- **One command** renders every route in `mockups/index.json`:
  - at 384 dp;
  - in Sumi and Washi, and in English and Japanese;
  - on a real Android device or emulator.

  It puts each capture beside the mockup that governs it, and records what it captured and what it
  could not.
- **The conformance sweep** asserts that every element of an enrolled inventory is drawn.
- **The claims patterns** run over the text the screens render, so a figure and a label that only
  become a claim once composed are caught.

Done, to a person, means three things:

- a folder of side-by-side pictures to open in a browser;
- a table of which routes were captured, which were not, and why;
- a `pnpm test` that goes red when an enrolled surface loses an element or a screen composes a banned
  claim.

## How the criteria are read

- **Criterion 2: "the existing Maestro flows (ADR-0086)".** This means ADR-0086's mechanism: flows
  generated from a spec by `scripts/generate-e2e-flows.mjs`, with selectors resolved against the
  app's own sources, and run by the Maestro CLI. Capture flows are a second kind of spec in that
  generator, and `atlas.yaml` is unchanged. It rules out anything that re-implements the screen.
- **Criterion 1: "every route in the F-218 index".** These are the 21 routes `mockups/index.json`
  names:
  - the 20 under `primaryFor` and `variantFor`;
  - `/profile/measure`, which is undrawn under OQ-7. It is captured and recorded as "not composed:
    no governing mockup".

  Each route is captured in the state a fresh install reaches after its spec's setup steps, and the
  record names that state. The state variants (03, 04, 16, 17) are captured by their surface
  features, each of which has its own criterion: *"the fidelity harness captures the route beside
  mockup NN"*.
- **Criterion 4: "a surface's F-220 inventory".** F-221 builds the mechanism, and enrolls the
  surfaces whose features are done: `14.splash` (F-231) and 27's four cards (F-236). Every other
  surface is owed by the feature whose `mockups` names it, and is asserted present only.

## Approach

### Reused (each read before planning)

- **The route data:**
  - `mockups/index.json` (F-218): the routes, the governing mockup, the variants and each image's
    sha256;
  - `routePatterns()` in `scripts/verify-route-targets.mjs`, the one route enumerator.
- **Mockups and inventories:**
  - `imageSize()` in `scripts/mockup-inventory.mjs`, which reads JPEG and PNG sizes from their
    headers;
  - `mockups/inventory/NN.json` (F-220): `frame.screens[].box` and `dpPerPx`, the elements with
    their `binding`, `icon`, `illustration` and `component`, and `governs`.
- **The flow generator:**
  - `scripts/generate-e2e-flows.mjs`: `loadSources`, `selector`, `renderStep`, `literal` and
    `scalar`, and `--check`;
  - its proof, `scripts/e2e-flows-proof.mjs`;
  - `onPath()` in `scripts/e2e-run.mjs`, exported for reuse;
  - `scripts/png.mjs`, whose `encodePng` writes the fixture captures.
- **Claims:** `.harness/verification/claims.json`, and the claims lint's own fixtures in
  `packages/testing/fixtures/claims/`.
- **`@irodora/ui/testing`:** `checkAll` and `checkSubject`, `TestNode`, the private `paragraph()`
  and `perceivable()` in `tree.ts`, and `STATE_TEST_IDS`.
- **`apps/mobile/test/screens.test.tsx`:**
  - `SCREENS`, `draw()` and `drawRoot`;
  - the F-204 sweep over the two locales, with and without motion, and its evidence writer;
  - `mockLanguageTag`.
- **The app's own behaviour:** `DEFAULT_APPEARANCE = 'system'`, `deviceLocale()` and the scheme
  `irodora`.
- **`plant-proof`'s `NO_JOURNAL_NEEDED`**, where the new writers are declared.

### New

- **Shared claims patterns.** `scripts/claims-patterns.mjs` holds `loadClaims()`,
  `compileBanned()` and `bannedIn()`. It is lifted out of `verify-claims.mjs`, which imports it, so
  the lint and the capture check compile the patterns one way.
- **Rendered text, in `packages/ui/src/testing/tree.ts`:**
  - `renderedTexts(root)` returns `{ kind: 'paragraph' | 'line' | 'name', text, path }[]`. A line
    is sibling paragraphs under a host whose `flexDirection` is `row`, joined by a space.
  - `drawsSomething(node, theme)`.
- **An optional, additive `observe` hook** on `checkAll` and `checkSubject`
  (`packages/ui/src/testing/conformance.ts`).
- **The inventory sweep's helpers**, in `apps/mobile/test/inventory.ts`: the `Locator` type (ADR-0134
  D1), `derivedLocator`, `elementFindings` and `ownerFindings`.
- **The capture spec and its flows.** `apps/mobile/e2e/capture/routes.json` is the spec. The
  generated flows go in `apps/mobile/e2e/capture/{en,ja}/<routeId>.yaml`, a subdirectory, so gate 7's
  runner never picks them up.
- **The fidelity scripts:**
  - `scripts/fidelity-compose.mjs`: `governingPanels()` and `composeSvg()`;
  - `scripts/fidelity-record.mjs`: `buildRecord()`, `summaryLine()`, `recordMarkdown()`,
    `hierarchyTexts()` and `captureClaims()`;
  - `scripts/fidelity-capture.mjs`: `pnpm fidelity:capture`, with an injectable device driver;
  - `scripts/fidelity-proof.mjs`, in the `lint` chain.
- **Hierarchy fixtures**, in `packages/testing/fixtures/claims/rendered/*.xml`.

**The flow a capture spec generates:**

```yaml
appId: com.irodora.app
---
- launchApp:
    clearState: false        # the runner clears, once, under --erase-app-data (D6)
- openLink: 'irodora:///atlas/aki-batake'
- assertVisible: '<anchor, in this flow's locale>'
- waitForAnimationToEnd
- takeScreenshot: capture    # lands at <output>/takeScreenshot/capture.png (Maestro docs)
```

**What the record holds** (`record.json`; never rendered text, which goes only to `claims.txt` and
`hierarchy.xml`, because repository walkers scan `.json` and `.md`):

- the commit, and the app's package, version and debuggability;
- the device: model, SDK, whether it is an emulator, physical pixels, the original and used density,
  the dp width, the font scale, and whether everything was restored;
- each condition, and whether it was applied;
- `expected`, `captured` and `notCaptured`;
- the claims counts: captures checked, texts, findings and unread;
- one result per route × condition, captured or not, with the reason.

`buildRecord` throws on a missing or duplicate result. `summaryLine` reads `NOTHING CAPTURED — 0 of
84` or `captured 80 of 84; 4 not captured`, so the two can never read alike.

**The composer's panels:**

1. the capture;
2. the primary mockup (P1);
3. the variant whose `governs` matches the condition: `25` for light on `/`, `26` for Japanese on
   `/atlas/[slug]`;
4. the spec's state variant, if any.

Framed mockups are cropped to their screen box. Each panel is scaled to 384 units, one unit per dp.
Images are embedded as data URIs, and their bytes must hash to the index row. Each panel is labelled
with the route, the condition, the mockup id, a short sha and the rule, plus "first viewport only".
Where no variant draws the condition, the label says so.

**What `pnpm fidelity:capture -- --erase-app-data [--serial X] [--locale-by-hand en|ja]` does:**

1. **Preflight.** On any failure it refuses, and writes a record of nothing captured.
   - The flows pass `--check`.
   - `maestro` and `adb` are on the PATH.
   - One device is attached, or one is picked with `--serial`.
   - The app is installed and is not debuggable.
   - `--erase-app-data` was given.
2. **Device setup.** `restore.txt` is written first. Then:
   - the density is set so the screen is 384 ± 0.5 dp wide;
   - the font scale is set to 1;
   - the animation scales are set to 0.

   Everything is restored in a `finally` and on SIGINT.
3. **For each condition**: night mode set and read back, and the locale set and read back
   (ADR-0134 D5).
4. **For each route**:
   - `pm clear`, then the locale again;
   - `maestro test --test-output-dir <dir>`, with a bounded timeout;
   - there must be exactly one PNG under `<dir>/takeScreenshot/`, of the device's width;
   - `uiautomator dump`, saved as `hierarchy.xml`.
5. **Compose and record:** compose each captured pair, run the claims over the hierarchy text, and
   write `record.json`, `record.md` and each `claims.txt`.
6. **Exit 0** only when everything expected was captured, with no findings and nothing unread.

`--compose <run-dir>` recomposes and re-records from raw files, with no device.

## Increments (Tier 1 per commit, ADR-0132)

| # | what | verified by |
|---|---|---|
| 0 | Claim on the person's direction (F-091's attestations stay outstanding), OQ-53 and ADR-0134, this plan | state |
| 1 | `claims-patterns.mjs`; `verify-claims` imports it with unchanged behaviour | verify-claims, its proof, the root lint |
| 2 | `renderedTexts`, `drawsSomething` and the `observe` hook, with ui tests. The F-204 sweep collects texts in all eight conditions and fails on a banned construction, and `conformance-sweep.json` gains a `claims` block. A real finding is fixed here, not allowlisted (rule 11) | ui and mobile jest, a11y, contrast |
| 3 | `inventory.ts`, the surface table, the owner rule. Enroll `14.splash` and 27's four cards, reconciling 27's inventory data if it disagrees with what F-236 shipped. Drop the presence assertions in `launch.test` that the sweep now makes (the token assertions stay) | mobile jest, verify-mockups if 27 moves |
| 4 | The generator's vocabulary: `openRoute`, `settle`, `screenshot`, `clearState`, and the ja catalogue, with new `e2e-flows-proof` cases | generate-e2e-flows --check, e2e-flows-proof |
| 5 | The capture spec for all 21 routes, with setup for the `[id]` routes; a coverage rule in both directions between the spec and the index; the 42 generated flows | the same |
| 6 | `fidelity-compose`, `fidelity-record` and `fidelity-proof` (composer and record cases) in `lint`; `NO_JOURNAL_NEEDED` entries | fidelity-proof, plant-proof, lint |
| 7 | `fidelity-capture` (driver, `--compose`) and `pnpm fidelity:capture`; orchestration, consent and restore cases on a fake driver; hierarchy fixtures | fidelity-proof, lint |
| 8 | Records: effects and notes; R9 §4 E2 and §12; the "not checked here" line in `verify-claims`; `conformance-sweep.json`'s `notCovered`; the `attested[]` entries for criteria 1, 2 and 5; F-231's note | state |
| 9 | Tier 2, then the evaluator once, fixes, Tier 2 again | — |

## Mockup fidelity

- **Governing mockup:** `all`, as references only. F-221 builds nothing a person sees in the app.
- **Inventory:** the elements of `14.splash` and `27` are asserted present. None is built here.
- **Bindings and departures:** none. The composed SVGs are gitignored evidence that embed the
  mockups unaltered, pinned by their sha256, and are never bundled.

## Anticipated effects

| | from → to | guard |
|---|---|---|
| E-055 | the route table → the capture spec and its flows | `--check` in lint, the spec ↔ index coverage rule, and an `e2e-flows-proof` case for each direction |
| E-126 | `mockups/index.json` → the spec and the composer | the coverage rule; the composer's sha256 check, against a decoy copy of the index with one digit flipped |
| E-128 | the inventories → the inventory sweep and the crop boxes | one locator per element and an element per locator (`pnpm test`); the boxes are read live |
| E-090 | `claims.json` → the jest sweep and the capture check, through `claims-patterns` | a jest test: every `drawn.md` and `variants.md` line is flagged, and every `near-misses.md` line is clean |
| **E-203 (new)** | `feature_list.json` (`status`, `mockups`) → the owner rule | a decoy features array in which F-242 is done but 01 is not enrolled |
| — | the `@irodora/ui/testing` API | typecheck and both jest suites; the new parameter is optional |
| — | `en.ts` and `ja.ts` → the ja flows | `--check` loads both |
| — | the person's device: its settings and app data | the consent refusal (zero mutating calls on the fake driver); `restore.txt`; the restore cases |
| — | the `plant-proof` write scan | the declared reasons |
| — | the evidence directory under the repository's walkers | a proof case: a finding's text is absent from `record.*` and present in `claims.txt` |

## Test plan

- **Against reality.** The committed mockups, by sha256, and the claims lint's `drawn.md`. No new
  golden data.
- **Property-style, seeded:**
  - `captured + notCaptured === expected`, and every route × condition appears exactly once;
  - every `drawn.md` line, split at each figure and label boundary into row-sibling `Text`s, comes
    back as one line and is flagged.
- **Equivalence.** The jest matcher and the lint matcher agree over `drawn`, `variants` and
  `near-misses`.
- **Decoys, each actually broken, each beside a baseline that passes:**
  - **The composer:**
    - its panel sets for `/` light, `/atlas/[slug]` in ja, and `/wardrobe` empty;
    - a flipped sha256 digit;
    - a framed mockup left uncropped;
    - a 411 dp capture;
    - two capture widths.
  - **The record:**
    - Maestro exits 1;
    - Maestro exits 0 with no PNG;
    - a PNG of the wrong width;
    - night mode reads back wrong;
    - no device;
    - no consent;
    - a result missing or duplicated;
    - "nothing captured" and "captured 0 of N" never reading as "no differences".
  - **Capture text:**
    - a figure and a label as row siblings are flagged;
    - the same two on different lines are clean;
    - a clean screen yields texts and no findings;
    - unreadable XML counts as unread, which fails the run.
  - **The sweep:**
    - a removed node is named;
    - a locator for no element is named;
    - an element with no locator is named;
    - a `testID` on an empty `View` is "not drawn";
    - a composed-claim decoy fails, and the real subjects are clean.
- **End to end:** the person's device run, attested.

## Verification

```
Tier 1 per increment: format:check, typecheck, the root lint, the tests of what changed (turbo --filter='...[HEAD]'), state
Tier 2 once, and again after the review: state, typecheck, lint, format, build, test --force, a11y, contrast, cvd, security, verify-ci --all
```

**Not run, and why:**

- `e2e` (gate 7): there is no JDK, Maestro or device here, and the gate is still pending (F-091
  criteria 3 and 4). `pnpm test:e2e` here runs the flow check, which passes, and then refuses for want
  of Maestro.
- The real `pnpm fidelity:capture` run belongs to the person, and is attested.

## Attestations (ADR-0038; each quotes its criterion verbatim; each blocks the release)

| criterion | what the person does | what it must show |
|---|---|---|
| 1 | Runs `pnpm fidelity:capture -- --erase-app-data` once, on an Android device or emulator over adb, with a non-debuggable build of the attested commit (`pnpm --filter @irodora/mobile exec expo run:android --variant release`) | `record.json` lists all 21 routes × 4 conditions at 384 ± 0.5 dp, with each captured pair composed. The counts, and every miss with its reason, go into `progress.md` |
| 2 | The same run | Each PNG is written by `takeScreenshot` in a generated flow, against `com.irodora.app`. The record names the device. A person opens the composed pages and confirms each shows its route |
| 5 | The same run | The record's claims block reads `unread: 0` and `findings: 0`. A finding is fixed and the run repeated |

Criteria 3 and 4 are fully gated here.

**What the person needs:**

- `adb` (platform-tools) and the Maestro CLI;
- a device or emulator whose app data they do not need, because the run erases it.

The run takes about 84 Maestro invocations, roughly 20–30 minutes. Its `raw/` folder can be sent back
and recomposed here. In the same session, `pnpm test:e2e` would run `atlas.yaml`, which discharges
F-091's journey criteria by an actual run.

## Risks and open questions

**No `OQ-*` remains open.** OQ-53 is closed by ADR-0134 D2.

1. **Device-side formats are unobserved until the first run:** `openLink`'s URL form,
   `takeScreenshot`'s folder, `uiautomator`'s XML, and `set-app-locales` through `pm clear`. Each
   fails closed into the record, and ADR-0134 says to revisit it after the first run.
2. **The run erases the app's data** on the device it runs on. Hence the consent flag, and the advice
   to use an emulator.
3. **Enrolling 27 may expose drift** in its inventory's bindings. It is reconciled here or recorded.
4. **The jest claims sweep may find a real composed claim.** It is fixed (rule 11), not excused.
5. **`screens.test` is memory-sensitive** (F-240). The `observe` hook adds no renders.

## Out of scope

- F-267's comparison and its departures record.
- State variants beyond each route's reachable state.
- Enrolling surfaces that are not yet built.
- Order, grouping, proportion and tokens per element.
- Scrolling and stitching.
- iOS, the device accent, Slate and Obsidian.
- Pixel diffing.
- A `--route` filter.
- Activating gate 7.

## Status (implementing session)

| increment | commit | notes |
|---|---|---|
| 0 | this commit | Claim, ADR-0134 (D1–D7; OQ-53 closed by D2), criterion 2 amended, and this plan. F-221's `blockedByAttestation` is removed on the person's direction, quoted in its notes. F-091's attestations stay outstanding, with the person's run noted. **Tier 1 run:** format, state, claims. |
| 1 | this commit | **The claims patterns, compiled once.** `scripts/claims-patterns.mjs` (`loadClaims`, `compileBanned` with the lint's case-insensitive flag, `bannedIn`). `verify-claims.mjs` imports it and compiles once instead of per line; its behaviour is unchanged (30 patterns, 0 violations; `verify-claims-proof`: all 41 cases discriminate). **Tier 1, each exit 0:** format, typecheck, lint, claims, the claims proof. |
| 2–3 | this commit | **The two halves of the sweep, in one commit.** The test run for increment 2 alone overlapped edits for increment 3, so its result could not be credited to either tree; the two are verified, and land, together.
- **Rendered text (criterion 5, jest).**
  - `renderedTexts(root)` reads paragraphs (outermost `Text`), visual lines and accessible names (label, hint, value text). A visual line is a run of two or more children of a `row` host that each hold one paragraph, joined, read in visual order for `row-reverse`. `drawsSomething(node)` is text, a name, a picture or any paint.
  - Both are proven in `packages/ui/test/rendered-texts.test.tsx`, ten cases with decoys: a column is never a line, a column inside a row ends the run, and an empty `View` with an id is not drawn.
  - `checkAll` and `checkSubject` take an optional `observe` hook, which sees every tree once and changes no finding. The F-204 sweep reads every tree through it against the claims patterns: 22,876 paragraphs, 2,570 lines and 10,136 names, over 82 subjects in 8 conditions, 30 patterns, 0 findings. A composed claim (a figure and a word side by side) fails the sweep, as a decoy shows.
  - `conformance-sweep.json` gains a `claims` block, and asserts each kind was read.
  - `apps/mobile/test/claims.ts` reads `claims.json` the lint's way. `claims.test.ts` holds it to the lint's own fixtures: every `drawn.md` and `variants.md` item is refused, and every `near-misses.md` item passes. Every drawn claim, split at each space into two paragraphs side by side, is read back as one line and refused.
  - The planted claims are held apart in the tests' source, so the claims lint never reads them.
- **The inventory sweep (criterion 4).**
  - `apps/mobile/test/inventory.ts` holds the locators (ADR-0134 D1: derived from the record, or given), `elementFindings` over the JSON tree and a live snapshot (components, glyphs, illustrations), and `surfacesOf`.
  - Five surfaces are enrolled and rendered in both themes and both languages: `14.splash` (the Launch), and 27's four cards. 31 elements are asserted.
  - Decoys:
    - a node removed is named;
    - an id on an empty `View` is "draws nothing";
    - a locator for no element is named;
    - an element with no locator is named.
- **What enrolling 27 found.**
  - The registry's empty-wardrobe subject passed only `onAddGarment`, so it drew a branch the route never shows when the wardrobe is empty. The route passes `onScan`, and 27's card, with its body and Scan First Garment, had never been swept. The subject now passes the route's own props.
  - The refused card's title is ADR-0128's composition, *Reading Refused* plus the check's name. Its locator is the screen's own `refusalText`.
- **The owner rule, in `verify-mockups` (ADR-0134 D7).** `.harness/verification/inventory-surfaces.json` is the table both sides read: the enrolled surfaces, and four not whole, with why.
  - `verify-mockups` refuses:
    - a surface whose builders, the features naming its mockup and waiting on F-221, are all done, while it is not enrolled;
    - a surface no feature builds;
    - a row naming no surface;
    - a not-whole row with no reason.

    Four new proof cases show each one. It lives there, not in the test, because it reads the feature list, and a cached test keyed on that would re-run on every state edit (`verify-cache-scope` refused the first draft).
  - The jest side asserts its renders equal the table's enrolled list, in both directions.
- **`launch.test`** keeps the tokens each 14.splash element is drawn in. Presence is the sweep's (F-231's note).
- **`turbo.json`** declares the claims fixtures and the surface table: the cache-scope check found both reads.
- **Tier 1, each exit 0:** format, typecheck, lint, state, `verify-mockups` and its proof, then `turbo run test --filter='...[HEAD]'`, a11y and contrast — 35/35 tasks; the sweep: 82 subjects, 8 conditions, 0 findings, 0 claims; 31 elements asserted in 20 renders, 23 surfaces owed. |
| 4 | this commit | **The generator's capture vocabulary.** `openRoute` turns a route file and its parameters into a deep link on the app's own scheme, read from `app.config.ts`. `(group)` folders are dropped and `index` is its folder. A parameter takes only a published colour's slug: an id the app creates at run time is reached by steps, and the root by launching. Layouts are refused. `settle` is `waitForAnimationToEnd`, and `screenshot` is `takeScreenshot: capture` (Maestro writes it to the run's `takeScreenshot/` folder), at most one per flow. `launch` honours `clearState`, true by default. A spec's `locale` (`en` or `ja`) picks the catalogue every key resolves in, the tap-ambiguity rule included, and the header names it and the spec's origin. `atlas.yaml` regenerates byte for byte. **`e2e-flows-proof`** adds a Japanese capture flow and checks its six rendered parts, plus ten refusals: an unpublished colour, a missing parameter, an id parameter, an extra parameter, the root, a layout, an unknown locale, two captures, a non-boolean `clearState`, and a key missing from the Japanese catalogue alone. Its existing cases caught a regression on the way: English specs had stopped reading `messages`. **Tier 1, each exit 0:** format, typecheck, lint (with `e2e-flows-proof`, 32 cases), state, `generate-e2e-flows --check`. |
| 5 | this commit | **The capture spec and its 40 flows.** `apps/mobile/e2e/capture/routes.json` names all 21 routes the mockup index names. Each reachable route gets one flow per locale under `capture/en` and `capture/ja`: launch without clearing, open the route, assert its anchor (the screen's title key, in that locale), settle, capture. That makes 40 flows for 20 routes. `/` is reached by launching. The `[slug]` routes open on `aki-batake`. `/wardrobe/with/[id]` is reached by steps from a cleared app: open the add screen, type the type, tap Red Earth (one of the twelve swatches it draws), save, open the Wardrobe tab, tap the garment, tap "What goes with it". The save button is tapped by a new `testID` (`wardrobe.save`): its words are also the Wear screen's control, so the generator's ambiguity rule refuses a text tap (ADR-0086). **`/atlas/with/reading/[id]` is recorded as unreachable**, with its reason: a reading exists only after the Lens measures something through the camera. F-259 owns capturing it, and the run records it as not captured. **The generator refuses:** a route the index names that the spec lacks, a spec route the index lacks, a file that is not its route (expo-router's rule), a route named twice, an unreachable route without a reason, a route with neither anchor nor reason, and under `--check` a stale flow no route produces. Gate 7's runner reads only the top-level folder, so the captures never run as journeys. **`e2e-flows-proof`** adds the real spec (covers the index, every flow renders) and six refusals. **Tier 1, each exit 0:** format, typecheck, lint (with the proof and `--check`), state, `turbo run test --filter='...[HEAD]'` (17/17). |
| 6 | this commit | **The composer and the record, proven without a device.**
- **`scripts/fidelity-compose.mjs`.** `governingPanels` names the mockups that govern a route in a condition: P1, plus the variant whose inventory governs it, 25 in Washi and 26 in Japanese. It notes what nothing draws: a state variant not composed, an undrawn route's question, no light or Japanese drawing. `composeSvg` lays out one SVG: the capture and each mockup 384 units wide, a framed mockup cropped to its inventory's screen, images embedded, each panel labelled. A mockup whose bytes do not hash to the index's sha256 is refused by name (ADR-0134 D4, no dependency). `imageSize` gains `imageSizeOf(bytes)`.
- **`scripts/fidelity-record.mjs`.** `buildRecord` requires every route in all four conditions exactly once (84) and refuses a miss without a reason. `summaryLine` reads `NOTHING CAPTURED — 0 of 84` when that is the truth. `runPassed` requires everything captured and read, with no finding. `recordMarkdown` and `hierarchyTexts` read uiautomator's XML as a tree: paragraphs, `content-desc` names, and lines, meaning children of one node holding one text each on the same screen line. An unreadable dump throws, and the run counts it as unread. `captureClaims` and `claimsFile`: a finding's words are written only to the capture's `claims.txt`.
- **Hierarchy fixtures** in `packages/testing/fixtures/claims/rendered/`: composed, stacked, clean, unreadable.
- **`scripts/fidelity-proof.mjs`, in the `lint` chain.** 27 cases over the real mockups and inventories and fixture captures built in memory, each rule with a baseline and a decoy. It writes nothing.
- **One composed page viewed rendered**, through a local server (the browser pane refuses `file://`): a blank capture beside 06 and 26, each cropped to its screen.
- **Tier 1, each exit 0:** format, typecheck, lint (the proof and plant-proof included), `verify-mockups`, state. |
| 7 | this commit | **The runner: `pnpm fidelity:capture`.** `scripts/fidelity-capture.mjs` drives the device through an injected driver (`tools`, `devices`, `shell`, `runFlow`, `dumpHierarchy`) and writes through an injected sink, so the proof runs the same `runCapture` against a fake phone.
- **Preflight, which changes nothing:** the flows are current; adb and Maestro are present; one device, or `--serial`; the app is installed and not debuggable; `--erase-app-data` was given. Each refusal is a record of nothing captured, with the reason on every row.
- **The run:** `restore.txt` is written before the first change. The density is set so the screen is 384 ± 0.5 dp wide and read back. Font scale goes to 1 and the animation scales to 0. For each condition, night mode is set and read back. For each route: `pm clear`, the per-app language set and read back, the flow run, exactly one capture of the screen's width, the hierarchy dumped and read for claims, then composed. Everything is restored in a `finally` and on Ctrl+C, and a failed restore prints its commands. `--locale-by-hand` covers phones without per-app languages. `--compose <run folder>` recomposes a run sent back, with no device.
- **Declared unreachable misses:** a miss the capture spec declares unreachable is counted apart (`unreachable`), named in the summary and in `record.md`, and does not fail the run; any other miss does. Without this, every run would exit 1 for the reading route.
- **`onPath`** moves to `scripts/on-path.mjs`, shared with `e2e-run`, whose behaviour is unchanged: it still refuses without Maestro.
- **The proof gains 15 cases on the fake device:**
  - consent refused with zero mutating commands;
  - no device, two devices, a debuggable build, no app;
  - a full run of 80 captures that passes;
  - `restore.txt` before the first change;
  - 384 dp at density 450, with every setting put back;
  - a clear before every capture, and every capture composed;
  - a flow failing mid-run, with the device still put back;
  - no capture, or one of the wrong width;
  - a screen left at 411 dp;
  - night mode ignored;
  - a failed restore;
  - unreadable text and a composed claim.
- **Smoke-tested here:** `--erase-app-data` with no adb wrote `NOTHING CAPTURED — 0 of 84` with the reason on every row, and exited 1. It also showed the record calling an unreached device "a physical device", now "none reached". `NO_JOURNAL_NEEDED` gains the runner.
- **Tier 1, each exit 0:** format, typecheck, lint (the proofs included), plant-proof, state; `e2e-run` refuses without Maestro, as before. |
| 8 | this commit | **Records.**
- **Effects:** E-055 (the route table now feeds the capture spec and its 40 flows), E-126 (the index feeds the spec and the composer's sha256 check), E-128 (the inventories are asserted on the rendered tree, and crop the composed mockups) and E-090 (one compile for three readers) are extended, each note with its F-221 section. New: **E-203**, a surface feature cannot close with its surface unswept, with its note and index line.
- **R9-MOCKUP-FIDELITY:** §12 names the enrollment, the owner rule and `pnpm fidelity:capture`, and §4 E2 says a composed claim is now held on the screen too.
- **`verify-claims`** now points its "not checked here" line at the sweep and the capture. The sweep's `notCovered` points at the capture, and its evidence is regenerated.
- **F-221's `attested[]`:** criteria 1, 2 and 5, quoted verbatim, each with the exact run and what it must show, each blocking the release.
- **ADR-0134** gains "Recorded while building": the declared unreachable route, the steps to the garment route, the owner rule's home, and what enrolling 27 found.
- **Downstream:** F-231's note is followed through. Every surface feature still waiting on F-221 is told to enroll its surface in the same change.
- **Tier 1, each exit 0:** format, typecheck, state, claims, lint. |
| review | this commit | **The one review (evaluator): FAIL as delivered.** Two blocking, six significant and twelve minor findings. Its Tier 2 on 4b953bf, each run one at a time:
- **Exit 0:** state, typecheck, lint, format, build, `test --force` (35/35 uncached), a11y, contrast, cvd, `fidelity-proof`, `generate-e2e-flows --check`, `e2e-flows-proof`, `verify-mockups --prove`.
- **Exit 1, expected:** security (F-322's nine). `verify-ci --all` was 35/38, exactly the known reds, with no F-333 event. `test:e2e` refused, with no Maestro. The capture command with no adb wrote NOTHING CAPTURED and exited 1.

It proved B1 with a probe. Each finding fixed or recorded:
- **B1, fixed: four of 31 elements were not really asserted.** Locators counted anywhere on the screen, so the Lens's mode chips stood in for 27's step chips, the lockup's mark withheld at opacity 0 for the visible one, and the whole card for its glow. Now:
  - every surface names its root, and counts are taken inside it;
  - a STATIC `opacity: 0` hides, and an animated one, the mount frame, does not (probed: animated views carry `jestAnimatedStyle`);
  - the glow and step chips are found by their own ids, and the empty card by its id;
  - a removal decoy runs for each kind of locator (testID, text, component, the hidden mark, illustration, glyph, the step chip and glow).
- **B2, fixed: "every route" had been narrowed, on a false premise.** A reading also comes from a library photo (F-166). The reading route stays declared unreachable, with the corrected reason, because a generated flow cannot drive the system photo picker (ADR-0086). Now:
  - it names its owner, F-259, and `generate-e2e-flows --check` refuses an unreachable route with no owner, a non-feature owner, or a done one;
  - **the run fails while any route is declared**, and the record still names it, with the owner;
  - criterion 1's attestation now reads "every route" and cannot be discharged until F-259 adds the reach;
  - the obligation is in F-259's notes.
- **S1, fixed: Ctrl+C never reached the restore.** The run is synchronous. A device command a Ctrl+C kills (SIGINT, or exit 3221225786 on win32) now throws `Interrupted`, and the run stops, puts the device back and records every capture not taken. A no-op listener keeps Node from dying between commands.
- **S2, fixed:** the app's language is read at the start and restored, and the dump file is removed.
- **S3, fixed:** the flow preflight fails closed on any non-zero exit.
- **S4, fixed:** the old dump is removed and the new one must report "dumped to". A dump from another package, or with no text, is unread. Per-capture text counts are recorded.
- **S5, fixed:** in both readers, a row's children give their top lines, so a figure beside a stacked label is one line, and its note stays apart.
- **S6, fixed:** through a Windows shell the whole command line is quoted, the command included, and no argument array is passed (no DEP0190).
- **Minors:**
  - M1 (ADR D7: lint, not test), M2 (R9 §12 names the declared route), M3 (the "fails closed" claim is corrected in the header and ADR) and M11 (row 7 said 15 runner cases; it had 12) are corrected.
  - M4: `recompose` re-derives unreachable from the spec and re-checks each capture's file and width.
  - M5: font and animation scales are read back, and `pm clear` is confirmed.
  - M6: the weak case is gone; the runner case checks the finding's real words against `record.json` and `record.md`.
  - M7: `staleFlows` is pure, with a proof case.
  - M8: the commit gains `-dirty`.
  - M9: SVG text is read in the sweep. A phone does not expose it, and the header and ADR say so.
  - M10: Maestro runs inside its own output folder.
  - M12 is recorded as backlog **F-335**: gate 7's runner cannot start `maestro.bat`.
- **Proofs after the fixes:** `fidelity-proof` 42 cases; `e2e-flows-proof` gains 4 (the three owner refusals and stale flows); the ui rendered-text tests 12; the inventory sweep 16 cases; E-128's guard and note are reworded to what is asserted.

**Tier 1 on the fixes:** see the commit. Tier 2 on the final tree: see `progress.md`. |
