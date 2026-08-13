# NOTICE

Irodora incorporates third-party material. This file records what, from where, and under
what terms. It is maintained alongside every dependency and content addition, and its
completeness is checked by the `content` verification gate.

---

## 1. Software dependencies

Runtime and development dependencies are declared in `package.json` files and pinned by
`pnpm-lock.yaml`. Each carries its own licence. A full machine-generated inventory (SBOM)
is produced per release; see [`docs/operations/release-process.md`](docs/operations/release-process.md).

**Licence policy.** Permissive licences (MIT, ISC, BSD, Apache-2.0) are allowed. Weak
copyleft (MPL-2.0, LGPL) requires review before adoption. Strong copyleft (GPL, AGPL) is
not permitted in shipped code. The check runs in CI.

### Notable dependencies used as test oracles, not runtime code

The colour engine is implemented in-house
([ADR-0004](docs/adr/0004-own-the-colour-engine-culori-as-test-oracle.md)). The following
are development dependencies used to cross-validate our maths, and are **not** shipped:

| Library | Licence | Used for |
|---|---|---|
| `culori` | MIT | Independent conversion and ΔE reference values |
| `colorjs.io` | MIT | CSS Color 4 specification conformance cross-check |

---

## 2. Colour science

The engine implements published, non-proprietary colour science. Formulae and the
standards that define them are cited in
[`docs/architecture/color-engine.md`](docs/architecture/color-engine.md). Mathematical
formulae are not themselves copyrightable; the specification documents that describe them
are, and we do not reproduce their text.

| Source | Used for | Note |
|---|---|---|
| CIE 15:2018 (colorimetry), CIE 142:2001 (CIEDE2000) | Lab, LCh, ΔE00 | Formulae implemented from published description; CIE documents are not redistributed |
| IEC 61966-2-1 (sRGB) | Transfer function, primaries | As above |
| Björn Ottosson, *Oklab* (2020) | OKLab / OKLCH | Published by the author into the public domain |
| W3C CSS Color 4 / 5 | Space definitions, gamut mapping | W3C Document Licence; used as specification, not copied |
| WCAG 2.2 (W3C) | Contrast criteria | W3C Document Licence |
| Brettel, Viénot & Mollon (1997); Viénot et al. (1999) | CVD simulation | Algorithms implemented from published papers |
| Machado, Oliveira & Fernandes (2009) | Anomalous-trichromacy CVD models | As above |
| Bruce Lindbloom's reference values | Golden-dataset cross-validation | Values used for verification; attribution retained in test fixtures |

---

## 3. Colour content and cultural material

**Irodora does not ingest third-party colour datasets.** The corpus is compiled
in-house with per-entry provenance. The full policy — including our position on Sanzo
Wada's *Haishoku Soukan*, on modern digitisations, and on the difference between a
public-domain source work and a copyrighted modern edition of it — is in
[`docs/content/licensing-and-provenance.md`](docs/content/licensing-and-provenance.md)
and [ADR-0007](docs/adr/0007-colour-corpus-provenance-and-licensing.md).

Every corpus entry carries `source`, `source_type`, `source_licence`, `verified_by` and
`verified_at`. An entry without complete provenance cannot ship: the `content` gate
fails the build.

Nothing in this repository asserts that a digitally rendered hex value *is* a historical
Japanese colour. The product's language is "closest digital reference", never "exact
traditional colour".

---

## 4. Fonts and brand assets

Recorded here when adopted, with the licence under which each is used. Irodora's own
marks, wordmark and generated illustration are proprietary and covered by
[LICENSE](LICENSE).

---

## 5. Harness methodology

The agent harness in [`.harness/`](.harness/) is our own work. Its structure is informed
by two openly published bodies of work, adapted rather than copied:

- **Learn Harness Engineering** (walkinglabs) — the five-subsystem model
  (Instructions · State · Verification · Scope · Lifecycle), WIP limits, the clean-state
  protocol, and the generator/evaluator separation.
- **ECC** (Affaan Mustafa, MIT) — skill-file patterns, continuous-learning capture, and
  the observation loop.

Where an ECC skill was adapted, the derived file says so in its own header. Our principal
adaptation is that all memory is written to the **in-repository** system of record rather
than a personal agent store — see [ADR-0029](docs/adr/0029-harness-agnostic-core-thin-adapter.md).

### Design skills

Three published design skills were **read and adapted** into our own harness skills rather
than installed as dependencies. We do not vendor them; each derived file names its source in
its own header, and each was rewritten against this product's constraints.

| Source | Licence | Adapted into | What we took, and what we changed |
|---|---|---|---|
| **taste-skill** (© 2026 Leonxlnx, `github.com/Leonxlnx/taste-skill`) | MIT | [`visual-taste`](.harness/skills/visual-taste/SKILL.md) | The anti-generic discipline, brief inference, audit-before-redesign, the pre-flight check. **Changed:** the escape from generic output is bound to *this* subject — for a colour product the answer is not "add visual interest", it is restraint executed with enough craft to read as deliberate |
| **Emil Kowalski**, *Animations on the Web* (`emilkowal.ski`) | Published writing, cited not copied | [`motion`](.harness/skills/motion/SKILL.md) | Duration by interaction class, exits faster than entrances, ease-out as default, compositor properties only, springs only where a physical metaphor is real. **Changed:** the product rule that motion may never alter a colour overrides all of it wherever they meet |
| **Impeccable** design skill · **shadcn/ui** conventions | — | [`build-ui`](.harness/skills/build-ui/SKILL.md) | Type-scale contrast, tracking by size, balanced headings, measure, proximity-before-size, tabular numerals. Token **naming** compatibility with shadcn/Base UI |

**Astryx** (Meta, MIT) was evaluated as a frontend foundation and **not adopted** — see
[ADR-0033](docs/adr/0033-frontend-foundation-own-the-token-layer-headless-primitives.md).
No Astryx code is used. Our token names are shadcn/Base-UI compatible, which is
interoperability rather than adoption; no shadcn code is vendored either.
