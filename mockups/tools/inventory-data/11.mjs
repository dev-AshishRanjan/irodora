// Mockup 11 — the wardrobe gallery. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes are pixel readings
// (measure.ps1, mask.ps1, corner.ps1). Two are derived, and say so: card 2's photo is black fabric the
// same value as its card, so its box is card 1's photo at card 2's offset; and the kimono line-art is
// too faint to separate from the ground, so its box is the region the low-threshold scan marks. The
// three buttons share the row Add Garment reads cleanly (the art crosses the other two). The gap
// card's bulb is drawn yellow — questions.md 11 — so nothing binds it. The generator orders elements
// by the reading rule. Type size as in 02.mjs.
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

const garment = (n, card, photo, caption, name, meta, captionLines = 1) => {
  const p = `11.grid.garment-${n}`;
  return [
    el(p, 'ui:Card', card, {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      action: 'navigate:/wardrobe/[id]',
    }),
    el(`${p}.photo`, 'app:GarmentPhoto', photo, {
      parent: p,
      tokens: { radius: 'sm' },
      binding: `store:garments.${n - 1}.photo`,
      ...(n === 1 ? { raw: { cornerPx: 8.25 } } : {}),
    }),
    t(`${p}.caption`, caption, p, `store:garments.${n - 1}.caption`, {
      tokens: { fg: 'text.tertiary' },
      type: text('sans', 'caption'),
      copy: { shape: 'caption', script: 'mixed', lines: captionLines },
    }),
    t(`${p}.name`, name, p, `store:garments.${n - 1}.name`, {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t(`${p}.meta`, meta, p, `store:garments.${n - 1}.wears`, {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'value', script: 'mixed' },
    }),
  ];
};
const button = (key, box, icon, route) =>
  el(`11.actions.${key}`, 'ui:Button', box, {
    tokens: { border: 'border.subtle', radius: 'sm' },
    icon,
    binding: `static:wardrobe.${key}`,
    action: `navigate:${route}`,
    copy: { shape: 'label', script: 'latin' },
  });

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '11.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    el('11.art', 'ui:Illustration', B(560, 0, 208, 690), { illustration: 'kimono' }),
    el('11.title', 'ui:Text', B(233, 59, 298, 24), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      binding: 'static:wardrobe.title',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    button('add', B(55, 117, 223, 46), 'plus', '/wardrobe/add'),
    button('lab', B(288, 117, 190, 46), 'wardrobe', '/wardrobe/lab'),
    button('shopping', B(488, 117, 239, 46), 'bag', '/wardrobe/shopping'),
    // ---- coverage
    el('11.coverage', 'ui:Card', B(38, 185, 702, 295), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1E2128' },
      raw: { cornerPx: 12.5 },
    }),
    el('11.coverage.ring', 'new:RingGauge', B(295, 216, 181, 160), {
      parent: '11.coverage',
      tokens: { fg: 'text.primary', track: 'border.subtle' },
      binding: 'engine:coverage',
    }),
    t('11.coverage.figure', B(341, 282, 90, 36), '11.coverage', 'engine:coverage.percent', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600, { tabular: true }),
      copy: { shape: 'value', script: 'figures' },
    }),
    t('11.coverage.figure-label', B(347, 329, 78, 37), '11.coverage', 'static:wardrobe.coverage', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'caption'),
      copy: { shape: 'label', script: 'latin', lines: 2 },
    }),
    t('11.coverage.heading', B(247, 395, 279, 21), '11.coverage', 'engine:coverage', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      copy: { shape: 'heading', script: 'mixed' },
    }),
    t('11.coverage.counts', B(102, 428, 567, 19), '11.coverage', 'engine:coverage.counts', {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'body', script: 'mixed' },
    }),
    // ---- the gap
    el('11.gap', 'ui:Card', B(38, 492, 702, 168), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1E2128' },
    }),
    el('11.gap.icon', null, B(67, 520, 18, 28), { parent: '11.gap', icon: 'bulb' }),
    t('11.gap.title', B(95, 525, 431, 26), '11.gap', 'engine:gaps.0.title', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t('11.gap.body', B(62, 563, 617, 21), '11.gap', 'engine:gaps.0.explanation', {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'body', script: 'latin' },
    }),
    el('11.gap.explore', 'ui:Button', B(62, 595, 171, 34), {
      parent: '11.gap',
      tokens: { border: 'border.subtle', radius: 'sm' },
      icon: 'arrow-right',
      binding: 'static:wardrobe.exploreInAtlas',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'latin' },
    }),
    // ---- the garments (the third row runs on under the tab bar)
    ...garment(
      1,
      B(38, 709, 338, 261),
      B(52, 724, 309, 137),
      B(53, 876, 298, 14),
      B(54, 903, 177, 24),
      B(53, 933, 212, 19),
    ),
    ...garment(
      2,
      B(393, 709, 338, 261),
      B(408, 724, 309, 137),
      B(409, 876, 309, 14),
      B(409, 903, 176, 19),
      B(408, 934, 245, 16),
    ),
    ...garment(
      3,
      B(38, 986, 338, 263),
      B(51, 1000, 310, 138),
      B(53, 1150, 245, 29),
      B(54, 1186, 146, 18),
      B(54, 1213, 207, 17),
      2,
    ),
    ...garment(
      4,
      B(393, 986, 338, 263),
      B(407, 1001, 310, 137),
      B(408, 1150, 242, 29),
      B(409, 1186, 188, 18),
      B(409, 1212, 265, 17),
      2,
    ),
    el('11.grid.garment-5', 'ui:Card', B(38, 1266, 338, 24), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      action: 'navigate:/wardrobe/[id]',
    }),
    el('11.grid.garment-6', 'ui:Card', B(393, 1266, 338, 24), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      action: 'navigate:/wardrobe/[id]',
    }),
    // ---- 11's own tab bar — four items; C1 puts 01's five in its place
    el('11.tabs', 'app:TabBar', B(0, 1288, 768, 88), {
      tokens: { bg: 'ground', border: 'border.subtle' },
      measured: { bg: '#1F2329' },
    }),
    el('11.tabs.home.icon', 'ui:NavIcon', B(90, 1316, 30, 30), {
      parent: '11.tabs',
      icon: 'home',
      action: 'navigate:/',
    }),
    el('11.tabs.wardrobe.icon', 'ui:NavIcon', B(274, 1306, 34, 28), {
      parent: '11.tabs',
      icon: 'wardrobe',
      action: 'navigate:/wardrobe',
    }),
    el('11.tabs.grid.icon', 'ui:NavIcon', B(464, 1316, 28, 30), {
      parent: '11.tabs',
      icon: 'grid',
    }),
    el('11.tabs.settings.icon', 'ui:NavIcon', B(648, 1316, 32, 31), {
      parent: '11.tabs',
      icon: 'settings',
      action: 'navigate:/profile/settings',
    }),
    t('11.tabs.wardrobe.label', B(251, 1340, 80, 16), '11.tabs', 'static:tabs.wardrobe', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'caption', 500),
    }),
  ],
  notDesign: [],
  departures: [],
  conflicts: [
    {
      id: 'C1',
      elements: [
        '11.tabs',
        '11.tabs.home.icon',
        '11.tabs.wardrobe.icon',
        '11.tabs.grid.icon',
        '11.tabs.settings.icon',
        '11.tabs.wardrobe.label',
      ],
      resolution: "P5 → 01: 11's four-item tab bar is replaced by 01's five, icon and label",
      flippedByUser: false,
    },
  ],
};
