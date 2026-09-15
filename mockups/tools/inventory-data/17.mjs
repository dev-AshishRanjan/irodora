// Mockup 17 — Personal Colour Profile, step 2: the in-progress state of /profile (§6 C15). Full-bleed,
// 768 px → 2 px = 1 dp (§2). Boxes are pixel readings (measure.ps1, corner.ps1). Derived, and saying
// so: the two draping options' swatch boxes run from the option card's top to the first row where the
// card's own fill returns; the radar web's box excludes the Depth label the first scan merged into it
// (split by a column scan at the web's centre line); the palette card's corner fit, 8 dp, is
// equidistant from sm (6) and md (10) — sm, as its two sibling cards fit. The radar is drawn blue — questions.md 14; its
// axes and the sliders name different dimensions — questions.md 15, so the axis that matches no slider
// binds to OQ-25; the option buttons are printed in square brackets — questions.md 13. The generator
// orders elements by the reading rule. Type size as in 02.mjs.
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
const cap = (emDp, weight = 400) => ({ type: text('sans', 'caption', weight), raw: { emDp } });

const option = (key, o) => {
  const p = `17.draping.option-${key}`;
  return [
    el(p, 'ui:Card', o.box, {
      parent: '17.draping',
      tokens: { border: 'border.subtle', radius: 'sm' },
    }),
    el(`${p}.swatch`, 'new:DrapeSwatch', o.swatch, {
      parent: p,
      tokens: { radius: 'sm' },
      binding: `corpus:profile.trial.${key}.hex`,
      measured: { fill: o.fill },
    }),
    t(`${p}.label`, o.label, p, `static:profile.draping.option-${key}`, {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t(`${p}.name`, o.name, p, `corpus:profile.trial.${key}.name`, {
      tokens: { fg: 'text.secondary' },
      ...cap(o.em.name),
    }),
    t(`${p}.hex`, o.hex, p, `corpus:profile.trial.${key}.hex`, {
      tokens: { fg: 'text.secondary' },
      ...cap(o.em.hex),
      copy: { shape: 'value', script: 'mixed' },
    }),
    el(`${p}.select`, 'ui:Button', o.select, {
      parent: p,
      tokens: o.selected
        ? { bg: 'action.primary', radius: 'sm' }
        : { border: 'border.subtle', radius: 'sm' },
      binding: `static:profile.draping.select-${key}`,
      action: `select:profile.trial.${key}`,
      copy: { shape: 'label', script: 'latin' },
    }),
    ...(o.selected
      ? [el(`${p}.select.selected`, null, o.selected, { parent: `${p}.select` })]
      : []),
  ];
};
const axis = (key, box, emDp, binding, lines = 1) =>
  t(`17.radar.axis-${key}`, box, '17.radar', binding, {
    tokens: { fg: 'text.secondary' },
    ...cap(emDp),
    copy: { shape: 'label', script: 'latin', ...(lines > 1 ? { lines } : {}) },
  });
const dimension = (key, label, value, track, em) => [
  t(`17.radar.${key}.label`, label, '17.radar', `static:profile.dimension.${key}`, {
    tokens: { fg: 'text.primary' },
    ...cap(em.label),
  }),
  t(`17.radar.${key}.value`, value, '17.radar', `engine:profile.dimensions.${key}.label`, {
    tokens: { fg: 'text.primary' },
    ...cap(em.value),
    copy: { shape: 'value', script: 'mixed' },
  }),
  el(`17.radar.${key}.range`, 'ui:Slider', track, {
    parent: '17.radar',
    tokens: { fg: 'text.primary', track: 'border.subtle' },
    binding: `engine:profile.dimensions.${key}.range`,
  }),
];
const swatch = (n, box, fill, name, emDp) => [
  el(`17.palette.swatch-${n}`, 'ui:Swatch', box, {
    parent: '17.palette',
    tokens: { radius: 'sm' },
    binding: `engine:profile.palette.${n - 1}.hex`,
    measured: { fill },
  }),
  t(`17.palette.swatch-${n}.name`, name, '17.palette', `corpus:profile.palette.${n - 1}.romaji`, {
    tokens: { fg: 'text.secondary' },
    ...cap(emDp),
  }),
];

export default {
  kind: 'screen',
  governs: 'state',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '17.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    el('17.title', 'ui:Text', B(92, 64, 585, 28), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      binding: 'static:profile.title',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    el('17.step', 'ui:Chip', B(164, 111, 441, 38), {
      tokens: { bg: 'level2', radius: 'pill' },
      measured: { bg: '#343C46' },
      binding: 'store:profile.session.step',
      copy: { shape: 'badge', script: 'latin' },
    }),
    // ---- the draping comparison
    el('17.draping', 'ui:Card', B(51, 174, 667, 467), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1C2027' },
    }),
    t('17.draping.title', B(74, 200, 420, 25), '17.draping', 'static:profile.draping.title', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t('17.draping.prompt', B(74, 236, 560, 47), '17.draping', 'static:profile.draping.prompt', {
      tokens: { fg: 'text.secondary' },
      ...cap(11.8),
      copy: { shape: 'body', script: 'latin', lines: 2 },
    }),
    ...option('a', {
      box: B(73, 301, 303, 327),
      swatch: B(73, 301, 303, 176),
      fill: '#BA6A31',
      label: B(88, 491, 92, 19),
      name: B(87, 519, 160, 15),
      hex: B(88, 540, 133, 18),
      select: B(88, 567, 274, 40),
      em: { name: 10.3, hex: 10.0 },
    }),
    ...option('b', {
      box: B(393, 301, 303, 327),
      swatch: B(393, 301, 303, 174),
      fill: '#7C4F66',
      label: B(407, 491, 91, 19),
      name: B(407, 519, 128, 16),
      hex: B(407, 540, 131, 18),
      select: B(406, 566, 276, 43),
      selected: B(443, 582, 11, 11),
      em: { name: 11.0, hex: 10.0 },
    }),
    // ---- the radar and the four ranges
    el('17.radar', 'ui:Card', B(51, 656, 667, 341), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1C2027' },
    }),
    t('17.radar.title', B(75, 680, 576, 26), '17.radar', 'static:profile.radar.title', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t('17.radar.subtitle', B(75, 711, 612, 20), '17.radar', 'static:profile.radar.subtitle', {
      tokens: { fg: 'text.secondary' },
      ...cap(10.8),
      copy: { shape: 'body', script: 'latin' },
    }),
    el('17.radar.chart', 'new:RadarChart', B(132, 767, 182, 182), {
      parent: '17.radar',
      tokens: { track: 'border.subtle' },
      binding: 'engine:profile.dimensions',
    }),
    axis('temperature', B(183, 749, 81, 16), 8.6, 'static:profile.dimension.temperature'),
    axis('muted-tolerance', B(71, 852, 63, 29), 9.9, 'oq:OQ-25', 2),
    axis('depth', B(318, 852, 38, 16), 8.6, 'static:profile.dimension.depth'),
    axis('chroma', B(197, 956, 52, 13), 8.9, 'static:profile.dimension.chroma'),
    ...dimension('temperature', B(377, 756, 104, 17), B(542, 754, 155, 18), B(376, 778, 321, 17), {
      label: 9.1,
      value: 8.6,
    }),
    ...dimension('depth', B(377, 813, 144, 20), B(530, 813, 167, 20), B(376, 836, 322, 18), {
      label: 10.8,
      value: 9.5,
    }),
    ...dimension('chroma', B(378, 872, 147, 16), B(554, 872, 143, 18), B(377, 895, 321, 18), {
      label: 11.0,
      value: 8.6,
    }),
    ...dimension('contrast', B(378, 931, 163, 16), B(544, 930, 155, 20), B(376, 954, 323, 17), {
      label: 11.0,
      value: 9.5,
    }),
    // ---- the recommended palette
    el('17.palette', 'ui:Card', B(51, 1012, 667, 217), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1C1F26' },
    }),
    t('17.palette.title', B(75, 1037, 247, 20), '17.palette', 'static:profile.palette.title', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t(
      '17.palette.subtitle',
      B(75, 1067, 561, 20),
      '17.palette',
      'static:profile.palette.subtitle',
      { tokens: { fg: 'text.secondary' }, ...cap(10.8), copy: { shape: 'body', script: 'latin' } },
    ),
    ...swatch(1, B(73, 1099, 117, 82), '#828081', B(92, 1192, 79, 15), 10.3),
    ...swatch(2, B(200, 1099, 117, 83), '#C3C4C6', B(213, 1192, 89, 15), 10.3),
    ...swatch(3, B(325, 1099, 118, 83), '#F1F0EE', B(347, 1193, 75, 14), 9.6),
    ...swatch(4, B(453, 1100, 116, 81), '#49555E', B(472, 1192, 78, 15), 10.3),
    ...swatch(5, B(578, 1099, 118, 83), '#B48C6E', B(607, 1193, 61, 14), 9.6),
    // ---- the next card, cut by the action bar
    el('17.next-card', 'ui:Card', B(54, 1246, 662, 11), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
    }),
    // ---- the action
    el('17.actions', 'app:ActionBar', B(0, 1257, 768, 119), {
      tokens: { border: 'border.subtle' },
      measured: { bg: '#1D2027' },
    }),
    el('17.actions.continue', 'ui:Button', B(49, 1277, 670, 64), {
      parent: '17.actions',
      tokens: { bg: 'action.primary', radius: 'sm' },
      icon: 'arrow-right',
      binding: 'static:profile.confirmContinue',
      action: 'submit:profile.step',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    {
      what: 'garbled-text',
      note: 'the palette subtitle misspells a word',
      box: B(75, 1067, 561, 20),
    },
    {
      what: 'presentation',
      note: 'a faint mark in the render’s bottom-right corner (mean #1F2228), part of no element',
      box: B(734, 1368, 34, 8),
    },
  ],
  departures: [],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '17.draping.option-a.swatch',
        '17.draping.option-b.swatch',
        '17.palette.swatch-1',
        '17.palette.swatch-2',
        '17.palette.swatch-3',
        '17.palette.swatch-4',
        '17.palette.swatch-5',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C15',
      elements: ['17.title', '17.step'],
      resolution:
        '17 is the in-progress state of profile/index, not a /profile/setup route; 23 is its finished state',
      flippedByUser: false,
    },
  ],
};
