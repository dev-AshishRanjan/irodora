# Plan: F-076 — The Noto Sans JP subset asset

| | |
|---|---|
| **Feature** | F-076 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-11 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `scripts/` · `apps/mobile` · `@irodora/design-tokens` |
| **Author** | implementing session |
| **Date** | 2026-08-20 |

---

## Intent

Ship the face, so *"every kanji the corpus can render actually renders"* stops being a hope and
becomes a gate. F-017 built the checker and proved it against a synthetic font; the asset is
what was missing, and the download was explicitly authorised.

## What the environment allowed, and what it did not

**No Python**, so `fonttools`/`pyftsubset` — the conventional subsetter — is unavailable.
`subset-font` wraps the harfbuzz WASM build of `hb-subset` and needs none, which is what makes
the pipeline possible here at all. Recorded because the next person will reach for `pyftsubset`
first and find the same wall.

## Approach

**The subset is generated from our own content**, which is ADR-0057's whole argument. JIS X
0208 Level 1+2 would have been the conventional choice and a guess: 纁 is not in it, and a
corpus of traditional colour names is exactly where such characters live.

**The subset is committed; the 9.6 MB source is not.** The source is a downloaded build input,
cached under `.cache/`. CI never needs it — `verify-font-coverage.mjs` checks the *committed*
subset against the required set, so the artefact and the check are both in the repository.

**`--check` byte-compares.** `hb-subset` is deterministic for the same input and codepoint set,
so a difference means content changed and the font was not regenerated — the exact failure that
produces tofu on a device with every other gate green.

### Increments

1. The generator, the download, the subset.
2. The licence record — OFL 1.1, version, source, and why subsetting is permitted.
3. Gate wiring: coverage **and** staleness inside `content`.
4. `typography.families` reaches React Native, which F-017 deliberately deferred until the
   asset existed; the app loads the face and holds rendering until it is ready.

## Anticipated effects

**E-017 gets its guard.** It was recorded with `guard: none` pending this feature. A corpus
publish that introduces an uncovered character now fails `gate:content`, naming the entry and
the codepoint — proven by planting 纁 and watching it fail.

**E-007** — the manifest's RN target gains `nativeFamilies`, so four targets regenerate.

## Test plan

- **The proof that matters:** a corpus entry containing a codepoint the subset lacks must fail
  the coverage check. Planted 纁 and watched it fail, then removed it.
- **Staleness:** `--check` must fail when content changes without regeneration.
- **The stale F-017 test is replaced, not deleted.** It asserted that no family is emitted, which
  was correct then and correctly failed the moment it stopped being true. Its replacement
  asserts the opposite property: one family, not a stack, and `jp` only.

## Out of scope

The Latin face — ADR-0057 §6 keeps the platform font, because Latin has no tofu failure mode ·
weight subsetting beyond what the variable font carries · vertical writing.
