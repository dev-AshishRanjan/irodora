// Mockup 05 — the Atlas library. Full-bleed, 768 px → 2 px = 1 dp (§2). Every box is a pixel reading
// (measure.ps1 blobs/edges; corners by corner.ps1). Chips and buttons carry their own copy, as 01's
// CTA does. Type size by the rule in 02.mjs (em from the line box by glyph class; `caption` below
// 12 dp). Radii are recorded only where the corner was fitted.
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

const season = (key, box, selected = false) =>
  el(`05.filters.season.${key}`, 'ui:Chip', box, {
    tokens: selected
      ? { bg: 'action.primary', radius: 'pill' }
      : { border: 'border.subtle', radius: 'pill' },
    binding: `static:atlas.season.${key}`,
    action: `select:filter.season.${key}`,
    copy: { shape: 'label', script: key === 'all' ? 'latin' : 'mixed' },
    ...(key === 'spring' ? { raw: { cornerPx: 20.5 } } : {}),
  });
const family = (key, box) =>
  el(`05.filters.family.${key}`, 'ui:Chip', box, {
    tokens: { border: 'border.subtle', radius: 'pill' },
    binding: `corpus:family.${key}`,
    action: `select:filter.family.${key}`,
    copy: { shape: 'label', script: 'mixed' },
    ...(key === 'ao' ? { raw: { cornerPx: 18 } } : {}),
  });
// [card, swatch, kanji, hex, romaji, oklch|null, era]
const cards = [
  [
    B(35, 503, 339, 391),
    B(45, 514, 319, 206),
    B(56, 740, 68, 34),
    B(274, 742, 79, 16),
    B(55, 788, 122, 21),
    B(55, 825, 240, 15),
    B(55, 854, 82, 15),
  ],
  [
    B(394, 503, 339, 391),
    B(404, 514, 319, 206),
    B(416, 740, 67, 34),
    B(633, 743, 79, 14),
    B(415, 787, 73, 27),
    B(415, 825, 221, 15),
    B(415, 854, 55, 19),
  ],
  [
    B(35, 914, 339, 368),
    B(45, 925, 319, 212),
    B(55, 1158, 68, 34),
    B(273, 1160, 80, 16),
    B(55, 1205, 91, 21),
    B(55, 1242, 212, 16),
    B(55, 1272, 49, 8),
  ],
  [
    B(394, 914, 339, 368),
    B(404, 924, 319, 213),
    B(415, 1158, 102, 34),
    B(632, 1160, 80, 16),
    B(415, 1205, 139, 21),
    null,
    B(416, 1242, 65, 16),
  ],
];
const part = (n, key, box, extra) =>
  el(`05.card-${n}.${key}`, 'ui:Text', box, { parent: `05.card-${n}`, ...extra });
const cardParts = cards.map(([card, swatch, kanji, hex, romaji, oklch, era], i) => {
  const n = i + 1;
  return {
    card: el(`05.card-${n}`, 'ui:Card', card, {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      action: 'navigate:/atlas/[slug]',
      ...(n === 1 ? { measured: { bg: '#1C1F26' }, raw: { cornerPx: 13.25 } } : {}),
    }),
    swatch: el(`05.card-${n}.swatch`, 'ui:Swatch', swatch, {
      parent: `05.card-${n}`,
      tokens: { keyline: 'keyline', radius: 'sm' },
      binding: 'corpus:entry.hex',
      ...(n === 1 ? { raw: { cornerPx: 9 } } : {}),
    }),
    kanji: part(n, 'kanji', kanji, {
      tokens: { fg: 'text.primary' },
      type: text('gothic', 'body'),
      binding: 'corpus:entry.name.ja',
      copy: { shape: 'heading', script: 'japanese' },
      raw: { emDp: 18.9 },
    }),
    hex: part(n, 'hex', hex, {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'caption', 400, { tabular: true }),
      binding: 'corpus:entry.hex',
      copy: { shape: 'value', script: 'figures' },
      raw: { emDp: 11 },
    }),
    romaji: part(n, 'romaji', romaji, {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      binding: 'corpus:entry.name.romaji',
      copy: { shape: 'label', script: 'latin' },
    }),
    oklch: oklch
      ? part(n, 'oklch', oklch, {
          tokens: { fg: 'text.secondary' },
          type: text('sans', 'caption', 400, { tabular: true }),
          binding: 'engine:oklch',
          copy: { shape: 'value', script: 'figures' },
          raw: { emDp: 10.3 },
        })
      : null,
    era: part(n, 'era', era, {
      tokens: { fg: 'text.tertiary' },
      type: text('sans', 'caption'),
      // era is empty for all 120 entries (§8); what this line shows is OQ-17's to answer
      binding: 'oq:OQ-17',
      copy: { shape: 'caption', script: 'latin' },
      raw: { emDp: 10.3 },
    }),
  };
});
const [c1, c2, c3, c4] = cardParts;

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '05.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    // ---- header
    el('05.title', 'ui:Text', B(35, 27, 392, 48), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
      binding: 'static:atlas.title',
      copy: { shape: 'heading', script: 'mixed' },
      raw: { emDp: 26 },
    }),
    el('05.more', 'ui:Button', B(704, 45, 24, 6), { icon: 'more', action: 'open:atlas.menu' }),
    el('05.count', 'ui:Chip', B(35, 77, 211, 42), {
      tokens: { bg: 'level2' },
      icon: 'list',
      binding: 'corpus:entries.count',
      copy: { shape: 'badge', script: 'latin' },
    }),
    el('05.compare', 'ui:Button', B(412, 79, 112, 40), {
      tokens: { border: 'border.subtle' },
      binding: 'static:atlas.compare',
      action: 'navigate:/atlas/compare',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('05.finder', 'ui:Button', B(534, 82, 88, 37), {
      tokens: { border: 'border.subtle' },
      binding: 'static:atlas.finder',
      action: 'navigate:/atlas/finder',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('05.palettes', 'ui:Button', B(628, 82, 105, 37), {
      tokens: { border: 'border.subtle' },
      binding: 'static:atlas.palettes',
      action: 'navigate:/atlas/palettes',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('05.header-rule', null, B(0, 139, 768, 1), { tokens: { fg: 'border.subtle' } }),
    // ---- search and filters
    el('05.search', 'ui:SearchField', B(35, 203, 698, 53), {
      tokens: { border: 'border.subtle', radius: 'md' },
      icon: 'search',
      binding: 'static:atlas.searchPlaceholder',
      action: 'adjust:filter.query',
      copy: { shape: 'placeholder', script: 'latin' },
      raw: { cornerPx: 21 },
    }),
    season('all', B(34, 275, 68, 44), true),
    season('spring', B(111, 276, 124, 42)),
    season('summer', B(245, 276, 140, 42)),
    season('autumn', B(395, 276, 136, 42)),
    season('winter', B(541, 276, 125, 42)),
    el('05.filters.family-label', 'ui:Text', B(36, 342, 130, 22), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'caption', 500),
      binding: 'static:atlas.family',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 11.8 },
    }),
    // the family row scrolls: its last chip is cut by the screen edge as drawn
    family('ao', B(35, 375, 96, 40)),
    family('aka', B(141, 375, 105, 40)),
    family('midori', B(256, 375, 127, 40)),
    family('murasaki', B(393, 375, 152, 40)),
    family('cha', B(554, 375, 107, 40)),
    family('kuro', B(671, 375, 97, 40)),
    el('05.filters-rule', null, B(35, 435, 698, 2), { tokens: { fg: 'border.subtle' } }),
    el('05.heading', 'ui:Text', B(35, 462, 65, 23), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      binding: 'static:atlas.heading',
      copy: { shape: 'heading', script: 'latin' },
    }),
    // ---- the grid, first row
    c1.card,
    c2.card,
    c1.swatch,
    c2.swatch,
    c1.kanji,
    c1.hex,
    c2.kanji,
    c2.hex,
    c1.romaji,
    c2.romaji,
    c1.oklch,
    c2.oklch,
    c1.era,
    c2.era,
    // ---- second row (runs on under the tab bar; card 4 draws no OKLCh line — questions.md 8)
    c3.card,
    c4.card,
    c3.swatch,
    c4.swatch,
    c3.kanji,
    c3.hex,
    c4.kanji,
    c4.hex,
    c3.romaji,
    c4.romaji,
    c3.oklch,
    c4.era,
    // ---- 05's own tab bar — four items; C1 puts 01's five in its place. Its top (1276) chains with
    // card 3's cut-off era line (1272), so the two read as one row, the tab bar first.
    el('05.tabs', 'app:TabBar', B(0, 1276, 768, 100), {
      tokens: { bg: 'ground', border: 'border.subtle' },
      measured: { bg: '#1D2027' },
    }),
    c3.era,
    el('05.tabs.indicator', null, B(2, 1285, 190, 3), {
      parent: '05.tabs',
      tokens: { fg: 'text.primary' },
    }),
    el('05.tabs.atlas.icon', 'ui:NavIcon', B(82, 1304, 31, 28), {
      parent: '05.tabs',
      icon: 'atlas',
      action: 'navigate:/atlas',
    }),
    el('05.tabs.compass.icon', 'ui:NavIcon', B(273, 1303, 30, 30), {
      parent: '05.tabs',
      icon: 'compass',
    }),
    el('05.tabs.search.icon', 'ui:NavIcon', B(466, 1305, 27, 27), {
      parent: '05.tabs',
      icon: 'search',
    }),
    el('05.tabs.profile.icon', 'ui:NavIcon', B(658, 1305, 25, 27), {
      parent: '05.tabs',
      icon: 'profile',
      action: 'navigate:/profile',
    }),
    el('05.tabs.atlas.label', 'ui:Text', B(76, 1341, 42, 14), {
      parent: '05.tabs',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'caption', 500),
      binding: 'static:tabs.atlas',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 9.6 },
    }),
  ],
  notDesign: [
    {
      what: 'leaked-label',
      note: 'a prompt label printed as a section title',
      box: B(36, 165, 360, 20),
    },
  ],
  departures: [
    {
      rule: 'E1',
      element: '05.title',
      why: '日本の伝統色 — “traditional colour” — presents an inspired palette as historical (FR-23, §4 E1 names 05); the heading keeps its place and length and states the real classification',
    },
    {
      rule: 'E1',
      element: '05.card-1.oklch',
      why: '#5B6B78 is printed as OKLCh 0.49 / 0.035 / 240°; it is 0.519 / 0.028 / 242.7° (§4 E1) — the line shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '05.card-2.oklch',
      why: '#7BA23F is printed as OKLCh 0.63 / 0.12 / 132°; it is 0.662 / 0.135 / 127.8° (§4 E1) — the line shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '05.card-3.oklch',
      why: '#F4A7B9 is printed as OKLCh 0.74 / 0.08 / 15°; it is 0.808 / 0.093 / 4.1° (§4 E1) — the line shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '05.card-4.swatch',
      why: '05 renders #EB6EA5, a light pink, as deep crimson (§4 E1); the swatch renders the entry’s own hex',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: ['05.card-1.swatch', '05.card-2.swatch', '05.card-3.swatch', '05.card-4.swatch'],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: [
        '05.card-1.kanji',
        '05.card-2.kanji',
        '05.card-3.kanji',
        '05.card-4.kanji',
        '05.card-1.romaji',
        '05.card-2.romaji',
        '05.card-3.romaji',
        '05.card-4.romaji',
      ],
      resolution: 'text sits beside the sample as 05 draws it',
      flippedByUser: false,
    },
    {
      id: 'C6',
      elements: ['05.card-1.kanji', '05.card-2.kanji', '05.card-3.kanji', '05.card-4.kanji'],
      resolution: 'each surface follows its own mockup — kanji are sans here',
      flippedByUser: false,
    },
    {
      id: 'C1',
      elements: [
        '05.tabs',
        '05.tabs.indicator',
        '05.tabs.atlas.icon',
        '05.tabs.compass.icon',
        '05.tabs.search.icon',
        '05.tabs.profile.icon',
        '05.tabs.atlas.label',
      ],
      resolution: "P5 → 01: 05's four-item tab bar is replaced by 01's five, icon and label",
      flippedByUser: false,
    },
    {
      id: 'C13',
      elements: [
        '05.filters.family.ao',
        '05.filters.family.aka',
        '05.filters.family.midori',
        '05.filters.family.murasaki',
        '05.filters.family.cha',
        '05.filters.family.kuro',
      ],
      resolution:
        "F-224 groups the corpus's 25 families under these seven, as content with provenance",
      flippedByUser: false,
    },
  ],
};
