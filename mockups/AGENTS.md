# AGENTS.md — `mockups/`

> **Scoped harness. Extends [`../AGENTS.md`](../AGENTS.md), which still applies in full.**
> This scope is **stricter**, never looser.

This directory became load-bearing on 2026-09-10, when it was made the reference the product
UI is rebuilt against. Everything here is therefore governed, and R9 (`F-218` … `F-248`) is
the release that acts on it.

> **The gate cannot see this file yet.** `scripts/verify-state.mjs` walks `apps/`, `packages/`
> and `content/` for scoped harnesses. `F-218` adds `mockups/`. Until it does, these rules are
> binding on a reader and invisible to the build — which is exactly the asymmetry
> [[a-gate-that-errors-is-failing-open]] is about, and why it is recorded rather than assumed.

---

## What a mockup is, and what it is not

**A mockup is art direction: composition, hierarchy, density, scale, register.** In those
respects the set is good, and R9 adopts it.

**A mockup is not a specification, and nothing in it is data.** Mockups `01`–`18` are
image-generation renders. Measured against the repository on 2026-09-10:

| what the render says | what the repository says |
|---|---|
| `#5B6B78` is `CIELAB 45.2 / -3.4 / -8.1` | `44.37 / -2.85 / -9.23` |
| `#5B6B78` is `OKLCh 0.490 / 0.035 / 240.2°` | `0.519 / 0.028 / 242.7°` |
| `Display-P3 0.357, 0.420, 0.471` | that is the sRGB triplet ÷ 255, not a P3 conversion |
| 甚三紅 `#EB6EA5` (a light pink) | rendered as a deep crimson |

**Take the layout. Re-derive every number.**

---

## Three absolute rules

### 1. No colour name that is not in the corpus

All 120 entries in [`../content/colors/`](../content/colors) are classified
`japanese-inspired`. Every one is an Irodora construction. **None claims an era.**

The current set prints thirteen names that do not exist here — *Ai-nezumi, Tetsu-kon,
Kachi-iro, Moegi, Toki-iro, Jinza-momi, Koke-iro, Uguisu-cha, Nureba-iro, Shiro-neri,
Gin-nezumi, Kuchiba, Sabi-asagi* — and attributes them to periods the corpus does not record.

### 2. No provenance a source does not stand behind

Mockup `06` prints:

> *"Historical Provenance: Sourced from Edo period dyeworks manuscript (1842). Verified natural
> indigo recipe."*

**That manuscript does not exist.** [ADR-0065](../docs/adr/0065-the-seed-corpus-is-coined-not-canonical-and-constructed-not-measured.md)
exists to prevent that sentence, and `10`'s *"Heian Verified"* badge is the same claim in a
smaller font. Inventing a citation in a reference image is the failure
[`content/AGENTS.md`](../content/AGENTS.md) rule 3 describes, committed a directory away from
where the gate is looking.

### 3. No number without the thing that produced it

ΔE00 is honest. A percentage bolted onto it is not, and the honest half is what makes the
invented half credible.

Banned in this directory for the same reason [ADR-0031](../docs/adr/0031-measurement-claims-policy.md)
bans them in the product: *"97% Match"*, *"95% Confidence"*, *"100% CVD-Safe"*, *"100%
Distinguishable"*, *"Museum-grade"*, *"Master Harmony"*, and any composite score standing in
for the measurements underneath it.

> **These do not currently trip [`claims.json`](../.harness/verification/claims.json).** Checked,
> string by string, before this file was written. The pattern list is narrower than the policy,
> and `F-219` closes that gap. Until it does, this rule is enforced by reading.

---

## The colour ramp is not the mockups' to set

The set proposes a ground of `#15171B` rising to `#464D5B` — **OKLCh C 0.0086 → 0.0251, all at
h ≈ 264°**. The shipped ramp sits at **C ≈ 0.004** at every step, which is achromatic to within
measurement noise.

That difference is not taste. `level3` is the surface a sample sits on, and a chromatic
surround shifts the perceived hue of what sits in it — the reason viewing standards specify a
*neutral* surround for appraisal. [ADR-0096](../docs/adr/0096-a-theme-is-a-hue-on-the-chrome-and-never-touches-the-ground-a-colour-is-judged-against.md)
is titled for precisely this, and its chroma ceiling is `0.01`.

**The cool register is available and already proven: `themeRecipes.fuka`, hue 240, pinned to
the corpus entry `fuka-mizu`.** `F-220` decides between pointing at it and adding a recipe near
264°. Repainting the base ramp is not on the table.

---

## Every mockup names its route

A mockup that depicts no route, and a route that no mockup depicts, are both defects. As of
2026-09-10 the set has both:

- **Six routes are undrawn** — `atlas/with/[slug]`, `atlas/card/[slug]`, `atlas/nearby/[slug]`,
  `wardrobe/shopping`, `profile/index`, `wardrobe/with/[id]`.
- **`07` is mis-routed** — filed at `atlas/with/[slug]`, draws `atlas/wear/[slug]`.
- **`16` names a route that does not exist** — `/atlas/palettes/create`; the draft state lives
  inside `atlas/palettes.tsx`.
- **Nothing shows light, and nothing shows `ja`** — both ship, and neither is a fallback.

`F-218` builds the index that makes each of these a build failure rather than a reading.

---

## The register

Adopt the delicate botanical and garment line-art. It is the warmth channel, and it is why the
set feels like a product rather than a spreadsheet.

**Do not drift to kawaii.** [`../docs/design/BRAND.md`](../docs/design/BRAND.md) excludes it by
name as *a different, unrelated cultural register*. The set does not currently drift there; the
distance is small, and it is held on purpose.
