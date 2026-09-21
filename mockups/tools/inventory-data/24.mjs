// Mockup 24 — Garment Harmonies, drawn inside a phone with a bezel and a notch. The screen is 536 px
// wide (x 116–651, y 72–1310), so 384 / 536 = 0.7164 dp per px (§2). Boxes are pixel readings
// (measure.ps1, corner.ps1). Derived, and saying so: the row list's card runs on under the action bar,
// so its box stops at the bar's rule; the action is drawn as a line of text on the bar, with no button
// outline, so its box is the text's. The capture card prints #1B2936's OKLCh as 0.28 / 0.045 / 252°,
// which is 0.274 / 0.031 / 247° — sample content (E1). The capture chip's gold camera glyph is
// questions.md 5. The generator orders elements by the reading rule. Type size as in 02.mjs, the em
// converted at 0.7164 dp per px; ties between two steps take the smaller.
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
const sized = (size, emDp, weight = 400, extra = {}) => ({
  type: text('sans', size, weight, extra),
  ...(emDp ? { raw: { emDp } } : {}),
});

// A row is not drawn as a box — only the rules between rows are — so a row's elements are children of
// the list card, and share an id prefix rather than a parent.
const L = '24.rows';
const field = (p, key, label, value, v, script) => [
  t(`${p}.${key}.label`, label, L, `static:with.field.${key}`, {
    tokens: { fg: 'text.tertiary' },
    ...sized(v.labelSize),
  }),
  t(`${p}.${key}.value`, value, L, `corpus:with.${v.n}.${key}`, {
    tokens: { fg: 'text.primary' },
    ...(key === 'japanese'
      ? { type: text('sans', 'title') }
      : sized(v.size, v.em, 400, key === 'hex' ? { tabular: true } : {})),
    copy: { shape: 'value', script },
  }),
];
const row = (n, r) => {
  const p = `24.rows.row-${n}`;
  return [
    t(`${p}.rank`, r.rank, L, `engine:with.${n - 1}.rank`, {
      tokens: { fg: 'text.primary' },
      ...sized(r.rankSize, r.rankEm),
      copy: { shape: 'value', script: 'figures' },
    }),
    t(`${p}.relationship`, r.title, L, `engine:with.${n - 1}.relationship`, {
      tokens: { fg: 'text.primary' },
      ...sized(r.titleSize, r.titleEm),
    }),
    el(`${p}.distance`, 'ui:Chip', r.badge, {
      parent: L,
      tokens: { radius: 'sm' },
      measured: { bg: r.badgeFill },
      binding: `engine:with.${n - 1}.deltaE00`,
      copy: { shape: 'badge', script: 'figures' },
    }),
    el(`${p}.swatch`, 'ui:Swatch', r.swatch, {
      parent: L,
      tokens: { radius: 'md' },
      binding: `corpus:with.${n - 1}.hex`,
      measured: { fill: r.fill },
    }),
    ...field(p, 'japanese', r.jpLabel, r.kanji, { n: n - 1, labelSize: 'label' }, 'japanese'),
    ...field(
      p,
      'romaji',
      r.romajiLabel,
      r.romaji,
      { n: n - 1, labelSize: r.romajiLabelSize, size: r.romajiSize, em: r.romajiEm },
      'latin',
    ),
    ...field(
      p,
      'hex',
      r.hexLabel,
      r.hex,
      { n: n - 1, labelSize: r.hexLabelSize, size: 'title', em: 19.6 },
      'figures',
    ),
  ];
};

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'device',
    screens: [{ id: '24.screen', box: B(116, 72, 536, 1239), dpPerPx: 0.7164 }],
  },
  elements: [
    // ---- header
    el('24.header', null, B(116, 72, 536, 128), {
      tokens: { bg: 'level1' },
      measured: { bg: '#1F2227' },
    }),
    el('24.title', 'ui:Text', B(275, 146, 219, 20), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
      binding: 'static:with.garmentTitle',
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 19.6 },
    }),
    el('24.share', 'ui:Button', B(604, 145, 33, 44), {
      icon: 'share',
      action: 'open:share.garment',
    }),
    el('24.back', 'ui:Button', B(121, 154, 95, 36), {
      icon: 'chevron-left',
      binding: 'static:with.back',
      action: 'navigate:/wardrobe',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('24.subtitle', 'ui:Text', B(320, 172, 127, 19), {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'body'),
      binding: 'static:with.garmentTitleJa',
      copy: { shape: 'label', script: 'japanese' },
    }),
    el('24.header-rule', null, B(116, 200, 536, 2), { tokens: { fg: 'border.subtle' } }),
    // ---- the reading
    el('24.capture', 'ui:Card', B(130, 225, 508, 229), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'lg' },
      measured: { bg: '#1E2028' },
    }),
    el('24.capture.source', 'ui:Chip', B(149, 241, 470, 35), {
      parent: '24.capture',
      tokens: { bg: 'level2', radius: 'pill' },
      icon: 'camera',
      binding: 'engine:reading.conditions',
      copy: { shape: 'badge', script: 'latin' },
    }),
    el('24.capture.swatch', 'ui:Swatch', B(149, 290, 145, 145), {
      parent: '24.capture',
      tokens: { radius: 'md' },
      binding: 'engine:reading.hex',
      measured: { fill: '#182937' },
    }),
    t('24.capture.title', B(305, 290, 282, 27), '24.capture', 'store:garment.name', {
      tokens: { fg: 'text.primary' },
      ...sized('body', null, 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t('24.capture.id', B(305, 320, 151, 17), '24.capture', 'store:garment.id', {
      tokens: { fg: 'text.tertiary' },
      ...sized('body'),
      copy: { shape: 'value', script: 'mixed' },
    }),
    t('24.capture.hex', B(304, 356, 92, 19), '24.capture', 'engine:reading.hex', {
      tokens: { fg: 'text.primary' },
      ...sized('body', 18.6, 400, { tabular: true }),
      copy: { shape: 'value', script: 'figures' },
    }),
    t('24.capture.name', B(306, 383, 176, 23), '24.capture', 'engine:reading.name', {
      tokens: { fg: 'text.primary' },
      ...sized('body'),
    }),
    t('24.capture.oklch', B(306, 412, 237, 19), '24.capture', 'engine:reading.oklch', {
      tokens: { fg: 'text.secondary' },
      ...sized('label', null, 400, { tabular: true }),
      copy: { shape: 'value', script: 'mixed' },
    }),
    // ---- where to look
    el('24.scope', 'ui:ChoiceGroup', B(133, 488, 502, 71), {
      tokens: { bg: 'level2', radius: 'lg' },
      measured: { bg: '#2A2D34' },
      raw: { cornerPx: 26 },
    }),
    el('24.scope.wardrobe', null, B(138, 492, 246, 64), {
      parent: '24.scope',
      tokens: { bg: 'level3', radius: 'lg' },
      binding: 'engine:with.wardrobe.count',
      action: 'select:with.scope.wardrobe',
      copy: { shape: 'label', script: 'latin', lines: 2 },
    }),
    el('24.scope.corpus', null, B(410, 503, 195, 42), {
      parent: '24.scope',
      tokens: { fg: 'text.secondary' },
      binding: 'engine:with.corpus.count',
      action: 'select:with.scope.corpus',
      copy: { shape: 'label', script: 'latin', lines: 2 },
    }),
    // ---- the ranked harmonies (the fourth runs on under the action bar)
    el('24.rows', 'ui:Card', B(131, 584, 506, 604), {
      tokens: { bg: 'level1', radius: 'md' },
      measured: { bg: '#1E2025' },
    }),
    ...row(1, {
      box: B(136, 600, 496, 139),
      rank: B(154, 612, 15, 19),
      rankSize: 'body',
      rankEm: 18.6,
      title: B(185, 611, 217, 24),
      titleSize: 'body',
      titleEm: 18.5,
      badge: B(513, 604, 103, 33),
      badgeFill: '#827252',
      swatch: B(184, 646, 76, 76),
      fill: '#877954',
      jpLabel: B(274, 661, 85, 17),
      kanji: B(274, 682, 53, 27),
      romajiLabel: B(378, 660, 59, 19),
      romajiLabelSize: 'label',
      romaji: B(379, 686, 111, 20),
      romajiSize: 'title',
      romajiEm: 19.6,
      hexLabel: B(506, 661, 34, 15),
      hexLabelSize: 'label',
      hex: B(506, 686, 98, 20),
    }),
    el('24.rows.rule-1', null, B(136, 739, 496, 2), {
      parent: '24.rows',
      tokens: { fg: 'border.subtle' },
    }),
    ...row(2, {
      box: B(136, 757, 496, 139),
      rank: B(153, 768, 19, 20),
      rankSize: 'body',
      rankEm: 19.6,
      title: B(185, 768, 162, 24),
      titleSize: 'body',
      titleEm: 18.5,
      badge: B(513, 761, 103, 33),
      badgeFill: '#3699A9',
      swatch: B(184, 803, 76, 76),
      fill: '#359DAB',
      jpLabel: B(274, 818, 85, 18),
      kanji: B(275, 839, 79, 27),
      romajiLabel: B(380, 816, 58, 20),
      romajiLabelSize: 'label',
      romaji: B(379, 843, 95, 24),
      romajiSize: 'title',
      romajiEm: 18.5,
      hexLabel: B(506, 817, 33, 16),
      hexLabelSize: 'label',
      hex: B(506, 843, 98, 20),
    }),
    el('24.rows.rule-2', null, B(136, 896, 496, 2), {
      parent: '24.rows',
      tokens: { fg: 'border.subtle' },
    }),
    ...row(3, {
      box: B(136, 914, 496, 139),
      rank: B(153, 925, 19, 20),
      rankSize: 'body',
      rankEm: 19.6,
      title: B(186, 925, 274, 24),
      titleSize: 'body',
      titleEm: 18.5,
      badge: B(509, 918, 108, 33),
      badgeFill: '#E1B161',
      swatch: B(184, 959, 76, 77),
      fill: '#E2B45E',
      jpLabel: B(274, 974, 84, 18),
      kanji: B(274, 996, 53, 27),
      romajiLabel: B(380, 973, 59, 19),
      romajiLabelSize: 'label',
      romaji: B(381, 1000, 87, 24),
      romajiSize: 'title',
      romajiEm: 18.5,
      hexLabel: B(506, 974, 34, 16),
      hexLabelSize: 'label',
      hex: B(506, 1000, 97, 20),
    }),
    el('24.rows.rule-3', null, B(136, 1053, 496, 2), {
      parent: '24.rows',
      tokens: { fg: 'border.subtle' },
    }),
    ...row(4, {
      box: B(136, 1071, 496, 117),
      rank: B(152, 1082, 20, 19),
      rankSize: 'body',
      rankEm: 18.6,
      title: B(186, 1081, 121, 21),
      titleSize: 'body',
      titleEm: 20.6,
      badge: B(514, 1075, 102, 33),
      badgeFill: '#904546',
      swatch: B(184, 1117, 76, 71),
      fill: '#924749',
      jpLabel: B(274, 1131, 84, 19),
      kanji: B(274, 1153, 54, 27),
      romajiLabel: B(380, 1130, 59, 20),
      romajiLabelSize: 'label',
      romaji: B(381, 1157, 84, 20),
      romajiSize: 'title',
      romajiEm: 19.6,
      hexLabel: B(506, 1130, 33, 16),
      hexLabelSize: 'label',
      hex: B(506, 1157, 99, 20),
    }),
    // ---- the action
    el('24.actions', 'app:ActionBar', B(116, 1188, 536, 123), {
      tokens: { border: 'border.subtle' },
      measured: { bg: '#1E2028' },
    }),
    el('24.actions.create', 'ui:Button', B(213, 1217, 343, 25), {
      parent: '24.actions',
      binding: 'static:with.createOutfit',
      action: 'navigate:/wardrobe/outfit',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    {
      what: 'bezel',
      note: 'the phone’s bezel and notch around the screen',
      box: B(100, 59, 571, 1275),
    },
    {
      what: 'status-bar',
      note: 'a device status bar drawn into the render (9:41, signal, battery)',
      box: B(116, 80, 536, 40),
    },
    {
      what: 'presentation',
      note: 'the OS home indicator, which no surface of the app draws',
      box: B(286, 1284, 197, 10),
    },
    {
      what: 'outside-art',
      note: 'blossom and wave line-art left of the phone',
      box: B(0, 0, 100, 1376),
    },
    {
      what: 'outside-art',
      note: 'blossom and wave line-art right of the phone',
      box: B(671, 0, 97, 1376),
    },
    { what: 'outside-art', note: 'the ground above the phone', box: B(100, 0, 571, 59) },
    { what: 'outside-art', note: 'wave line-art below the phone', box: B(100, 1334, 571, 42) },
  ],
  departures: [
    {
      rule: 'E1',
      element: '24.capture.oklch',
      why: '#1B2936’s printed OKLCh (0.28 / 0.045 / 252°) does not survive checking — it is 0.274 / 0.031 / 247° — sample content (§4 E1); the line shows the engine’s conversion',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '24.capture.swatch',
        '24.rows.row-1.swatch',
        '24.rows.row-2.swatch',
        '24.rows.row-3.swatch',
        '24.rows.row-4.swatch',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: [
        '24.capture.title',
        '24.capture.hex',
        '24.capture.name',
        '24.capture.oklch',
        '24.rows.row-1.japanese.value',
        '24.rows.row-2.japanese.value',
        '24.rows.row-3.japanese.value',
        '24.rows.row-4.japanese.value',
      ],
      resolution: 'text sits beside the sample as 24 draws it',
      flippedByUser: false,
    },
    {
      id: 'C10',
      elements: [
        '24.rows.row-1.distance',
        '24.rows.row-2.distance',
        '24.rows.row-3.distance',
        '24.rows.row-4.distance',
      ],
      resolution:
        'followed: the tinted ΔE00 badges carry their figure (golden rule 13) and are declared chroma-ceiling exceptions by F-225',
      flippedByUser: false,
    },
    {
      id: 'C16',
      elements: ['24.capture.source'],
      resolution:
        '24 also governs atlas/with/reading/[id]; its "Estimated from a capture" chip is that route’s case',
      flippedByUser: false,
    },
  ],
};
