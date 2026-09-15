// Mockup 15 — settings. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes are pixel readings (measure.ps1,
// corner.ps1). Derived, and saying so: the five cards' borders are too faint against a vignetted
// ground to scan, so their boxes are read from the section band scans (sides x 27–738, tops and
// bottoms from the heading-to-card gaps); tile 2's box is the tiles' regular pitch (the selected
// tile beside it merges into one reading); and tile 1's swatch, Sumi Charcoal on a tile of nearly
// its own value, is the other swatches' geometry. The four tile colours are measured at their
// centres — Slate Graphite, which no mockup prints, reads #2C323A (the §5 value F-220 owes);
// Obsidian Noir reads #101115 against the #101114 its tile prints. The security badge's lock is drawn
// in colour — questions.md 5. The generator orders elements by the reading rule. Type size as in 02.mjs.
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

const heading = (n, box, key) =>
  t(`15.section-${n}.heading`, box, null, `static:settings.${key}`, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'body', 500),
    copy: { shape: 'heading', script: 'latin' },
  });
const card = (n, box, extra = {}) =>
  el(`15.section-${n}`, 'ui:Card', box, {
    tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
    ...extra,
  });
const tile = (key, box, swatch, name, detail, colour, selected = false) => [
  el(`15.themes.${key}`, 'new:ThemeTile', box, {
    parent: '15.section-1',
    tokens: selected ? { border: 'text.primary', radius: 'md' } : { bg: 'level2', radius: 'md' },
    binding: `static:themes.${key}`,
    action: `select:theme.${key}`,
    ...(key === 'obsidian' ? { raw: { cornerPx: 18.5 } } : {}),
  }),
  el(`15.themes.${key}.swatch`, 'ui:Swatch', swatch, {
    parent: `15.themes.${key}`,
    tokens: { radius: 'sm' },
    binding: `static:themes.${key}.ground`,
    measured: { fill: colour },
  }),
  t(`15.themes.${key}.name`, name, `15.themes.${key}`, `static:themes.${key}.name`, {
    tokens: { fg: 'text.primary' },
  }),
  t(`15.themes.${key}.detail`, detail, `15.themes.${key}`, `static:themes.${key}.detail`, {
    tokens: { fg: 'text.secondary' },
    type: text('sans', 'caption'),
    copy: { shape: 'caption', script: 'latin', lines: 2 },
  }),
];
const mode = (key, box, selected = false) =>
  el(`15.cvd.${key}`, 'ui:Chip', box, {
    parent: '15.section-2',
    tokens: selected
      ? { border: 'text.primary', radius: 'pill' }
      : { border: 'border.subtle', radius: 'pill' },
    binding: `static:settings.cvd.${key}`,
    action: `select:cvd.${key}`,
    copy: { shape: 'label', script: 'latin' },
  });
const toggle = (key, label, dot, control) => [
  t(`15.engine.${key}.label`, label, '15.section-3', `static:settings.${key}`, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'body'),
  }),
  el(`15.engine.${key}.state`, null, dot, {
    parent: '15.section-3',
    tokens: { fg: 'text.tertiary' },
  }),
  el(`15.engine.${key}.switch`, 'ui:Switch', control, {
    parent: '15.section-3',
    binding: `store:settings.${key}`,
    action: `toggle:settings.${key}`,
  }),
];

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '15.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    el('15.title', 'ui:Text', B(28, 60, 523, 44), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
      binding: 'static:settings.title',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    el('15.mark', 'ui:Mark', B(693, 57, 48, 45), { tokens: { fg: 'text.primary' } }),
    el('15.art', 'ui:Illustration', B(736, 100, 32, 1190), { illustration: 'leaves' }),
    // ---- 1. themes
    heading(1, B(30, 152, 456, 27), 'appearance'),
    card(1, B(27, 188, 711, 259), { measured: { bg: '#202227' } }),
    ...tile(
      'sumi',
      B(52, 214, 156, 213),
      B(59, 220, 141, 123),
      B(65, 356, 128, 15),
      B(63, 381, 133, 31),
      '#171A1E',
      true,
    ),
    el('15.themes.sumi.selected', null, B(68, 230, 16, 16), {
      parent: '15.themes.sumi',
      tokens: { fg: 'text.primary' },
    }),
    ...tile(
      'slate',
      B(222, 214, 156, 213),
      B(229, 220, 141, 124),
      B(236, 356, 126, 19),
      B(252, 381, 94, 31),
      '#2C323A',
    ),
    ...tile(
      'obsidian',
      B(391, 214, 156, 213),
      B(399, 221, 140, 123),
      B(409, 356, 121, 15),
      B(430, 381, 78, 31),
      '#101115',
    ),
    ...tile(
      'washi',
      B(561, 214, 156, 213),
      B(568, 219, 143, 127),
      B(574, 356, 129, 16),
      B(592, 381, 95, 31),
      '#F3F2ED',
    ),
    // ---- 2. colour-vision mode
    heading(2, B(24, 485, 651, 45), 'accessibility'),
    card(2, B(27, 530, 711, 139)),
    mode('standard', B(50, 550, 155, 51), true),
    mode('protanopia', B(216, 551, 152, 46)),
    mode('deuteranopia', B(380, 551, 178, 46)),
    mode('tritanopia', B(570, 551, 144, 46)),
    el('15.cvd.badge', 'ui:Chip', B(51, 608, 375, 40), {
      parent: '15.section-2',
      tokens: { bg: 'level2', radius: 'pill' },
      icon: 'contrast',
      binding: 'engine:corpus.separation',
      copy: { shape: 'badge', script: 'latin' },
    }),
    // ---- 3. engine and controls
    heading(3, B(28, 713, 385, 28), 'engine'),
    card(3, B(27, 752, 711, 199)),
    ...toggle('tabular', B(51, 780, 401, 31), B(624, 790, 10, 11), B(647, 773, 71, 45)),
    ...toggle('haptics', B(52, 839, 399, 29), B(624, 847, 11, 11), B(647, 830, 71, 43)),
    ...toggle('provenance', B(52, 897, 416, 27), B(624, 904, 10, 11), B(646, 888, 72, 41)),
    // ---- 4. learned preference weights
    heading(4, B(28, 994, 432, 28), 'weights'),
    card(4, B(27, 1032, 711, 113)),
    t('15.weights.pair', B(52, 1068, 278, 46), '15.section-4', 'store:preferences.weights.0', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 400, { tabular: true }),
      copy: { shape: 'value', script: 'mixed', lines: 2 },
    }),
    el('15.weights.reset', 'ui:Button', B(470, 1057, 248, 52), {
      parent: '15.section-4',
      tokens: { border: 'border.strong', radius: 'md' },
      binding: 'static:settings.resetWeights',
      action: 'submit:preferences.reset',
      copy: { shape: 'label', script: 'latin' },
    }),
    // ---- 5. on-device security (runs on under the tab bar)
    heading(5, B(28, 1188, 453, 27), 'security'),
    card(5, B(27, 1228, 711, 60)),
    el('15.security.badge', 'ui:Chip', B(61, 1251, 646, 29), {
      parent: '15.section-5',
      icon: 'lock',
      binding: 'static:settings.securityBadge',
      copy: { shape: 'badge', script: 'latin' },
    }),
    // ---- 15's own tab bar — four items; C1 puts 01's five in its place
    el('15.tabs', 'app:TabBar', B(0, 1288, 768, 88), {
      tokens: { bg: 'ground', border: 'border.subtle' },
      measured: { bg: '#1E2126' },
    }),
    el('15.tabs.indicator', null, B(605, 1293, 95, 1), {
      parent: '15.tabs',
      tokens: { fg: 'text.primary' },
    }),
    el('15.tabs.profile', 'ui:NavIcon', B(623, 1309, 59, 54), {
      parent: '15.tabs',
      icon: 'profile',
      binding: 'static:tabs.profile',
      action: 'navigate:/profile',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('15.tabs.compass', 'ui:NavIcon', B(279, 1319, 32, 32), {
      parent: '15.tabs',
      icon: 'compass',
      action: 'navigate:/atlas',
    }),
    el('15.tabs.bell', 'ui:NavIcon', B(458, 1319, 32, 31), { parent: '15.tabs', icon: 'bell' }),
    el('15.tabs.home', 'ui:NavIcon', B(102, 1320, 28, 29), {
      parent: '15.tabs',
      icon: 'home',
      action: 'navigate:/',
    }),
  ],
  notDesign: [
    {
      what: 'status-bar',
      note: 'a device status bar drawn into the render, with a carrier named Irodora',
      box: B(0, 0, 768, 36),
    },
  ],
  departures: [
    {
      rule: 'E2',
      element: '15.cvd.badge',
      why: 'the computed separation score (FR-5) for the corpus palettes, printing 100 only when it is 100; a safety claim about people does not ship',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '15.themes.sumi.swatch',
        '15.themes.slate.swatch',
        '15.themes.obsidian.swatch',
        '15.themes.washi.swatch',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C9',
      elements: ['15.themes.sumi', '15.themes.slate', '15.themes.obsidian', '15.themes.washi'],
      resolution: 'the four drawn themes (§5); system and device accent are kept (E4)',
      flippedByUser: false,
    },
    {
      id: 'C1',
      elements: [
        '15.tabs',
        '15.tabs.indicator',
        '15.tabs.profile',
        '15.tabs.compass',
        '15.tabs.bell',
        '15.tabs.home',
      ],
      resolution: "P5 → 01: 15's four-item tab bar is replaced by 01's five, icon and label",
      flippedByUser: false,
    },
  ],
};
