# AGENTS.md — `mockups/`

> **Scoped harness. Extends [`../AGENTS.md`](../AGENTS.md), which still applies in full.**
> This scope is **stricter**, never looser.

The set is **complete at 28** (`00`–`27`) and **load-bearing**: R9 (`F-218` … `F-270`)
rebuilds the product to match it with **no discretionary deviation**. The contract — what
"strict" means, how two contradicting mockups are resolved, and the closed list of forced
departures — is [`docs/design/R9-MOCKUP-FIDELITY.md`](../docs/design/R9-MOCKUP-FIDELITY.md).
Read it before building anything from an image in this directory.

> **The gate cannot see this file yet.** `scripts/verify-state.mjs` walks `apps/`, `packages/`
> and `content/` for scoped harnesses. `F-218` adds `mockups/`. Until it does, these rules bind a
> reader and are invisible to the build [[a-gate-that-errors-is-failing-open]].

---

## What an image here is

**The specification for everything a person can see** — layout, composition, hierarchy,
density, scale, typeface, colour, radius, icon, illustration, copy structure. R9 follows all of
it.

**Not the specification for anything a person reads as a fact.** The images are
image-generation renders. Their names, numbers, dates and provenance lines are placeholders, and
they do not survive checking — [`R9-MOCKUP-FIDELITY.md` §4](../docs/design/R9-MOCKUP-FIDELITY.md#e1--mockup-content-is-sample-content).

---

## Three absolute rules

### 1. Mockup content never reaches the product

No colour name, hex, value, count, date or provenance line is copied from an image. The slot is
built exactly; what fills it comes from the engine, the corpus or the store.

The images print over twenty colour names that are **not in [`../content/colors/`](../content/colors)**
— all 120 entries there are `japanese-inspired` and none claims an era — and cite an 1842 Edo
dyeworks manuscript that does not exist. Copying either into the product is the dishonesty
[`../content/AGENTS.md`](../content/AGENTS.md) rule 3 describes.

### 2. No drawn claim ships unless the product can demonstrate it

*"97% Match"*, *"100% CVD-Safe"*, *"Museum-grade"*, *"Master Harmony"*, *"Extracting reflectance
spectra"* — the element is built; its words come from a defined computation. **None of these
trips [`claims.json`](../.harness/verification/claims.json) today**; `F-219` closes that. Until
then this rule is enforced by reading.

### 3. A changed image is a changed specification

An image is replaced or edited only together with its row in the route index (`F-218`) and its
element inventory (`F-220`). A mockup that changes silently leaves every feature built from it
checking against a picture nobody specified.

---

## The palette is the mockups'

Until 2026-09-10 this file said the colour ramp was not the mockups' to set. **The user decided
otherwise, after the trade-off was put to them**, and the decision is recorded here rather than
softened: `F-225` adopts the README token table, including a surround behind samples that carries
chroma (C up to 0.0206), and its ADR states that consequence plainly.

**Three tokens still move**, because a blocking accessibility gate may not be lowered — the
smallest passing step, listed with its ΔE00 in
[§4 E3](../docs/design/R9-MOCKUP-FIDELITY.md#e3--accessibility-floors-that-are-blocking-gates).

---

## The set disagrees with itself

The tab bar is drawn nine ways. Home `01` and Home-light `25` are different designs; so are
colour detail `06` and its Japanese `26`. **A feature never resolves that on its own** — the
precedence in [§3](../docs/design/R9-MOCKUP-FIDELITY.md#3--precedence--how-a-contradiction-between-mockups-is-resolved)
does, and the decisions are in the conflict register (§6).

---

## The register

The botanical and garment line-art is the warmth channel and R9 keeps it. **Do not drift to
kawaii**: [`../docs/design/BRAND.md`](../docs/design/BRAND.md) excludes it by name as *a
different, unrelated cultural register*. The set does not drift there; hold that on purpose.
