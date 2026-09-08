# ADR-0098 — The status triple moves together, because CVD separation and not contrast is what binds it

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-07 |
| **Feature** | F-174 |
| **Supersedes** | the light half of [ADR-0044](0044-status-tokens-corrected-and-status-colour-is-text.md); leaves [ADR-0053](0053-dark-status-salience-matches-light-and-error-gets-lighter.md)'s dark values untouched |

---

## Context

`Status` has taken an `adjacentToSample` prop since F-069. What it does is put the status on
`swatch.well` — the neutral ground — so that a colour sample beside it is not read against a
coloured field. Simultaneous contrast is the reason: a red chip next to a fabric swatch changes
how the fabric reads, and the person is looking at the fabric to decide something.

**Nothing in this product had ever painted a status**, so no status token declared a pairing
with the well and gate 9 had never measured one. F-152 painted the first two — the refused
photograph on AddGarment, the failed write on Export — and F-156's audit measured the third
ground for the first time.

Two of the three kinds cannot legibly sit there:

| light | on `swatch.well` | floor |
|---|---|---|
| `status.ok` | **4.21:1** | 4.5 |
| `status.warn` | **4.32:1** | 4.5 |
| `status.bad` | 8.29:1 | 4.5 |

So the component promises a ground two of its three kinds cannot use. `bad` is the only kind
declared for now, which is why the gates stayed green — the trap was guarded rather than open,
and F-171's pairing rule would have caught the next `adjacentToSample` ok or warn before it
shipped.

## What the feature record got wrong, and it matters

F-174's own notes said the obstacle was the **salience rank**: darkening `ok` enough to clear
the well makes it measure equal to `warn` against the light background, and ADR-0053 is explicit
that a rank differing between themes tells a person toggling the theme that a different thing is
urgent.

That is true of darkening `ok` alone. It is not the binding constraint. **CVD separation is.**

Darkening `warn` toward the well's requirement moves it toward `bad`'s lightness, and under
simulation amber and red converge — lightness is the only channel left between them. Every
candidate that clears 4.5:1 with `bad` where it was drops `warn`/`bad` far below the floor of
60:

| candidate | contrast on the well | worst CVD | why it fails |
|---|---|---|---|
| `ok` L 0.514, `warn` L 0.510, chroma unchanged | passes | **49.4** | tritan, Machado. And `warn` sits ΔL 0.002 from the sRGB edge — a blue channel of 1/255. |
| `ok` L 0.514, `warn` L 0.500 c 0.08 | passes | **45.6** | protan, Viénot. Reducing `warn`'s chroma collapses it against `ok` instead. |
| `ok` L 0.512, `warn` L 0.524, `bad` unmoved | passes | **56.0** | tritan, Machado. |
| `ok` L 0.512, `warn` L 0.524, `bad` L 0.390 | passes | **59.2** | tritan, Machado. Close, and still under. |

**`bad` has to move below L 0.385 to give `warn` the room.** That is the finding: the three
tokens are one system, and the one that was comfortably passing is the one whose position was
holding the other two out.

## Decision

**Move all three light status tokens in lightness only. Chroma and hue are unchanged, and the
dark theme does not move.**

| token | was | becomes | hex |
|---|---|---|---|
| `light.status.ok` | L 0.530 c 0.09 h 158 | **L 0.504** | `#387B58` → `#307450` |
| `light.status.warn` | L 0.540 c 0.11 h 70 | **L 0.518** | `#976213` → `#905B06` |
| `light.status.bad` | L 0.400 c 0.15 h 26 | **L 0.370** | `#861116` → `#7C000C` |

And **`swatch.well` joins the `pairsWith` list of all three tokens in both themes**, which is
what makes gate 9 check the ground the component actually uses. Gate scope is driven by
`pairsWith`; an undeclared ground is a ground nobody measures.

### That lightness is the channel to spend is what the exception already says

`status.warn`'s chroma exception reads: *"Chroma is where this token buys its CVD separation,
because lightness is already carrying contrast, salience rank and gamut headroom."* Spending
chroma here would trade away the guarantee the change exists to keep — and the measurements
above show exactly that happening: `warn` at c 0.08 separates from `ok` at 45.6.

No new exception is needed, and none of the three existing ones changes.

## How the values were chosen

A grid search over the feasible box — `ok` L 0.44–0.516, `warn` L 0.46–0.532, `bad` L 0.37–0.40,
with chroma variants — **judged by the gate's own functions**: `checkContrast`,
`checkSeparation`, `checkSalience` and `checkChromaCeiling`, run on a mutated manifest through
`parseManifest` so all eight palettes are seen exactly as gate 9 sees them.

That last part is the methodological point. A search that re-implemented the ratio would agree
with itself on day one; F-143's peer gate is already a recorded case of a checker that
reimplemented its subject and got its own headline findings wrong. 63 840 combinations, 35 pass
every check.

The one chosen is the point where **the status tokens stop being the tightest thing in the
system**. After it, the closest pairing anywhere is a pre-existing one — `aota.light`
`foreground.3` on `surface.2` at 3.16 against a 3.0 large-text floor — which is an older
question and not this one's.

## Consequences

**Measured, on every ground the tokens are declared against:**

| | on `swatch.well` | on `background` | on `surface.1` | on `surface.2` |
|---|---|---|---|---|
| `ok` | 4.21 → **4.70** | 4.90 → 5.48 | 5.05 → 5.63 | 4.65 → 5.20 |
| `warn` | 4.32 → **4.75** | 5.04 → 5.53 | 5.18 → 5.69 | 4.78 → 5.25 |
| `bad` | 8.29 → **9.36** | 9.66 → 10.92 | 9.94 → 11.23 | 9.17 → 10.36 |

**CVD separation, worst over every deficiency, all eleven Machado severities and Viénot
dichromacy** (floor 60):

| pair | was | becomes |
|---|---|---|
| `ok` / `bad` | 63.1 | **63.1** |
| `warn` / `bad` | 63.9 | **63.2** |
| `ok` / `warn` | 63.2 | **63.4** |

System-wide worst is **63.1 both before and after** — the change costs nothing here, which is
the whole reason this particular point was chosen over the 34 others.

**Salience rank** `bad` > `warn` > `ok` holds in both themes, measured as |APCA Lc| against each
theme's own background, which is what `checkSalience` asserts.

### The downsides, stated

**Three shipped colours change visibly.** `bad` in particular goes from `#861116` to `#7C000C` —
deeper, and reading as more saturated because the blue channel drops from 22 to 12. Anyone who
has seen the product's error state will see a different red.

**The margins on the well are real but not generous** — 4.70 and 4.75 against 4.5. A future
change to `swatch.well` itself would put them back under, and there is no headroom to absorb one
silently. The pairing is now declared, so gate 9 would catch it; that is the guard, and it is a
guard rather than a cushion.

**`warn` still has no reader.** Moving it does not give it one. The token ledger's entry has to
stop saying `warn` is *blocked* and start saying it is *unused*, which are different facts and
only one of them is now true.

**A second re-approval is owed.** `valuesChangedSinceApproval` now records this change and
supersedes the 2026-08-19 / ADR-0053 entry for the three dark tokens. Superseding records which
entry is current; it does not ratify the older one. Both are outstanding against the
2026-08-14 signature.

## Alternatives taken seriously

**Restrict `adjacentToSample` to `bad` in the type.** No colour changes, closes the trap today,
and it is genuinely defensible: `bad` is the only kind any surface draws. Rejected because it
withdraws the promise rather than meeting it — a success or a caution could then never appear
beside a colour sample, which is a real product limitation adopted to avoid a colour decision.
And `warn` would be left with neither a home nor a route to one.

**Reduce `warn`'s chroma so it can darken freely.** At c 0.08 it has ΔL 0.131 of gamut headroom
and clears every contrast floor comfortably. Rejected on measurement: `ok`/`warn` falls to 45.6
under protan (Viénot). The chroma exception predicted this in words; the search confirmed it in
numbers.

**Move the hues.** Not explored beyond confirming that a lightness-only solution exists. Hue is
the most visible property of a semantic colour — green means success, amber means caution — and
moving it to satisfy a contrast floor is the largest possible change for the problem at hand.

**Darken `swatch.well`.** Refused without measurement. The well is the neutral ground a colour
sample is judged against; its value is a colour-appearance decision, not a contrast budget to
spend.

## When this changes

Re-open it if `swatch.well` moves, if a fourth status kind is introduced, or if a surface
finally draws `warn` and somebody looks at it beside a sample and disagrees. The values are the
output of a search, not a preference, so the honest way to change them is to change a constraint
and re-run it.
