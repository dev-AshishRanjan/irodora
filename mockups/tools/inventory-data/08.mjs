// Mockup 08 — colour compare. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes are pixel readings
// (measure.ps1). The left metric card's left edge is read from its bottom border's run (x 35); the
// line-art is inside the screen, so it is design. The generator orders elements by the reading rule.
// Type size by the rule in 02.mjs.
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
const rule = (id, box, parent) => el(id, null, box, { parent, tokens: { fg: 'border.subtle' } });

const side = (key, s) => [
  el(`08.pair.${key}.swatch`, 'ui:Swatch', s.swatch, {
    parent: '08.pair',
    tokens: { keyline: 'keyline', radius: 'md' },
    binding: `store:compare.${key}.hex`,
  }),
  t(`08.pair.${key}.name`, s.name, '08.pair', `corpus:compare.${key}.name`, {
    tokens: { fg: 'text.primary' },
    type: text('gothic', 'body'),
    copy: { shape: 'heading', script: 'mixed' },
  }),
  t(`08.pair.${key}.meta`, s.meta, '08.pair', `engine:compare.${key}.oklch`, {
    tokens: { fg: 'text.secondary' },
    type: text('sans', 'label', 400, { tabular: true }),
    copy: { shape: 'value', script: 'figures' },
  }),
  el(`08.pair.${key}.change`, 'ui:Button', s.change, {
    parent: '08.pair',
    tokens: { border: 'border.subtle', radius: 'md' },
    binding: `static:compare.change.${key}`,
    action: `open:compare.pick.${key}`,
    copy: { shape: 'label', script: 'latin' },
  }),
];
const metric = (key, label, value, reading) => [
  t(`08.metrics.${key}.label`, label, '08.metrics', `static:compare.${key}`, {
    tokens: { fg: 'text.primary' },
  }),
  t(`08.metrics.${key}.value`, value, '08.metrics', `engine:compare.${key}`, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'label', 500, { tabular: true }),
    copy: { shape: 'value', script: 'figures' },
  }),
  ...(reading
    ? [
        t(`08.metrics.${key}.reading`, reading, '08.metrics', 'derived:F-222', {
          tokens: { fg: 'text.secondary' },
          type: text('sans', 'caption'),
          raw: { emDp: 10.3 },
        }),
      ]
    : []),
];
const access = (key, label, value, binding) => [
  t(`08.access.${key}.label`, label, '08.access', `static:compare.${key}`, {
    tokens: { fg: 'text.primary' },
  }),
  t(`08.access.${key}.value`, value, '08.access', binding, {
    tokens: { fg: 'text.secondary' },
    copy: { shape: 'value', script: 'mixed' },
  }),
];

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '08.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    // ---- header
    el('08.back', 'ui:Button', B(35, 37, 94, 22), {
      icon: 'back',
      binding: 'static:atlas.back',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('08.title', 'ui:Text', B(245, 34, 278, 30), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 500),
      binding: 'static:compare.title',
      copy: { shape: 'heading', script: 'mixed' },
      raw: { emDp: 20.5 },
    }),
    el('08.export', 'ui:Button', B(705, 30, 27, 34), {
      icon: 'download',
      action: 'share:comparePdf',
    }),
    el('08.header-rule', null, B(0, 93, 768, 7), { tokens: { fg: 'border.subtle' } }),
    // ---- line-art inside the screen (§2: design)
    el('08.art-top', 'ui:Illustration', B(520, 100, 206, 80), { illustration: 'plum-branch' }),
    el('08.art-right', 'ui:Illustration', B(736, 190, 32, 252), { illustration: 'plum-branch' }),
    el('08.art-left', 'ui:Illustration', B(0, 880, 40, 360), { illustration: 'plum-branch' }),
    // ---- the pair
    el('08.pair', 'ui:Card', B(34, 179, 700, 514), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1E2125' },
    }),
    el('08.seam', null, B(383, 186, 2, 524), { tokens: { fg: 'keyline' } }),
    ...side('a', {
      swatch: B(58, 203, 303, 303),
      name: B(58, 528, 185, 29),
      meta: B(58, 571, 288, 18),
      change: B(58, 615, 303, 54),
    }),
    ...side('b', {
      swatch: B(407, 203, 303, 304),
      name: B(408, 529, 217, 31),
      meta: B(407, 571, 289, 18),
      change: B(407, 615, 303, 54),
    }),
    // ---- perceptual distance
    el('08.metrics', 'ui:Card', B(35, 756, 338, 463), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1E2126' },
    }),
    t('08.metrics.title', B(59, 783, 233, 48), '08.metrics', 'static:compare.metrics', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      copy: { shape: 'heading', script: 'latin', lines: 2 },
    }),
    rule('08.metrics.rule-1', B(58, 850, 290, 2), '08.metrics'),
    ...metric('delta-e00', B(59, 867, 54, 19), B(191, 868, 46, 18), B(191, 895, 130, 19)),
    t(
      '08.metrics.delta-e00.formula',
      B(59, 895, 101, 18),
      '08.metrics',
      'static:compare.ciede2000',
      {
        tokens: { fg: 'text.secondary' },
        type: text('sans', 'caption'),
        raw: { emDp: 10.3 },
      },
    ),
    rule('08.metrics.rule-2', B(59, 926, 289, 2), '08.metrics'),
    ...metric('delta-eok', B(59, 945, 50, 20), B(191, 943, 58, 20), null),
    rule('08.metrics.rule-3', B(59, 978, 289, 2), '08.metrics'),
    ...metric('lightness', B(58, 995, 97, 45), B(191, 995, 45, 19), B(191, 1023, 83, 19)),
    rule('08.metrics.rule-4', B(58, 1054, 290, 2), '08.metrics'),
    ...metric('chroma', B(58, 1071, 79, 45), B(191, 1071, 44, 19), B(191, 1100, 156, 15)),
    rule('08.metrics.rule-5', B(59, 1130, 289, 2), '08.metrics'),
    ...metric('hue', B(58, 1147, 41, 45), B(192, 1147, 59, 19), B(192, 1176, 136, 15)),
    // ---- contrast and colour vision
    el('08.access', 'ui:Card', B(395, 756, 339, 463), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1D2025' },
    }),
    t('08.access.title', B(420, 783, 263, 52), '08.access', 'static:compare.access', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      copy: { shape: 'heading', script: 'latin', lines: 2 },
    }),
    rule('08.access.rule-1', B(420, 850, 289, 2), '08.access'),
    ...access('wcag', B(420, 866, 158, 20), B(420, 893, 181, 47), 'engine:contrast'),
    t('08.access.wcag.apca', B(421, 943, 120, 17), '08.access', 'engine:apca', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'caption', 400, { tabular: true }),
      copy: { shape: 'value', script: 'figures' },
    }),
    rule('08.access.rule-2', B(420, 972, 290, 2), '08.access'),
    ...access('protan', B(421, 989, 107, 23), B(420, 1016, 202, 22), 'engine:separation.protan'),
    rule('08.access.rule-3', B(420, 1050, 289, 1), '08.access'),
    ...access('deutan', B(421, 1066, 133, 22), B(420, 1093, 202, 22), 'engine:separation.deutan'),
    rule('08.access.rule-4', B(420, 1127, 289, 2), '08.access'),
    ...access('tritan', B(421, 1143, 98, 23), B(420, 1171, 201, 22), 'engine:separation.tritan'),
    // ---- actions
    el('08.actions', 'app:ActionBar', B(0, 1235, 768, 141), {
      tokens: { border: 'border.subtle' },
    }),
    el('08.actions.pdf', 'ui:Button', B(32, 1279, 345, 63), {
      parent: '08.actions',
      tokens: { bg: 'action.primary', radius: 'md' },
      binding: 'static:compare.exportPdf',
      action: 'share:comparePdf',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('08.actions.studio', 'ui:Button', B(393, 1281, 342, 60), {
      parent: '08.actions',
      tokens: { border: 'border.subtle', radius: 'md' },
      binding: 'static:compare.addToStudio',
      action: 'navigate:/atlas/palettes',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    {
      what: 'leaked-label',
      note: 'a component name printed as a section title',
      box: B(47, 142, 466, 23),
    },
    { what: 'leaked-label', note: 'a note on the seam, misspelt', box: B(269, 715, 230, 20) },
    {
      what: 'leaked-label',
      note: 'a component level printed after the card title',
      box: B(269, 814, 78, 16),
    },
  ],
  departures: [
    {
      rule: 'E1',
      element: '08.pair.a.meta',
      why: '#5B6B78 is printed as OKLCh 0.490 · 240°; it is 0.519 / 0.028 / 242.7° (§4 E1) — the line shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '08.pair.b.meta',
      why: '#5C828C is printed as OKLCh 0.540 · 210°; it is 0.582 / 0.045 / 215.9° (§4 E1) — the line shows the engine’s conversion',
    },
    {
      rule: 'E2',
      element: '08.access.wcag.value',
      why: 'the ratio and the Lc stay; the one-word pairing verdict after them does not (FR-32, FR-3) — the pair shows its harmony relationship (FR-6) where it has one',
    },
    ...['protan', 'deutan', 'tritan'].map((k) => ({
      rule: 'E2',
      element: `08.access.${k}.value`,
      why: 'the computed separation (FR-5) stays with the model it was computed under; the safety suffix is a claim about people and does not ship',
    })),
  ],
  conflicts: [
    {
      id: 'C11',
      elements: ['08.pair.a.swatch', '08.pair.b.swatch'],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
  ],
};
