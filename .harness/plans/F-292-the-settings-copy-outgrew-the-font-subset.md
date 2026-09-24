# Plan: F-292 — The settings copy outgrew the Japanese font subset

| | |
|---|---|
| **Feature** | F-292 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-11 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `apps/mobile` (the committed asset) |
| **Author** | Claude Opus 5.5 · **Date** 2026-09-24 |

---

## Intent

Four kanji the Japanese catalogue now uses are not in the bundled font. 幅 is in
`settings.tabular` and 触 is in `settings.haptics`, so on a device those two settings rows render
a tofu box where a character should be. Gate 11 has been red on it since F-239 (2026-09-21), and
nobody saw, because CI stopped at step 8 first (F-291). Done means gate 11 is green and the font
carries every glyph the two rows need. Whether they then render in full on a device is not
observed here.

## Approach

**Reused:** `scripts/generate-font-subset.mjs`, the one generator (ADR-0057), unchanged. It unions
the codepoints of the ja catalogue, the corpus, the phrase lexicon and the taxonomy vocabulary
with the always-included ranges, and subsets the cached Noto Sans JP Variable.

**New:** nothing. The committed `apps/mobile/assets/fonts/NotoSansJP-Subset.ttf` is regenerated.

**Why the local subset will match CI's.** `--check` in CI fetches the source from google/fonts
`main` and byte-compares the subset it produces with the committed one. The cached source's git
blob is `cdd8f083c1f5928ff3361f8cda4d3fc9462cbe89`, the same as upstream's (read from the
contents API, no download), and upstream has not changed that file since 2022-11-03. The generator's other inputs,
`subset-font` and `harfbuzzjs`, are pinned by the lockfile. The claim that hb-subset gives the same
bytes on ubuntu as on Windows rests on history rather than on a proof: four subsets generated on
this workstation (3d70459, a6b60ea, a56e7b4, c81ffe7) passed CI's byte comparison. It is confirmed
for this one only when CI runs.

**Increments:** one. Regenerate, then run gate 11 and `--check`.

## Mockup fidelity

- **Governing mockup:** `15` (settings), the screen whose copy carries 幅 and 触.
- **Inventory / bindings:** unchanged. No element, value or layout moves. This restores glyphs the
  catalogue already names, and the copy is F-239's.
- **Departures:** none.

## Files to touch

```
apps/mobile/assets/fonts/NotoSansJP-Subset.ttf   — regenerated: four more glyphs
NOTICE.md                                        — the shipped size, stale since F-012 (added in review)
memory/effects/a-corpus-publish-can-outrun-…     — E-017's note: this recurrence (added in review)
.harness/state/feature_list.json, progress.md    — the record
```

## Anticipated effects

- **The font asset feeds every Japanese surface.** Adding glyphs changes no existing glyph: the
  subset is cut from the same source with a superset of codepoints. Guard: gate 11
  (`verify-font-coverage.mjs` and `generate-font-subset.mjs --check`).
- **Bundle size grows by four glyphs.** It is measured and recorded, not assumed.
- Existing links: whatever `effects.json` has from the subset or ADR-0057. Follow each one.

## Test plan

- **Negative first:** gate 11 red at HEAD, naming the four codepoints (F-291's CI walk, recorded).
- `node scripts/verify-font-coverage.mjs` green, and `node scripts/generate-font-subset.mjs --check`
  green, both on the regenerated file.
- `pnpm test:content` green as a whole, and the content mutation proof.
- The glyph count and byte size before and after, recorded.

## Verification

```
node scripts/verify-state.mjs
pnpm test:content
node scripts/verify-content-proof.mjs
pnpm security        # always
```

## Risks and open questions

- **Comments cost glyphs.** 仕 and 様 are only in a comment at `ja.ts:517`. The generator and the
  check agree on reading the whole file, so this is consistent rather than wrong. Changing what
  counts as required text is a change to ADR-0057's rule, and it is not this feature.

## Out of scope

Anything that changes what the generator or the check treats as required text.
