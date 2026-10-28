// Mockup 09 — the colour finder. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes are pixel readings
// (measure.ps1; result cards against their own colour). Result text is drawn on the colour (C8). The
// generator orders elements by the reading rule. Type size by the rule in 02.mjs.
//
// F-250 RE-MEASURED EVERY BOX, TYPE, CORNER, FILL AND INK (2026-10-27), with a Node port of
// measure.ps1's `blobs`/`mean`, corner.ps1's fit, stem.ps1's run widths and ink coverage, and
// art-measure.ps1's percentiles, each reading repeatable with the .ps1 where PowerShell runs:
// - TYPE (02.mjs's rule, caps/digits ≈ box/0.73): the title's F inks 25 px and its C 26 (overshoot) —
//   17.1 dp an em, so `body`, not `title`: F-220's title was the 33 px box (検索's 31 px of ink, 42–72)
//   read as capitals. Atlas's A 24 px and Clear's C 26: `body`. The query's d (ascender) 25 px: body.
//   The chips' N 20 px (13.7 dp): `label`. The two section titles' P and I 22–23 px (15.1–15.75 dp):
//   body. The slider labels' L and the values' digits 20 px: label. The result names' capitals 25 px
//   (K, U, M, Y; the kanji 34–35 px): body. The English lines' capitals 22, 22, 22, 21 px
//   (15.1, 15.1, 15.1, 14.4 dp): siblings, three of four nearer body — `body`, not label. The hex and
//   ΔE00 digits 21 px (14.4 dp; ΔE00's 00 on the line, not lowered): label. The OKLCh line's K 19 px
//   (13.0 dp): label.
// - WEIGHT (ink coverage of one glyph per x-height², threshold 150, and stem runs at threshold 300):
//   the title's e covers 0.579 and its stems run 4.41 px (0.129 em); every other run's e covers
//   0.458–0.52 and its stems 0.096–0.109 em, within the reading's noise of one another. So the title is
//   600, as recorded, and the readings cannot part 400 from 500 among the rest: F-220's weights stand.
// - CORNERS (corner.ps1's fit at three probe offsets, px): the query card 16.5, 16.5, 14.25, 14.25 and
//   the sliders card 15.5, 14, 17, 16.5 — median 16.0 (8.0 dp, the sm/md midpoint; the smaller) and
//   mean 15.6: `sm` (6), as 08's cards. F-220 recorded md. The result cards 17.25–19.25 (8.6–9.6 dp):
//   `md`, as R9 §5 reads (8.75). The chips' edge, traced row by row, fits r ≈ 20 px with a 12-row
//   straight run between the arcs (rows 279–290 of 262–308): `md`, not a pill.
// - FILLS AND EDGES: the cards #1D2128 (level 1, #20232A), edged 2 px at luma 57–64 (#36373F–#393E48),
//   `border.subtle`. The chips #30363E–#333840, all three alike — `level3` (#323742), not level 2, and
//   none drawn chosen; no edge. The field is neither filled nor outlined: its words sit on the card.
//   Its clear is a disc #969CA2 with the cross cut through to the card (`close-circle`).
// - INKS: every text on the page is the primary ink but the slider values (#D2D7DE, secondary) and
//   the field's clear. On the result cards every line is near-white (#FAFFEF…): one ink per card.
// - THE BAR draws no rule (rows 88–126 flat at luma 25). Its controls centre at 57.5–58.5 px (the
//   arrow 46–70, Clear's × 46–69, the title's capitals 45–70): the bar is 116 px, symmetric about
//   them. The back arrow inks 30 × 25 px and Clear's × 24 × 24 px.
// - THE CARET after the query (618, 199, 2 × 39 px) is the platform's, drawn in a focused field.
// - THE ART inks p50 0.081–0.093 and p90 0.101–0.106 of the foreground over the ground (gamma luma),
//   the backdrop's `opacity.art`; inside both cards the fill is flat to ±1 luma, so the art is on the
//   ground only, behind the cards. Its strokes run x 549–767 and y 97–518 (the right margin carries
//   them down past the sliders' title); F-220's box stopped at 420.
// - THE RESULT CARDS are drawn in two forms by their sample names: cards 1–2 set kanji and romaji on
//   one line and cards 3–4 break after the kanji, though card 3's would fit; card 2 breaks its hex line
//   after the bullet, though card 1's line of the same length does not. Each card here records one
//   name, one English line and one distance line (hex • ΔE00), each box the union of the runs 09
//   broke it into, and the first card its OKLCh line (ADR-0161 D2).
const B = (x, y, w, h) => ({ x, y, w, h });
const el = (id, component, box, extra = {}) => ({
  id,
  component,
  box,
  tokens: {},
  binding: null,
  action: null,
  copy: null,
  ...extra,
});
const text = (face, size, weight = 400, extra = {}) => ({ face, size, weight, ...extra });
const t = (id, box, parent, binding, extra = {}) =>
  el(id, 'ui:Text', box, {
    parent,
    type: text('sans', 'label'),
    binding,
    copy: { shape: 'label', script: 'latin' },
    ...extra,
  });

// The only interactive slider a screen draws (F-232), so its sizes are the component's (P3): a track
// 6.1–6.7 px (3–3.5 dp) thick, white up to the value and `level3` (ΔE00 1.8–2.7) past it, under a
// white thumb 27.4–27.5 px (13.7 dp) across. The box runs the track's length and the thumb's height.
// The whites read like board 00's, where a control's white fill is `action.primary`.
const slider = (key, label, track, value, m) => [
  t(`09.sliders.${key}.label`, label, '09.sliders', `static:finder.${key}`, {
    tokens: { fg: 'text.primary' },
  }),
  el(`09.sliders.${key}.track`, 'ui:Slider', track, {
    parent: '09.sliders',
    tokens: { track: 'level3', fill: 'action.primary', thumb: 'action.primary', radius: 'pill' },
    measured: m.measured,
    raw: m.raw,
    binding: `store:finder.point.${key}`,
    action: `adjust:finder.point.${key}`,
  }),
  // F-250 (ADR-0159 D2): the point as printed, and the lexicon terms whose region holds it.
  t(`09.sliders.${key}.value`, value, '09.sliders', 'engine:finder.sliderReadings', {
    tokens: { fg: 'text.secondary' },
    type: text('sans', 'label', 400, { tabular: true }),
    copy: { shape: 'value', script: 'mixed' },
  }),
];
const result = (n, card, lines, measuredBg) => {
  const p = `09.results.result-${n}`;
  return [
    // The result card IS the swatch (R9 §5): its fill is the colour, and its text is set on it
    // (F-233), so it is a Swatch with children rather than a Card holding one.
    el(p, 'ui:Swatch', card, {
      tokens: { radius: 'md' },
      binding: `corpus:finder.results.${n - 1}.hex`,
      action: 'navigate:/atlas/[slug]',
      measured: { bg: measuredBg },
      ...(n === 1 ? { raw: { cornerPx: 17.25 } } : {}),
    }),
    ...lines.map(([key, box, binding, shape, script]) =>
      t(`${p}.${key}`, box, p, binding, {
        type:
          key === 'name'
            ? text('gothic', 'body', 500)
            : key === 'english'
              ? text('sans', 'body')
              : text('sans', 'label', 400, { tabular: true }),
        copy: { shape, script },
      }),
    ),
  ];
};

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '09.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    // ---- header
    // The app bar (F-234): no rule; 116 px, symmetric about its controls (centred at 57.5–58.5 px).
    el('09.header', 'ui:AppBar', B(0, 0, 768, 116)),
    // F-250: the arrow inks 30 × 25 px; Atlas's A 24 px — body. The word is the Atlas tab's (F-246).
    // Its left edge stays F-220's 31: at threshold 150 the tip's first pixel is 32 (half covered,
    // past a 1 px sharpening ring at 31), but every other bar's left was read F-220's way, ring and
    // all, and APP_BAR_INSET is their median — one bar read another way would move it by method
    // alone. Re-reading every bar's edge is F-282's.
    el('09.back', 'ui:Button', B(31, 46, 116, 25), {
      parent: '09.header',
      icon: 'back',
      type: text('sans', 'body'),
      binding: 'static:tab.atlas',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'latin' },
    }),
    // F-250: 25 px of capital — 17.1 dp, `body`; F-220's `title` read the kanji's 31 px as capitals.
    el('09.title', 'ui:Text', B(236, 42, 296, 31), {
      parent: '09.header',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      binding: 'static:finder.title',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    // F-250: the × inks 24 × 24 px; Clear's C 26 px (overshoot) — body.
    el('09.clear', 'ui:Button', B(622, 45, 118, 26), {
      parent: '09.header',
      icon: 'close',
      type: text('sans', 'body'),
      binding: 'static:finder.clear',
      action: 'submit:finder.clear',
      copy: { shape: 'label', script: 'latin' },
    }),
    // ---- leaves, inside the screen (§2: design), on the ground behind the cards (F-250)
    el('09.art', 'ui:Illustration', B(549, 97, 219, 422), { illustration: 'leaves' }),
    // ---- the query
    el('09.search', 'ui:Card', B(29, 166, 710, 185), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1D2128' },
      raw: { cornerPx: 15.4 },
    }),
    // F-250: a search field drawn neither filled nor outlined, its words on the card.
    el('09.search.query', 'ui:SearchField', B(64, 198, 557, 41), {
      parent: '09.search',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body'),
      binding: 'store:finder.query',
      action: 'adjust:finder.query',
      copy: { shape: 'placeholder', script: 'latin' },
    }),
    // F-250: a disc #969CA2 with the cross cut through it, 35 px across.
    el('09.search.clear', 'ui:Button', B(669, 201, 35, 35), {
      parent: '09.search',
      icon: 'close-circle',
      tokens: { fg: 'text.secondary' },
      measured: { fg: '#969CA2' },
      action: 'submit:finder.query.clear',
    }),
    // F-250: level 3, no edge, corner md (r ≈ 20 px); the labels' N 20 px — label. None is drawn
    // chosen. The middle chip's words are E2's (ADR-0159 D4): the name search reads five forms.
    ...[
      ['phrase', B(64, 262, 213, 47), 'phrase'],
      ['kanji', B(290, 262, 217, 47), 'name'],
      ['hex', B(520, 262, 170, 47), 'hex'],
    ].map(([key, box, mode]) =>
      el(`09.search.mode-${key}`, 'ui:Chip', box, {
        parent: '09.search',
        tokens: { bg: 'level3', fg: 'text.primary', radius: 'md' },
        measured: { bg: '#323840' },
        type: text('sans', 'label'),
        binding: `static:finder.mode.${mode}`,
        action: `select:finder.mode.${mode}`,
        copy: { shape: 'label', script: 'latin' },
      }),
    ),
    // ---- the three perceptual dimensions
    t('09.sliders.title', B(33, 396, 454, 30), null, 'static:finder.dimensions', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      copy: { shape: 'heading', script: 'latin' },
    }),
    el('09.sliders', 'ui:Card', B(29, 436, 710, 265), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1D2227' },
      raw: { cornerPx: 15.75 },
    }),
    ...slider('lightness', B(53, 499, 154, 30), B(222, 497, 250, 31), B(488, 499, 230, 29), {
      measured: { track: '#343B44', fill: '#ECF0F4', thumb: '#F1F1F5' },
      raw: { trackPx: 6.7, thumbPx: 27.5 },
    }),
    // the value sits at the start, so too little fill shows to read
    ...slider('chroma', B(53, 569, 137, 28), B(204, 567, 268, 31), B(488, 570, 230, 26), {
      measured: { track: '#353C45', thumb: '#EEF2F5' },
      raw: { trackPx: 6.1, thumbPx: 27.4 },
    }),
    ...slider('hue', B(53, 639, 91, 28), B(159, 637, 332, 30), B(506, 639, 212, 28), {
      measured: { track: '#353B44', fill: '#ECF0F4', thumb: '#EFF0F5' },
      raw: { trackPx: 6.5, thumbPx: 27.5 },
    }),
    // ---- the nearest references
    t('09.results.heading', B(30, 748, 606, 32), null, 'static:finder.nearest', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      copy: { shape: 'heading', script: 'latin' },
    }),
    ...result(
      1,
      B(28, 796, 344, 216),
      [
        ['name', B(58, 826, 201, 34), 'corpus:finder.results.0.name', 'heading', 'mixed'],
        ['english', B(59, 874, 170, 27), 'corpus:finder.results.0.english', 'label', 'latin'],
        ['distance', B(57, 925, 268, 21), 'engine:finder.results.0.deltaE00', 'value', 'figures'],
        ['oklch', B(58, 963, 293, 19), 'corpus:finder.results.0.oklch', 'value', 'figures'],
      ],
      '#66791D',
    ),
    ...result(
      2,
      B(396, 796, 344, 216),
      [
        ['name', B(423, 826, 246, 37), 'corpus:finder.results.1.name', 'heading', 'mixed'],
        ['english', B(424, 874, 257, 27), 'corpus:finder.results.1.english', 'label', 'latin'],
        // 09 breaks this line after the bullet: #715C1F at y 925, ΔE00 1.45 at y 962.
        ['distance', B(422, 925, 126, 58), 'engine:finder.results.1.deltaE00', 'value', 'figures'],
      ],
      '#6D591F',
    ),
    ...result(
      3,
      B(28, 1035, 344, 221),
      [
        // 09 breaks this name after the kanji: 海松色 at y 1066, Miru-iro at y 1114.
        ['name', B(58, 1066, 115, 74), 'corpus:finder.results.2.name', 'heading', 'mixed'],
        ['english', B(59, 1154, 225, 28), 'corpus:finder.results.2.english', 'label', 'latin'],
        ['distance', B(57, 1205, 265, 22), 'engine:finder.results.2.deltaE00', 'value', 'figures'],
      ],
      '#575E2B',
    ),
    ...result(
      4,
      B(396, 1035, 344, 221),
      [
        // 09 breaks this name after the kanji: 柳煤竹 at y 1066, Yanagi-susutake at y 1114.
        ['name', B(422, 1066, 247, 81), 'corpus:finder.results.3.name', 'heading', 'mixed'],
        ['english', B(424, 1154, 210, 28), 'corpus:finder.results.3.english', 'label', 'latin'],
        ['distance', B(422, 1205, 275, 22), 'engine:finder.results.3.deltaE00', 'value', 'figures'],
      ],
      '#575840',
    ),
    // ---- 09's own tab bar — four items; C1 puts 01's five in its place
    el('09.tabs', 'ui:TabBar', B(0, 1266, 768, 110), {
      tokens: { bg: 'ground', border: 'border.subtle' },
      measured: { bg: '#1C2127' },
    }),
    el('09.tabs.indicator', null, B(0, 1270, 191, 1), {
      parent: '09.tabs',
      tokens: { fg: 'text.primary' },
    }),
    el('09.tabs.atlas.icon', 'ui:NavIcon', B(74, 1288, 40, 40), {
      parent: '09.tabs',
      icon: 'compass',
      action: 'navigate:/atlas',
    }),
    el('09.tabs.map.icon', 'ui:NavIcon', B(269, 1305, 37, 34), { parent: '09.tabs', icon: 'map' }),
    el('09.tabs.profile.icon', 'ui:NavIcon', B(464, 1305, 33, 35), {
      parent: '09.tabs',
      icon: 'profile',
      action: 'navigate:/profile',
    }),
    el('09.tabs.settings.icon', 'ui:NavIcon', B(656, 1303, 37, 38), {
      parent: '09.tabs',
      icon: 'settings',
      action: 'navigate:/profile/settings',
    }),
    t('09.tabs.atlas.label', B(67, 1335, 55, 21), '09.tabs', 'static:tab.atlas', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'caption', 500),
    }),
  ],
  notDesign: [
    {
      what: 'leaked-label',
      note: 'a component name and level printed as a section title',
      box: B(32, 126, 266, 25),
    },
    {
      what: 'leaked-label',
      note: 'a component note printed after the section title',
      box: B(498, 390, 247, 42),
    },
    // F-250 (ADR-0159 D4): notation inside elements that are design, as 05's and 08's (ADR-0142 D3).
    {
      what: 'garbled-text',
      note: 'square brackets around the chip label "Natural Phrase": notation, not copy',
      box: B(81, 275, 179, 24),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around the chip label "Japanese Kanji": notation, not copy',
      box: B(307, 275, 183, 25),
    },
    {
      what: 'presentation',
      note: 'the text caret after the query: the platform draws it in a focused field (F-250)',
      box: B(618, 199, 2, 39),
    },
  ],
  departures: [
    {
      rule: 'E1',
      element: '09.search.query',
      why: 'the field holds what the person types; 09’s phrase is sample content, and the start is the empty field (ADR-0158 D2)',
    },
    {
      rule: 'E1',
      element: '09.sliders.lightness.value',
      why: 'the sliders print the search point and the lexicon terms whose region holds it (ADR-0159 D1–D2); 09’s 48 %, 0.045 and 142° and “Medium Deep” and “Moss Green” are sample content — the lexicon has no such terms — and so is each thumb’s position',
    },
    {
      rule: 'E1',
      element: '09.results.result-1.name',
      why: 'the results are corpus entries ranked by ΔE00 from the search point (ADR-0158 D3); 09’s Koke-iro, Uguisu-cha, Miru-iro and Yanagi-susutake, their English names, hexes and ΔE00s are sample content — none is in the corpus',
    },
    {
      rule: 'E1',
      element: '09.results.result-1.oklch',
      why: '#69821B is printed as OKLCh 0.52 / 0.062 / 140°; it is 0.567 / 0.128 / 122.8° (§4 E1) — the line shows the record’s OKLCh at 3 / 3 / 1, as 05 and 06 print it (ADR-0159 D3)',
    },
    {
      rule: 'E2',
      element: '09.search.mode-kanji',
      why: 'the chip reads Colour Name: the name search reads kanji, kana, romaji, English and slug, so “Japanese Kanji” would say a romaji or English query was read as kanji (ADR-0159 D4)',
    },
    {
      rule: 'E3',
      element: '09.search.mode-phrase',
      why: 'the chosen chip carries its leading dot (ADR-0141), so a choice is never colour alone; 09 draws none chosen',
    },
    {
      rule: 'E4',
      element: '09.results.result-1',
      why: 'nothing matched shows 00’s caption with the kind’s hint, and a reading forced on text it cannot read says so (ADR-0160 D8); no mockup draws either',
    },
  ],
  conflicts: [
    {
      id: 'C1',
      elements: [
        '09.tabs',
        '09.tabs.indicator',
        '09.tabs.atlas.icon',
        '09.tabs.map.icon',
        '09.tabs.profile.icon',
        '09.tabs.settings.icon',
        '09.tabs.atlas.label',
      ],
      resolution: "P5 → 01: 09's four-item tab bar is replaced by 01's five, icon and label",
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: [
        '09.results.result-1.name',
        '09.results.result-2.name',
        '09.results.result-3.name',
        '09.results.result-4.name',
      ],
      resolution:
        'text sits on the sample as 09 draws it, and takes per sample whichever of the two text colours passes 4.5:1 (E3)',
      flippedByUser: false,
    },
  ],
};
