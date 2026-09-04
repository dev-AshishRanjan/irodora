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
  // 日本語 tab labels. Kept to two or three characters where the word allows it — the bar
  // gives each tab a fifth of the width, and kanji at 10px need the room more than Latin does.
  'tab.home': 'ホーム',
  'tab.atlas': '色図鑑',
  'tab.lens': 'レンズ',
  'tab.wardrobe': '衣装',
  'tab.profile': 'プロフィール',
  // ホーム (F-146)。日本語として書き下ろしたもので、英語の訳ではない (ADR-0028)。
  'home.lastReading': '最後の測定',
  'home.noReadings': 'まだ測定がありません',
  'home.noReadingsHint': 'レンズを向けると、ここに表示されます。',
  'home.takeReading': 'レンズを開く',
  'home.wardrobe': '衣装',
  'home.wardrobeCount': '点',
  'home.wardrobeEmpty': 'まだ登録がありません',
  'home.wardrobeEmptyHint': '追加した衣服はこの端末にのみ保存されます。',
  'home.addGarment': '衣服を追加',
  'home.today': '今日の色',
  'home.todayNote': '日付で選ばれた色図鑑の一色です。明日は変わります。',
  'home.title': 'このデバイスでエンジンが動作しています',
  'home.offline': 'ここで計算しました。どこにも送信していません。',
  'colour.hex': '16進',
  'colour.differenceUnit': 'ΔE00',

  'atlas.title': '色の一覧',

  'compare.title': '2色をくらべる',
  'compare.slotA': '1つめの色',
  'compare.slotB': '2つめの色',
  'compare.choose': '色をえらぶ',
  'compare.difference': '色差',
  'compare.perAxis': '軸ごとの差',
  'compare.separation': '色覚での見分けやすさ',
  'compare.contrast': 'コントラスト',
  'compare.sameColour': '同じ色なので、差はすべてゼロです。',
  'unit.deltaE00': 'ΔE00',
  'unit.lc': 'Lc',
  'space.cielab': 'CIELAB (D65)',
  'space.oklch': 'OKLCh',
  'space.srgb': 'sRGB（符号化）',
  'axis.labL': '明度 L*',
  'axis.labA': '緑と赤 a*',
  'axis.labB': '青と黄 b*',
  'axis.oklchL': '明度 L',
  'axis.oklchC': '彩度 C',
  'axis.oklchH': '色相 h',
  'contrast.wcag': 'WCAG 2.2 比',
  'contrast.apcaBOnA': 'APCA — 1つめの上に2つめ',
  'contrast.apcaAOnB': 'APCA — 2つめの上に1つめ',
  'contrast.apcaNote':
    'APCAは向きで変わります。どちらを文字にするかで値がちがいます。WCAGは変わりません。',
  'separation.score': '見分けやすさ',
  'separation.deltaE00': '模擬したときの色差',
  'separation.lightness': '明度の差',
  'separation.severity': '表にある中でもっとも強い段階で模擬しています。',
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
  // F-020 — Palette Studio (FR-49).
  'studio.title': '配色スタジオ',
  'studio.origin': 'この端末であなたが作った配色です。Irodoraの収録色ではありません。',
  'studio.name': '配色の名前',
  'studio.nameHint': '夕方の散歩',
  'studio.members': 'この配色の色',
  'studio.order': '並び順が、それぞれの色の占める割合になります。',
  'studio.role': '役割',
  'studio.moveUp': '上へ',
  'studio.moveDown': '下へ',
  'studio.remove': '外す',
  'studio.empty': 'まだ色がありません。',
  'studio.emptyHint': '下で探して、色をえらぶと追加されます。',
  'studio.add': '色を追加する',
  'studio.save': '配色を保存する',
  'studio.saved': 'この端末に保存しました。',
  'studio.yours': '保存した配色',
  'studio.none': 'まだ保存はありません。',
  'studio.open': '開く',
  'studio.delete': 'この配色を削除する',
  'studio.new': '新しい配色をつくる',
  'studio.problem.empty': '保存するには、色を1つ以上追加してください。',
  'studio.problem.noAnchor': '1つの色を「基準」にしてください。ほかの色はそれに合わせて選びます。',
  'studio.problem.noName': '保存するには、名前をつけてください。',
  'studio.problem.other': 'この配色はまだ保存できません。',
  // F-021 — Colour Finder (FR-47).
  'finder.title': '色さがし',
  'finder.search': '名前・読み・16進・ことば',
  'finder.hint': '名前、#526A6B のような16進、「暗いくすんだ緑」などで探せます。',
  'finder.empty': '入力すると検索します。',
  'finder.none': '該当する色がありません。',
  'finder.answered.hex': 'その16進にもっとも近い色',
  'finder.answered.phrase': 'そのことばが表す範囲にある色',
  'finder.answered.name': '名前が一致する色',
  'finder.region': 'このことばの意味',
  'finder.vocabulary': '語彙',
  'finder.noneHexHint': 'この版のどの色も、表示できる範囲より離れています。',
  'finder.nonePhraseHint': 'この版にその範囲に入る色はありません。',
  'finder.noneNameHint': '名前・読み・識別子のいずれにも含まれていません。',
  'axis.hue': '色相',
  // F-023 — Shareable colour cards (FR-50).
  'card.title': '色のカード',
  'card.attribution': 'Irodora',
  'card.thumbnail': '縮小したとき',
  'card.note':
    'この端末で、固定した収録版から作成しています。同じ色・同じ版なら同じカードになります。',
  'card.export': 'ファイルへの書き出しは、書き出し機能とともに追加します。',
  'detail.openCard': 'カードを見る',

  /*
   * F-026. Written under one extra constraint the English does not have: **every kanji here
   * already exists in the bundled subset**, which is generated from `content/colors/**` and
   * this file (ADR-0057). A character the face lacks renders as tofu, and gate 11 would catch
   * it — but only on a workstation that can rebuild the font, and the source face is a 9.6 MB
   * download that CI deliberately does not have. So the copy was written to the covered set
   * rather than written first and repaired afterwards. That is E-017's cost, paid here.
   *
   * 差し色 is the ordinary Japanese term for an accent colour and is used rather than a
   * transliteration; 合わせやすい色 / 合わせにくい色 say what a neutral and an avoid-list
   * actually are, where 中立色 would be a translation of our word for it.
   */
  'profile.title': '自分の色',
  'profile.privacy': 'カメラは使いません。すべてこのデバイスの中だけです。',
  'profile.privacyPhoto':
    'カメラは一度だけ見て、写真はすぐに捨てました。すべてこのデバイスの中だけです。',
  'lens.title': 'レンズ',
  'lens.privacy': '映像はこのデバイスの中だけで見て、すぐに捨てます。保存も送信もしません。',
  'lens.viewfinder': 'カメラの映像です。画面の中心にある色を続けて読みます。',
  'lens.askTitle': 'レンズにはカメラが必要です',
  'lens.askBody': '目の前の色を読むためだけに使います。写真は残しません。',
  'lens.ask': 'カメラを許可する',
  'lens.deniedTitle': 'カメラを使えません',
  'lens.deniedBody':
    'このアプリのカメラ利用がオフになっています。端末の設定から戻せます。ほかの機能はカメラがなくても使えます。',
  'lens.waiting': '画面の中心を色に合わせてください。',
  'lens.noReading': 'まだ色を読んでいません。',
  'lens.conditions': '読み取りの条件',
  'lens.confidence': 'この読み取りの確からしさ（0 から 1）',
  'lens.reading': '中心で読んだ色',
  'lens.samples': '使った画素の数',
  'lens.nearest': '近い色',
  'lens.useForProfile': 'この色を自分の色づくりに使う',
  'lens.useForProfileNote':
    '出発点を提案するだけで、あとから変えられます。次の画面で確認するまで何も保存しません。',
  // F-125 — the second destination.
  'lens.useForWardrobe': 'この色で服を追加する',
  'lens.useForWardrobeNote':
    'この読み取りからの推定として、そのときの条件とともに記録します。服を追加するまで何も保存しません。',
  'lens.light.daylight': '昼の光',
  'lens.light.warmIndoor': '暖かい室内の光',
  'lens.light.coolIndoor': '涼しい室内の光',
  'lens.light.mixed': '混ざった光',
  'lens.light.lowLight': '暗い光',
  'lens.light.unknown': '光の種類は分かりません',
  'lens.space.srgb': 'sRGB',
  'lens.space.displayP3': 'Display-P3',
  'lens.space.unknown': 'カメラが色空間を伝えていません',
  'profile.progress': 'くらべる',
  'profile.question': 'どちらを着たいですか。',
  'profile.choose': 'えらぶ',
  'profile.summary': 'えらんだ色からわかること',
  'profile.estimate':
    'えらんだ色からの見立てで、計った値ではありません。ちがうところはなおしてください。なおしたところはそのままです。',
  'profile.corrected': '自分でえらびました。',
  'profile.confidence.agreed': 'えらび方がそろっています。',
  'profile.confidence.split': 'えらび方が分かれたので、たしかさは低めです。',
  'profile.confidence.none': 'まだくらべていません。',
  'profile.dim.lightness': '明るさの範囲',
  'profile.dim.temperature': '暖色か寒色か',
  'profile.dim.chroma': '色の濃さ',
  'profile.dim.contrast': '明暗の差',
  'profile.dim.neutrals': '合わせやすい色',
  'profile.dim.accents': '差し色',
  'profile.dim.avoid': '合わせにくい色',
  'profile.band.dark': '暗いほう',
  'profile.band.mid': '中ほど',
  'profile.band.light': '明るいほう',
  'profile.band.wide': 'ぜんぶ',
  'profile.chromaBand.low': 'おさえめ',
  'profile.chromaBand.mid': 'ふつう',
  'profile.chromaBand.high': 'はっきり',
  'profile.temp.cool': '寒色',
  'profile.temp.leansCool': 'やや寒色',
  'profile.temp.leansWarm': 'やや暖色',
  'profile.temp.warm': '暖色',
  'profile.contrast.low': '弱め',
  'profile.contrast.medium': '中くらい',
  'profile.contrast.high': '強め',
  'profile.keep': 'のこす',
  'profile.drop': 'はずす',
  'profile.listEmpty': 'あてはまる色はありませんでした。',
  'profile.save': 'この見立てを保存する',
  'profile.saved': 'このデバイスに保存しました。',
  'profile.notFinished': 'すべてくらべてから保存できます。',
  'profile.restart': 'もういちどくらべる',
  'profile.restartHint': '自分でえらんだところはそのままです。',

  /*
   * F-027. Same constraint as the block above: every kanji is already in the bundled subset.
   *
   * The natural word for "starting point" here is te-gakari, and its first character is not in
   * the face — so 見立て is used instead, the same word the guided summary already uses for its
   * own estimate, and the more honest one anyway.
   *
   * IT IS SPELLED IN ROMAJI ABOVE ON PURPOSE. Gate 11 reads this whole file, comments included,
   * so a note explaining that a character is unavailable puts that character into the required
   * set — which is exactly how this comment failed the gate on its first draft.
   */
  'profile.fromPhoto':
    'カメラで一度読んだものです。カメラは部屋の光もいっしょに読むので、くらべたときより弱い見立てです。一つずつたしかめてください。',
  'profile.confirm': 'これでよい',
  'profile.compareInstead': 'かわりにくらべる',
  'profile.confirmHint': '見立てをたしかめて、よければ保存できます。',

  /*
   * F-032. Same two constraints as every Japanese block here: every kanji is already in the
   * bundled subset, and every string is an observation about the COLOURS rather than about the
   * reader. 見分けにくい ("hard to tell apart") describes the pair; a sentence with あなた in it
   * would describe the person, and this product knows nothing about anybody's vision.
   */
  'cvd.title': '見分けについて',
  'cvd.none': 'よくある3つの色覚のどれでも、ここの色はすべて見分けられます。',
  'cvd.hard': 'この2色は見分けにくいです',
  'cvd.separation': '見分けやすさ',
  'cvd.swapTo': '2つめをこの色にかえると',
  'cvd.improvement': 'よくなる分',
  'cvd.noAlternative': 'このバージョンには、かえてよくなる色はありません。',
  'cvd.method':
    'このデバイスで、公開されているモデルを使い、いちばん強い段階で、固定した色のバージョンに対して計りました。',

  /* The wardrobe (FR-40, F-043). */
  'wardrobe.title': '服を追加する',
  'wardrobe.type': '何ですか？',
  'wardrobe.typeHint': 'セーター、コート、スカーフ',
  'wardrobe.colour': 'その色',
  'wardrobe.fromLens': 'レンズの読み取りを使う — 推定であり、一致ではありません',
  'wardrobe.pickColour': '色を選ぶ',
  'wardrobe.photo': '写真',
  'wardrobe.photoLibrary': '写真を選ぶ',
  'wardrobe.photoCamera': '写真を撮る',
  'wardrobe.photoAttached': '写真を添付しました。このデバイスに残ります。',
  'wardrobe.photoRejected': 'このファイルは使えませんでした。',
  'wardrobe.optional': '以下はすべて任意です',
  'wardrobe.brand': 'ブランド',
  'wardrobe.size': 'サイズ',
  'wardrobe.save': 'ワードローブに追加',
  'wardrobe.saved': 'ワードローブに追加しました。',
  'wardrobe.noType': '何かを入力すると追加できます。',
  'wardrobe.noColour': '色を選ぶと追加できます。',
  'wardrobe.unknownSlug': 'この色は現在の収録版にありません。',
  'wardrobe.count': 'ワードローブの中',
  // The compatibility explanation (FR-29, F-052) — @irodora/recommendation's MESSAGE_KEYS.
  // F-055 — professional surfaces: colorimeter entry and the ΔE00 table (FR-28, FR-61).
  'measure.title': '測定値と色差',
  'measure.origin':
    'お手持ちの測定器の値を入力すると、この端末で収録版と照らし合わせます。どこにも送らず、保存もしません。',
  'measure.library': '参照する収録版',
  'measure.reference': '基準の色',
  'measure.pickReference': '測定した色をえらぶ',
  'measure.noReference': '基準の色をえらぶと、入力した値と比べます。',
  'measure.space': '測定器が返す形式',
  'measure.add': 'この測定値を追加',
  'measure.samples': '入力した測定値',
  'measure.empty': 'まだ入力がありません。',
  'measure.arrivedIn': '入力形式',
  'measure.axisLchC': '彩度 C*',
  'measure.problem.blank': 'この欄には数値が必要です。',
  'measure.problem.notANumber': '数字のみ。文字やカンマは使えません。',
  'measure.problem.outOfRange': 'この欄で使える範囲を外れています。',
  'explain.temperature.supports': '暖かみがあなたに合っています。',
  'explain.temperature.opposes': '暖かみがあなたに合っていません。',
  'explain.temperature.neutral': '暖かみは効いても妨げてもいません。',
  'explain.lightness.supports': '明るさがあなたの範囲に入っています。',
  'explain.lightness.opposes': '明るさがあなたの範囲から外れています。',
  'explain.lightness.neutral': '明るさは効いても妨げてもいません。',
  'explain.chroma.supports': '色みの強さがあなたに合っています。',
  'explain.chroma.opposes': '色みの強さがあなたに合っていません。',
  'explain.chroma.neutral': '色みの強さは効いても妨げてもいません。',
  'explain.contrast.supports': 'コントラストの強さがあなたに合っています。',
  'explain.contrast.opposes': 'コントラストの強さがあなたに合っていません。',
  'explain.contrast.neutral': 'コントラストは効いても妨げてもいません。',

  // F-052 — the shopping check (FR-52).
  'shopping.title': '買う前に',
  'shopping.origin':
    'このデバイスのワードローブと照らし合わせます。どこにも送らず、保存もしません。',
  'shopping.now': '今つくれるコーディネート',
  'shopping.unlocked': 'これで増えるコーディネート',
  'shopping.countedAt': '基準点',
  'shopping.noSlot':
    'コーディネートはトップス、ボトムス、くつから数えます。この枠がないため数えられません。ほかのふたつの答えは有効です。',
  'shopping.compatibility': 'あなたへの合い方',
  'shopping.evidence': 'プロフィールがどれだけ語ったか',
  'shopping.noProfile': 'カラープロフィールを設定すると、色の合い方をお伝えします。',
  'shopping.duplicate': '近いものをすでに持っています',
  'shopping.noDuplicate': 'ワードローブにこれほど近いものはありません。',
  'shopping.empty': '先にワードローブに追加すると、比べる相手ができます。',

  // F-051 — a price arrives with its currency or not at all (FR-46).
  'wardrobe.cost': '購入価格',
  'wardrobe.costHint': '例：45.50',
  'wardrobe.currency': '通貨コード',
  'wardrobe.currencyHint': '例：JPY',
  'wardrobe.costNotRecorded': '記録しません。',
  'wardrobe.costNoAmount': '価格には金額と通貨の両方が必要です。',
  'wardrobe.costBadAmount': '数字と小数点1つまで。例：45.50',
  'wardrobe.costBadCurrency': '通貨コードは3文字です。例：GBP、JPY',
  'wardrobe.costTooPrecise': 'この通貨の小数点以下の桁数を超えています。',

  /* The outfit builder (FR-33, F-045). */
  'outfit.title': 'コーディネートを組む',
  'outfit.top': 'トップス',
  'outfit.trouser': 'ボトムス',
  'outfit.shoe': 'くつ',
  'outfit.slotEmpty': 'まだ選んでいません',
  'outfit.lock': '固定する',
  'outfit.unlock': '固定をやめる',
  'outfit.lockedNote': '固定中。ほかの枠はこれに合わせて選ばれます。',
  'outfit.suggested': 'ワードローブから',
  'outfit.overall': '総合',
  'outfit.empty': 'まだ枠に合う服がありません。トップス、ボトムス、くつを追加してください。',
  // F-051 — cost per wear, and the three ways there is not one (FR-46).
  'outfit.perWear': '1回あたり',
  'outfit.perWearBasis': '価格と着用回数',
  'outfit.costNoCost': '価格が記録されていないため、1回あたりの費用は出せません。',
  'outfit.costNoCurrency': '通貨がないため、1回あたりの費用は出せません。',
  'outfit.costNeverWorn': 'まだ着ていないため、1回あたりの費用は出せません。',
  'outfit.wore': 'これを着ました',
  'outfit.woreDone': '記録しました。それぞれの着用回数が1増えました。',
  'outfit.woreNothing': '服を選ぶと、着用を記録できます。',
  // F-109 — the preference weights are inspectable and resettable (FR-37).
  'preferences.title': '学習した好み',
  'preferences.origin':
    'この端末で、あなたが残した組み合わせと見送った組み合わせから学習します。端末の外には出ません。',
  'preferences.learned': '色の組み合わせ',
  'preferences.formula': '重みは回数から計算されます。差が1増えるごとに一定量動き、上限は',
  'preferences.accepted': '残した',
  'preferences.rejected': '見送った',
  'preferences.net': '差',
  'preferences.weight': '重み',
  'preferences.empty': 'まだ学習したものはありません。',
  'preferences.emptyHint': '組み合わせを残すか見送ると、その根拠の数字とともにここに表示されます。',
  'preferences.resetTitle': 'すべて削除',
  'preferences.resetHint': '下の組み合わせをすべて削除し、好みのない状態に戻します。',
  'preferences.reset': 'すべて削除',
  'preferences.resetCount': '削除する組み合わせ',
  'preferences.resetIrreversible': 'この操作は元に戻せません。',
  'preferences.resetCancel': '削除しない',
  'preferences.resetDo': '削除する',
  // F-117 — a screen must never close the app when its native module will not load.
  'lens.unavailable': 'カメラを利用できません',
  'lens.unavailableBody':
    'このビルドではカメラを起動できないため、カメラでの色の読み取りは利用できません。アトラス、ファインダー、比較、ワードローブなど、カメラを使わない機能はこれまでどおり使えます。',
  'lens.unavailableDetail': 'この問題を報告する場合は、原因を特定できるのは次の行です。',
  // F-122 — the wardrobe gets somewhere to be looked at, and a garment somewhere to be corrected.
  'browse.title': 'あなたのワードローブ',
  'browse.empty': 'まだ何もありません',
  'browse.emptyHint': '服を追加すると、色の近いものごとにまとめてここに表示されます。',
  'browse.add': '服を追加',
  'browse.grouping': '収録色にどれだけ近いかでまとめています。',
  'browse.ungrouped': 'まとめていません',
  'browse.count': '服の数',
  'browse.edit': '編集する',
  'browse.editing': '編集中',
  'browse.back': 'ワードローブに戻る',
  'browse.name': '名前',
  'browse.nameHint': '呼びかた',
  'browse.pattern': '柄',
  'browse.patternHint': '無地、ストライプ、チェック',
  'browse.material': '素材',
  'browse.materialHint': 'ウール、コットン、リネン',
  'browse.formality': 'あらたまり度',
  'browse.formalityHint': 'ふだん着、きれいめ、フォーマル',
  'browse.purchaseDate': '購入日',
  'browse.purchaseDateHint': '例：2026-03-14',
  'browse.save': '変更を保存',
  'browse.saved': '保存しました。',
  'browse.clearing': '空にした項目は削除されます。',
  // F-123 — the investment signal (ADR-0082). Two numbers from the reader's own wardrobe, and
  // deliberately no verdict.
  'shopping.price': '価格',
  'shopping.priceHint': '例：180.00',
  'shopping.investment': 'いま持っているものと比べて',
  'shopping.breakEven': '手持ちと同じ一回あたりになるまでの着用回数',
  'shopping.typical': '手持ちを実際に着ている回数',
  'shopping.investmentBasis': '計算のもと',
  'shopping.investmentGarments': '点、一回あたり',
  'shopping.investmentPerWear': 'の計算です',
  'shopping.investmentYours': 'これはあなた自身の数字です。買うかどうかはご自分で決めてください。',
  'shopping.investmentNoPrice': '価格を入力すると、手持ちのものと比べられます。',
  'shopping.investmentNoComparable':
    '同じ種類で価格と着用回数の両方がそろっているものがないため、比べる相手がありません。',
  'shopping.investmentTooFew': '同じ種類のものにあと数点、価格と着用回数を記録すると表示されます。',
  'shopping.investmentHave': '比べられる点数',
  'shopping.investmentNeed': '必要な点数',
  // F-124 — the six outfit components (FR-32, E-053). What was measured, never a verdict.
  // F-129 — the export surface (FR-51).
  // F-131 — FR-41's filter half.
  'browse.filters': 'しぼりこみ',
  'browse.filterType': '種類',
  'browse.filterSeason': '季節',
  'browse.filterFormality': 'あらたまり度',
  'browse.filterNone': '条件に合う服がありません。',
  'browse.filterNoneHint': '解除するとすべての服が表示されます。',
  'browse.filterApplied': 'しぼりこみ中',
  'export.title': '書き出し',
  'export.origin': '選んだ配色から、このデバイスで作成します。版はファイルに記録します。',
  'export.subject': '書き出すもの',
  'export.format': '形式',
  'export.formatCsv': 'CSV — 1色1行',
  'export.formatJson': 'JSON — すべての値。読み込みもできます',
  'export.formatCss': 'CSS — カスタムプロパティ',
  'export.formatTokens': 'デザイントークン — 読み込みもできます',
  'export.formatAse': 'ASE — Adobe スウォッチ',
  'export.formatPdf': 'PDF — 見るための資料',
  'export.save': '書き出す',
  'export.saved': '書き出しました',
  'export.cancelled': '保存しませんでした。',
  'export.failed': '書き出せませんでした。',
  'export.empty': '先に配色を作ると、書き出せます。',
  'export.buildPalette': '配色を作る',
  'export.refused': 'この形式では扱えない文字が含まれています。',
  'export.versions': 'ファイルに記録する版',
  'outfit.harmony.supports': '暖かみの方向がそろっていて、選んで組んだように見えます。',
  'outfit.harmony.opposes': '暖かみの方向がばらついています。',
  'outfit.harmony.neutral': '色どうしの関係は、どちらにも働いていません。',
  'outfit.personalFit.supports': 'あなたに似合う色です。面積の大きい服ほど強く効きます。',
  'outfit.personalFit.opposes': 'あなたには合いにくい色です。面積の大きい服ほど強く効きます。',
  'outfit.personalFit.neutral': '似合うかどうかは、どちらにも働いていません。',
  'outfit.contrast.supports': '明るさの差が、あなたに似合う強さです。',
  'outfit.contrast.opposes': '明るさの差が、あなたに似合う強さより強いか弱いかです。',
  'outfit.contrast.neutral': '明るさの差は、どちらにも働いていません。',
  'outfit.corpusAffinity.supports': '収録色に近い色です。',
  'outfit.corpusAffinity.opposes': '収録色のどれからも離れた色です。',
  'outfit.corpusAffinity.neutral': '収録色との距離は、どちらにも働いていません。',
  'outfit.versatility.supports': '面積の大きい服は、収録色の多くと合わせられます。',
  'outfit.versatility.opposes': '面積の大きい服は、収録色のうち合わせられるものが少なめです。',
  'outfit.versatility.neutral': '面積の大きい服の合わせやすさは、どちらにも働いていません。',
  'outfit.cvdAccessibility.supports':
    '主な三つの色覚型のいずれでも、どの組み合わせも見分けられます。',
  'outfit.cvdAccessibility.opposes':
    '主な三つの色覚型のいずれかで、見分けにくい組み合わせがあります。',
  'outfit.cvdAccessibility.neutral': '見分けやすさは、どちらにも働いていません。',
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
  'colour.differenceUnit',
  'coord.xyz',
  'coord.lab',
  'coord.lch',
  'coord.oklch',
  'coord.rgb',
  // F-019. Units and space names, on every metric FR-48 asks for. Each one passes
  // NOTATION_SHAPE and the length cap; a phrase could not be added here.
  'unit.deltaE00',
  'unit.lc',
  'space.cielab',
  'space.oklch',
  // F-023. A brand name: identical in both languages, letters only, and well inside the
  // length cap. Translating it would invent a second name for one product.
  'card.attribution',
  // F-097. The two capture spaces the Lens names. Both are symbols: 'sRGB' and 'Display-P3'.
  // The second was written 'Display P3' first and NOTATION_SHAPE refused it — a space followed
  // by a bare word is what the rule uses to tell a symbol from a phrase, and it was right to.
  // Hyphenating it is also the formal name (the CSS and ICC spelling is `display-p3`), so the
  // rule improved the copy rather than being worked around.
  'lens.space.srgb',
  'lens.space.displayP3',
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
