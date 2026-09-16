# Plan: F-275 — The serif is identified against open-licence candidates

| | |
|---|---|
| **Feature** | F-275 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-69 (via `F-226`), NFR-11 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `mockups/tools` · docs |
| **Author** | implementing session |
| **Date** | 2026-09-16 |

---

## Intent

Give the person answering **OQ-29** a measured choice instead of a single commercial answer. F-220
measured `01`'s wordmark against the 20 serifs installed on this machine and found Georgia Pro
closest (IoU 0.83), under a commercial licence, with **no open-licence face among the candidates** —
so the question as it stands offers "buy Georgia Pro" or "pick something unmeasured". This measures
open-licence faces the same way and records them beside that result.

**Taken out of the backlog now because the user authorised the downloads** (2026-09-16: *"For
downloading fonts, do it yourself"*), which was this feature's only blocker, and because OQ-29 blocks
F-226, a must.

## Approach

**Reused:** `mockups/tools/serif-match.ps1` — F-220's matcher, which renders a word and scores it
against a crop of the image by mask IoU on a 160-column grid after scaling to the target's bounding
box; the wordmark and tagline boxes already recorded in `mockups/tools/inventory-data/{00,01,14,25}.mjs`,
so the crops are the inventory's own readings rather than new measurements.

**New:**

- **`-fontDir` on `serif-match.ps1`**: font files loaded through `System.Drawing.Text.PrivateFontCollection`
  and scored beside the installed families. A downloaded face is measured **without being installed**,
  which keeps the machine's font set out of the result and the result reproducible.
- **The candidate set**, fetched from the `google/fonts` repository's `ofl/` tree — each face's own
  file plus the `OFL.txt` beside it, recorded with its URL and size. Chosen for resemblance to the
  drawn letterforms rather than by popularity, and one of them, **Gelasio**, is designed as a
  metric-compatible alternative to Georgia, which is the face F-220 measured closest.
- **The record**: §5 of `R9-MOCKUP-FIDELITY.md` gains the open-licence scores beside the installed
  ones; **OQ-29** in PRD §10 and fidelity §11 names the closest open face so the question becomes a
  choice between measured options.

**Nothing is committed as a binary.** The font files live in the session scratchpad: this feature
measures, and `F-226` is what ships a face (with `NOTICE.md`, the subset and the coverage gate). A
font in the repository that nothing loads would be a licence obligation with no reader.

**Increments:**

1. The claim, this plan, and the tool's `-fontDir`.
2. The downloads, each recorded with source URL, licence and size; the run over `01`'s wordmark and
   tagline and over `00`, `14`, `25`.
3. The record: §5, OQ-29 in both places, `progress.md`.

## Mockup fidelity

- **Governing mockups:** `01` (the wordmark and tagline), `00`, `14`, `25` — the four F-220 measured.
- **Inventory:** none built. The crops come from `01.header.wordmark`, `01.header.tagline`,
  `00.wordmark`, `25.wordmark` and `14`'s mark.
- **Bindings:** none.
- **Departures:** none. **This decides nothing a person has not been asked** — it measures candidates
  and hands OQ-29 a table; which face ships stays the person's answer (golden rule 14).

## Files to touch

```
mockups/tools/serif-match.ps1          — `-fontDir`, loading faces from files
mockups/tools/README.md                 — how the open-licence run is reproduced
docs/design/R9-MOCKUP-FIDELITY.md §5    — the scores beside the installed result
docs/PRD.md §10, R9 §11                 — OQ-29 gains the closest open face
.harness/state/feature_list.json; progress.md
```

## Anticipated effects

1. **OQ-29's content changes** → `F-226`, which is blocked on it, and `verify-mockups`' open-question
   check reads both §10 and §11. Guard: `gate:state`, `verify-mockups`.
2. **`serif-match.ps1` gains a parameter** → nothing else runs it; it is a measurement tool, not a
   gate. Guard: none needed, and saying so rather than inventing one.
3. **No effect on the build**: no source, no token, no shipped asset.

## Test plan

- **Unit / property:** none — this is a measurement, and its evidence is the scores it prints.
- **The decoy that matters:** the installed faces are scored in the same run, so Georgia Pro's 0.83
  reproduces. A run where the known answer moved would mean the loader, not the candidates, changed
  the measurement.
- **Negative:** a face that fails to load must be reported by name rather than skipped silently —
  otherwise a missing candidate reads as a candidate that scored badly.

## Verification

```
node scripts/verify-state.mjs
corepack pnpm lint && corepack pnpm format:check
node scripts/verify-mockups.mjs && node scripts/verify-claims.mjs
```

Each captured in its own variable.

## Risks and open questions

- **The scores are a shape comparison, not a typographic judgement.** IoU on a mask says which
  outline covers the drawn one best at one size; it cannot see spacing, hinting, language coverage or
  licence terms. The record says so, and OQ-29 stays the person's.
- **Japanese coverage is not measured here.** `20`'s card and `26` draw Japanese in a serif, and no
  Latin face answers that; `F-226`'s second criterion owns it.

## Out of scope

Shipping a face, subsetting it, `NOTICE.md`, the font-coverage gate — all `F-226`. Answering OQ-29.
