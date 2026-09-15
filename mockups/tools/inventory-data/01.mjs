// Mockup 01 — Home. Full-bleed, 768 px wide → 2 px = 1 dp (§2). Every box is a pixel reading
// (measure.ps1 blobs/edges; corners by corner.ps1). Type size: the em is estimated from the line box
// by glyph class — Latin with descenders or brackets ≈ box/0.93–1.05, caps/ascenders/digits only ≈
// box/0.73, Japanese ≈ box/0.9 — then snapped to §5's steps (display1 72 · title 22 · body 16 ·
// label 14); `caption` marks an em below 12 dp, where §5 names no step (raw.emDp keeps the estimate).
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
const tab = (key, route, icon, iconBox, labelBox) => [
  el(`01.tabs.${key}.icon`, 'ui:NavIcon', iconBox, {
    parent: '01.tabs',
    icon,
    action: `navigate:${route}`,
  }),
  el(`01.tabs.${key}.label`, 'ui:Text', labelBox, {
    parent: '01.tabs',
    tokens: { fg: key === 'home' ? 'text.primary' : 'text.secondary' },
    type: text('sans', 'caption', 500),
    binding: `static:tabs.${key}`,
    copy: { shape: 'label', script: 'latin' },
    raw: { emDp: 10 },
  }),
];
const tiles = [
  [99, 956, 104, 105, [165, 1019, 28, 31]],
  [215, 956, 105, 105, [282, 1022, 28, 28]],
  [332, 956, 104, 105, [398, 1024, 27, 25]],
  [449, 956, 103, 105, [515, 1022, 28, 29]],
  [565, 956, 104, 105, [629, 1018, 30, 32]],
];

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '01.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    // ---- header
    el('01.header.line-art', 'ui:Illustration', B(471, 15, 297, 261), {
      illustration: 'plum-branch',
    }),
    el('01.header.mark', 'ui:Mark', B(73, 80, 78, 77), { tokens: { fg: 'text.primary' } }),
    el('01.header.wordmark', 'ui:Wordmark', B(170, 93, 212, 51), {
      tokens: { fg: 'text.primary' },
      raw: { emDp: 34 },
    }),
    el('01.header.tagline', 'ui:Text', B(73, 200, 269, 112), {
      tokens: { fg: 'text.primary' },
      type: text('serif', 'body'),
      binding: 'static:home.tagline',
      copy: { shape: 'heading', script: 'latin', lines: 3 },
      raw: { emDp: 18.5 },
    }),
    el('01.header.chip', 'ui:Chip', B(378, 280, 320, 40), {
      tokens: { border: 'border.subtle', radius: 'pill' },
      binding: 'static:home.onDevice',
      copy: { shape: 'badge', script: 'latin' },
    }),
    // ---- the hero card: a corpus colour, its names and its coordinates on the sample, and the question
    el('01.hero', 'ui:Card', B(73, 353, 621, 497), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1C1C22' },
      raw: { cornerPx: 17 },
    }),
    el('01.hero.sample', 'ui:Swatch', B(99, 378, 570, 344), {
      parent: '01.hero',
      tokens: { keyline: 'keyline', radius: 'sm' },
      binding: 'corpus:entry.hex',
      raw: { cornerPx: 13.5 },
    }),
    el('01.hero.sample.kanji', 'ui:Text', B(127, 536, 90, 44), {
      parent: '01.hero.sample',
      type: text('gothic', 'title'),
      binding: 'corpus:entry.name.ja',
      copy: { shape: 'heading', script: 'japanese' },
      raw: { emDp: 24.4 },
    }),
    el('01.hero.sample.kana', 'ui:Text', B(128, 592, 139, 26), {
      parent: '01.hero.sample',
      type: text('gothic', 'label'),
      binding: 'corpus:entry.name.kana',
      copy: { shape: 'label', script: 'japanese' },
    }),
    el('01.hero.sample.name', 'ui:Text', B(127, 634, 331, 31), {
      parent: '01.hero.sample',
      type: text('sans', 'label', 500),
      binding: 'corpus:entry.name.en',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('01.hero.sample.oklch', 'ui:Text', B(127, 674, 305, 19), {
      parent: '01.hero.sample',
      type: text('sans', 'label', 400, { tabular: true }),
      binding: 'engine:oklch',
      copy: { shape: 'value', script: 'figures' },
    }),
    el('01.hero.cta', 'ui:Button', B(98, 745, 572, 71), {
      parent: '01.hero',
      tokens: { bg: 'action.primary', radius: 'pill' },
      type: text('sans', 'body', 500),
      icon: 'arrow-right',
      binding: 'static:home.whatGoesWithThis',
      action: 'navigate:/atlas/with/[slug]',
      copy: { shape: 'label', script: 'latin' },
      raw: { cornerPx: 33.5 },
    }),
    // ---- line-art at the left edge, inside the screen (§2: design)
    el('01.side-art', 'ui:Illustration', B(0, 842, 72, 378), { illustration: 'plum-branch' }),
    // the header's branch continues down the right edge, beside the hero card
    el('01.side-art-right', 'ui:Illustration', B(696, 280, 72, 208), {
      illustration: 'plum-branch',
    }),
    // ---- wardrobe preview
    el('01.wardrobe', 'ui:Card', B(73, 865, 621, 229), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
    }),
    el('01.wardrobe.title', 'ui:Text', B(99, 901, 251, 24), {
      parent: '01.wardrobe',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      binding: 'static:home.wardrobePreview',
      raw: { emDp: 15.8 },
      copy: { shape: 'heading', script: 'latin' },
    }),
    el('01.wardrobe.count', 'ui:Chip', B(382, 894, 287, 36), {
      parent: '01.wardrobe',
      tokens: { border: 'border.subtle', radius: 'pill' },
      binding: 'engine:coverage',
      copy: { shape: 'badge', script: 'mixed' },
    }),
    ...tiles.map(([x, y, w, h], i) =>
      el(`01.wardrobe.tile-${i + 1}`, 'ui:Swatch', B(x, y, w, h), {
        parent: '01.wardrobe',
        tokens: { keyline: 'keyline', radius: 'sm' },
        binding: `store:garments.${i}.colour`,
        action: 'navigate:/wardrobe/[id]',
        raw: { cornerPx: 14 },
      }),
    ),
    // The badge's meaning is drawn and defined nowhere — OQ-11 asks a person, so it binds to the question.
    ...tiles.map(([, , , , b], i) =>
      el(`01.wardrobe.tile-${i + 1}.badge`, 'new:TextureBadge', B(...b), {
        parent: `01.wardrobe.tile-${i + 1}`,
        binding: 'oq:OQ-11',
      }),
    ),
    // ---- today's colour card — it runs on under the tab bar (the page scrolls)
    el('01.colour-card', 'ui:Card', B(74, 1105, 620, 117), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
    }),
    el('01.colour-card.title', 'ui:Text', B(100, 1146, 409, 29), {
      parent: '01.colour-card',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      binding: 'static:home.colourCard',
      copy: { shape: 'heading', script: 'latin' },
    }),
    el('01.colour-card.sample', 'ui:Swatch', B(565, 1140, 104, 80), {
      parent: '01.colour-card',
      tokens: { keyline: 'keyline', radius: 'sm' },
      binding: 'corpus:entry.hex',
      raw: { cornerPx: 11.5 },
    }),
    el('01.colour-card.note', 'ui:Text', B(101, 1188, 354, 34), {
      parent: '01.colour-card',
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'label'),
      binding: 'corpus:entry.provenance.note',
      // two lines: the second is cut by the tab bar two rows below its top (rows 1220–1221)
      copy: { shape: 'body', script: 'latin', lines: 2 },
      raw: { emDp: 12.3 },
    }),
    // ---- the tab bar (C1: 01 governs every tab bar)
    el('01.tabs', 'app:TabBar', B(0, 1222, 768, 154), {
      tokens: { bg: 'ground', border: 'border.subtle' },
    }),
    el('01.tabs.indicator', null, B(89, 1224, 95, 5), {
      parent: '01.tabs',
      tokens: { fg: 'text.primary' },
    }),
    ...[
      tab('home', '/', 'home', B(120, 1243, 33, 35), B(111, 1290, 51, 15)),
      tab('atlas', '/atlas', 'atlas', B(243, 1242, 35, 36), B(239, 1290, 42, 14)),
      tab('lens', '/lens', 'lens', B(366, 1243, 36, 33), B(328, 1290, 112, 15)),
      tab('wardrobe', '/wardrobe', 'wardrobe', B(488, 1244, 39, 34), B(465, 1290, 85, 14)),
      tab('profile', '/profile', 'profile', B(616, 1243, 31, 35), B(605, 1289, 54, 15)),
    ].map(([icon]) => icon),
    ...[
      tab('home', '/', 'home', B(120, 1243, 33, 35), B(111, 1290, 51, 15)),
      tab('atlas', '/atlas', 'atlas', B(243, 1242, 35, 36), B(239, 1290, 42, 14)),
      tab('lens', '/lens', 'lens', B(366, 1243, 36, 33), B(328, 1290, 112, 15)),
      tab('wardrobe', '/wardrobe', 'wardrobe', B(488, 1244, 39, 34), B(465, 1290, 85, 14)),
      tab('profile', '/profile', 'profile', B(616, 1243, 31, 35), B(605, 1289, 54, 15)),
    ].map(([, label]) => label),
  ],
  notDesign: [],
  departures: [
    {
      rule: 'E1',
      element: '01.hero.sample.oklch',
      why: 'Ai-nezumi (#5B6B78) is printed as OKLCh 0.49 / 0.035 / 240°; it is 0.519 / 0.028 / 242.7° (§4 E1) — the line shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '01.colour-card.title',
      why: '“Traditional” presents an inspired palette as historical (FR-23, §4 E1 names 01); the heading keeps its place and length and states the real classification',
    },
    {
      rule: 'E1',
      element: '01.colour-card.note',
      why: 'a Heian source is provenance no entry holds — none of the 120 claims an era (§4 E1, ADR-0065); the note is the entry’s own',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '01.hero.sample',
        '01.wardrobe.tile-1',
        '01.wardrobe.tile-2',
        '01.wardrobe.tile-3',
        '01.wardrobe.tile-4',
        '01.wardrobe.tile-5',
        '01.colour-card.sample',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C6',
      elements: ['01.hero.sample.kanji'],
      resolution:
        'each surface follows its own mockup — kanji are sans here; the card (20) is the one that needs a Japanese serif',
      flippedByUser: false,
    },
    {
      id: 'C1',
      elements: ['01.tabs', '01.tabs.lens.label'],
      resolution:
        "P5 → 01: Home · Atlas · Lens · Wardrobe · Profile, icon and label; the Lens label reads Lens, not 01's Lens Camera",
      flippedByUser: false,
    },
    {
      id: 'C2',
      elements: [
        '01.header.mark',
        '01.header.wordmark',
        '01.hero',
        '01.hero.cta',
        '01.wardrobe',
        '01.tabs',
      ],
      resolution:
        "P1 + P2: 01's layout governs Home in both themes; 25 governs only the light palette",
      flippedByUser: false,
    },
    {
      id: 'C4',
      elements: ['01.header.mark', '01.header.wordmark'],
      resolution:
        'the in-app lockup is 01’s: the mark (geometry from 14) and the wordmark, monochrome',
      flippedByUser: false,
    },
    {
      id: 'C7',
      elements: ['01.hero.sample'],
      resolution: "P1: the hero sample is 01's rounded square, not 25's circle",
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: [
        '01.hero.sample.kanji',
        '01.hero.sample.kana',
        '01.hero.sample.name',
        '01.hero.sample.oklch',
      ],
      resolution:
        'text sits on the sample as 01 draws it, and takes per sample whichever of the two text colours passes 4.5:1 (E3)',
      flippedByUser: false,
    },
  ],
};
