// Mockup 09 — the colour finder. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes are pixel readings
// (measure.ps1; result cards against their own colour). Result text is drawn on the colour (C8). The
// generator orders elements by the reading rule. Type size by the rule in 02.mjs.
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

const slider = (key, label, track, value) => [
  t(`09.sliders.${key}.label`, label, '09.sliders', `static:finder.${key}`, {
    tokens: { fg: 'text.primary' },
  }),
  el(`09.sliders.${key}.track`, 'ui:Slider', track, {
    parent: '09.sliders',
    binding: `store:finder.${key}`,
    action: `adjust:finder.${key}`,
  }),
  t(`09.sliders.${key}.value`, value, '09.sliders', 'derived:F-222', {
    tokens: { fg: 'text.secondary' },
    type: text('sans', 'label', 400, { tabular: true }),
    copy: { shape: 'value', script: 'mixed' },
  }),
];
const result = (n, card, lines, measuredBg) => {
  const p = `09.results.result-${n}`;
  return [
    el(p, 'ui:Card', card, {
      tokens: { radius: 'md' },
      binding: `corpus:finder.nearest.${n - 1}.hex`,
      action: 'navigate:/atlas/[slug]',
      measured: { bg: measuredBg },
      ...(n === 1 ? { raw: { cornerPx: 19.75 } } : {}),
    }),
    ...lines.map(([key, box, binding, shape, script]) =>
      t(`${p}.${key}`, box, p, binding, {
        type:
          key === 'name'
            ? text('gothic', 'body', 500)
            : text('sans', 'label', 400, { tabular: shape === 'value' }),
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
    el('09.back', 'ui:Button', B(31, 45, 117, 27), {
      icon: 'back',
      binding: 'static:atlas.back',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('09.title', 'ui:Text', B(235, 41, 298, 33), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
      binding: 'static:finder.title',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    el('09.clear', 'ui:Button', B(622, 44, 119, 28), {
      icon: 'close',
      binding: 'static:finder.clear',
      action: 'submit:finder.clear',
      copy: { shape: 'label', script: 'latin' },
    }),
    // ---- leaves, inside the screen (§2: design)
    el('09.art', 'ui:Illustration', B(560, 97, 208, 323), { illustration: 'leaves' }),
    // ---- the query
    el('09.search', 'ui:Card', B(29, 166, 710, 185), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1D2228' },
    }),
    el('09.search.query', 'ui:TextField', B(64, 198, 557, 41), {
      parent: '09.search',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body'),
      binding: 'store:finder.query',
      action: 'adjust:finder.query',
      copy: { shape: 'placeholder', script: 'latin' },
    }),
    el('09.search.clear', 'ui:Button', B(669, 201, 35, 35), {
      parent: '09.search',
      icon: 'close',
      action: 'submit:finder.query.clear',
    }),
    ...[
      ['phrase', B(64, 261, 213, 49)],
      ['kanji', B(290, 261, 217, 48)],
      ['hex', B(520, 261, 170, 49)],
    ].map(([key, box]) =>
      el(`09.search.mode-${key}`, 'ui:Chip', box, {
        parent: '09.search',
        tokens: { bg: 'level2', radius: 'pill' },
        binding: `static:finder.mode.${key}`,
        action: `select:finder.mode.${key}`,
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
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1D2227' },
    }),
    ...slider('lightness', B(53, 499, 154, 30), B(222, 497, 250, 31), B(488, 499, 230, 29)),
    ...slider('chroma', B(53, 569, 137, 28), B(204, 567, 268, 31), B(488, 570, 230, 26)),
    ...slider('hue', B(53, 639, 91, 28), B(159, 637, 332, 30), B(506, 639, 212, 28)),
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
        ['name', B(58, 826, 202, 35), 'corpus:finder.nearest.0.name', 'heading', 'mixed'],
        ['english', B(59, 873, 170, 28), 'corpus:finder.nearest.0.english', 'label', 'latin'],
        ['distance', B(56, 924, 270, 23), 'engine:finder.nearest.0.deltaE00', 'value', 'figures'],
        ['oklch', B(57, 963, 294, 20), 'engine:finder.nearest.0.oklch', 'value', 'figures'],
      ],
      '#66791D',
    ),
    ...result(
      2,
      B(396, 796, 344, 216),
      [
        ['name', B(423, 826, 247, 39), 'corpus:finder.nearest.1.name', 'heading', 'mixed'],
        ['english', B(422, 873, 261, 29), 'corpus:finder.nearest.1.english', 'label', 'latin'],
        ['hex', B(421, 924, 127, 23), 'corpus:finder.nearest.1.hex', 'value', 'figures'],
        ['distance', B(422, 961, 124, 23), 'engine:finder.nearest.1.deltaE00', 'value', 'figures'],
      ],
      '#6D591F',
    ),
    ...result(
      3,
      B(28, 1035, 344, 221),
      [
        ['kanji', B(57, 1065, 105, 36), 'corpus:finder.nearest.2.name.ja', 'heading', 'japanese'],
        ['name', B(58, 1114, 116, 27), 'corpus:finder.nearest.2.name.romaji', 'label', 'latin'],
        ['english', B(59, 1154, 225, 28), 'corpus:finder.nearest.2.english', 'label', 'latin'],
        ['distance', B(56, 1204, 267, 24), 'engine:finder.nearest.2.deltaE00', 'value', 'figures'],
      ],
      '#575E2B',
    ),
    ...result(
      4,
      B(396, 1035, 344, 221),
      [
        ['kanji', B(422, 1066, 107, 35), 'corpus:finder.nearest.3.name.ja', 'heading', 'japanese'],
        ['name', B(421, 1113, 249, 35), 'corpus:finder.nearest.3.name.romaji', 'label', 'latin'],
        ['english', B(423, 1153, 212, 28), 'corpus:finder.nearest.3.english', 'label', 'latin'],
        ['distance', B(422, 1204, 276, 24), 'engine:finder.nearest.3.deltaE00', 'value', 'figures'],
      ],
      '#575840',
    ),
    // ---- 09's own tab bar — four items; C1 puts 01's five in its place
    el('09.tabs', 'app:TabBar', B(0, 1266, 768, 110), {
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
    t('09.tabs.atlas.label', B(67, 1335, 55, 21), '09.tabs', 'static:tabs.atlas', {
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
  ],
  departures: [
    {
      rule: 'E1',
      element: '09.results.result-1.oklch',
      why: '#69821B is printed as OKLCh 0.52 / 0.062 / 140°; it is 0.567 / 0.128 / 122.8° (§4 E1) — the line shows the engine’s conversion',
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
        '09.results.result-3.kanji',
        '09.results.result-4.kanji',
      ],
      resolution:
        'text sits on the sample as 09 draws it, and takes per sample whichever of the two text colours passes 4.5:1 (E3)',
      flippedByUser: false,
    },
  ],
};
