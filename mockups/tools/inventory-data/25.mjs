// Mockup 25 — Home in the light palette, a variant: it governs the light palette only (§3 P2); Home's
// layout is 01's (§6 C2). Drawn as a phone screen on a light ground, with callouts and a title around
// it. The screen's side borders sit at x 146–148 and 619–621, so the screen is 470 px wide (x 149–618,
// y 114–1298) and 384 / 470 = 0.8170 dp per px (§2). Boxes are pixel readings (measure.ps1,
// corner.ps1). Derived, and saying so: the hero circle's box is its vertical diameter, centred on the
// screen's axis (callout leader lines cross its sides); the CTA pill's right edge is its left edge
// mirrored about the card's centre, since a leader line runs into it; each callout's box joins its text
// and its leader line. Tile names are cut by the tab bar, so each one's em is read from its first
// line. The generator orders elements by the reading rule. Type size as in 02.mjs, the em converted
// at 0.8170 dp per px; ties between two steps take the smaller.
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

const tile = (n, box, badge, photo, name, size, emDp) => {
  const p = `25.wardrobe.tile-${n}`;
  return [
    // An edge darker than both the paper and the card reads on three sides (F-233): 25 draws the
    // card's border too, in the light palette's border.subtle (#E5E3DE), as 01 draws it in the dark.
    el(p, 'ui:Card', box, {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      // F-242 (ADR-0138 D5): `/wardrobe/[id]` names no route; a garment opens 24's.
      action: 'navigate:/wardrobe/with/[id]',
    }),
    // The badge marks a garment whose material is recorded (OQ-11, closed by ADR-0137). 25 governs
    // only the light palette (P2), so its circle is not built; 01's mark is.
    el(`${p}.badge`, 'new:TextureBadge', badge, {
      parent: p,
      tokens: { radius: 'pill' },
      binding: `store:garments.${n - 1}.material`,
    }),
    el(`${p}.photo`, 'app:GarmentPhoto', photo, {
      parent: p,
      binding: `store:garments.${n - 1}.photo`,
    }),
    t(`${p}.name`, name, p, `store:garments.${n - 1}.name`, {
      tokens: { fg: 'text.primary' },
      type: text('sans', size),
      ...(emDp ? { raw: { emDp } } : {}),
    }),
  ];
};
const tab = (key, icon, label, route, selected = false) => [
  el(`25.tabs.${key}.icon`, 'ui:NavIcon', icon, {
    parent: '25.tabs',
    tokens: { fg: selected ? 'text.primary' : 'text.tertiary' },
    icon: key,
    action: `navigate:${route}`,
  }),
  t(`25.tabs.${key}.label`, label, '25.tabs', `static:tabs.${key}`, {
    tokens: { fg: selected ? 'text.primary' : 'text.tertiary' },
    type: text('sans', 'label', selected ? 500 : 400),
  }),
];

export default {
  kind: 'screen',
  governs: 'palette',
  frame: {
    kind: 'device',
    screens: [{ id: '25.screen', box: B(149, 114, 470, 1185), dpPerPx: 0.817 }],
  },
  elements: [
    // ---- header
    el('25.wordmark', 'ui:Wordmark', B(182, 197, 301, 38), { tokens: { fg: 'text.primary' } }),
    el('25.mark', 'ui:Mark', B(537, 185, 79, 59), { tokens: { fg: 'text.primary' } }),
    el('25.header-rule', null, B(149, 258, 470, 2), { tokens: { fg: 'border.subtle' } }),
    el('25.tagline', 'ui:Text', B(233, 283, 300, 115), {
      tokens: { fg: 'text.primary' },
      type: text('serif', 'title'),
      binding: 'static:home.tagline',
      copy: { shape: 'heading', script: 'latin', lines: 3 },
      raw: { emDp: 34.7 },
    }),
    // ---- the hero
    el('25.hero', 'ui:Card', B(165, 425, 438, 554), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#FEFEFE' },
    }),
    el('25.hero.ring', null, B(244, 446, 280, 280), {
      parent: '25.hero',
      tokens: { border: 'keyline', radius: 'pill' },
    }),
    el('25.hero.sample', 'ui:Swatch', B(254, 456, 260, 260), {
      parent: '25.hero.ring',
      tokens: { radius: 'pill' },
      binding: 'corpus:today.hex',
      measured: { fill: '#38424C' },
    }),
    t('25.hero.kanji', B(346, 744, 76, 37), '25.hero', 'corpus:today.kanji', {
      tokens: { fg: 'text.primary' },
      type: text('gothic', 'title'),
      copy: { shape: 'heading', script: 'japanese' },
      raw: { emDp: 33.6 },
    }),
    t('25.hero.kana', B(341, 788, 87, 17), '25.hero', 'corpus:today.kana', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'body'),
      copy: { shape: 'label', script: 'japanese' },
    }),
    el('25.hero.oklch', 'ui:Chip', B(346, 818, 185, 47), {
      parent: '25.hero',
      tokens: { bg: 'level2', radius: 'md' },
      measured: { bg: '#DFE0DA' },
      binding: 'engine:today.oklch',
      copy: { shape: 'value', script: 'mixed', lines: 2 },
    }),
    t('25.hero.hex.label', B(248, 824, 27, 13), '25.hero', 'static:home.hex', {
      tokens: { fg: 'text.secondary' },
    }),
    t('25.hero.hex.value', B(247, 844, 78, 14), '25.hero', 'corpus:today.hex', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 400, { tabular: true }),
      copy: { shape: 'value', script: 'figures' },
    }),
    el('25.hero.cta', 'ui:Button', B(189, 884, 391, 68), {
      parent: '25.hero',
      tokens: { bg: 'action.primary', radius: 'lg' },
      measured: { bg: '#1D1D22' },
      binding: 'static:home.whatGoesWithThis',
      action: 'navigate:/atlas/with/[slug]',
      copy: { shape: 'label', script: 'mixed', lines: 2 },
    }),
    el('25.art-blossom', 'ui:Illustration', B(440, 955, 176, 110), { illustration: 'blossom' }),
    // F-235 (2026-10-05), blobs against the ground (lum 237, t 25): the active dot 9 px, two inactive
    // 8 px, a fourth 4 px, centres 18 px apart. The active dot's extra px is within its higher contrast
    // through the same threshold (±1 px). It is marked by ink alone (rule 13). ADR-0120 (OQ-52): the
    // current page is a capsule in this ink, the others text.tertiary, and the small fourth means the
    // pages go on past it.
    el('25.dots', 'ui:PageDots', B(361, 988, 61, 9), {
      tokens: { fg: 'text.primary', inactive: 'text.tertiary' },
      measured: { fg: '#191A1A', inactive: '#BFBFB9' },
      raw: { activePx: 9, dotPx: 8, smallPx: 4, pitchPx: 18 },
    }),
    // ---- the wardrobe strip (the tiles run on under the tab bar; the third runs off the screen's edge)
    t('25.wardrobe.title', B(184, 1032, 276, 24), null, 'static:home.wardrobeQuickAccess', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 500),
      copy: { shape: 'heading', script: 'latin' },
    }),
    el('25.art-waves', 'ui:Illustration', B(150, 1040, 36, 150), { illustration: 'waves' }),
    ...tile(
      1,
      B(176, 1067, 160, 128),
      B(196, 1080, 37, 37),
      B(238, 1080, 42, 84),
      B(196, 1171, 109, 21),
      'label',
      19.0,
    ),
    ...tile(
      2,
      B(345, 1067, 156, 128),
      B(359, 1080, 37, 37),
      B(397, 1080, 71, 84),
      B(360, 1171, 91, 21),
      'label',
    ),
    ...tile(
      3,
      B(507, 1067, 111, 128),
      B(523, 1080, 36, 36),
      B(562, 1080, 56, 84),
      B(523, 1171, 95, 17),
      'label',
    ),
    // ---- 25's own tab bar — four items, no Profile; C1 puts 01's five in its place
    el('25.tabs', 'ui:TabBar', B(149, 1195, 470, 104), {
      tokens: { bg: 'level1', border: 'border.subtle' },
      measured: { bg: '#FEFEFE' },
    }),
    ...tab('home', B(200, 1205, 28, 25), B(195, 1237, 38, 11), '/', true),
    ...tab('lens', B(316, 1205, 23, 24), B(312, 1237, 30, 11), '/lens'),
    ...tab('atlas', B(427, 1205, 27, 25), B(424, 1237, 33, 11), '/atlas'),
    ...tab('wardrobe', B(539, 1205, 29, 25), B(521, 1237, 64, 11), '/wardrobe'),
  ],
  notDesign: [
    {
      what: 'board-annotation',
      note: 'the board’s title and its dot, above the screen',
      box: B(33, 34, 495, 33),
    },
    {
      what: 'leaked-label',
      note: 'the route string printed under the board’s title',
      box: B(301, 71, 167, 18),
    },
    {
      what: 'status-bar',
      note: 'a device status bar drawn into the render (9:41, signal, battery)',
      box: B(160, 134, 450, 32),
    },
    {
      what: 'callout',
      note: 'a callout naming the lockup, with its leader line',
      box: B(29, 210, 147, 16),
    },
    {
      what: 'callout',
      note: 'a callout naming the mark, with its leader line',
      box: B(593, 191, 153, 70),
    },
    {
      what: 'callout',
      note: 'a callout naming the hero sample and its size, with its leader line',
      box: B(38, 554, 212, 71),
    },
    {
      what: 'callout',
      note: 'a callout naming the hero ring as a keyline, with its leader line',
      box: B(518, 554, 230, 53),
    },
    {
      what: 'callout',
      note: 'a callout naming the CTA, with its leader line',
      box: B(580, 911, 94, 12),
    },
    {
      what: 'callout',
      note: 'a callout naming the texture badge, misspelt, with its leader line',
      box: B(69, 1092, 131, 53),
    },
    { what: 'outside-art', note: 'the plain ground left of the device', box: B(0, 107, 146, 1210) },
    {
      what: 'outside-art',
      note: 'the plain ground right of the device',
      box: B(622, 107, 146, 1210),
    },
    { what: 'outside-art', note: 'the plain ground below the device', box: B(0, 1320, 768, 56) },
    {
      what: 'presentation',
      note: 'the OS home indicator, which no surface of the app draws',
      box: B(299, 1283, 170, 7),
    },
  ],
  departures: [
    {
      rule: 'E3',
      element: '25.dots',
      why: 'the current page is a capsule in the drawn ink, not only a darker dot (golden rule 13: a second channel, shape); the other dots take text.tertiary, since the drawn #BFBFB9 is 1.69:1 on the ground, under the 3:1 a graphic needs (WCAG 1.4.11). ADR-0120',
    },
    {
      rule: 'E1',
      element: '25.hero.oklch',
      why: '#5B6B78’s printed OKLCh does not survive checking (§4 E1); the chip shows the engine’s conversion',
    },
  ],
  conflicts: [
    {
      id: 'C17',
      elements: ['25.hero', '25.hero.cta', '25.tabs'],
      resolution:
        "light appearance: 14's splash composition in 25's palette — these elements carry that palette's measured values",
      flippedByUser: false,
    },
    {
      id: 'C2',
      elements: [
        '25.tagline',
        '25.hero',
        '25.hero.cta',
        '25.wardrobe.tile-1',
        '25.wardrobe.tile-2',
        '25.wardrobe.tile-3',
      ],
      resolution: "P1 + P2: 01's layout, 25's palette — 25 is Home's light translation",
      flippedByUser: false,
    },
    {
      id: 'C4',
      elements: ['25.wordmark', '25.mark'],
      resolution:
        "the in-app lockup is 01's and the mark's geometry 14's; 25's variant is not used",
      flippedByUser: false,
    },
    {
      id: 'C7',
      elements: ['25.hero.ring', '25.hero.sample'],
      resolution: "P1: 01's rounded square, not 25's circle",
      flippedByUser: false,
    },
    {
      id: 'C1',
      elements: [
        '25.tabs',
        '25.tabs.home.icon',
        '25.tabs.home.label',
        '25.tabs.lens.icon',
        '25.tabs.lens.label',
        '25.tabs.atlas.icon',
        '25.tabs.atlas.label',
        '25.tabs.wardrobe.icon',
        '25.tabs.wardrobe.label',
      ],
      resolution: "P5 → 01: 25's four-item tab bar is replaced by 01's five, icon and label",
      flippedByUser: false,
    },
  ],
};
