/**
 * The Japanese catalogue.
 *
 * `Record<MessageKey, string>` — so a missing key and an extra key are both `tsc` failures,
 * and neither needs a script that someone has to remember to wire into a gate.
 *
 * ## Translated is not the same as reviewed, and the gap is recorded rather than hidden
 *
 * ADR-0028 and the `i18n-copy` skill both forbid shipping machine translation without review
 * by a competent speaker. **OQ-5 is closed by [ADR-0060](../../../../docs/adr/0060-one-editor-and-self-review-is-declared-rather-than-assumed.md)
 * as a decision, not an answer** — Irodora ships with one editor — so the reviewer this file
 * waits for is still not engaged. F-012 shipped 120 corpus entries under the same limitation,
 * and F-018 roughly quadrupled this catalogue, so the gap is larger than when it was written.
 *
 * So the mechanism ships now and the *quality* is declared outstanding: every entry carries a
 * review status against a roster id ([ADR-0047](../../../../docs/adr/0047-editorial-identity-is-a-roster-id-not-a-name.md)),
 * the unreviewed count is asserted and printed by the test, and F-017 carries the
 * corresponding **attested** criterion. What must never happen is *"a missing translation
 * fails the build"* quietly becoming *"an unreviewed translation passes silently."*
 */

import type { MessageKey } from './en';

export const ja: Record<MessageKey, string> = {
  'home.title': 'このデバイスでエンジンが動作しています',
  'home.offline': 'ここで計算しました。どこにも送信していません。',
  'colour.hex': '16進',
  'colour.coordinates': 'OKLCh',
  'colour.source': '出典',
  'colour.difference': '色差',
  'colour.differenceUnit': 'ΔE00',
  'sample.indigo': '藍',
  'sample.blueBlack': '藍墨茶',

  'atlas.title': '色の一覧',
  'home.openAtlas': '色を見る',
  'atlas.corpus': '収録版',
  'atlas.colours': '色',
  'atlas.palettes': '配色',
  'atlas.search': '名前や読みで探す',
  'atlas.filters': 'しぼりこみ',
  'atlas.all': 'すべて',
  'atlas.clear': '解除',
  'atlas.showing': '表示中',
  'atlas.empty': '条件に合う色がありません。',
  'atlas.emptyHint': '解除するとすべての色が表示されます。',
  'filter.family': '系統',
  'filter.temperature': '寒暖',
  'filter.lightness': '明るさ',
  'filter.chroma': 'あざやかさ',
  'filter.season': '季節',
  'temperature.warm': '暖',
  'temperature.cool': '寒',
  'temperature.neutral': 'どちらでもない',
  'band.dark': '暗い',
  'band.mid': 'ふつう',
  'band.light': '明るい',
  'chroma.low': '低い',
  'chroma.mid': 'ふつう',
  'chroma.high': '高い',
  'season.spring': '春',
  'season.summer': '夏',
  'season.autumn': '秋',
  'season.winter': '冬',
  'classification.historical': '史料にもとづく色',
  'classification.traditional': '伝統色',
  'classification.modern-japanese': '現代の日本の色',
  'classification.japanese-inspired': '日本の色に着想を得た当社の色',
  'classification.editorial': '当社が選んだ色',
  'role.anchor': '基準',
  'role.neutral': '中間',
  'role.light': '明色',
  'role.accent': '差し色',
  'detail.names': '名前',
  'detail.kanji': '漢字',
  'detail.kana': 'かな',
  'detail.romaji': 'ローマ字',
  'detail.english': '英語',
  'detail.coordinates': '色の数値',
  'detail.description': '説明',
  'detail.contemporary': '今の使いかた',
  'detail.fashionUse': '衣服での使いかた',
  'detail.taxonomy': '分類',
  'detail.provenance': 'この色の由来',
  'detail.relations': '関連する色',
  'detail.palettes': 'この色を含む配色',
  'detail.colourVision': '色覚',
  'detail.editorialNotes': '編集メモ',
  'detail.notFound': 'この版にその色はありません。',
  'detail.notRecorded': '記録なし',
  'coord.xyz': 'XYZ (D65)',
  'coord.lab': 'CIELAB',
  'coord.lch': 'CIELCh',
  'coord.oklch': 'OKLCh',
  'coord.rgb': 'sRGB',
  'coord.inGamut': 'sRGBの範囲内',
  'coord.outOfGamut': 'sRGBの範囲外。下の16進はもっとも近いsRGBの表示',
  'coord.renderDifference': '画面に描かれる色との差',
  'prov.source': '出典',
  'prov.sourceId': '出典番号',
  'prov.sourceType': '出典の種類',
  'prov.licence': '利用条件',
  'prov.rightsHolder': '権利者',
  'prov.publisher': '発行',
  'prov.publishedYear': '発行年',
  'prov.url': 'リンク',
  'prov.derivation': '値の求めかた',
  'prov.author': '執筆',
  'prov.reviewer': '確認',
  'prov.reviewedAt': '確認日',
  'prov.independence': '確認の独立性',
  'independence.independent': '執筆者とは別の人が確認',
  'independence.self': '執筆者自身が確認',
  'sourceType.measurement': '実測',
  'sourceType.publication': '刊行物',
  'sourceType.museum-record': '博物館の記録',
  'sourceType.editorial': '当社の編集',
  'sourceType.standard': '規格',
  'rel.related': '色が近い',
  'rel.complementary': '色相が反対',
  'rel.historicalVariants': '歴史上の異なる呼び名',
  'rel.none': '記録なし',
  'cvd.normal': '指定どおり',
  'cvd.protan': '赤が弱い（1型）',
  'cvd.deutan': '緑が弱い（2型）',
  'cvd.tritan': '青が弱い（3型）',
  'cvd.note':
    'この端末で、公開されたモデルの最も強い段階で計算した模擬表示です。模擬はモデルであり、他の人に見えているものではありません。',
};

/**
 * Values that are legitimately identical in both languages.
 *
 * Without this list, "no ja value equals its en value" would be the check that catches a
 * copy-paste placeholder — and it would also flag these, which are notation rather than prose.
 * The list is explicit and short **by design**: every entry is a place the check is switched
 * off, so it must be short enough to read.
 */
export const IDENTICAL_BY_DESIGN: readonly MessageKey[] = [];

/**
 * Notation, which is the same symbol in both languages.
 *
 * `IDENTICAL_BY_DESIGN` is capped at three because it is a list of *favours* — each entry
 * switches the copy-paste check off at one key, and a list of favours has to stay short enough
 * that somebody reads it. F-018 needed five more, and lengthening the list would have made the
 * cap a number to edit rather than a constraint.
 *
 * So this is a **category with a rule instead**, and the rule is stricter than the list it
 * replaces: an entry must be identical in both languages AND look like notation —
 * `NOTATION_SHAPE`, at most `NOTATION_MAX` characters. "CIELAB" and "ΔE00" qualify;
 * "Search by name or reading" cannot, whatever anyone claims about it.
 *
 * The ad-hoc list is now **empty**, and that is the point: every exemption is governed by
 * something a test can check rather than by an assertion in a comment.
 */
export const NOTATION_KEYS: readonly MessageKey[] = [
  'colour.coordinates',
  'colour.differenceUnit',
  'coord.xyz',
  'coord.lab',
  'coord.lch',
  'coord.oklch',
  'coord.rgb',
];

/**
 * A symbol, optionally with one parenthesised qualifier. Anchored at both ends.
 *
 * The first draft was `[A-Za-z0-9Δ ().-]*`, which the decoy immediately caught admitting
 * "Not recorded" — twelve characters of ordinary prose. A space followed by a bare word is
 * what separates a phrase from a symbol, so the space is now allowed only before a
 * parenthesised qualifier: "XYZ (D65)" qualifies, "Not recorded" cannot.
 *
 * **What it cannot see, and the reason the list stays short:** a single capitalised English
 * word — "Search" — is indistinguishable from a symbol by shape alone. This rule removes the
 * realistic copy-paste failure (a sentence) and the length cap removes phrases; the remaining
 * case is why `NOTATION_KEYS` is still a reviewed list rather than an open category.
 */
export const NOTATION_SHAPE = /^[A-Za-zΔ][A-Za-z0-9Δ.-]*(?: \([A-Za-z0-9]+\))?$/u;

/** Long enough for "XYZ (D65)", far too short for a phrase. */
export const NOTATION_MAX = 12;

/**
 * Which entries a competent speaker has reviewed, by roster id.
 *
 * Empty until OQ-5 closes. The test asserts the count is reported, not that it is zero —
 * asserting zero would mean the mechanism could never ship, and asserting nothing would let
 * "unreviewed" become invisible.
 */
export const JA_REVIEWED: Readonly<Partial<Record<MessageKey, string>>> = {};
