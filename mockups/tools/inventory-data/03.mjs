// Mockup 03 — the Lens analysis sheet. Full-bleed, 768 px → 2 px = 1 dp (§2). The captured photograph
// fills the top and fades into the ground by y ≈ 425; the sheet is the ground inside an outline; the
// sample card is level 1 (#20232A, read exactly). Boxes are pixel readings (measure.ps1, corner.ps1);
// the list's detail lines are split at their bullets, each bullet belonging to the segment after it.
// Type size by the rule in 02.mjs (em from the line box by glyph class; `caption` below 12 dp).
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
const sheet = '03.sheet';
const pair = (key, labelBox, valueBox, binding) => [
  el(`03.sample.${key}.label`, 'ui:Text', labelBox, {
    parent: '03.sample',
    tokens: { fg: 'text.secondary' },
    type: text('sans', 'caption'),
    binding: `static:lens.notation.${key}`,
    copy: { shape: 'label', script: 'latin' },
    raw: { emDp: 11.6 },
  }),
  el(`03.sample.${key}.value`, 'ui:Text', valueBox, {
    parent: '03.sample',
    tokens: { fg: 'text.primary' },
    type: text('sans', 'label', 400, { tabular: true }),
    binding,
    copy: { shape: 'value', script: 'figures' },
  }),
];
// [swatch, name, rank, delta, match, link?] per ranked row
const rows = [
  [
    B(120, 820, 67, 68),
    B(199, 823, 320, 32),
    B(96, 845, 7, 18),
    B(199, 862, 93, 24),
    B(300, 862, 122, 24),
    B(431, 862, 183, 24),
  ],
  [
    B(120, 911, 67, 68),
    B(199, 914, 381, 31),
    B(95, 936, 14, 19),
    B(199, 954, 101, 18),
    B(309, 954, 123, 18),
    null,
  ],
  [
    B(120, 1002, 67, 68),
    B(198, 1005, 396, 32),
    B(95, 1027, 13, 18),
    B(199, 1046, 97, 18),
    B(304, 1046, 123, 18),
    null,
  ],
];
const row = ([swatch, name, rank, delta, match, link], i) => {
  const n = i + 1;
  const p = `03.matches.row-${n}`;
  return {
    top: [
      el(`${p}.swatch`, 'ui:Swatch', swatch, {
        parent: sheet,
        tokens: { keyline: 'keyline', radius: 'sm' },
        binding: `corpus:nearest.${i}.hex`,
        raw: { cornerPx: 11.25 },
      }),
      el(`${p}.name`, 'ui:Text', name, {
        parent: sheet,
        tokens: { fg: 'text.primary' },
        type: text('gothic', 'body'),
        binding: `corpus:nearest.${i}.name`,
        copy: { shape: 'label', script: 'mixed' },
        raw: { emDp: 17.8 },
      }),
    ],
    rank: el(`${p}.rank`, 'ui:Text', rank, {
      parent: sheet,
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'label', 400, { tabular: true }),
      binding: `engine:nearest.${i}.rank`,
      copy: { shape: 'value', script: 'figures' },
    }),
    detail: [
      el(`${p}.delta`, 'ui:Text', delta, {
        parent: sheet,
        tokens: { fg: 'text.secondary' },
        type: text('sans', 'label', 400, { tabular: true }),
        binding: `engine:nearest.${i}.deltaE00`,
        copy: { shape: 'value', script: 'figures' },
      }),
      el(`${p}.match`, 'ui:Text', match, {
        parent: sheet,
        tokens: { fg: 'text.secondary' },
        type: text('sans', 'label', 400, { tabular: true }),
        binding: 'oq:OQ-9',
        copy: { shape: 'value', script: 'mixed' },
      }),
      ...(link
        ? [
            el(`${p}.open`, 'ui:Text', link, {
              parent: sheet,
              tokens: { fg: 'text.secondary' },
              type: text('sans', 'label'),
              binding: 'static:lens.openInAtlas',
              action: 'navigate:/atlas/[slug]',
              copy: { shape: 'label', script: 'latin' },
            }),
          ]
        : []),
    ],
  };
};
const ranked = rows.map(row);

// 03 is variantFor /lens (mockups/index.json): it governs the analysis STATE of the Lens (P2), and 02
// governs the rest.
export default {
  kind: 'screen',
  governs: 'state',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '03.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    el('03.capture', 'app:CaptureImage', B(0, 0, 768, 425), { binding: 'engine:capture.frame' }),
    el(sheet, 'ui:Sheet', B(57, 360, 654, 957), {
      tokens: { bg: 'ground', border: 'border.subtle', radius: 'lg' },
    }),
    el('03.sheet.handle', null, B(344, 370, 80, 8), {
      parent: sheet,
      tokens: { fg: 'border.strong', radius: 'pill' },
    }),
    // ---- the chip row scrolls: the third chip is cut by the sheet's edge as drawn
    el('03.chips.conditions', 'ui:Chip', B(76, 393, 290, 33), {
      parent: sheet,
      tokens: { border: 'border.subtle', radius: 'pill' },
      icon: 'sun',
      binding: 'engine:captureConditions',
      copy: { shape: 'badge', script: 'mixed' },
      raw: { cornerPx: 19.25 },
    }),
    el('03.chips.gamut', 'ui:Chip', B(376, 393, 121, 33), {
      parent: sheet,
      tokens: { border: 'border.subtle', radius: 'pill' },
      icon: 'colour-wheel',
      binding: 'engine:gamut',
      copy: { shape: 'badge', script: 'latin' },
    }),
    el('03.chips.provenance', 'ui:Chip', B(506, 393, 202, 33), {
      parent: sheet,
      tokens: { border: 'border.subtle', radius: 'pill' },
      binding: 'engine:reading.provenance',
      copy: { shape: 'badge', script: 'latin' },
    }),
    // ---- the sampled card
    el('03.sample', 'ui:Card', B(75, 445, 618, 296), {
      parent: sheet,
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#20232A' },
      raw: { cornerPx: 22.75 },
    }),
    el('03.sample.title', 'ui:Text', B(97, 469, 245, 24), {
      parent: '03.sample',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      binding: 'static:lens.sampledCard',
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 12.9 },
    }),
    el('03.sample.swatch', 'ui:Swatch', B(118, 509, 210, 209), {
      parent: '03.sample',
      tokens: { keyline: 'keyline', radius: 'md' },
      binding: 'engine:reading.hex',
      raw: { cornerPx: 19.5 },
    }),
    ...pair('hex', B(361, 565, 36, 17), B(450, 564, 88, 19), 'engine:reading.hex'),
    ...pair('oklch', B(360, 599, 67, 17), B(451, 598, 190, 19), 'engine:oklch'),
    ...pair('cielab', B(360, 633, 72, 17), B(451, 632, 171, 19), 'engine:cielab'),
    el('03.sample.art', 'ui:Illustration', B(599, 661, 89, 73), {
      parent: '03.sample',
      illustration: 'kimono',
    }),
    // ---- the three nearest references
    el('03.matches.heading', 'ui:Text', B(97, 776, 559, 25), {
      parent: sheet,
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      binding: 'static:lens.nearestHeading',
      copy: { shape: 'heading', script: 'mixed' },
      raw: { emDp: 12.5 },
    }),
    ...ranked.flatMap((r) => [...r.top, r.rank, ...r.detail]),
    // ---- actions
    el('03.actions.wear', 'ui:Button', B(94, 1149, 298, 64), {
      parent: sheet,
      tokens: { bg: 'action.primary', radius: 'pill' },
      action: 'navigate:/atlas/with/reading/[id]',
    }),
    el('03.actions.add', 'ui:Button', B(402, 1150, 272, 63), {
      parent: sheet,
      tokens: { border: 'border.strong', radius: 'pill' },
      action: 'navigate:/wardrobe/add',
    }),
    el('03.actions.wear.label', 'ui:Text', B(125, 1172, 209, 21), {
      parent: '03.actions.wear',
      tokens: { fg: 'ground' },
      type: text('sans', 'caption', 500),
      binding: 'static:lens.wearIt',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 11.3 },
    }),
    el('03.actions.wear.icon', null, B(343, 1174, 17, 15), {
      parent: '03.actions.wear',
      icon: 'arrow-right',
    }),
    el('03.actions.add.icon', null, B(438, 1173, 16, 17), {
      parent: '03.actions.add',
      icon: 'plus',
    }),
    el('03.actions.add.label', 'ui:Text', B(464, 1172, 175, 19), {
      parent: '03.actions.add',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      binding: 'static:lens.addToWardrobe',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('03.actions.hold', 'ui:Button', B(95, 1224, 578, 61), {
      parent: sheet,
      tokens: { bg: 'level2', radius: 'pill' },
      measured: { bg: '#282A2F' },
      action: 'navigate:/lens/against',
    }),
    el('03.actions.hold.label', 'ui:Text', B(227, 1245, 314, 23), {
      parent: '03.actions.hold',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      binding: 'static:lens.holdAsTarget',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 12.4 },
    }),
  ],
  notDesign: [
    {
      what: 'leaked-label',
      note: 'a component name and level printed after the card title',
      box: B(352, 469, 244, 23),
    },
    {
      what: 'leaked-label',
      note: 'a component name printed as a section title',
      box: B(98, 1110, 195, 20),
    },
  ],
  departures: [
    {
      rule: 'E1',
      element: '03.sample.oklch.value',
      why: '#2E4756 is printed as OKLCh 0.44 / 0.042 / 228°; it is 0.384 / 0.040 / 235.6° (§4 E1) — the cell shows the reading’s conversion',
    },
    {
      rule: 'E1',
      element: '03.sample.cielab.value',
      why: '#2E4756 is printed as CIELAB 46.1 / -4.8 / -12.3; it is 28.80 / -5.00 / -11.93 (§4 E1) — the cell shows the reading’s conversion',
    },
    ...[1, 2, 3].map((n) => ({
      rule: 'E2',
      element: `03.matches.row-${n}.match`,
      why: 'no such figure exists: naming returns the closest references ranked by ΔE00, never a match (FR-7) — held by OQ-9',
    })),
    {
      rule: 'E2',
      element: '03.matches.heading',
      why: 'the heading names the nearest references as matches; FR-7 returns references ranked by ΔE00, and the heading says so (a §4 E2 row F-220 adds)',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '03.sample.swatch',
        '03.matches.row-1.swatch',
        '03.matches.row-2.swatch',
        '03.matches.row-3.swatch',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
  ],
};
