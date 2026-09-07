# Claims lint fixture — the Japanese copy, both directions

The negative control for the Japanese half of `scripts/verify-claims-proof.mjs` (F-172, E-089).

**This is the product's own text, not my judgement of Japanese.** Every string below was already
in `apps/mobile/src/i18n/ja.ts`, and the verdict on each was established when E-089 audited the
catalogue — two of them were defects and were fixed; six were correct and were left alone. A
pattern set that gets this file wrong in either direction is wrong about the shipping product.

## What was wrong, and is the reason this gate exists

The Home screen called a camera reading a **measurement**:

- `home.lastReading` was 最後の測定
- `home.noReadings` was まだ測定がありません

A camera reading is `estimated` provenance. ADR-0031 reserves that vocabulary for `reference` and
`calibrated` — the two sources with an instrument behind them. Both strings now say 読み取り, which
is what the rest of the catalogue already used.

**No pattern catches these**, and that is deliberate rather than an oversight. See below.

## What is correct, and must never be flagged

The `measure` screen is about values a person read off **their own instrument**, which is exactly
the provenance the word is reserved for:

- 測定値と色差
- お手持ちの測定器の値を入力すると、この端末で収録版と照らし合わせます。どこにも送らず、保存もしません。
- 測定した色をえらぶ
- 測定器が返す形式
- この測定値を追加
- 入力した測定値

Six uses, all legitimate. **A rule that banned the vocabulary would pass every red case in the
proof and break the product's only honest use of the word** — which is why this file is the case
that must stay green.

## Why 測定 is not a pattern

Telling the two groups apart is grammar. The defect was a bare noun describing an estimate; the
legitimate uses attach to 器 (device) and 値 (value), or sit in the past tense about something the
person did.

Writing that rule from a dictionary produces a lint that either passes everything or blocks
correct copy — **and neither failure would be visible to whoever wrote it**. So it is recorded as
the worked example the native-speaker review has to settle, rather than guessed at. F-172's first
acceptance criterion is outstanding for exactly this.

## Honest vocabulary, in both languages

An estimate is an estimate: 読み取り, 推定. A corpus entry is the closest reference ranked by ΔE00,
never an identity. A calibrated value may say 測定 because a reference card was in frame and the
correction is recorded.

## What this fixture proves

1. The seven Japanese patterns do **not** fire on the product's real, correct copy.
2. Therefore a red result from a mutated copy of this file is caused by the mutation.

Without a green baseline in the language the patterns are written for, every red is
uninterpretable — which is the same argument `clean.md` makes for English, and it needed making
twice because the gate needed teaching twice.
