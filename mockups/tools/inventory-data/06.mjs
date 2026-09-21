// Mockup 06 — colour detail. A SPEC CARD with callouts on the right and above. It draws two widths
// (questions.md 9): the upper panel (x 50–528, top 97) holds the navigation, so the screen is its inner
// width — 474 px → 384 / 474 dp per px — and the provenance card, the combinations card and the action
// bar, drawn wider, are recorded as drawn and declared as overhangs waiting on OQ-19. The readout table is
// recorded as measured geometry — row bands and the column rule at x 160 — not as text boxes.
// Type size by the rule in 02.mjs, at this screen's scale.
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

const rows = [
  ['hex', 747, 'engine:reading.hex'],
  ['oklch', 775, 'engine:oklch'],
  ['cielab', 802, 'engine:cielab'],
  ['srgb', 830, 'engine:srgb'],
];
const tableRows = rows.flatMap(([key, y, binding]) => [
  el(`06.readout.table.${key}`, 'app:ReadoutRow', B(74, y, 430, 26), {
    parent: '06.readout.table',
    tokens: { border: 'border.subtle' },
  }),
  el(`06.readout.table.${key}.label`, 'ui:Text', B(74, y, 86, 26), {
    parent: `06.readout.table.${key}`,
    tokens: { fg: 'text.secondary' },
    type: text('sans', 'label', 500),
    binding: `static:notation.${key}`,
    copy: { shape: 'label', script: 'latin' },
  }),
  el(`06.readout.table.${key}.value`, 'ui:Text', B(161, y, 343, 26), {
    parent: `06.readout.table.${key}`,
    tokens: { fg: 'text.primary' },
    type: text('sans', 'label', 400, { tabular: true }),
    binding,
    copy: { shape: 'value', script: 'figures' },
  }),
]);
const garment = (n, photo, badge, caption) => [
  el(`06.combinations.item-${n}.photo`, 'app:GarmentPhoto', photo, {
    parent: '06.combinations',
    tokens: { radius: 'pill' },
    binding: `engine:combinations.${n - 1}`,
    action: 'navigate:/wardrobe/[id]',
  }),
  el(`06.combinations.item-${n}.rank`, 'ui:Chip', badge, {
    parent: '06.combinations',
    tokens: { bg: 'level2', radius: 'pill' },
    binding: `engine:combinations.${n - 1}.rank`,
    copy: { shape: 'badge', script: 'figures' },
  }),
];
const caption = (n, box) =>
  el(`06.combinations.item-${n}.caption`, 'ui:Text', box, {
    parent: '06.combinations',
    tokens: { fg: 'text.secondary' },
    type: text('sans', 'label'),
    binding: `store:garments.${n - 1}.name`,
    copy: { shape: 'caption', script: 'mixed', lines: 2 },
  });
const [g1, g2, g3] = [
  garment(1, B(73, 1102, 83, 83), B(73, 1102, 27, 28)),
  garment(2, B(175, 1102, 83, 83), B(175, 1102, 27, 28)),
  garment(3, B(275, 1102, 84, 83), B(276, 1102, 26, 28)),
];

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'spec-card',
    screens: [{ id: '06.screen', box: B(53, 99, 474, 1201), dpPerPx: 0.8101 }],
  },
  overhangs: [
    { element: '06.provenance', question: 'OQ-19' },
    { element: '06.combinations', question: 'OQ-19' },
    { element: '06.actions', question: 'OQ-19' },
  ],
  elements: [
    // ---- header
    el('06.back.icon', null, B(72, 134, 18, 16), { icon: 'back', action: 'navigate:/atlas' }),
    el('06.back.label', 'ui:Text', B(101, 134, 47, 17), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      binding: 'static:atlas.back',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 18.9 },
    }),
    el('06.bookmark', 'ui:Button', B(405, 131, 18, 22), {
      icon: 'bookmark',
      action: 'toggle:bookmark',
    }),
    el('06.share', 'ui:Button', B(446, 131, 19, 23), { icon: 'share', action: 'share:colourCard' }),
    el('06.export', 'ui:Button', B(487, 132, 22, 21), {
      icon: 'export',
      action: 'navigate:/profile/export',
    }),
    el('06.header-rule', null, B(54, 168, 472, 2), { tokens: { fg: 'border.subtle' } }),
    // ---- the swatch, and the card stacked behind it
    el('06.swatch', 'ui:Swatch', B(73, 181, 416, 369), {
      tokens: { keyline: 'keyline' },
      binding: 'corpus:entry.hex',
      measured: { fill: '#576777' },
    }),
    el('06.swatch.stack', null, B(489, 182, 17, 368), { parent: '06.swatch' }),
    // ---- names and taxonomy
    el('06.kanji', 'ui:Text', B(84, 574, 120, 59), {
      tokens: { fg: 'text.primary' },
      type: text('gothic', 'display1'),
      binding: 'corpus:entry.name.ja',
      copy: { shape: 'heading', script: 'japanese' },
      raw: { emDp: 53 },
    }),
    el('06.kana', 'ui:Text', B(216, 583, 94, 19), {
      tokens: { fg: 'text.secondary' },
      type: text('gothic', 'body'),
      binding: 'corpus:entry.name.kana',
      copy: { shape: 'label', script: 'japanese' },
    }),
    el('06.name', 'ui:Text', B(215, 611, 210, 21), {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'body'),
      binding: 'corpus:entry.name.en',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 18.3 },
    }),
    el('06.taxonomy', 'ui:Chip', B(82, 645, 368, 27), {
      tokens: { bg: 'level2', radius: 'pill' },
      // era is empty for all 120 entries (§8) — questions.md 7
      binding: 'corpus:entry.taxonomy',
      copy: { shape: 'badge', script: 'latin' },
    }),
    // ---- the readout card
    el('06.readout', 'ui:Card', B(54, 692, 472, 180), {
      tokens: { bg: 'level1', border: 'border.subtle' },
      measured: { bg: '#1F232A' },
    }),
    el('06.readout.title', 'ui:Text', B(73, 711, 360, 22), {
      parent: '06.readout',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
      binding: 'static:detail.readout',
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 19.2 },
    }),
    el('06.readout.table', 'new:DataTable', B(73, 746, 432, 111), {
      parent: '06.readout',
      tokens: { border: 'border.subtle' },
    }),
    ...tableRows,
    // ---- provenance (drawn wider than the upper frame)
    el('06.provenance', 'ui:Card', B(51, 889, 667, 146), {
      tokens: { bg: 'level1', border: 'border.subtle' },
      measured: { bg: '#20232A' },
    }),
    el('06.provenance.art', 'ui:Illustration', B(475, 895, 231, 134), {
      parent: '06.provenance',
      illustration: 'plum-branch',
    }),
    el('06.provenance.title', 'ui:Text', B(74, 909, 305, 22), {
      parent: '06.provenance',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
      binding: 'static:detail.provenance',
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 19.2 },
    }),
    el('06.provenance.body', 'ui:Text', B(73, 940, 400, 50), {
      parent: '06.provenance',
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'label'),
      binding: 'corpus:entry.provenance.note',
      copy: { shape: 'body', script: 'latin', lines: 3 },
    }),
    el('06.provenance.review', 'ui:Text', B(74, 998, 197, 17), {
      parent: '06.provenance',
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'label'),
      icon: 'seal-check',
      binding: 'corpus:entry.review',
      copy: { shape: 'label', script: 'latin' },
    }),
    // ---- combinations (C19: it spans the row; drawn beside a garbled card)
    el('06.combinations', 'ui:Card', B(51, 1049, 329, 173), {
      tokens: { bg: 'level1', border: 'border.subtle' },
      measured: { bg: '#1F2229' },
    }),
    el('06.combinations.title', 'ui:Text', B(73, 1068, 233, 19), {
      parent: '06.combinations',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
      binding: 'static:detail.combinations',
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 21.1 },
    }),
    ...g1,
    ...g2,
    ...g3,
    caption(1, B(74, 1194, 82, 27)),
    caption(2, B(170, 1194, 93, 27)),
    caption(3, B(281, 1194, 72, 27)),
    // ---- the sticky action bar (drawn wider than the upper frame)
    el('06.actions', 'app:ActionBar', B(51, 1222, 667, 78), {
      tokens: { bg: 'level1', border: 'border.subtle' },
      measured: { bg: '#20232A' },
    }),
    el('06.actions.wear', 'ui:Button', B(68, 1245, 312, 44), {
      parent: '06.actions',
      tokens: { bg: 'action.primary' },
      icon: 'arrow-right',
      binding: 'static:detail.wearIt',
      action: 'navigate:/atlas/with/[slug]',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('06.actions.hold', 'ui:Button', B(390, 1246, 310, 42), {
      parent: '06.actions',
      tokens: { border: 'border.subtle' },
      binding: 'static:detail.holdAsTarget',
      action: 'navigate:/lens/against',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('06.actions.hold.icon', null, B(419, 1256, 21, 21), {
      parent: '06.actions.hold',
      icon: 'reticle',
    }),
  ],
  notDesign: [
    {
      what: 'bezel',
      note: 'the spec card’s frame around the upper panel',
      box: B(50, 97, 479, 776),
    },
    {
      what: 'callout',
      note: 'the three bracketed action names above the frame',
      box: B(293, 57, 250, 16),
    },
    { what: 'callout', note: 'their leader lines', box: B(290, 74, 239, 58) },
    { what: 'callout', note: 'the swatch note and its leader', box: B(505, 340, 224, 60) },
    { what: 'callout', note: 'the kanji note and its leader', box: B(458, 600, 223, 15) },
    {
      what: 'leaked-label',
      note: 'a component name, level and hex printed as a note, with its leader',
      box: B(485, 709, 230, 31),
    },
    { what: 'callout', note: 'the elevated-cards note and its leader', box: B(505, 783, 154, 13) },
    {
      what: 'callout',
      note: 'the hairline-borders note (misspelt) and its leader',
      box: B(528, 860, 190, 32),
    },
    {
      what: 'callout',
      note: 'the line-art note and its leader, below the provenance card',
      box: B(530, 1033, 187, 42),
    },
    { what: 'callout', note: 'the action-bar note below the frame', box: B(303, 1300, 162, 31) },
    {
      what: 'garbled-text',
      note: 'C19: the right-hand card holds only garbled text',
      box: B(392, 1049, 326, 173),
    },
  ],
  departures: [
    {
      rule: 'E1',
      element: '06.readout.table.oklch.value',
      why: '#5B6B78 is printed as OKLCh 0.490 / 0.035 / 240.2°; it is 0.519 / 0.028 / 242.7° (§4 E1) — the cell shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '06.readout.table.cielab.value',
      why: '06 prints CIELAB values that do not survive checking for its own hex (§4 E1); the cell shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '06.readout.table.srgb.value',
      why: '06’s "Display-P3" triplet is its sRGB values ÷ 255, not a P3 conversion (§4 E1); the cell shows the engine’s real conversion',
    },
    {
      rule: 'E1',
      element: '06.provenance.body',
      why: 'the provenance line is the corpus entry’s own note; 06’s dated manuscript is sample content no entry holds — none of the 120 claims an era',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: ['06.swatch'],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: ['06.kanji', '06.kana', '06.name'],
      resolution: 'text sits beside the sample as 06 draws it',
      flippedByUser: false,
    },
    {
      id: 'C6',
      elements: ['06.kanji'],
      resolution: 'each surface follows its own mockup — kanji are sans here',
      flippedByUser: false,
    },
    {
      id: 'C3',
      elements: ['06.readout.title', '06.provenance.title', '06.combinations.title'],
      resolution:
        "P1 + P2: 06's layout governs colour detail; 26 governs its Japanese headings and typography",
      flippedByUser: false,
    },
    {
      id: 'C19',
      elements: ['06.combinations'],
      resolution: 'the right-hand card is not design (§2); Wearable Combinations spans the row',
      flippedByUser: false,
    },
  ],
};
