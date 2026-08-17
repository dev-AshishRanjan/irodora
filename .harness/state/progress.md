# Progress

Append-only history. Newest at the top. This is what a fresh session reads to find out what
happened, what was verified, and what to do next.

Every entry records **which gates ran and which did not**. The second half is the part a
reader cannot reconstruct.

---

## 2026-08-15 — F-010 DONE · the Color value type, and a guard that broke while I was holding it

A colour now carries how it came to exist, as a type. A component that accepts a `Color`
**necessarily has** its provenance, because there is no way to build one without it.

### Evidence

```
  ✓ gate 0   state          14 checks, 13 warnings
  ✓ gate 1   typecheck      38 tasks
  ✓ gate 2   lint           + guards, engine purity, unsafeFromHex census
  ✓ gate 3   format
  ✓ gate 4   test           750 tests (color-core 41 new, contracts 151)
  ✓ gate 5   color-golden   299
  ✓ gate 6   build          26 tasks
  ✓ gate 9   contrast       unaffected
  ✓ gate 10  cvd            unaffected
  ✓ gate 15  security       gitleaks, no leaks
  ✓ mirror   10/10
  ✓ pin      scripts/verify-contract-pin.mjs — 4 probes, baseline green
  ✓ unsafe   scripts/verify-unsafe-call-sites.mjs — 139 files, 0 call sites

NOT run: e2e, a11y, content, perf, web-perf, e2e-full — all still `pending` in gates.json.
```

### The design decision

`Provenance` is a **discriminated union on `source`**, not an interface with an optional
`conditions` field. ADR-0005 says `conditions` is "required when source is `estimated` or
`calibrated`", and there are two ways to write that:

```ts
interface Provenance { source: MeasurementSource; conditions?: CaptureConditions }  // asks nicely
type Provenance = UntrackedProvenance | CapturedProvenance;                          // refuses
```

The first still compiles for an estimate that lost its capture conditions — which is exactly
the object nobody should be able to build. The second is ADR-0005's own argument applied one
level down [[provenance-in-the-type-is-what-makes-honesty-structural]].

The plan flagged the risk that this might be over-engineering if `CaptureConditions` could
only be given speculative fields. It could not: the fields are already specified in
`color-engine.md` and match **FR-17** (illuminant) and **FR-18** (quality) exactly. So the
union requires real data, not an empty object.

### The pin broke, then broke differently, and the second one was silent

**The good break.** Adding `conditions` turned the ADR-0036 compile-time pin red immediately,
forcing the wire schema to move in the same commit. That is the mechanism working — it is
precisely why the two artefacts are pinned.

**The silent one.** Once `Provenance` became a union, the pin *weakened without failing*.
`keyof` on a union returns only the keys **common to every member**, so:

```
optional field added to one union member  →  pnpm typecheck: PASSED
```

Verified by doing it, not reasoned about. That is the same hole the `keyof` assertion was
added to close in F-002 — [[mutual-assignability-does-not-catch-an-optional-field]] — reopened
by a change to the type's *shape* rather than its contents.

The pin is now asserted **per member**, and `scripts/verify-contract-pin.mjs` is what says so:
four probes, each adding an optional field to a different part of the schema, each asserted to
turn typecheck red, with the baseline asserted green first.

### "Every call site is reviewed", made countable

ADR-0005 and `color-core/AGENTS.md` both say `unsafeFromHex`'s call sites are reviewed. That
is a sentence about people, and a sentence about people is not a check.
`scripts/verify-unsafe-call-sites.mjs` enumerates them and runs inside `pnpm lint`: a new call
site fails the build until someone adds it to the reviewed list — **which is the moment the
review actually happens**. Zero today, which is the correct state.

It is a script rather than a test because the colour-engine ESLint zone forbids `node:`
imports even in tests (NFR-3), and a directory walk needs `node:fs`. The choice was to weaken
the strictest guard in the repository or move the census out of the engine. It is a
repository-wide question anyway.

### Three things the tests caught that I had wrong

- **`assertProvenance` destructured blindly.** A JavaScript consumer or a `JSON.parse` result
  reaching it with `undefined` got "Cannot destructure property 'confidence'". Now a
  `ProvenanceError` that names what is missing and why.
- **The replay fixture used the current version** in one entry. The fixture's own assertion —
  that no entry may carry `CORE_VERSION` — caught it. A fixture written from today's versions
  compares the code to itself and goes green for free.
- **`@ts-expect-error` suppresses the next LINE**, and Prettier reflowing an object literal
  moved the error away from the directive, turning a passing negative test into "Unused
  '@ts-expect-error' directive". The directives now sit against the offending property.

### Effects

**E-002** is the link this exercised, and it behaved as documented: the guard is the compile-
time pin, and it fired first.

### Where the work is

Committed on `feat/F-003-design-tokens`, **not pushed**. Tree clean.

### Next

**F-009 and F-010 have not had an independent evaluation.** An evaluator was launched for
F-009 and had not reported when this was written. R1 continues at **F-011** (corpus schema,
provenance and the content gate), `blockedBy: F-010`, now done.

---

## 2026-08-15 — F-009 DONE · gamut mapping, and a deliberate break with CSS Color 4

A colour that does not fit the display has to become one that does, and **which** one is a
product decision. `gamutMap` reduces OKLCh chroma and holds lightness and hue — so a colour
gets less vivid rather than becoming a different colour.

### Evidence

```
  ✓ gate 0   state          14 checks, 13 warnings
  ✓ gate 1   typecheck      37 tasks
  ✓ gate 2   lint           37 tasks + guards + engine purity (6 packages)
  ✓ gate 3   format
  ✓ gate 4   test           433 tests (color-spaces: 345, +88 for F-009)
  ✓ gate 5   color-golden   201 in color-spaces, incl. the 14-entry gamut dataset
  ✓ gate 6   build          25 tasks
  ✓ gate 9   contrast       unaffected, still green
  ✓ gate 10  cvd            unaffected, still green
  ✓ gate 15  security       gitleaks, no leaks
  ✓ mirror   10/10 active gates

NOT run: e2e, a11y, content, perf, web-perf, e2e-full — all still `pending` in gates.json.
```

### The decision, and the measurement that made it

CSS Color 4 §13.2 is the documented default: chroma bisection **plus MINDE**, which stops
early once the channel-clipped colour is within a just-noticeable difference in `deltaEok`
and returns the *clipped* one. We implement the bisection and **not** the MINDE step.

There were two reasons, and only the second one decided it.

**The structural reason** was that `deltaEok` lives in `@irodora/color-difference`, which
depends on `color-spaces` — so MINDE would have meant a second implementation of a shipped
function. That is a real constraint but it is the kind of reason that should make you
suspicious of your own conclusion, so the difference was **measured** before the ADR was
written, exactly as the plan said it must be.

**The measurement decided it.** Over 30 out-of-gamut colours, against `colorjs.io`:

| | ours | CSS Color 4 MINDE |
|---|---|---|
| max hue drift | **2.6 × 10⁻⁵ °** | **11.97 °** |
| ΔE00 between the two results | — | up to **5.21** |
| `oklch(0.9 0.35 240)` | 240.00 → 240.00 | 240.00 → **228.03** |

`deltaEok` tolerates hue movement, so MINDE trades hue for chroma. On a product whose claim
is that the colour is right, that is the wrong trade — "less vivid" is a sentence a user
accepts; "now yellow" is not.

Our result agrees with **culori's `clampChroma`** — an independent implementation of the same
algorithm — to **0.0063 ΔE00**. So the 5.21 gap is not our error; the two algorithms answer
different questions. Recorded in **ADR-0045**, including the cost: we are not CSS-compliant,
and a browser mapping the same `oklch()` itself will disagree with us.

### The bound, stated rather than hoped for

Acceptance criterion 1 says "within stated bounds", and the first version of the test asserted
a bound I had guessed. It failed — at 23° of hue drift — and the investigation is the useful
part:

- **In OKLCh the preservation is exact**: 7 × 10⁻¹², which is round-trip noise. Only `C` moves.
- **Rendering adds one thing**: a final clamp of at most `GAMUT_EPSILON` (10⁻⁷) per channel.
- **Near the black point that tiny absolute movement is a large relative one**, and OKLCh hue
  at chroma 10⁻³ is not a meaningful angle.

| result `L` and `C` at least | max \|ΔL\| | max Δhue |
|---|---|---|
| 0.05 | 1.2 × 10⁻⁷ | 6.9 × 10⁻⁵ ° |
| 0.01 | 3.9 × 10⁻⁶ | 7.6 × 10⁻³ ° |
| unfiltered | 5.7 × 10⁻⁴ | **23 °** |

The last row is in the test as a comment rather than deleted, because a bound that only holds
where you looked is not a bound.

### The decoy

Per-channel clipping — what almost everything else does — implemented in the test and
measured: **33.6° of hue shift**. Our own drift is asserted immediately beside it on the same
colours, so the claim "we preserve hue" is a comparison rather than an assertion
[[a-decoy-that-is-not-broken-proves-nothing]].

The golden dataset needed the same care. There is no published table of gamut-mapped results,
so the 14 entries are `definitional` and the test asserts the **definition**: the result is in
gamut *and* one bisection step more chroma is not. An entry cannot pass by the implementation
agreeing with itself.

### Recorded, not fixed

**F-071 — two flaky property tests, both pre-existing.** `oklab.test.ts` runs 5,000
**unseeded** `fast-check` samples against a 1e-12 bound; it failed once during this feature at
1.2477e-12 — a 25% overshoot, so it will recur — and then passed six consecutive full-suite
runs. I confirmed it was not mine by stashing and re-running. The F-003 evaluation found a
second, a `createPrng` timeout under the parallel run.

Neither is F-009's, and neither is cosmetic: gates 4 and 5 are blocking, and **a blocking gate
that can go red for a reason unrelated to the change teaches people to re-run it until it is
green** — which is how a real regression gets waved through.

### Effects

**E-012 is new**, and it is the same shape as E-003 and E-005: `gamutMap` is a *definition*
shared by many callers with no import edge that shows the sharing. A second implementation
will not look like a rival algorithm — it will look like an inline `Math.min(1, Math.max(0,
c))`, or a component that renders `oklch()` and lets the browser map it.

### Where the work is

Committed on **`feat/F-003-design-tokens`** (the branch now carries F-003 and F-009), **not
pushed**. Tree clean.

### Next

R1 continues at **F-010** — the `Color` value type and reproducibility envelope,
`blockedBy: F-006`, which is done.

---

## 2026-08-15 — F-003 DONE · the token pipeline, and a design system that failed its own gates

**Gate 9 (`contrast`) is active and blocking.** One manifest now compiles to CSS custom
properties, TypeScript, React Native styles and a Tailwind v4 theme, and two blocking gates
read it. R0 is complete — F-003 was the last one outstanding (ADR-0037).

**The approved design system failed both gates on the first run.** Five WCAG AA failures and
five CVD separation failures, plus two structural defects nobody could have seen by reading
the file. That is the headline, and it is the gate working.

### Evidence

```
  ✓ gate 0   state          14 checks, 13 warnings
  ✓ gate 1   typecheck      37 tasks
  ✓ gate 2   lint           37 tasks + guards + engine purity
  ✓ gate 3   format
  ✓ gate 4   test           738 tests (design-tokens: 96 new)
  ✓ gate 5   color-golden   299 tests
  ✓ gate 9   contrast       48 declared pairings across 2 themes — ACTIVE, watched fail
  ✓ gate 10  cvd            41 tests (design-tokens: 29 new), both models, all 11 severities
  ✓ gate 6   build          25 tasks
  ✓ mirror   10/10 active gates
  ✓ gate 15  security       gitleaks 50 commits, no leaks; pnpm audit, no high/critical
  ✓ proof    scripts/verify-contrast-proof.mjs — 9 cases, baseline green in each:
             8 red, plus report-only-under-placeholder which must stay green

NOT run: e2e, a11y, content, perf, web-perf, e2e-full — all still `pending` in gates.json.
```

### Three defects in the approved manifest

**1. `srgb` and `oklch` disagreed on 37 of 38 opaque tokens** — up to 6.09 ΔE00, and
`dark.background` was stated `#141312` where its own OKLCh resolves to `#090807`, a factor of
more than two in luminance. The residual fits no single wrong-transform hypothesis, so the
two columns were authored by different means and the hexes were chosen by eye. Whichever
field the gate read, the other was wrong.

**ADR-0043**: `oklch` is authoritative, `srgb` is engine-derived output, and a hand-edited
hex fails gate 9. The class of defect is gone rather than fixed — the second value is no
longer authored.

**2. A duplicate JSON key made the gate's blocking condition unreachable.** The file carried
`"status": "approved"` *and* `"status": { ok, warn, bad }`. JSON keeps the last, so the
approval string never survived parsing, and `gate.contrast.blockingWhenStatus: "approved"`
was comparing against an object. Valid JSON; no parser, formatter or schema we run says a
word. Found by writing a loader that asserted the field's **type** rather than its presence.
[[a-duplicate-json-key-silently-deletes-the-earlier-one]]

**3. The values failed the standard the product sells.** Five pairings below AA (worst
`light: status.warn on surface.2` at 3.72:1) and five CVD combinations below the declared
minimum of 60 (worst `light: status.warn / status.bad` under tritan at 44.4). Three chromatic
tokens spaced by hue and packed into a 0.11 band of lightness — when hue collapses, nothing
is left. **ADR-0044** records the corrected values, and records that the decision which
actually forced them was classifying `status.*` as `usage: "text"` (4.5:1) rather than
`nonText` (3:1).

### The design review changed the answer twice

The `designer` subagent reviewed the first correction and rejected it. Dark `status.warn` at
`L 0.88` passed every gate and sat **1.32:1 from the primary foreground with 7° of hue
between them** — caution that reads as emphasised body text, and 2.5× louder than error.

The general point is worth keeping: **lightness is triple-booked** — contrast, salience rank
against the ground, and gamut headroom — while hue is booked for nothing and chroma for one
thing, and those are the axes CVD separation actually keys on.
[[lightness-is-triple-booked-so-spend-the-margin-on-hue-and-chroma]]

The review also found two real weaknesses in the gate itself, both fixed:

- **`compositeOver` checked the favourable ground.** A translucent token named one base, so a
  black hairline was evaluated over white — the best it will ever look — while the same line
  divides rows on `surface.2` and frames the `swatch.well`. It is now a list of every ground,
  and the gate takes the worst.
- **`swatch.hairline` claimed an edge "perceptible against any value"**, which a single-tone
  16% inset cannot deliver against a light sample and no fixed-token check can cover. The
  claim was softened to what is verified (golden rule 11 applies to our own documents), and
  the treatment that would deliver it is **F-068**.

### The mutation proof rotted mid-feature

The gate-10 decoy pushed `dark.status.ok` from `L 0.730` to `L 0.800` and was watched go red.
Then `status.warn` moved for an unrelated reason and gained headroom, and re-running the proof
gave `baseline exit 0, mutated exit 0` — the mutation still applied, the gate still ran, and
it no longer collapsed anything. A proof that passed when written and rotted afterwards.

Replaced with a 48° hue rotation of success toward caution (**64.1 → 31.8**), which attacks
the mechanism rather than the margin. The number is in the decoy's name so the next reader can see
how much slack it has.
[[a-decoy-written-against-old-values-quietly-stops-discriminating]]

### What is NOT delivered

- **The rendered-surface half of gate 9's charter** — scanning components for colour-only
  status indicators. No component exists until F-017. The gate prints this on every run
  rather than implying coverage by being green.
- **A human designer has not seen the corrected palette.** The review was by subagent.
  ADR-0044 states this plainly in its Bad consequences; it is not design approval.
- **A human designer has still not seen the corrected palette.** Both reviews were by
  subagent. The manifest records that in `valuesChangedSinceApproval`, and ADR-0044 says it in
  its Bad consequences.
- **Independent verification DID complete, on the third attempt**, and returned FAIL on the
  record rather than on any gate. Everything it raised is fixed or recorded above. The two
  earlier runs died on session limits; that is why this entry was first written claiming the
  separation had not been achieved.
- **`border.strong` does not meet 3:1** as an outlined control boundary. Now recorded as
  **F-070** with its measured ratios, and the token carries an `uncheckedReason` so the gate
  names it rather than passing over it in silence.

### The colour-science review returned CHANGES REQUIRED, and it was right four times

It verified every number I claimed — all 44 derived hexes against culori and colorjs.io, WCAG
recomputed from the spec text, APCA bitwise against colorjs.io over 18 pairings, and ADR-0044's
own figures. Then it found four defects **in the gate**, each of which made the gate assert
something measurably false:

**1. "Severity 1.0 is the worst case" is not true.** The comment justifying a single-point
check said a pair surviving total deficiency survives every milder one. Machado's tabulated
matrices are **not monotone** — the tritan table reverses direction around 0.5–0.6 — and
`light: status.warn / status.bad` scores **61.2 at severity 0.90** against 65.8 at 1.0. Nothing
was below the minimum, but the *reason* for checking one point did not hold. All eleven
tabulated severities are now checked.

**2. The separation claim was about the wrong model.**
[`color-engine.md`](../../docs/architecture/color-engine.md) §7 assigns **total dichromacy to
Brettel–Viénot** and anomalous trichromacy to Machado. Evaluating "separable at severity 1.0"
only through Machado's extrapolation to its endpoint answers a different question — and under
Viénot, `light: status.ok / status.warn` under protan scored **59.6, below the declared 60**.
Both models are now evaluated and the worse taken; tritan stays Machado-only because
`simulateDichromacy` throws for it rather than return a plausible wrong answer (F-008).

**3. The alpha-compositing comment was inverted.** It claimed linear-light compositing was the
stricter reading "for a light overlay on a dark ground, which is the direction that matters".
Measured, that is backwards:

| token | linear | encoded |
|---|---|---|
| `dark.border.strong` over `background` | 3.66:1 | **1.41:1** |
| `light.border.strong` over `surface.3` | **1.17:1** | 1.41:1 |

Linear is **2.2× more permissive** in the case the comment named, and neither model is
uniformly stricter. The deeper error was conceptual: the engine's "average in linear light"
rule is about combining measurements, but this is a **prediction of what the platform will
draw**, and CSS and React Native both composite in the encoded space. A gate certifying the
physically-correct value while the user sees the other one is certifying a colour that never
renders. Both are now computed and the worse taken.

**4. Gate coverage was driven entirely by `pairsWith`, so nine tokens per theme were checked
by nothing** — and said nothing, which reads as a pass. `swatch.well`, `swatch.hairline`,
`border`, `border.strong` and `chart.1…5`. A token covered by nothing now **fails** unless it
carries an `uncheckedReason` saying why it cannot be checked here. That turns "unchecked" from
an absence into a statement a reviewer can disagree with, and it is the same silent-failure
shape the status check already guarded one level down.

### The independent evaluation returned FAIL, and found two blockers the gates could not

The third `evaluator` run completed — the first two died on session limits — and it
reproduced every gate green while failing the feature on the **record**, which is the part no
gate reads.

**BLOCKER 1 — ADR-0044's value table was not what shipped.** It recorded the *intermediate*
correction and was never updated when the colour-science review forced a third pass. Three of
six rows were wrong. The manifest's `valuesChangedSinceApproval` names ADR-0044 as *the*
record for exactly those six tokens, so the one machine-readable pointer to the decision led
to superseded numbers. **A decision record has no gate; its numbers go stale silently.** Fixed,
with the failure kept in the ADR rather than tidied away.

**BLOCKER 2 — a claim the code did not support.** `DESIGN-SYSTEM.md` said `foreground.3` "is
emitted under a TypeScript brand that is not assignable where normal text is expected". It was
not. `TextToken`/`LargeTextToken` were phantom brands — `string & { __text: unique symbol }` —
that nothing produced, nothing applied, and the generated tokens ignored entirely. A consumer
reading `COLOR.light['foreground.3']` got a plain string and no error anywhere. The test that
"proved" the brands differ was true and **vacuous**.

Now real: the TypeScript target emits `TEXT_TOKENS` and `LARGE_TEXT_TOKENS` derived from the
manifest's own `usage` field, and the two types are literal unions of those names. The
non-assignability is structural, cannot drift from the manifest, and the test asserts a
genuine token IS assignable — the baseline the old version lacked.

### The gap in the mutation proof, which is the finding I would keep

**Nothing isolated `checkContrast`.** Case 1 ("a token nudged below AA") changes a token's
`oklch`, which *also* breaks the ADR-0043 derived-hex check — so gate 9 went red either way.
Verified by neutering it: with `passes: true` hard-coded, **gate 9 still exits 0**, and all
eight mutations still held. There was also no unit test for `checkContrast`,
`requirementFor` or `checkChromaCeiling` anywhere.

The AA comparison — the single most load-bearing line in the feature — was indistinguishable
from a no-op. Now covered by `test/check.test.ts` (11 assertions, including both directions of
`passes` and an independently recomputed ratio) and by a ninth proof case that neuters the
comparison and asserts the package tests catch what gate 9 cannot.

### Also corrected

- **`turbo.json` gave `test:contrast` `dependsOn: ["^build"]`** — its own build was not a
  dependency, so `pnpm --filter @irodora/design-tokens test:contrast` validated whatever
  `dist` happened to contain. Freshness held only incidentally. Now `["^build", "build"]`,
  confirmed with `turbo run test:contrast --dry=json`.
- **The severity-sweep decoy did not discriminate.** It filtered on `severity < 1`, which also
  matches rows scoring 100 at *every* severity where index 0 wins the tie. It now requires a
  row whose worst is strictly below its score at severity 1.0 — the same lesson as the gate-10
  decoy, one level up.
- **Stale measurements**, all re-measured: `CVD_SEVERITIES`' doc said 61.2/65.8 (actual
  **64.0/67.1**); the test comment said a 4.6-point gap (actual **3.1**); `gates.json` and
  `progress.md` said the replacement decoy takes the pair 65.2 → 30.0 (actual **64.1 → 31.8**,
  which is what the decoy's own name already said — *the record of the re-measurement was not
  itself re-measured*); `effects.json` said six mutations where there are nine cases.
- **Evidence counts were overstated**: color-golden is **299**, not 312; cvd is **41**, not 43.
  My summing double-counted. F-003 added no golden datasets.
- **Gate 15 (security) is active and I listed it as NOT run.** It runs and passes: gitleaks
  over 50 commits, no leaks; `pnpm audit`, nothing high or critical.

### Two findings recorded rather than fixed

**Coverage is per-token, not per-combination.** `uncheckedReason` catches a token nobody
names, but says nothing about an undeclared *combination* between two covered tokens. The
evaluator measured these, and they exist nowhere else:

| undeclared combination | ratio | would need |
|---|---|---|
| `light foreground.3 / surface.3` | 2.97:1 | 3.0 |
| `light foreground.3 / swatch.well` | 2.86:1 | 3.0 |
| `light status.ok / surface.3` | 4.36:1 | 4.5 |
| `light status.warn / surface.3` | 4.48:1 | 4.5 |
| `light status.ok / swatch.well` | 4.21:1 | 4.5 |
| `dark status.bad / swatch.well` | 4.00:1 | 4.5 |

None is declared, so none is checked, and both tokens in each pair are "covered". Which
combinations are real is a component question — **F-017** — but the numbers are now written
down instead of being rediscovered.

**`uncheckedReason` gives "cannot be checked" and "would fail" the same escape hatch.**
`swatch.well` genuinely has no fixed second colour; `border.strong` simply does not meet 3:1.
Both are declared loudly and `border.strong` has F-070, but the mechanism does not distinguish
them, and it should.

**Gate 4 is flaky, pre-existing.** `packages/testing` → `createPrng > stays inside [0, 1)`
timed out at 5000 ms under the 37-task parallel run; passes in isolation in 1.8 s. A
100k-iteration loop on the default timeout is a gate that can go red for a non-behavioural
reason. Not F-003's, and not fixed here — recorded so the next red run is not mistaken for a
regression.

### What that cost in values

Fixing (2) meant the palette had to move again — three small changes, all measured:
`dark.status.warn` chroma 0.125 → 0.130, `light.status.ok` chroma 0.100 → 0.090,
`light.status.bad` L 0.410 → 0.400 and chroma 0.160 → 0.150. Worst separation across **both
models and all eleven severities** is now **64.1 dark / 63.2 light**, against a required 60.

### The one finding I did not fix, and why

**`dark.status.bad` sits at APCA Lc −37.5 to −38.6** — below the Lc 45 *large-text* floor —
while WCAG reads 4.92:1 and passes. ADR-0044 classifies `status.*` as `text` precisely because
the product tints the label, so this is body copy below even the large-text floor in the
default theme.

I measured whether it could be fixed in isolation: holding `ok` and `warn`, **no value of
`bad` reaches even Lc 40 while keeping separation ≥ 60.** The APCA floor and the CVD minimum
are in direct tension at the current lightness arrangement. A jointly feasible trio exists
(dark ok L 0.67, warn L 0.70, bad L 0.82 — every token above Lc 45, worst separation 63.1) but
it makes error the *lightest* token in the dark theme, which is the same wholesale
re-arrangement as the cross-theme salience question. Folded into **F-067** with the numbers.
Meanwhile gate 9 prints those three pairings in a separate **red** band on every run, so they
cannot be mistaken for the ordinary WCAG/APCA disagreements.

### Smaller corrections from the same review

- **ADR-0044 had a wrong unit** — "11/255 in linear terms" is the *encoded* byte; linear is
  0.0032.
- **`chromaCeiling.surfaceAndText` kept its old name** after the rule became universal, which
  is an invitation to re-derive the exemption-by-classification bug from the field name.
  Renamed `maxChroma`.
- **ADR-0043's ΔE00 column did not say which Lab.** It is D65 per ADR-0003; colorjs.io
  defaults to D50 and reports up to 0.3 lower.
- **`packages/cvd-engine/src/machado.ts` claimed** the matrices are applied in encoded sRGB
  because "that is how every reference implementation applies them". That is false — R's
  `colorspace` moved to linear RGB, and DaltonLens applies them in linear. The convention here
  is still defensible (it matches the paper's illustrations and culori, our transcription
  oracle), but the stated reason was wrong. Corrected, and the palette was recomputed under
  **both** conventions: worst status pairing **61.9 linear / 64.0 encoded**, clearing 60 either
  way. A conclusion that survives both readings does not depend on the fork.
- **The manifest said `"status": "approved"` with `approvedAt: 2026-08-14`** while carrying six
  tokens authored on the 15th that no human approved — in the one field a gate reads. It now
  also carries `valuesChangedSinceApproval` naming the tokens, the ADR and who did review it.

**F-070** records `border.strong` with its measured ratios: it is an outlined control boundary
under WCAG 1.4.11, it fails under the encoded model in both themes, and reaching 3:1 needs
~53% alpha — a solid grey line, which the design system explicitly forbids. That conflict is a
design decision, not a value tweak.

### Recorded as features

- **F-067** — the two themes assert **opposite** salience hierarchies. Against its own ground
  the dark theme says caution is loudest and error quietest; light says error is loudest by
  nearly 2×. **Pre-existing**, not introduced here: it follows from holding OKLCh `L` rank
  constant across two grounds of opposite polarity. A jointly feasible fix was computed and is
  recorded in the feature, but it inverts the dark theme's lightness hierarchy wholesale,
  which is a person's decision.
- **F-068** — swatch edge treatment against an arbitrary sample. Also asks that a real dark
  garment colour be put on the corrected `swatch.well` and looked at: `#2B2A28` is darker than
  the `#383533` the design review saw, because that hex was the ADR-0043 defect.
- **F-069** — a status colour may not sit beside a colour sample without the `swatch.well`
  separator. Simultaneous contrast pushes the sample the opposite way, and the Lens result is
  exactly where a low-confidence indicator wants to live.

### Where the work is

Committed on **`feat/F-003-design-tokens`**, two commits, **not pushed** — there is no remote,
and pushing is the human decision either way. The tree is clean.

### Next

R1 continues at **F-009** (gamut mapping) — `blockedBy: F-006`, which is done.

Worth doing at some point, and not blocking: the gate-4 flake in `packages/testing`, and
making `uncheckedReason` distinguish "cannot be checked here" from "does not pass".

R0 is complete.

---

## 2026-08-15 — F-008 DONE · the CVD engine, and a gate that could not fail

**Gate 10 (`cvd`) is active.** Machado anomalous trichromacy works across continuous severity,
Viénot dichromacy works for protan and deutan, and the separation score exists — one
definition, which is what E-005 is about.

**F-008 is done, with criterion 1 partly ATTESTED** (ADR-0038). Machado for all three
deficiencies and Vienot dichromacy for protan and deutan are gated; **tritan dichromacy is
owed** and blocks release. Read "The Brettel construction was attempted and refuted" for why,
and what discharges it.

### Evidence

```
  ✓ gate 0   state          14 checks, 12 warnings
  ✓ gate 1   typecheck      37 tasks
  ✓ gate 2   lint           37 tasks + 10 guards + engine purity (proven)
  ✓ gate 3   format
  ✓ gate 4   test           654 tests
  ✓ gate 5   color-golden   298 tests
  ✓ gate 10  cvd            12 tests — ACTIVE, after being watched fail
  ✓ gate 6   build          25 tasks
  ✓ mirror   9/9 active gates

NOT run: e2e, a11y, contrast, content, perf, web-perf, e2e-full.
```

### The finding: gate 10's first decoy could not fail

The gate was written, it passed, and the mutation proof said otherwise. **Deleting the
lightness term from `separation.ts` entirely and re-running gate 10 passed.**

The decoy pair — a navy against a pale olive — has both terms saturated, so removing one
changed nothing. The test asserting "a score ignoring lightness would rate this pair lower"
was comparing 100 against 100.

Then I overcorrected: measuring one more pair suggested the lightness term was inert
altogether, and I nearly recorded that as a design defect. **It is not.** The term binds
whenever `lightnessTerm > differenceTerm`, which happens for roughly **9% of sampled pairs** —
ΔE00 already contains the lightness difference, so the two are strongly correlated but not
identical.

Three things changed as a result:

- the decoy uses the pair where the term contributes **14.6 points**;
- the **binding frequency is asserted**, so the case is not a hand-picked anecdote;
- the mutation proof is recorded in `gates.json`: term deleted → exit 1, restored → exit 0.

[[a-decoy-that-is-not-broken-proves-nothing]], for the second time this session, and the first
time where the decoy's failure was invisible until the mutation was actually run.

### Transcription, stated precisely rather than implied

`culori` carries all 33 Machado matrices on disk citing the Oliveira lab tables, so **it is
the transcription source for 30 of them.** Asserting that ours match culori's would compare a
value against a copy of itself — the failure shape of both previous features — and the module
comment says so instead of implying a check that is not there.

What is independent:

1. **The three severity-1.0 matrices were reproduced from memory before the tables were
   transcribed, and matched all 27 numbers.** That validates the transcription *channel*.
2. **Severity 0 is exactly the identity** in all three tables.
3. **All 99 rows sum to 1 within 1e-6.** A mistyped digit almost anywhere breaks it.

The Hunt–Pointer–Estévez inverse was written from recall and was **wrong from the 8th digit**.
The `M · M⁻¹ = I` check caught it — the third time that check has paid for itself.

### Criterion 2, and the first attempt that failed it

Confusion pairs built from the classic **published copunctal points** collapse from ΔE00 51.2
to **5.2** — a tenfold collapse, and not the under-2 the criterion requires.

The reason is a real finding: **the published copunctal points and Viénot's matrices come from
different cone fundamentals**, and mixing them leaves a residual. Using the kernel of the
published matrix itself — the confusion line those matrices actually define — gives
**17.3 → 0.089** (protan) and **20.6 → 0.494** (deutan).

Both halves are asserted, because a simulation returning a constant passes the collapse alone.
The 5.2 figure is a golden entry so nobody re-derives it and concludes the simulation is broken.

### Also settled before the comparison ran

**culori's severity interpolation is dead code** — `Math.round(t % 0.1)` is always 0, so
`filterDeficiencyDeuter(0.15)` returns the 0.1 result. This was written into the plan *before*
the oracle test ran, so when the disagreement appeared it was already classified. The oracle is
consulted only at the eleven tabulated severities, where it is a real check; ours interpolates,
and a test asserts our 0.15 sits strictly between the neighbours while culori's equals one.

### What is not delivered

- **Tritan dichromacy — now an ATTESTED obligation (ADR-0038), not a silent gap.**
  `simulateDichromacy` **throws** for it. Viénot's single-plane
  simplification is not accurate for tritanopia, whose two half-planes diverge substantially,
  and a silently-wrong tritan simulation would feed the separation score and produce an
  accessibility claim nobody could trace. A function that refuses is the honest shape while
  the full two-half-plane Brettel 1997 construction is unwritten.

  **That is the remaining work, and it has no oracle** — neither `culori` nor `colorjs.io`
  implements Brettel. The check will have to be the confusion-line property, as it is for the
  other two.

  **The blocker is identified and pinned as a golden entry.** A copunctal point is the
  chromaticity of the missing cone fundamental, so it is derivable from the LMS→XYZ columns.
  HPE gives tritan (0.1680, 0.0000) against the published (0.171, −0.003) — agreement to
  0.003 — but protan (0.8374, 0.1626) against (0.747, 0.253), and deutan (2.3019, −1.3019)
  against (1.400, −0.400). **`XYZ_TO_LMS_HPE` is the wrong fundamental set**; the published
  points are Smith–Pokorny, which is also what Viénot derived from. That is the same reason
  the copunctal-point pair leaves a 5.2 ΔE00 residual. The remaining construction needs
  Smith–Pokorny plus the four anchor stimuli (475/575 nm for protan and deutan, 485/660 nm
  for tritan) — 9 + 12 numbers with no oracle, checked only by the confusion-line property.

- **The separation weights are not calibrated.** `SEPARATION_DELTA_E_CEILING`,
  `SEPARATION_LIGHTNESS_CEILING` and `SEPARATION_LIGHTNESS_WEIGHT` are named constants with a
  stated rationale and nothing asserts them as thresholds. F-029 moves them into versioned
  content. Nothing in gate 10 should be read as a tuned figure.

- **E-005 is guarded at the source end only**, like E-001 and E-003 before it. Its consumers —
  F-030's recommendation scoring, F-032's CVD outfit mode, F-003's `cvdPairs` — do not exist.

### The Brettel construction was attempted and refuted, not abandoned

Finishing criterion 1 means the two-half-plane Brettel construction for tritan. It was tried,
and two checks refuted it before anything shipped.

**The fundamental set is now settled.** Smith–Pokorny reproduces **all three** published
copunctal points — protan 0.0007, deutan 0.0002, tritan 0.0048 — where Hunt–Pointer–Estévez
reproduces only tritan. That was the open question from earlier in this entry, and it is
closed.

**The anchor stimuli are the blocker.** Brettel needs the LMS coordinates of monochromatic
lights at 475 and 575 nm (protan, deutan) and 485 and 660 nm (tritan). An implementation using
recalled values was checked two ways:

1. **Against Viénot** — which is the published *single-plane reduction of Brettel*, and
   therefore a genuine oracle for protan and deutan, contrary to what this session earlier
   assumed. Worst disagreement **32.5 ΔE00** (protan), **57.4 ΔE00** (deutan), concentrated on
   blues.
2. **The diagnostic that explains it.** Viénot's simplification is valid *because* the two
   half-planes are nearly coplanar. With the recalled anchors the angle between the half-plane
   normals is **88.4°**, where validity requires ≈0°.

So the anchors are wrong, or in a normalisation inconsistent with this white point — and the
second check says which, rather than leaving it as "the numbers disagree".

**They cannot be derived in this repository.** LMS at a wavelength needs CIE colour-matching
functions. There is no spectral data anywhere in the dependency tree, and neither `culori` nor
`colorjs.io` implements Brettel.

**Finishing this is a decision, not a coding task.** Three options, none of which should be
taken by whoever picks this up next without saying so:

- **Vendor CIE colour-matching functions.** A content and licensing question
  ([`content/AGENTS.md`](../../content/AGENTS.md)), and it adds spectral data to a repository
  that currently has none.
- **Obtain a trustworthy transcription of Brettel's published anchor table** — which needs the
  paper, and the same two checks above as acceptance.
- **Attest criterion 1 under [ADR-0038](../../docs/adr/0038-every-acceptance-criterion-names-its-check.md).**
  Protan and deutan dichromacy are delivered and gated; tritan dichromacy becomes an
  outstanding obligation with a named verification.

The third is defensible: tritanopia is by far the rarest of the three, Machado tritanomaly
*is* delivered across full severity, and the separation score covers all three deficiencies
through the Machado path. But it is a scope decision about an accessibility guarantee, so it
is recorded here rather than taken quietly.


### Watch out

- **Machado operates on ENCODED sRGB; Brettel/Viénot operates in LINEAR light.** The two
  models differ on this deliberately — it is what each source specifies — and swapping either
  is a plausible-looking change that alters every result.
- **`simulateDichromacy` throws for tritan.** Any caller iterating all three deficiencies must
  handle it; `hasDichromacySupport` exists for that.
- **The separation score's lightness term binds for only ~9% of pairs.** A future change that
  makes it bind for 0% will still pass most of gate 10 — the binding-frequency assertion is
  what catches it.

### Next

**F-003 is now eligible** — F-008 closed with its tritan obligation attested rather than
silently dropped. F-003 — and it carries the manifest defect this session found: 37 of 38
opaque tokens have an `srgb` hex that contradicts their own `oklch`.

---

## 2026-08-15 — F-007 DONE · ΔE00 is the ranking authority, and a rounding that decides accessibility

**ΔE00 exists in code.** Every naming result, duplicate warning, CVD separation score and
recommendation ranking the product will ever produce now has a function behind it
([E-003](../state/effects.json)).

### Evidence

```
  ✓ gate 0   state          14 checks, 12 warnings (11 attested + E-009)
  ✓ gate 1   typecheck      37 tasks
  ✓ gate 2   lint           37 tasks + 10 boundary guards + engine purity (proven)
  ✓ gate 3   format
  ✓ gate 4   test           624 tests
  ✓ gate 5   color-golden   280 tests — 139 cited entries across 10 datasets, 2 identity digests
  ✓ gate 6   build          25 tasks
  ✓ gate 15  security       gitleaks clean · audit clean

NOT run: e2e, a11y, contrast, cvd, content, perf, web-perf, e2e-full — each
         activates with its own feature. `contrast` (F-003) is now partially
         unblocked: it has its WCAG and APCA arithmetic, and still needs F-008
         for cvdPairs.
```

### What was built

`@irodora/color-difference`: ΔE76 · ΔE94 (both weightings) · **ΔE00** · ΔEok · WCAG 2.x
contrast · **APCA 0.0.98G-4g**.

- **All 34 Sharma–Wu–Dalal pairs to four decimal places.** Worst deviation 4.95e-5, which is
  the paper's own rounding rather than slack — and that margin is pinned, so a future
  tolerance widening is visible.
- **APCA asserted bitwise against `colorjs.io`.** `toBe`, not a tolerance; worst difference
  across the set is exactly 0.
- **Every constant pinned digit-for-digit at tolerance 0** — the check F-006 did not have.

### The transcription check, which is the real deliverable

F-006 shipped a dropped digit that six golden datasets, two oracles and a matrix-inverse check
could not see. This feature is 34 rows × 7 numbers plus 24 constants, so the same failure was
the dominant risk — and **a typo and a genuine bug are indistinguishable from inside**: both
present as "our answer disagrees with the expected one".

So the reference data is checked **separately from the implementation**. `culori` computes
ΔE00 on every transcribed pair independently; a row a third-party implementation also
reproduces is a row whose seven numbers are internally consistent, and any remaining
disagreement is ours. A decoy perturbs one number and confirms the consistency actually
breaks.

It earned its place immediately, on a smaller scale: two golden entries were first written
with more decimal places than the probe that produced them had printed — digits I did not
have. The test caught it at 4.4e-7.

### The finding: a rounding that decides accessibility

WCAG normatively specifies relative-luminance coefficients rounded to four decimals. Our
engine has them to seventeen. The plan asserted that mattered; this feature measured it:

| `rgb(27, 129, 156)` on white | ratio | AA at 4.5:1 |
|---|---|---|
| WCAG's published coefficients | 4.49990508 | **fails** |
| the exact sRGB Y row | 4.50007872 | **passes** |

A sweep of 8-bit colours against white found **111 such flips** across the 3:1, 4.5:1 and 7:1
thresholds.

So `wcagContrast` carries WCAG's constants rather than calling `srgbToXyz`, and "the
difference is only 5e-4, just use the engine" is a WCAG conformance claim the specification
does not support. **[ADR-0041](../../docs/adr/0041-three-luminance-definitions-coexist-deliberately.md)**
records that three luminance definitions now coexist deliberately — engine, WCAG, APCA — and
why none may be substituted for another.

Two supporting facts, both measured:

- WCAG's coefficients sum to **exactly 1**, so a *neutral* has bit-identical luminance under
  WCAG and under the engine. Every grey agrees; only chromatic colours diverge. **A test suite
  built from greys concludes the three definitions are interchangeable.**
- APCA's sum to **1.0000001**, so `apcaLuminance(white)` is not 1. It looks like a defect to
  normalise away, and normalising it would break every published Lc value.
- APCA linearises with a **pure power function**, no linear segment. At 8-bit code 3 that is a
  factor of 39 from the piecewise curve — and it is correct, because it is what APCA specifies.

→ [[reproducing-a-standard-is-not-the-same-as-being-accurate]]

### Also settled by measurement rather than memory

**Which WCAG transfer cutoff.** WCAG publishes `0.03928`, IEC publishes `0.04045`. `0.03928 ×
255 = 10.0164` and `0.04045 × 255 = 10.3148`, so **no 8-bit code lies between them** — over all
256 codes the maximum difference is exactly 0. We use WCAG's because this package reproduces
WCAG; the choice has no numeric consequence for any colour WCAG contrast is ever applied to. A
decoy asserts the two *do* differ inside the band, so that is a reason rather than a
coincidence.

### Symmetry, asserted in both directions

Acceptance criterion 5 asks for symmetry and identity. The honest reading is that symmetry
must be asserted **where it holds and where it does not**:

- ΔE76, ΔE00, ΔEok and WCAG contrast are symmetric — asserted `toBe`, bitwise. A metric that is
  only *nearly* symmetric ranks A-then-B differently from B-then-A, which surfaces as an
  unstable sort rather than as a failing test.
- **ΔE94 is asymmetric by specification** (2.4% here) and **APCA is asymmetric by design**.
  Asserting symmetry for either would fail, or be quietly deleted by whoever met it next.
- ΔE94's asymmetry comes with the reason it hides: `Sc` and `Sh` depend only on the reference
  colour's chroma, so two colours of *equal* chroma give the same answer either way round.

Identity is `toBe(0)` — exactly zero, not merely small. An implementation returning 1e-16 would
rank a colour as marginally different from itself.

### Delivered against acceptance

| # | Criterion | Status |
|---|---|---|
| 1 | ΔE76, ΔE94, ΔE00, ΔEok implemented | **Done** — ΔE94 in both published weightings |
| 2 | All 34 Sharma–Wu–Dalal pairs to 4 dp | **Done**, worst 4.95e-5, each pair transcription-checked independently |
| 3 | WCAG contrast matches the specification's worked examples exactly | **Done** — with WCAG's own constants, and the 111-flip measurement showing why that is required |
| 4 | APCA Lc computed and reported alongside | **Done** — 0.0.98G-4g, bitwise against colorjs.io, version exported because "Lc 62" without one is not reproducible |
| 5 | Property tests assert ΔE symmetry and identity | **Done**, in both directions |

### The colour-science review ran, and found six things

Owed since F-006, and it did not come back clean. Verdict: **CHANGES REQUIRED, on a green
board.**

**What it could not break.** It transcribed the 34 Sharma–Wu–Dalal pairs independently and
matched all 238 numbers; wrote a fresh CIEDE2000 from the paper's equations (agreement
1.2e-14); and verified OKLab, the transfer function, CIELAB, adaptation, ΔE94 and APCA against
`culori` and `colorjs.io`. **No trap on the list is present in any computed value.**

**1. The WCAG cutoff was the superseded constant.** `0.03928` is the original WCAG 2.0 text;
W3C corrected it by errata in May 2021, and WCAG 2.1 and 2.2 both publish `0.04045`. ADR-0021
gates on WCAG 2.2 — so the version implemented and the version enforced were different
documents. Corrected under **[ADR-0042](../../docs/adr/0042-wcag-luminance-cutoff-is-004045-not-003928.md)**,
which exists because this is a golden value change.

Worth exactly **0 for 8-bit input** — no integer code lies between the two — and up to
**7.55e-7 in luminance** for float input, which is 6.6e-5 in a contrast ratio. The Lens
produces float sRGB straight from camera samples, so it is not academic. No published contrast
figure moved; the difference identity digest did, and was regenerated as the intended change
its own docstring permits.

**Nothing in this repository could have caught it.** The constant was pinned digit-for-digit,
at tolerance 0, in a golden entry, with a citation — and every one of those compared the
transcription against the same superseded source. **A digit-for-digit entry proves a
transcription is faithful; it cannot prove the source is current.** The only thing that
catches this class of error is someone going back to the published document.

**2. A comment was wrong by 750×.** `luminance.ts` said the cutoff difference was "around
1e-9". It is 7.55e-7. The 2.3e-9 figure is the *step between the two branches at the join* — a
different quantity, which the engine's transfer module states correctly and separately. That
conflation is precisely why nobody re-examined the constant.

**3. ADR-0041's "111 flips" did not reproduce.** The full 16,777,216-colour sweep gives
**984**. Mine came from a strided sweep and was written up as the full one. The direction of
the argument is unharmed — 984 supports it more strongly than 111 — but an ADR whose entire
authority is "rejected on measurement" must name a measurement that reproduces. Corrected in
the ADR and in the test comment.

**4. The naive-hue decoy named the wrong pairs and never ran the mutation.** The test asserted
only that the raw hue difference exceeded 180° for pairs 9–15, and the source comment claimed
those pairs catch an unwrapped hue difference. Both wrong: **pairs 9–15 all pass** under the
mutation. It is caught by **16, 17 and 19** — pair 19 by 10.8 ΔE00. Pairs 9–15 have ΔC′ ≈ 0
and near-equal chroma, so the sign flip is squared away and the `Rt` cross-term vanishes; they
test the branch *selection* at exactly ±180°, which is a different defect.

The test now builds the full mutated implementation, asserts exactly which pairs fail, and
asserts that 9–15 do not. The wrap itself was always correct — this was a documentation and
test-strength defect, in the file that teaches the next person which pairs guard what.

**5. The Ottosson entries cannot discriminate between the candidate OKLab matrices.** They
pass with **both** his original ten-decimal set and CSS Color 4's recalculation, and on two of
the four rows ours is the *further* away. They verify the transform is the right transform.
What actually discriminates is the digit-for-digit matrix entries, the exactly-neutral-white
entry at 1e-15, and bitwise agreement with `colorjs.io`. The dataset description implied
otherwise and now says this.

**6. OKLCh of a neutral returns hue 180°, and nothing pinned it.** Harmless at C = 5e-16 — and
not harmless if read and re-applied, since F-014 rotates hue in OKLCh and a hue taken from a
near-neutral and used at C = 0.1 produces cyan out of white. Now a golden entry. **Check
chroma before hue.**

### Found outside this feature, and it blocks F-003

**37 of the 38 opaque tokens in `design-system.manifest.json` have an `srgb` hex that does not
match their own `oklch`.** Not marginal: `color.dark.background` is stated `#141312` and its
`oklch` resolves to `#090807` — more than a factor of two in Y. The engine and `colorjs.io`
agree with each other on the conversion, so the two fields were produced by different means.

Verified independently before recording. The contrast gate reads this file, so whichever field
it reads, the other is wrong. Recorded on F-003, which must resolve which field is
authoritative **before** the gate is built.

### Honest gaps
- **E-003 is guarded at the source end only.** The consumers it names do not exist:
  `color-naming` is F-013, `recommendation` is F-030, the `cvd` gate activates with F-008.
- **APCA is not a normative standard and is pinned to one revision.** ADR-0021 stands: reported
  alongside WCAG, never substituted, disagreements go to design review.
- **The identity digests still prove platform-API freedom, not engine independence.** Both legs
  run on V8. This package is where a divergence would appear first — CIEDE2000 alone calls
  `atan2`, `exp`, `sin`, `cos` and `pow`, all implementation-approximated by ECMAScript.

### Watch out

- **`culori`'s ΔE00 must be tagged `lab65`, never `lab`.** Tagging D65 Lab as `lab` makes culori
  adapt it from D50 first and every Sharma pair reads 9–13% low.
- **ΔE94 takes the reference first.** Swapping the arguments is a different number.
- **APCA takes background first, text second, and the sign is the polarity.** `Math.abs` on an
  Lc throws away half the answer.
- **ΔEok white-to-black is 1, not 100.** A threshold copied from a ΔE00 context is off by two
  orders of magnitude.
- **Two identity fixtures now exist**, one per engine package, because the dependency runs
  difference → spaces and a shared fixture would have to live in neither. Regenerate both with
  `node scripts/generate-identity-fixture.mjs`.

### Next

**F-008 — CVD engine and separation scoring**, blocked only by F-007. Carry the F-003 manifest finding with it: F-003 unblocks after F-008. It consumes ΔE00 from
here and activates gate 10. After it, **F-003 becomes eligible** and R0 can finally close.

Nothing is `in_progress`.

---

## 2026-08-14 — F-006 DONE · the colour engine exists, and an independent review found the defect the gates could not

**R1 has started.** Eight colour spaces convert in both directions through CIE XYZ (D65), and
**gate 5 (`color-golden`) is active**.

**Read the review section before anything else.** The most useful thing this feature produced
is not the engine; it is the demonstration that a full green board, six mutation-proven
datasets and two independent oracles can all agree while a wrong constant sits in the
matrices — and that the separation of implementer from checker is what caught it.

### Evidence

```
  ✓ gate 0   state          14 checks, 12 warnings (11 attested + E-009)
  ✓ gate 1   typecheck      37 tasks
  ✓ gate 2   lint           37 tasks + 10 boundary guards + engine purity (proven)
  ✓ gate 3   format
  ✓ gate 4   test           455 tests
  ✓ gate 5   color-golden   129 tests — 64 cited golden entries + the identity fixture
  ✓ gate 6   build          25 tasks
  ✓ gate 15  security       gitleaks clean · audit clean

  ✓ mirror proof            8/8 active gates, each watched fail when its CI step is removed
  ✓ engine purity           both rules proven, baseline asserted clean before and after

NOT run: e2e, a11y, contrast, cvd, content, perf, web-perf, e2e-full — each
         activates with its own feature; none has an applicable surface here.
```

### What was built

`@irodora/color-spaces`: sRGB · Display-P3 · linear sRGB · XYZ (D65) · CIELAB · CIELCh ·
OKLab · OKLCh, plus CAT16 and Bradford chromatic adaptation. Zero runtime dependencies, no
`node:*`, no DOM, no `process`. `@irodora/testing` gained the seeded PRNG, the stratified
sampler, the IEEE-754 digest and the golden-dataset validator — all platform-free.

**56 ordered round-trip pairs, 10 000 stratified samples each, all within ΔE00 0.01** — real
worst case 1e-9, pinned separately so a degradation to 0.009 cannot pass silently.

**Bitwise identical to `colorjs.io`** on XYZ, Lab-D65, P3, linear sRGB **and OKLab** — 0, not
1e-15. `culori` agrees to 1e-14.

### The review, and what it found

The evaluator subagent ran every gate independently and returned **FAIL** on a green board.

**`XYZ_TO_LMS_OKLAB[3]` was `0.032984543`. Ottosson publishes `0.0329845436`.** A dropped
digit — 1.8e-8 relative. Nothing caught it:

- Ottosson's reference table is quoted to **three decimals** and resolves a 2% error, not a
  1.8e-8 one. The golden file's own description claimed those entries were "what catches a
  transcribed digit in M1 or M2". They cannot.
- The oracle cross-check had **7.6e-5 of headroom**, because it was accommodating a 1.24e-4
  disagreement believed to be structural.
- The `M · M⁻¹ = I` check is **structurally incapable** of finding it: the stored inverse was
  computed *from* the forward matrix, so the identity holds whatever the forward matrix says.
- Seven `published-formula` golden entries were **bitwise equal to our own output** and missed
  their own stated tolerance against the formula they cited by 200×–96 000×. That is the exact
  thing `assertGoldenDataset` exists to prevent, passing because a validator can check that a
  citation string is non-empty and not that it is true.

**Two checks each described as covering the other's blind spot, and the defect in the gap.**

Following the lead further produced a larger correction. **[ADR-0039] was wrong**, and is now
superseded by **[ADR-0040]**. It had claimed `culori` and `colorjs.io` reach OKLab by
Ottosson's direct linear-sRGB matrix while we compose through XYZ, and that the 1.24e-4
disagreement was therefore permanent. `colorjs.io` declares `base: XYZ_D65` — the same path as
ours. Reading its source settled it, and its own comment names the real cause: both libraries
carry **CSS Color 4's recalculation** of Ottosson's transform for a consistent reference
white, and we carried the original.

Adopting the recalculated constants:

| | before | after |
|---|---|---|
| D65 white chroma | 1.25e-4 | **5e-16** |
| worst difference vs `colorjs.io` | 1.24e-4 | **0 — bitwise** |
| worst difference vs `culori` | 1.24e-4 | **8.9e-16** |
| worst ΔE00 vs `culori` | 0.046 | **0** |

The white residual had been documented as an inherent property of OKLab and asserted in the
golden set as such. It was an artefact of matrix vintage. **`culori` reaches OKLab by the
direct path and agrees to 1e-15 anyway — which is the direct evidence that the path never
mattered**, the claim ADR-0039 was built on.

**The reasoning error is the transferable part.** Two independent libraries disagreeing with
us by an identical amount was read as proof of a structural difference. It was equally
consistent with both of them being right and us being wrong in one place. *Both oracles
agreeing with each other and not with us is evidence about us.*

**The check that now exists:** the four OKLab matrices are golden entries in their own right,
compared **digit for digit at tolerance 0**. It would have failed on day one.

### Six further findings, five from a claim of mine that was not true

1. **`culori`'s ΔE00 read 9–13% low against every Sharma–Wu–Dalal pair — and culori was
   right.** `differenceCiede2000` normalises with `converter('lab65')`, so D65 Lab tagged
   `lab` (culori's D50 mode) is chromatically adapted before being measured. The plan had
   specified exactly that tag, with backwards reasoning. Ten percent is the dangerous size.
   → [[an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour]]

2. **The OKLab M1 inverse was transcribed wrong by 7.6e-4** and every conversion still
   returned plausible numbers. Found by asserting `M · M⁻¹ = I` across all six matrix pairs.
   The same check found the CAT16 inverse printed in the literature is rounded to 8 decimals
   and leaves a residual forty times worse than the hardware can do.

3. **CAT16 and Bradford disagree by up to 8.57 ΔE76 on saturated blue** — median 0.15. I had
   asserted "within 3". Blue is half this corpus.
   → [[the-adaptation-transform-is-a-product-decision-not-a-detail]]

4. **A golden set's blind spot must be measured, not described.** The first OKLab decoy was a
   real mutation the set could not see. The set's discriminating power is now bisected and
   asserted, limitations included.
   → [[measure-what-a-golden-set-can-detect-before-trusting-it]]

5. **"A transposed matrix survives a white-point check" is false** — transposing moves Y by
   0.19. The mutation that *does* survive is swapping two **columns**: white is the column
   sum, so any permutation leaves it bit-identical while red and green trade places.

6. **Gate 0 was scanning `node_modules`.** Its scoped-harness count moved 14 → 13 when an
   unused dependency was removed; the real number is 7. `walk()` used `statSync`, which
   follows symlinks, with no exclusion — so a scan for language *weakening a golden rule* was
   reading third-party files. Fixed with `Dirent` plus a skip list, proven both directions.
   → [[a-directory-walk-that-enters-node-modules-is-checking-someone-elses-repository]]

The evaluator also corrected several of this entry's own numbers: 71 entries → **64**, six
datasets → **five**, task counts, and two causal claims stated more strongly than the evidence
supported. Those are fixed in place rather than footnoted.

### Delivered against acceptance

| # | Criterion | Status |
|---|---|---|
| 1 | Eight spaces, both directions | **Done** |
| 2 | CAT16, with Bradford available | **Done** — Lindbloom's published Bradford D65→D50 reproduced to 4.4e-8 |
| 3 | Golden datasets from published sources, near-black included | **Done** — 64 entries across 5 datasets, each declaring published-value, published-formula or definitional; an entry citing no source fails the load |
| 4 | Round trip every pair within ΔE00 0.01, 10 000 colours | **Done** — 56 pairs, actual worst 1e-9 |
| 5 | Node, browser and React Native bitwise identical | **Mechanism + Node leg gated. Browser and device executions attested** (ADR-0038) |
| 6 | Zero runtime dependencies; no `node:*`, DOM, `process` | **Done**, and now checked rather than claimed |
| 7 | Gate 5 activates | **Done** — after execution and after each dataset was watched reject a mutation |

### Honest gaps

- **Bitwise cross-platform identity is not proven and cannot be yet.** ECMAScript specifies
  `Math.pow` and `Math.cbrt` as implementation-approximated, so identity across V8,
  JavaScriptCore and Hermes is **not guaranteed by the language**. A browser ran the
  300 000-value fixture during this feature and matched the digest, but Node and Chromium are
  both V8 — that proves the engine holds no platform API, not that engines agree. **No
  artefact of that browser run exists in the tree**; it is a claim, not evidence, and the
  three places it appears all discount it. Hermes needs a device (F-039/F-040).
- **E-001 is half-guarded.** Gate 5 protects the source end. The destination end — stored
  corpus values still agreeing with the engine — is the `content` gate at F-011.
- **The Sharma–Wu–Dalal pairs are an oracle check in the round-trip test, not a golden
  dataset.** They belong to F-007. No WCAG or CVD data yet either; gate 5's description says
  so rather than implying coverage it lacks.
- **The colour-scientist review did not run.** It was launched alongside the evaluator and
  terminated on a session limit before producing findings. The domain-specific second opinion
  on this engine is **owed**, and F-007 touches the same maths.

### Watch out

- **Our Lab is D65. Almost everything else is D50** — CSS `lab()`, `culori`'s `lab` mode, most
  published Lab tables. Cross-check against `lab65` / `lab-d65`, or adapt first.
- **Two published D65 white points are in circulation.** We derive from x=0.3127 y=0.3290;
  tables commonly use the rounded XYZ `[0.95047, 1, 1.08883]`. Worth 0.004 ΔE76 on sRGB red.
- **OKLab constants are CSS Color 4's, not the ones in Ottosson's article** (ADR-0040).
  Checking ours against the blog post will show a seventh-decimal difference. That is correct.
- **The identity fixture cannot be regenerated from the test suite** — writing needs `node:fs`
  and the engine lint zone forbids it in tests. Use
  `node scripts/generate-identity-fixture.mjs`, deliberately. Current digest
  `da79e11f85d2dc2b`.
- **The toolchain is not on `PATH` by default.** Node 24.19.0 and pnpm 11.21.0 live at
  `%APPDATA%\nvm\v24.19.0`; the machine default is 22.16.0 and fails the engines check.

### Next

**F-007 — colour difference and contrast**, blocked only by F-006. It brings the 34
Sharma–Wu–Dalal pairs into a golden dataset, WCAG contrast against the specification's worked
examples, and APCA alongside. After F-007 and F-008, **F-003 becomes eligible** and R0 closes.

Two things to carry into it: the ΔE00 oracle must be tagged `lab65`, and **a colour-science
review is owed on the F-006 maths**.

Nothing is `in_progress`.

---

## 2026-08-14 — F-005 DONE · the stack runs, and "portable" is a check rather than a claim

**R0 is now complete except F-003**, which waits on the colour engine by design
([ADR-0037](../../docs/adr/0037-design-tokens-wait-for-the-engine-r0-closes-incomplete.md)).

### Evidence

```
  ✓ gate 0   state          14 checks, 12 warnings (10 attested + E-009 + ...)
  ✓ gate 1   typecheck      37 tasks
  ✓ gate 2   lint           36 tasks + 10 boundary guards
  ✓ gate 3   format
  ✓ gate 4   test           184 tests — incl. real Postgres and real Valkey
  ✓ gate 6   build          25 tasks
  ✓ gate 15  security       gitleaks clean (history AND staged) · audit clean

  ✓ mirror proof            7/7 active gates
  ✓ compose portability     11 rules, all mutation-proven
  ✓ image non-root          api + worker, uid 1000, proven to distinguish
  ✓ terraform               fmt + validate, in a container, mutation-proven

NOT run: color-golden, e2e, a11y, contrast, cvd, content, perf, web-perf,
         e2e-full — each activates with its own feature.
```

### The stack, verified by running it

`docker compose -f infra/compose/docker-compose.prod.yml up` → **five services healthy**:
api, worker, postgres, valkey, minio. Then torn down.

**No ports are published.** On a VPS a published port bypasses the platform's TLS and is
reachable from the internet — that is how a database ends up exposed. The API answers on the
compose network; curl from the host is refused.

**The health split, proven against a real outage** rather than a mocked one — Postgres
actually stopped:

```
/healthz  200  {"status":"ok",...}                      the container stayed up
/readyz   503  {"database":"unavailable","cache":"ok"}
(postgres restarted)
/readyz   200  {"database":"ok","cache":"ok"}           no restart needed
```

**Eight concurrent migrators against one Postgres**: exactly one ran, seven skipped for the
right reason, the migration body never overlapped itself.

### "Consumed unmodified by both platforms" became checkable

This came out of a design challenge — *never depend on deployments in code; use Docker to
simulate production*. Right in principle, and the interesting part was where it is **not**:
Docker proves *behaviour*, and "consumed unmodified" is a *compatibility* claim. Substituting
one for the other while keeping the wording would be ADR-0031's failure applied to our own
process.

So it was split, not substituted. Most of the residual risk turned out to be a **static
property of the file**, and `verify-compose-portability.mjs` now checks eleven of them —
`container_name`, host networking, published ports, bind mounts, unpinned images, missing
restart policies, missing healthchecks, Swarm-only keys, `env_file`, undeclared volumes,
and `depends_on` conditions with no healthcheck behind them. Each is something a platform
rejects or silently reinterprets. All eleven mutation-proven, with a passing baseline.

The deployment itself stays **attested** (ADR-0038) and gate 0 lists it every run.

### Four checks that looked right and were not

Every one found by running the mutation, never by reading the code.
→ [[a-decoy-that-is-not-broken-proves-nothing]]

1. **`AliasingBlob`** subclassed the in-memory store and delegated to `super.put`, which
   copies. The "broken" adapter behaved correctly.
2. **The Postgres lock-leak test re-used one pool.** Advisory locks are **re-entrant within a
   session**, so it asked the same connection whether it could take the lock it had just
   leaked — which always answers yes. The test could not detect the leak it was named after.
3. Fixing that exposed **`InMemoryDatabase` keeping locks per instance**, so two
   "connections" never contended. Locks now live in an `InMemoryLockTable` — the server, not
   the client, which is the topology a real database has.
4. **The compose proof harness matched `rule: X` against ANSI-coloured output** and reported
   all eleven rules as broken when every one had fired.

### Two bugs that would have shipped

- **The Valkey adapter would have reported the cache down at boot.** With ioredis' offline
  queue disabled, a command issued before the socket connects fails instantly with
  `Stream isn't writeable`. `/readyz` is polled from the moment a process starts, so the
  first probe would have said "unavailable" on a healthy cache and the orchestrator would
  have held traffic off a ready container. The regression test pings with **no delay**;
  adding one would hide it.
- **`apps/api` only compiled by accident** — Fastify's `.d.ts` was transitively supplying
  Node types, so its own `@types/node` was doing nothing. `apps/worker` has no Fastify and
  failed outright. Both now declare `types: ["node"]`.

### A red commit, and why

`15ad3f5` was committed while gate 15 was red. The command was
`pnpm security:secrets 2>&1 | tail -1 && git commit` — piping replaced the gate's exit status
with `tail`'s, so `&&` saw success. **"Never commit red" was not overridden; it was lost to
shell plumbing.** → [[a-pipe-discards-the-exit-status-a-gate-just-produced]]

Every gate in this feature since is invoked with its exit status read directly. The finding
itself was two invented test fixtures — fixed both ways, with the exemption verified narrow
by planting a token in a sibling file and confirming it is still caught.

### Delivered against acceptance

| # | Criterion | Status |
|---|---|---|
| 1 | Multi-stage Dockerfiles, non-root, pinned digests | **api + worker done.** `web` needs F-017 |
| 2 | Compose boots; consumed unmodified by both platforms | **Boots: done.** Compatibility: gated statically, deployment attested |
| 3 | `/healthz` process only; `/readyz` db + cache | **Done**, proven against a real outage |
| 4 | Migrations under an advisory lock; no race | **Done**, 8 concurrent migrators |
| 5 | Every dependency behind a port with a conformance suite | **Done** — cache, database, blob. E-011 |
| 6 | Deployed on a real VPS via Coolify AND Dokploy | **Attested** — no VPS, no remote |
| 7 | Terraform skeleton with remote state configured | Skeleton **done** and validated; remote state **attested** |

### Honest gaps

- **`Dockerfile.web` does not exist.** `apps/web` is a stub with no Next.js, so the image
  cannot be built, and an unbuildable Dockerfile is a wish. It lands with F-017 — recorded in
  `verify-image-nonroot.mjs`, in the compose file header, and in both runbooks.
- **The blob port has one adapter.** The suite runs but has not discriminated between two
  implementations; the S3 adapter arrives with F-042.
- **The image non-root check does not run in CI** — it needs the images built, which belongs
  with a release workflow.
- **Both runbooks are marked unexercised.** Nobody has followed them end to end.

### Watch out

- **`gitleaks detect` scans committed history**, so running it before staging does not see
  new files. That is why increment 4's scan passed and increment 5's failed on a file
  increment 4 added. Use `pnpm security:staged` before committing.
- **Terraform and gitleaks are not repo dependencies.** gitleaks is installed at `~/go/bin`;
  Terraform runs in a pinned container and needs nothing installed.
- **Postgres advisory locks are re-entrant per session.** Any future test of lock release
  must re-acquire from a second connection.

### Next

**R0 is done except F-003.** The next eligible feature is **F-006** — colour spaces and
conversion — the first R1 feature and the start of the colour engine. `/next-feature` →
`/plan`.

F-003 becomes eligible after F-007 and F-008.

---

## 2026-08-14 — F-005 IN PROGRESS · 3 of 8 increments · handoff (superseded)

> **Updated after increment 3.** The entry below is the running handoff; read it top to
> bottom. Increment 3 (`/healthz`, `/readyz`) is done and committed at `029314d`, plus
> ADR-0038 at `66bec26`. 175 tests. Next is increment 4, the migration advisory lock.
>
> **Acceptance criteria 6 and 7 are now `attested`, not blockers** — see
> [ADR-0038](../../docs/adr/0038-every-acceptance-criterion-names-its-check.md). F-005 can
> close on the gated criteria; the VPS deployment and Terraform remote state stay recorded as
> owed, and gate 0 lists them on every run.
>
> The compatibility half of criterion 2 is **not** deferred with them: a static
> `verify-compose-portability.mjs` lands in increment 6 and must be proven to fail on a real
> violation, like every other guard here.

**F-005 is claimed and `in_progress`.** Two increments are done, committed and green. This
entry is the handoff — the plan
([`F-005-deployment-profiles.md`](../plans/F-005-deployment-profiles.md)) holds the rest.

### Done and committed

| Increment | Commit | What |
|---|---|---|
| 1 — `@irodora/config` | `ae56dd1` | The environment contract: 46 variables as a Zod schema, profile-aware strictness, 18 tests |
| 2 — `@irodora/ports` | `15ad3f5` | Cache and blob ports + conformance suites, 4 broken adapters proven caught |
| — | `1f0f917` | Gate 15 false positive, fixed both ways |

### Evidence at handoff

```
  ✓ state · typecheck · lint (10 guards) · format · test (165) · build
  ✓ security   gitleaks 11 commits, no leaks · audit: no known vulnerabilities

NOT run: color-golden, e2e, a11y, contrast, cvd, content, perf, web-perf,
         e2e-full — none applicable.
NOT run: docker build, docker compose up — increments 5 and 6, not started.
```

### Two things worth carrying forward

**Gate 15 caught my own test fixtures, and I committed while it was red.** Two invented
32-character strings in `load.test.ts` were flagged as generic API keys — correctly; a
scanner cannot know a fixture is fake. Fixed in both directions: the fixtures now use the
placeholder vocabulary the config already allowlists, *and* a path-scoped exemption covers
the history that already has them. The exemption is one file, not `*.test.ts`, and its cost
is written beside it.

**The commit that shipped red did so because of a pipe.** The command was
`pnpm security:secrets 2>&1 | tail -1 && git commit`, and piping replaced the gate's exit
status with `tail`'s, so `&&` saw success. "Never commit red" was not overridden by a
judgement — it was lost to shell plumbing. **Read a gate's exit status directly; never
through a pipeline.** The same shape as
[[a-gate-that-errors-is-failing-open]], one layer further out: the gate worked, and the
harness around it discarded the answer.

**The conformance decoy that was not broken.** The first `AliasingBlob` subclassed the
in-memory store and delegated to `super.put`, which copies — so the "broken" adapter behaved
correctly and the proof failed. Written standalone now. A decoy has to be checked for being
a real decoy.

### Next, in order

3. **Minimal API: `/healthz`, `/readyz`.** `apps/api` is still an empty stub. `/healthz`
   answers about the process only; `/readyz` uses the ports. The negative test is the point:
   with the database stopped, `/healthz` must stay 200 and `/readyz` must not — asserted with
   the dependency actually down, not mocked.
4. **Migration runner under a Postgres advisory lock.** Zero migrations to run, which is the
   right order — the lock is infrastructure, the schema is F-034. Test with two processes
   started simultaneously against one database; a single-process test passes whether or not
   the lock works.
5. **Dockerfiles** — multi-stage, non-root, pinned **digests** not tags. Assert the running
   uid is not 0; a `USER` line is a claim, `docker run --rm <image> id -u` is the fact.
6. **`infra/compose/docker-compose.prod.yml`** — boots locally, no platform-specific keys.
7. **Terraform skeleton.** A commented backend block, not one pointing at a bucket nobody
   created.
8. Reconcile `docs/operations/deployment/*.md`, record, close.

### Known, and not solvable here

- **Acceptance 6 — deployed on a real VPS through Coolify AND Dokploy — cannot be met.**
  There is no VPS and no git remote for either platform to pull from. Both deploy *from* a
  repository. Delivered as runbooks plus a compose file built to be consumed unmodified;
  the deployment itself stays outstanding and F-005 cannot honestly close without it.
- **Acceptance 7's "remote state configured"** needs a real backend. The skeleton is
  deliverable; the backend is not.
- **The Docker daemon is NOT running.** `docker --version` reports 29.6.1, but that is the
  CLI; `docker compose up` fails with
  `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine`.
  Docker Desktop has to be started before increments **4, 5 and 6** can be verified —
  the advisory-lock race test needs a real Postgres, and the images need a daemon to build.

  Recorded because an earlier note in this file claimed Docker was available on the strength
  of the CLI version alone. A version string proves a binary exists, not that the service
  behind it is up — the same shape as a gate that cannot run being mistaken for one that
  passed.

---

## 2026-08-14 — F-004 DONE · the gate that checks the gates could not fail

**Gate 15 (security) is active** — executed, and watched fire on planted secrets before being
switched on. **The gates ↔ CI mirror check had a hole in it**, found and closed.

### Evidence

```
  ✓ gate 0   state          13 checks, 1 known warning (E-009)
  ✓ gate 1   typecheck      31 tasks
  ✓ gate 2   lint           31 tasks + 10 boundary guards
  ✓ gate 3   format
  ✓ gate 4   test           136 tests
  ✓ gate 6   build          23 tasks
  ✓ gate 15  security       gitleaks 8.30.1 — 7 commits, ~1.23 MB, no leaks
                            pnpm audit --audit-level high — no known vulnerabilities
  ✓ mirror proof            all 7 active gates proven mirrored

NOT run: color-golden, e2e, a11y, contrast, cvd, content, perf, web-perf,
         e2e-full — each activates with its own feature.
```

**Gate 15 activated 2026-08-14**, after the F-001 precedent: run it, watch it pass, watch it
fail, then activate. Never before.

### The defect: gate 0's mirror check was matching substrings

`verify-state.mjs` asserted every active gate has a step in `ci.yml` via
`ci.includes(gate.command)`. Gate `test`'s command is `pnpm test` — a substring of eight
lines in the workflow:

```
 4 test    command="pnpm test"
         line  73 | run: pnpm test          ← the real step
         line  77 | run: pnpm test:golden
         line  93 | run: pnpm test:e2e
         … and five more
```

**Deleting the real `pnpm test` step left gate 0 green.** Gate `e2e` had the same hole via
`pnpm test:e2e:full`. A gate could be removed from CI and nothing would notice — which is
the precise failure gate 0 exists to prevent, sitting inside gate 0.

Now matches whole `run:` commands (handling block scalars), so a gate named in a *comment*
no longer counts as mirrored either — which matters, because the workflow names every gate
in prose.

**Confirmed by reverting:** with the old substring match restored, the new proof reports
`✗ test — gate 0 stayed GREEN with the step removed`. With the fix, all seven pass.

### `scripts/verify-gate-mirror.mjs` — the acceptance criterion as an executable check

F-004 asked that "a deliberately removed step makes it fail". That is not a thing to assert
once; it is a thing to run. The script removes **each active gate's step in turn** and
asserts gate 0 fails *and names that gate* — so a gate 0 that fails for an unrelated reason
does not count as the check working.

It checks its own baseline first. If gate 0 is already red, it says so and stops rather than
reporting seven false positives — the failure mode this repository has already hit twice.
`ci.yml` is restored in a `finally` and the restore is verified byte-for-byte.

### CI runs the command you run

The secret scan used `gitleaks/gitleaks-action@v2`, so `gates.json` declared
`pnpm security:secrets` while CI ran something else — and the mirror check would have failed
the moment gate 15 activated. **That was the check being right.** CI now installs pinned
gitleaks 8.30.1 and invokes the same command a developer does.

**One job, in order, stopping at the first failure**, per the acceptance. The security job
was merged into the gates job to satisfy that literally. The cost is named rather than
hidden: a failing typecheck now means the secret scan does not run on that push. It still
runs on every pull request, so a secret is caught before merge.

### Proving the security gate can fail, without committing a secret

A planted secret cannot go into git history to test the scanner — a secret in history is
compromised even when fake. Scanned a scratch directory with `--no-git` instead: **3 of 4
planted shapes detected, exit 1.**

Worth recording: the AWS documentation example key `AKIAIOSFODNN7EXAMPLE` is **not**
detected, because gitleaks' default rules allowlist published example credentials. A scan
that stays green on that is correct. Anyone testing this gate with the first AWS key they
find in a tutorial will conclude it is broken.

### Also

- **Changesets configured** for the 14 publishable packages; the 5 apps and `@irodora/testing`
  are ignored — they deploy, they do not publish. The one non-default setting is
  `fixed: [["@irodora/color-*", "@irodora/cvd-engine"]]`: **the engine packages version
  together**, because every result carries an `engine` version in its reproducibility
  envelope (FR-10), and `engine 1.4.0` cannot identify the code that produced an answer if
  the modules drift apart. No publish automation — a pipeline that can publish before anyone
  has decided what publishing means is one that publishes by accident.
- **gitleaks 8.30.1 installed on this workstation** (`go install`), with the user's approval.
  It is not a repo dependency; CI installs its own pinned copy.

### Not delivered, and why

**Branch protection (acceptance 3) is specified, not applied.** `git remote -v` is empty —
there is no GitHub repository. The settings are written up in
[`docs/operations/branch-protection.md`](../../docs/operations/branch-protection.md) ready to
apply, including the reasoning for requiring **one** check (`Verification gates`) rather than
sixteen: listing gates individually means editing branch protection every time one activates,
and forgetting is silent.

Creating a remote is publication, not local bookkeeping, so it was not done unasked. **Until
protection is applied the gates can be observed and ignored** — recorded in
`memory/observations.md` rather than left implied.

### Watch out

- **`pnpm security:secrets` needs gitleaks on PATH.** Installed here at `~/go/bin`. On a
  machine without it the gate errors rather than passing — which is correct, but the message
  is `command not found` and reads like a broken script.
- **Gate 0 is the named guard for several effect links and has no link of its own.** Editing
  `verify-state.mjs` traces to no dependents. The mirror check is now proven; its other
  twelve checks are not. Recorded as a missing guard.
- The mirror proof **writes to `ci.yml`**. If interrupted, `git checkout .github/workflows/ci.yml`.

### Next

**F-005** — deployment profiles — is the last R0 feature. **F-003 is deliberately not next:**
[ADR-0037](../../docs/adr/0037-design-tokens-wait-for-the-engine-r0-closes-incomplete.md)
added F-007 and F-008 as its real blockers, because its contrast gate and `cvdPairs`
assertion need colour maths that only R1 owns, and the manifest is `approved` so that gate is
blocking from the moment it exists. **R0 therefore closes with F-003 outstanding**, which is
deliberate and recorded.

---

## 2026-08-14 — F-002 DONE · one definition, three uses — and the third one was lying

**`@irodora/contracts` exists.** Zod 4 schemas are the single source of runtime validation,
TypeScript types and JSON Schema. All six applicable gates green, plus ten boundary guards.

### Evidence

```
node v24.19.0 · pnpm 11.21.0 · zod 4.4.3 · vitest 4.1.10

  ✓ gate 0  state         13 checks, 1 known warning (E-009)
  ✓ gate 1  typecheck     31 tasks
  ✓ gate 2  lint          31 tasks + 10 boundary guards
  ✓ gate 3  format
  ✓ gate 4  test          31 tasks · 136 tests in 5 files
  ✓ gate 6  build         23 tasks

NOT run: color-golden, e2e, a11y, contrast, cvd, content, perf, web-perf,
         e2e-full, security — all still `pending` in gates.json; each activates
         with its own feature (F-003, F-006, F-008, F-011, F-015, F-017, F-038,
         F-044, F-004). None applicable here.
```

No new gate activated. F-002 adds no gate; it adds content to gates 1–4 and 6.

### What the package contains

Cross-cutting wire primitives only — colour and provenance, the error contract, cursor
pagination, branded scalars, the JSON Schema bridge. **Endpoint schemas are deliberately not
here**; they arrive with the routes at F-015/F-016, and a contract package full of shapes
nothing serves is a contract package nobody trusts.

### The decision this feature turned on — [ADR-0036](../../docs/adr/0036-wire-schema-and-engine-type-pinned-by-the-compiler.md)

The colour engine has zero runtime dependencies (NFR-3), so **it cannot import Zod**, so it
declares `Provenance`, `MeasurementSource` and `ReproducibilityEnvelope` in plain TypeScript.
That is one shape defined twice — exactly what the TypeScript rules forbid, forced by a
golden constraint.

Resolved by keeping both and making the compiler prove they are the same shape.
`color.test.ts` asserts key-set equality plus mutual assignability; drift fails gate 1.

**This strengthens [E-002](../state/effects.json).** Its memory note previously ended *"it
does not catch a semantic weakening — making a field optional typechecks fine. That is a
review responsibility."* That is no longer true for these types, verified by breaking them:

```
Provenance.confidence made optional     typecheck FAILED   ← the exact weakening E-002 names
Provenance.originSpace removed          typecheck FAILED
MeasurementSource gains a member        typecheck FAILED
baseline                                typecheck passed
```

**One relaxation, taken deliberately and recorded as one:** `Provenance.capturedAt` and
`ReproducibilityEnvelope.profile` widened from `?: T` to `?: T | undefined`. Under
`exactOptionalPropertyTypes` those differ, and only the wider one is what a validator can
produce. Relaxing `Provenance` is precisely what E-002 exists to watch, so it is in the ADR
with its reasoning rather than sitting in a diff.

### Three checks that looked right and were not

Every one was found by **writing the violation and watching the check stay green** — not by
reading it. All three now fail on mutation, proven.

**1. Mutual assignability is not shape equality.** The type pin above originally asserted
assignability in both directions. Adding `device?: string` to `provenanceSchema` produced no
error at all: an object with an extra *optional* property is assignable both ways. Removing
one slips through identically. Adding a field is the most common drift there is, and the
guard would have shipped documented as catching it.
→ key set asserted separately. [[mutual-assignability-does-not-catch-an-optional-field]]

**2. The OpenAPI leg published the wrong side of the wire.** `z.toJSONSchema` defaults to
`io: 'output'`. `pageParamsSchema.limit` has a `.default()`, so the document marked `limit`
**required** while the validator accepts `{}`. Every generated client would have been told to
send a field the API does not need — wrong in the direction a client cannot work around.
→ `io` is now a required argument with no default.

This one is worth sitting with: the representability test was written specifically so
contract defects land when the schema is written rather than at F-015. It did not catch this,
because it only asserted *"does not throw"*. **A test aimed at the right risk can still be
aimed at the wrong property.**

**3. The self-enumerating schema scan could silently cover less.** It reads the barrel's own
exports so it "cannot fall behind" — and deleting one `export *` line dropped coverage from
18 schemas to 10 with every test green. The `length >= 10` floor did not notice.
→ the export list is pinned explicitly.

Also unpinned until review caught it: each error code's HTTP status. Changing
`validation_failed` from 422 to 400 passed typecheck, lint and the full suite. Now pinned.

### Independent verification found two of those three

The [evaluator subagent](../../.claude/agents/) ran the gates cold (`--force`, 92/92 tasks,
no cache), mutation-tested the type assertions 15 ways, and probed the new lint rule with
seven duplication forms. It returned **FAIL** with two blockers and four significant
findings. Defects 2 and 3 above are its findings, as is the discovery that the lint selector
covered two of roughly seven duplication forms — **missing string unions, which is the form
the two duplicated engine types actually take.**

The separation earned its keep on its first real use. A self-check would have reported six
green gates and stopped.

### Boundaries: 5 → 10

| New guard | Protects |
|---|---|
| contract layer may not hand-write a type | `interface X {}` |
| …may not hand-write a union | `type X = 'a' \| 'b'` — the form that mattered |
| …may not hide a type literal in a wrapper | `Readonly<{…}>`, `{…}[]`, `{…} & {…}` |
| …may not declare a TypeScript enum | `enum X {}` — neither interface nor alias |
| …may not import a Node API | `apps/web` and `apps/mobile` import this package |

The Node-API guard is a scope addition and is flagged as one: it was not in the acceptance
list. It exists because the alternative — giving the package `@types/node` for one test —
would have introduced the risk and deferred the guard, which is the failing-open shape.

### Watch out

- **`@types/node` is deliberately absent from `packages/contracts`.** If a future test needs
  to read a file, adding it is fine — the `node:*` lint rule already excludes tests and
  protects `src`. Do not add it to make a `src` file compile.
- **Cross-package type pins need a build.** `packages/contracts` typechecks against
  `color-core`'s built `.d.ts`. `pnpm typecheck` is sound (turbo declares `dependsOn:
  ["^build"]`); a bare `npx tsc -p packages/contracts/tsconfig.json` is **not**, and will
  pass on engine-side drift. Recorded in `memory/observations.md`.
- **Do not simplify the three assertions in `color.test.ts` into one.** `toEqualTypeOf`
  fails forever (readonly); the mutual pair passes forever (optional fields). One of those
  failure modes is silent.
- `CONTRACTS_VERSION` was **removed**, not implemented. Reasoning is in `version.ts`.
- The error-code enum is deliberately under-filled. Additive-only makes under-including the
  cheap direction; `quota_exceeded` (F-057) and `corpus_version_unknown` (F-016) are absent
  on purpose and have tripwire tests asserting so.

### Honest limits

- **Acceptance criterion 4 is enforced inside `packages/contracts` only.** A hand-written
  duplicate in a *consumer* package is not caught. There are no consumers yet; the rule
  lands with them at F-015. This is not full coverage of the criterion as written.
- **The E-004 chain is one link long.** Schema → validation → types → JSON Schema is live.
  OpenAPI, the SDK, and the regenerate-and-diff check do not exist and are F-015/F-057.
- `E-004.from.exists: true` is bookkeeping the state gate does not verify — it only checks
  path existence for `file|symbol|test|artifact|content` kinds. Recorded as a blind spot.

### Next

**F-003** — `@irodora/design-tokens` — and **F-004** and **F-005** are all now eligible
(each blocked only by F-001). Lowest id first: **F-003**. `/next-feature` → `/plan`.

---

## 2026-08-14 — F-001 DONE · the toolchain runs, and the boundaries are proven

**Node 24.19.0 installed. `pnpm install` ran. All six applicable gates executed and passed.**

### Evidence

```
node v24.19.0 · pnpm 11.21.0 · tsc 6.0.3

  ✓ gate 0  state        4s
  ✓ gate 1  typecheck    5s     31 tasks
  ✓ gate 2  lint        16s     31 tasks + 5 boundary guards
  ✓ gate 3  format       2s
  ✓ gate 4  test         1s     31 tasks
  ✓ gate 6  build        3s     23 tasks

NOT run: color-golden, e2e, a11y, contrast, cvd, content, perf, web-perf,
         e2e-full, security — none applicable; each activates with its own feature.
```

**Gates 1–4 and 6 are now `active` in `gates.json`**, with `activatedAt: 2026-08-14`. They
were activated *after* being executed and seen to pass, not before — a gate that has never
run is theatre.

### All five boundaries enforced, proven not assumed

```
✓ colour engine may not import a Node API        no-restricted-imports
✓ colour engine may not touch a platform global  no-restricted-globals
✓ colour engine keeps deep-import protection     no-restricted-imports
✓ packages may not be deep-imported              no-restricted-imports
✓ a floating promise is an error                 @typescript-eslint/no-floating-promises
```

### Two real defects the guards caught

**1. A later flat-config object REPLACES a rule rather than merging it.** The colour-engine
override declared only the `node:*` patterns, silently making deep imports legal in exactly
the packages with the strictest written rules. Everything parsed, ESLint ran clean, nothing
failed. Guard #3 exists for this specific defect — and it found it *before the rule had ever
run in anger*. See
[[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]].

**2. The guard runner itself was failing open-shaped.** It shelled out to `npx eslint`, which
throws `EINVAL` on Windows under Node 20+. It correctly refused to pass — but reported all
five as *"NOT enforced"*, which would have sent the next person to fix the ESLint config
rather than the runner. Now uses the ESLint Node API and distinguishes **"could not run"**
from **"did not fire"**.

### Decision forced during install — [ADR-0035](../../docs/adr/0035-typescript-6-not-7-until-type-aware-linting-catches-up.md)

`typescript-eslint` peers on `typescript >=4.8.4 <6.1.0`. **It does not support TypeScript 7.**

The plan flagged this risk and said dropping from 7 would be an ADR, not a silent edit — so
it is one. **Pinned to `~6.0.3`.** Type-aware linting is load-bearing for NFR-24 and four of
the five guards; a compiler major is worth far less than the enforcement it would cost. The
alternative — keeping TS 7 and dropping the type-aware rules — is the exact anti-pattern this
harness exists to prevent.

`~` not `^`, because the peer ceiling is `<6.1.0` and a caret would eventually resolve past it
and break install at an unrelated moment.

### Also corrected

- **Invented dependency versions.** `eslint@^9.40.0` does not exist. Every version is now
  queried from the registry: ESLint 10.8.1, typescript-eslint 8.67.0, @types/node 24.13.3
  (matching the runtime, not `latest`), Prettier 3.9.6, Vitest 4.1.10.
- **`allowBuilds`**, not `onlyBuiltDependencies` — pnpm 11's field. `unrs-resolver` approved
  with its reasoning recorded: dev-only, transitive to the lint toolchain, never shipped.
- **Turbo `test` outputs emptied.** It warned on every run about missing coverage output;
  warning noise trains people to ignore warnings.

### Watch out

- **Node 24 is not on the default PATH.** `C:\Program Files\nodejs` is a real directory with a
  May-2025 `node.exe` (22.16.0), so nvm-windows cannot symlink over it. `node --version` in a
  fresh terminal still reports 22.16.0. Either remove the direct install and let nvm own the
  path, or run `nvm use 24.19.0` from an elevated shell. **CI is unaffected** — it reads
  `.nvmrc`.
- The TypeScript 7 upgrade is a standing task with no owner. Trigger: typescript-eslint
  shipping TS 7 support.

### Next

**F-002** — `@irodora/contracts` — is the next eligible feature. `/next-feature` → `/plan`.

---

## Superseded handoff — F-001 was blocked on Node

**Feature:** F-001 — Monorepo toolchain scaffold ·
[plan](../plans/F-001-monorepo-toolchain-scaffold.md)

### Blocked on

**`pnpm install` cannot run on this workstation.** Node is **22.16.0**; `package.json`
requires `>=24.19.0 <25`. nvm-windows holds only 16.13.2, 16.9.1 and 20.5.1.

```
Your Node version is incompatible with "E:\JCFIP".
Expected version: >=24.19.0 <25
Got: v22.16.0
```

**Unblock with:**

```
nvm install 24.19.0 && nvm use 24.19.0
```

**Not** by lowering `engines`. Node 22 is in maintenance, 24 is the active LTS the project is
pinned to, and weakening a constraint so a command succeeds is the anti-pattern this harness
exists to prevent. The refusal is the constraint working.

### Done

- **23 workspace members** scaffolded — 15 packages, 5 apps, 3 test packages. Each with
  `package.json`, `tsconfig.json` (lint project: src + tests, `noEmit`) and
  `tsconfig.build.json` (emit project: src only).
- **Package index files carry real intent**, not empty stubs — `Provenance` and
  `ReproducibilityEnvelope` shapes in `color-core`, the `RADIUS` scale with `swatch: 0` in
  `design-tokens`, `MeasurementSource`, `Classification`, `DeploymentProfile`. Each names the
  feature that implements it.
- **`scripts/verify-guards.mjs`** — writes a deliberately violating file at the exact path each
  ESLint rule targets, asserts the rule fires, deletes it. Five guards. Wired into
  `pnpm lint`.
- **Root dev dependencies** pinned.

### A real bug the guards found before they ever ran

Writing guard #3 surfaced a defect in `eslint.config.mjs`: **a later flat-config object
replaces `no-restricted-imports` rather than merging with it.** The colour-engine override
declared only the `node:*` patterns, which silently disabled deep-import protection in exactly
the packages that need it most.

Fixed, and guard #3 exists specifically to catch it recurring. This is the case for guard
fixtures in one paragraph: the rule looked correct, parsed correctly, and did not do what it
appeared to do.

### Gates

```
Ran:      state ✓  — 13 checks, 1 known warning
NOT run:  typecheck, lint, format, test, build — pnpm install is blocked on Node
          color-golden, e2e, a11y, contrast, cvd, content, perf, web-perf, e2e-full, security
```

**Gates 1–4 and 6 were deliberately NOT activated in `gates.json`.** Activating a gate that
has never been executed would make it theatre — the exact failure the verification protocol
warns about. They activate when they have been run and seen to pass.

### Next action

1. `nvm install 24.19.0 && nvm use 24.19.0`
2. `pnpm install` — expect the lockfile to be created; commit it
3. `pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build`
4. `node scripts/verify-guards.mjs` — **all five guards must FAIL to lint**, i.e. report their
   rule. If any guard passes silently, that boundary is not enforced.
5. Only then: activate gates 1–4 and 6 in `gates.json`, and close F-001.

### Watch out

- **TypeScript 7** (`^7.0.2`) is the native port. Its behaviour under project references at this
  scale is unproven here. If it misbehaves, dropping to 5.9 is an **ADR**, not a silent edit.
- `verify-guards.mjs` shells out to `npx eslint`. On Windows it uses `npx.cmd`; if that path is
  wrong in CI, the script throws rather than passing — deliberately, since a guard that cannot
  run is a guard that is failing open.
- The scaffold is committed but **unverified**. Nothing is broken — gate 0 is green and there is
  no build to break — but do not treat these packages as working until step 3 has run.

---

## 2026-08-14 — Phase 2c: R1 surface designs complete

**Scope:** the remaining R1 surfaces designed on the approved system. No application code.

### Delivered

Home · Compare · Palette Studio · Finder · share card · Flow B (personal colour setup) ·
Flow C (CVD outfit check). Same token scope as the design system, so the two artifacts are
one system rather than two.

**Every R1 surface in [`DESIGN-BRIEF.md` §3](../../docs/design/DESIGN-BRIEF.md) is now
designed.**

### Decisions worth recording

**Compare suspends the separator rule, deliberately.** An `ADJACENT` mode butts the two
samples together with no well between them — the one place in the product where that rule is
lifted, and lifted *for the same reason it exists*. A colorist judges a difference by putting
two samples edge to edge; the boundary **is** the comparison. `SEPARATED` restores the wells
for judging each colour alone. Two modes, two questions, and the toggle names which one is
being asked. This is an exception to a hard constraint and is recorded as one.

**The Finder's interpretation panel became a feature.** Showing that "dark muted green"
resolved to `L 0.25–0.45 · C 0.02–0.06 · H 120–165°` from a versioned lexicon explains an
empty result, makes the search adjustable rather than a retry, and puts the determinism claim
on the most ordinary screen in the product.

**Flow C's grammar is the design.** Every sentence takes a colour pair as its subject, never
the user — "the rust and the olive separate by 38", not "you may struggle to distinguish
these". That single choice is the difference between an instrument and a diagnosis, and it
belongs in copy review, not just in design.

**The share card drops the well.** A card is a self-contained artefact landing on an unknown
background, so the card's own margin becomes the neutral ground. Edge-to-edge swatch.

### Gates

```
Ran:      state ✓  — 13 checks, 1 known warning
NOT run:  everything else. Still no application code.
```

### Next

1. **Settle Radix vs Base UI** — the last open foundation question before F-017.
2. Then **F-001**, the monorepo toolchain scaffold, via `/next-feature` → `/plan`.
3. Design work remaining is R2+ only, and follows its features rather than preceding them.

Nothing is `in_progress` in the feature list.

---

## 2026-08-14 — Phase 2b: design system approved · frontend foundation decided

**Scope:** the Stage 1 wireframes were rejected, the design was rebuilt, and the frontend
foundation question was researched and settled. No application code.

### The rejection, and what was wrong

Stage 1 wireframes came back as *"very bad — they lack design thinking and creativity."*
That was correct.

**The error:** C1 (*the interface must not decorate with colour*) was read as a reason to
remove things. The output was structurally sound and lifeless — a spec document with the word
*wireframe* on it. The constraint was treated as a limit to work within rather than as the
direction to work toward.

**What was actually true:** the references supplied — efferd, coss, and the fashion-retail
canon — all converge on neutral chrome, greyscale data, chroma held back. That is not a
compromise those designers accepted; it is what a product whose subject carries the colour
genuinely wants. Captured as
[[the-constraint-and-the-taste-usually-agree]], and it is why
[`visual-taste`](../skills/visual-taste/SKILL.md) now exists.

### Design system — approved

Rebuilt on the thesis **soft chrome, exact colour**: everything generous — 20px cards, 28px
containers, full pills, 44px targets, warm neutrals — except `radius.swatch: 0`, forever.
Surrounded by softness the hard edge reads as deliberate precision, and that tension is the
idea.

Framing: **a colour page is a product page, and here the colour is the product.** The swatch
takes the treatment a garment photograph gets; the specification sits quiet beneath it.

Taken and refused deliberately rather than blended: **deference** and 44px targets from Apple
HIG, **refusing** translucency near a swatch; **tonal elevation** and soft geometry from
Material 3, **refusing** dynamic colour outright — deriving a UI palette from a source colour
would tint the whole interface from the thing being examined.

`design-system.manifest.json` now carries **real values**, `status: "approved"`, and rules a
general-purpose system would have no reason to encode: `swatch.well` as a mandatory neutral
ground · `chromaCeiling` of 0.01 on surfaces and text · `foreground.3` marked
`largeTextOnly` because it fails AA at small sizes · greyscale `chart.1…5` · `cvdPairs`.
**The `contrast` gate is blocking from the moment it exists (F-003).**

### Frontend foundation — [ADR-0033](../../docs/adr/0033-frontend-foundation-own-the-token-layer-headless-primitives.md)

**Astryx evaluated and not adopted.** It is genuinely good — 150+ accessible components, an
MCP server, and Tailwind integration better engineered than expected (pre-compiled CSS,
explicit `@layer` ordering, a token bridge).

**It is web-only, and that is decisive.** Our manifest compiles to four targets including
React Native precisely so web and mobile cannot drift; adopting Astryx would split the design
system down the middle of the product, with the Lens on the far side. Its theme packages also
own the colour semantics that are this product's substance.

**Taken from it anyway:** its best idea is not its components — it is the MCP server letting
an agent browse the design system. Recorded as a backlog candidate for our own tokens.

Token names stay shadcn/Base-UI compatible so tweakcn, efferd and coss blocks remain usable
as reference. Interoperability, not adoption. **Radix vs Base UI to settle before F-017.**

### Skills adopted

Three published design skills **read and adapted**, not installed — per
[ADR-0029](../../docs/adr/0029-harness-agnostic-core-thin-adapter.md) we adapt and record
provenance. Rather than five overlapping skill files, each source went where it belonged:

| Source | Into | Adaptation |
|---|---|---|
| taste-skill (MIT, Leonxlnx) | **new** [`visual-taste`](../skills/visual-taste/SKILL.md) | Anti-generic discipline bound to *this* subject: the escape from generic here is restraint executed with craft, not added visual interest |
| Emil Kowalski, *Animations on the Web* | [`motion`](../skills/motion/SKILL.md) | Duration by interaction class, exits faster, ease-out default, compositor properties only. Overridden wherever it meets "motion may never alter a colour" |
| Impeccable · shadcn conventions | [`build-ui`](../skills/build-ui/SKILL.md) | Type-scale contrast, tracking by size, measure, proximity-before-size, tabular numerals |

Provenance recorded in [`NOTICE.md`](../../NOTICE.md). No third-party code is vendored.

### Gates

```
Ran:      state ✓  — 13 checks, 1 known warning
NOT run:  everything else. Still no application code.
```

### Next

1. Design the remaining R1 surfaces to the approved system — Palette Studio, Finder results,
   the share card, Compare, Home — plus Flows B and C.
2. Settle Radix vs Base UI.
3. Then F-001.

Nothing is `in_progress` in the feature list.

---

## 2026-08-14 — Phase 2a: Stage 1 wireframes, R1 web

**Scope:** the design tooling decision, and the first wireframe deliverable. No code.

### Done

**[ADR-0032](../../docs/adr/0032-design-in-claude-wireframes-before-visual-before-code.md)** —
design is produced in Claude rather than Figma, and the deliverable splits into three
separately-approved stages: **wireframes → visual design → code**.

The staging is the substantive part. A single combined design review collapses two different
questions, and feedback about type weight arrives before anyone has agreed what is on the
page. It matters more here than usual because half the hard constraints in the design brief
are about what colour does to perception (C1, C6, C7) — which cannot be judged from a
wireframe, while structural questions cannot be judged once the page is full of colour.

`DESIGN-BRIEF.md` §7 rewritten to match: it now specifies the three stages, what is approved
at each, and the greyscale rule with its one exception.

**Stage 1 wireframes delivered** — R1 web, published as an inspectable artifact:

- Colour detail (`/colors/[slug]`) — desktop and mobile, 11 annotations. Designed first
  because every other surface reuses its parts.
- Colour Atlas · Colour Lens (permission → live → result) · Compare · Home
- Flow A as an annotated six-step sequence with p50 budgets
- Eight component states, including the ones usually left blank: loading, no-results,
  camera-denied, offline, poor-confidence, focus-visible
- Six decisions surfaced explicitly for the reviewer, each with the alternative I did not take

**The greyscale rule and its exception.** Wireframes are greyscale except where a colour
*sample* appears — a sample is content, not decoration, and **C1 is only testable if you can
see a garment colour sitting inside the chrome.** The document's own chrome follows the
product's rule: one chromatic value in the entire page, a muted moss used only for annotation
markers, chosen because the samples shown are indigo-family and a reviewer's eye must never
conflate an annotation with a colour under examination.

### Gates

```
Ran:      state ✓  (node scripts/verify-state.mjs) — 13 checks, 1 known warning
NOT run:  everything else. Still no application code.
```

Verified after the ADR and brief edits: 33 ADRs, index consistent; 172 governed documents,
all links resolve.

### Recorded, not resolved

- The **perceptual Atlas arrangement** (annotation 2.3) is the largest open question. It may
  be the most distinctive thing on the site or an unnavigable novelty; it needs a stage-2
  prototype before we commit either way.
- **Colour values in the wireframes are placeholders.** Real corpus entries land with F-012,
  each with complete provenance and a named reviewer. Nothing in the deliverable is a
  verified colour claim, and the document says so.

### Next

1. **Review the wireframes.** Feedback references annotation numbers.
2. On approval: wireframe the remaining R1 surfaces — Palette Studio, Finder results, the
   shareable card — plus Flows B and C. Held until after this review so a structural
   correction lands before they are drawn rather than after.
3. Then stage 2 (visual design), then F-001.

Nothing is `in_progress` in the feature list. Design work precedes R0.

---

## 2026-08-13 — Phase 1: product definition and harness

**Scope:** convert the four brainstorm documents into a production-grade documentation set
and build the working system that will govern every subsequent change. No application code.

### Done

**Brand.** Irodora, from 彩り (*irodori*), "the arrangement of colours". Namespace verified
free before locking: `.com .io .app .co .net .org .design`, npm `@irodora`, GitHub
`irodora`. Kasane was the stronger concept and lost on the exact-match `.com`.

**Decisions settled with the user:** monorepo + modular monolith with named extraction
triggers · web first, mobile close behind · container-portable deployment with Coolify and
Dokploy as a first-class VPS target and AWS as the managed one.

**Documentation** — `docs/`:

- `PRD.md` — 68 FR and 24 NFR, each testable, each owned by a release; personas, six
  journeys, monetisation, metrics with targets, non-goals with reasons.
- `REQUIREMENTS-COVERAGE.md` — requirement → feature → gate, machine-checked.
- `roadmap.md`, `glossary.md`.
- `architecture/` — ARCHITECTURE, color-engine, data-model, api-contract, sync-protocol,
  security/threat-model, security/privacy-design.
- `adr/` — 31 records plus template and index.
- `design/` — BRAND, DESIGN-BRIEF (the input to the design phase), DESIGN-SYSTEM,
  ACCESSIBILITY, and the token manifest.
- `content/` — corpus spec and the licensing position.
- `compliance/data-governance.md`; `operations/` including per-platform deployment runbooks.

**Harness** — `.harness/`: AGENTS.md, 3 instruction docs, 13 rule files across 8 areas,
7 protocols, 8 governance documents, 23 skills, 8 commands, the plan template.

**Adapter** — `.claude/`: settings, 6 subagents (planner · generator · evaluator ·
color-scientist · designer · security-reviewer), and content-free shims for every command
and skill.

**Verification** — 16 gates defined in `gates.json` with activation triggers;
`scripts/verify-state.mjs` written and green; `.github/workflows/ci.yml` mirroring the
gates, with the mirror itself checked.

**State** — 66 features across R0–R5, R0–R2 fully specified with acceptance criteria;
10 seed effect links, each with its narrative note and named guard; memory seeded with
2 decisions, 9 lessons, 10 effect notes, 1 glossary entry, 1 product note.

### Deliberate departures from the brainstorm

1. **"Non-AI" became a four-tier capability policy** (ADR-0002). The blanket ban was
   unenforceable and would have outlawed the classical CV the Lens needs. The guarantee is
   now testable: disable tiers 1–3 and the product still answers.
2. **Measurement provenance is a type, not a disclaimer** (ADR-0005). A disclaimer is
   optional at every call site; a required field is not.
3. **Web is a first-class surface**, not a companion — the Atlas is the public proof of the
   engine.
4. **en/ja from day one** (ADR-0028). Retrofitting Japanese typography means redesigning.
5. **A real licensing position on colour data** (ADR-0007) — clean-room corpus, per-entry
   provenance, Wada as inspiration only.
6. **Ethical guardrails** (NFR-22, NFR-23) — no dermatological, ethnic or attractiveness
   inference, plus ITA-stratified bias validation as a release blocker.
7. **Monetisation defined** (ADR-0027), with accessibility permanently outside every paywall.
8. **Honest crypto language** — envelope encryption is described as what it is, and never as
   end-to-end.

### Gates

```
Ran:      state ✓  (node scripts/verify-state.mjs)
NOT run:  typecheck, lint, format, test, color-golden, build, e2e, a11y, contrast,
          cvd, content, perf, web-perf, e2e-full, security
Why:      no application code exists yet. Those gates activate with the features
          recorded in gates.json (`activatesWith`), starting at F-001.
```

Gate 0 is not a placeholder: it validates both state files against their committed schemas,
the effect graph and its memory pairing, path existence, guard coverage on critical links,
requirement traceability in both directions, the ADR index, the CI mirror, the env contract,
the golden-rule scan across scoped harnesses, and every relative link in every governed
document.

### Known and recorded

- `E-009` (rule weights) carries `guard: "none"` with `feature: F-029`. The graph is
  honestly reporting a check we owe rather than hiding it behind a lowered severity.
- Four open questions block the features that depend on them: OQ-1 (OIDC provider, R2),
  OQ-2 (billing, R4), OQ-3 (reference card, R4), OQ-4 and OQ-5 (corpus seed size and
  Japanese editorial reviewer, R1).
- Four gate blind spots recorded in `memory/observations.md`, including that
  `verify-state.mjs` implements a JSON Schema **subset** and reports its unsupported
  keywords rather than silently passing them.
- **The workstation runs Node 22.16.0.** `.nvmrc` pins 24.19.0. Gate 0 runs on 22; `pnpm
  install` will fail the engine check. Upgrade before F-001.

### Next

1. **UI design phase** — `docs/design/DESIGN-BRIEF.md` is the input. On approval, the token
   values land in `design-system.manifest.json` and its status moves from `placeholder` to
   `approved`, which makes the contrast gate blocking.
2. **Then F-001** (monorepo toolchain scaffold) via `/next-feature` → `/plan`.

Nothing is `in_progress`. The next session starts with `/next-feature`.
