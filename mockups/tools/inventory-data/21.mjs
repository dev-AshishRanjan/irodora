// Mockup 21 — Nearest in Corpus, drawn inside a device frame. The frame's inner screen is 614 px
// wide (x 77–690, y 107–1296), so 384 / 614 = 0.6254 dp per px (§2). Boxes are pixel readings
// (measure.ps1, corner.ps1). Derived, and saying so: row 5 runs on under the tab bar, so its box stops
// at the bar's top rule; the route string's box is its scan blob, which takes in leaf line-art beside
// it. The two section headings read like prompt text — OQ-26 — so they bind to the question. The
// generator orders elements by the reading rule. Type size as in 02.mjs, the em converted at 0.6254
// dp per px.
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

const row = (n, r) => {
  const p = `21.results.row-${n}`;
  return [
    el(p, 'new:CorpusRow', r.box, {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: r.bg },
    }),
    el(`${p}.swatch`, 'ui:Swatch', r.swatch, {
      parent: p,
      tokens: { radius: 'md' },
      binding: `corpus:nearest.${n - 1}.hex`,
      measured: { fill: r.fill },
    }),
    t(`${p}.name`, r.name, p, `corpus:nearest.${n - 1}.label`, {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body'),
      copy: { shape: 'label', script: 'mixed', lines: 2 },
      raw: { emDp: 18.8 },
    }),
    el(`${p}.distance`, 'ui:Chip', r.chip, {
      parent: p,
      tokens: { bg: 'level2', border: 'border.subtle', radius: 'sm' },
      raw: { cornerPx: 6.25 },
      binding: `engine:nearest.${n - 1}.deltaE00`,
      copy: { shape: 'value', script: 'figures' },
    }),
    t(`${p}.hex`, r.hex, p, `corpus:nearest.${n - 1}.hex`, {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'body', 400, { tabular: true }),
      copy: { shape: 'value', script: 'figures' },
    }),
    el(`${p}.view`, 'ui:Button', r.view, {
      parent: p,
      icon: 'arrow-right',
      binding: 'static:nearby.view',
      action: 'navigate:/atlas/[slug]',
      copy: { shape: 'label', script: 'latin' },
    }),
  ];
};
const tab = (key, icon, label, route) => [
  el(`21.tabs.${key}.icon`, 'ui:NavIcon', icon, {
    parent: '21.tabs',
    icon: key === 'library' ? 'compass' : key,
    ...(route ? { action: `navigate:${route}` } : {}),
  }),
  t(`21.tabs.${key}.label`, label, '21.tabs', `static:tabs.${key}`, {
    tokens: { fg: key === 'atlas' ? 'text.primary' : 'text.secondary' },
    type: text('sans', 'label', 500),
  }),
];

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'device',
    screens: [{ id: '21.screen', box: B(77, 107, 614, 1190), dpPerPx: 0.6254 }],
  },
  elements: [
    // ---- header
    el('21.back', 'ui:Button', B(105, 141, 89, 21), {
      icon: 'back',
      binding: 'static:nearby.back',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('21.title', 'ui:Text', B(235, 138, 311, 29), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
      binding: 'static:nearby.title',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    el('21.filter', 'ui:Button', B(631, 141, 31, 21), {
      icon: 'filter',
      action: 'open:nearby.filter',
    }),
    // ---- the anchor
    el('21.anchor.heading', 'ui:Text', B(103, 223, 239, 20), {
      tokens: { fg: 'text.secondary' },
      binding: 'oq:OQ-26',
      type: text('sans', 'body', 500),
      copy: { shape: 'heading', script: 'latin' },
    }),
    el('21.anchor', 'ui:Card', B(101, 257, 566, 178), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#21232A' },
    }),
    el('21.anchor.ring', null, B(126, 277, 136, 137), {
      parent: '21.anchor',
      tokens: { border: 'text.primary', radius: 'md' },
    }),
    el('21.anchor.swatch', 'ui:Swatch', B(133, 284, 122, 122), {
      parent: '21.anchor.ring',
      tokens: { radius: 'md' },
      binding: 'corpus:anchor.hex',
      measured: { fill: '#5A6C7A' },
    }),
    t('21.anchor.name', B(285, 296, 331, 31), '21.anchor', 'corpus:anchor.label', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      copy: { shape: 'label', script: 'mixed' },
      raw: { emDp: 18.5 },
    }),
    t('21.anchor.oklch', B(285, 336, 315, 20), '21.anchor', 'engine:anchor.oklch', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 400, { tabular: true }),
      copy: { shape: 'value', script: 'mixed' },
    }),
    t('21.anchor.baseline', B(286, 372, 156, 23), '21.anchor', 'static:nearby.baseline', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'body'),
    }),
    // ---- the ranked results (row 5 runs on under the tab bar)
    el('21.results.heading', 'ui:Text', B(103, 472, 359, 25), {
      tokens: { fg: 'text.secondary' },
      binding: 'oq:OQ-26',
      type: text('sans', 'body', 500),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t('21.results.subtitle', B(103, 502, 381, 22), null, 'static:nearby.orderedBy', {
      tokens: { fg: 'text.tertiary' },
      copy: { shape: 'body', script: 'mixed' },
    }),
    ...row(1, {
      box: B(101, 539, 565, 126),
      bg: '#18181B',
      swatch: B(117, 553, 98, 98),
      fill: '#5B8089',
      name: B(230, 556, 201, 61),
      chip: B(539, 555, 111, 34),
      hex: B(231, 626, 96, 20),
      view: B(570, 626, 78, 20),
    }),
    ...row(2, {
      box: B(101, 674, 566, 127),
      bg: '#16171B',
      swatch: B(118, 690, 96, 95),
      fill: '#294A51',
      name: B(231, 692, 265, 60),
      chip: B(539, 691, 111, 33),
      hex: B(231, 761, 94, 21),
      view: B(570, 761, 78, 20),
    }),
    ...row(3, {
      box: B(101, 809, 566, 127),
      bg: '#17181B',
      swatch: B(117, 824, 98, 97),
      fill: '#6F7971',
      name: B(230, 827, 228, 61),
      chip: B(538, 826, 112, 33),
      hex: B(230, 897, 92, 20),
      view: B(570, 897, 78, 20),
    }),
    ...row(4, {
      box: B(101, 946, 566, 125),
      bg: '#161519',
      swatch: B(118, 960, 96, 96),
      fill: '#175878',
      name: B(230, 962, 144, 61),
      chip: B(539, 961, 111, 33),
      hex: B(231, 1032, 89, 20),
      view: B(571, 1032, 77, 20),
    }),
    ...row(5, {
      box: B(101, 1081, 566, 121),
      bg: '#151619',
      swatch: B(118, 1096, 96, 95),
      fill: '#363D36',
      name: B(230, 1097, 221, 62),
      chip: B(538, 1096, 112, 34),
      hex: B(231, 1167, 95, 20),
      view: B(570, 1167, 78, 20),
    }),
    // ---- 21's own tab bar — three items; C1 puts 01's five in its place
    el('21.tabs', 'app:TabBar', B(77, 1202, 614, 95), {
      tokens: { bg: 'ground', border: 'border.subtle' },
      measured: { bg: '#16171B' },
    }),
    el('21.tabs.indicator', null, B(145, 1204, 90, 4), {
      parent: '21.tabs',
      tokens: { fg: 'text.primary' },
    }),
    ...tab('atlas', B(175, 1222, 30, 29), B(168, 1260, 43, 16), '/atlas'),
    ...tab('library', B(369, 1221, 30, 31), B(355, 1261, 59, 19)),
    ...tab('search', B(562, 1223, 31, 25), B(550, 1261, 56, 15), '/atlas/find'),
  ],
  notDesign: [
    { what: 'bezel', note: 'the device frame around the screen', box: B(74, 104, 619, 1197) },
    { what: 'outside-art', note: 'leaf line-art above the device frame', box: B(0, 0, 768, 104) },
    {
      what: 'outside-art',
      note: 'leaf line-art left of the device frame',
      box: B(0, 104, 74, 1197),
    },
    {
      what: 'outside-art',
      note: 'leaf line-art right of the device frame',
      box: B(693, 104, 75, 1197),
    },
    { what: 'outside-art', note: 'leaf line-art below the device frame', box: B(0, 1301, 768, 75) },
    {
      what: 'leaked-label',
      note: 'a region name printed above the frame',
      box: B(76, 72, 147, 22),
    },
    {
      what: 'leaked-label',
      note: 'the route string printed above the frame',
      box: B(498, 60, 211, 42),
    },
    {
      what: 'leaked-label',
      note: 'a region name printed below the frame',
      box: B(348, 1324, 73, 18),
    },
    {
      what: 'leaked-label',
      note: 'a component name and level printed after the anchor heading',
      box: B(349, 222, 232, 22),
    },
    {
      what: 'leaked-label',
      note: 'a pixel size printed inside the anchor swatch',
      box: B(169, 335, 49, 23),
    },
    {
      what: 'garbled-text',
      note: 'the results subtitle misspells a word',
      box: B(103, 502, 381, 22),
    },
    {
      what: 'garbled-text',
      note: 'the middle tab’s label is misprinted',
      box: B(355, 1261, 59, 19),
    },
  ],
  departures: [
    {
      rule: 'E1',
      element: '21.anchor.oklch',
      why: '#5B6B78’s printed OKLCh does not survive checking (§4 E1); the line shows the engine’s conversion',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '21.anchor.swatch',
        '21.results.row-1.swatch',
        '21.results.row-2.swatch',
        '21.results.row-3.swatch',
        '21.results.row-4.swatch',
        '21.results.row-5.swatch',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: [
        '21.anchor.name',
        '21.anchor.oklch',
        '21.results.row-1.name',
        '21.results.row-2.name',
        '21.results.row-3.name',
        '21.results.row-4.name',
        '21.results.row-5.name',
      ],
      resolution: 'text sits beside the sample as 21 draws it',
      flippedByUser: false,
    },
    {
      id: 'C1',
      elements: [
        '21.tabs',
        '21.tabs.indicator',
        '21.tabs.atlas.icon',
        '21.tabs.atlas.label',
        '21.tabs.library.icon',
        '21.tabs.library.label',
        '21.tabs.search.icon',
        '21.tabs.search.label',
      ],
      resolution: "P5 → 01: 21's three-item tab bar is replaced by 01's five, icon and label",
      flippedByUser: false,
    },
  ],
};
