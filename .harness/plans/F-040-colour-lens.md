# Plan: F-040 — Colour Lens

| | |
|---|---|
| **Feature** | F-040 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-12, NFR-12, FR-13, FR-14 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` |
| **Author** | implementing session |
| **Date** | 2026-08-20 |

---

## Intent

Point the camera at a garment and get a colour, with a confidence that tells the truth. The
product's centrepiece — and the surface where its privacy claim either holds or does not.

The maths landed in **F-077**; this is the plumbing that feeds it. That split is the reason
this plan can be honest about verification instead of pretending a camera exists.

## The verification story, stated first because it shapes everything

**None of the camera behaviour runs here.** No device, no simulator, no frames. So the plan
is explicit about which half is which, rather than discovering it at the end:

| Gated, here, now | Attested, on a device |
|---|---|
| No colour maths in `apps/mobile` — a guard, planted and watched firing | Frame processors run on a worklet thread and the UI thread never blocks |
| Only a small numeric result crosses the bridge — enforced by the **type**, not by review | `yuv` is the negotiated format and conversion happens in the processor |
| A frame is never written to a file — a guard | Every frame is disposed and the pipeline does not stall |
| Colour space `unknown` caps confidence — pure function, tested | The real colour space a real device reports |
| Four capture modes exist and each calls the engine | Sustained ≥ 15 updates/sec (FR-13) |
| No network permission is requested (already true since F-039) | No socket opens during a scan (NFR-12) |

Roughly half the acceptance is attested, and that is a property of the feature rather than a
shortcoming of the plan. Saying so is what [ADR-0038](../../docs/adr/0038-every-acceptance-criterion-names-its-check.md)
exists for.

## The three things a guard must catch, because no test here can

1. **Colour maths drifting into the app.** `apps/mobile/AGENTS.md`: *"The engine is imported,
   never ported."* A mobile-only re-implementation makes the same fabric measure differently on
   two surfaces, and [E-008](../state/effects.json) records that **no single-platform test can
   see it**. The worklet is exactly where this temptation lives, because a worklet cannot call
   arbitrary JS and the easy fix is to inline the arithmetic.
2. **A frame reaching disk.** NFR-12 and [ADR-0026](../../docs/adr/0026-privacy-on-device-by-default.md):
   ordinary colour detection never transmits or stores imagery. A debug write during
   development is how that becomes false, and it would survive review as a one-line change.
3. **A frame crossing the bridge.** The whole design is that a small numeric result crosses and
   the pixels do not. Enforced by the **return type** of the processor, so passing a frame does
   not compile — a comment saying "don't" is not a mechanism.

## Approach

**Reused:** `@irodora/color-sampling` for every number · `@irodora/color-core` so a result
carries provenance by type · `@irodora/ui` for the surface · the catalogue (ADR-0056) for copy.

**New:** `apps/mobile/src/lens/` — the capture modes, the colour-space→confidence rule, the
frame-processor result type, and the screen.

### Increments

1. **The result type and the colour-space rule.** `LensReading` carries only numbers and a
   `Provenance`; the colour-space mapping caps confidence when the platform will not say.
   Pure, fully tested. → `pnpm --filter @irodora/mobile test`
2. **The four capture modes**, each a thin call into `@irodora/color-sampling`. Tested against
   synthetic regions, so "each mode calls the engine" is a fact rather than an intention.
3. **The guards**: no colour maths in the app, no image write, planted and watched firing.
   → `node scripts/verify-guards.mjs`
4. **The camera surface** — VisionCamera, the worklet, the screen. Compile-checked; behaviour
   attested.
5. **Record and close**, moving `claims.json`'s `provenanceLanguage` half here now that a
   non-`declared` provenance finally exists.

## Anticipated effects

**E-008 finally has both ends.** It has protected a rule about code that did not exist; F-077
gave it the engine end, and this gives it the platform end — the guard is the new lint plus the
engine purity gate.

**Touches E-002.** This produces the first `estimated` provenance in the product, which is what
makes the `provenanceLanguage` table in `claims.json` checkable at last. F-017 moved it to F-040
for exactly this reason.

## Test plan

- **Pure logic:** the colour-space→confidence rule at every input including `unknown`; the four
  modes over synthetic regions; the result type carrying no pixel data.
- **Negative, with decoys:** a mode that computes a mean itself must fail the guard; a write to
  the filesystem in the lens path must fail the guard; a processor returning a frame must not
  compile.
- **Assertions to reject:** asserting the worklet "is a function"; asserting confidence is a
  number; any test that renders the camera and asserts it did not crash — jest-expo will happily
  mock a camera that does nothing, and that test would pass forever.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
node scripts/verify-guards.mjs
```

## Risks and open questions

**A worklet cannot call arbitrary JavaScript**, which is precisely why colour maths gets
inlined into one. If the engine cannot be called from a worklet, the honest answers are to move
the call off the worklet thread or to compile the engine for it — **not** to reimplement the
arithmetic there. Recorded now so the decision is made deliberately rather than under pressure.

**FR-13 asks for ≥ 15 updates/sec** and nothing here can measure that. It is attested, and it
is the criterion most likely to force a design change once measured.

## Out of scope

Calibrated capture with a reference card (F-053) · pattern and multi-colour extraction (F-064)
· the outfit scanner (F-054) · saving a reading (F-042 owns the wardrobe model) · any accuracy
*claim* — this produces a confidence, and ADR-0031 governs what may be said about it.
