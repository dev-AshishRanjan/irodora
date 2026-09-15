// Mockup 19 — What Goes With This, drawn inside a device frame. The frame's inner screen is 627 px
// wide (x 70–696, y 61–1312), so 384 / 627 = 0.6124 dp per px (§2). Boxes are pixel readings
// (measure.ps1, corner.ps1). Derived, and saying so: the header's box is the frame's inner width over
// the rows its fill spans at the centre line (the frame's corner curve cuts the blob at x 72); row 5
// runs on under the action bar, so its box stops at the bar's top rule. The two section headings and
// the rows' "Action: Wear" labels read like prompt text — OQ-26 — so they bind to the question.
// C18 is settled against FR-73's own text: questions.md 17. The generator orders elements by the
// reading rule. Type size as in 02.mjs, the em converted at 0.6124 dp per px.
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

const row = (n, r) => {
  const p = `19.rows.row-${n}`;
  return [
    el(p, 'new:HarmonyRow', r.box, {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: r.bg },
    }),
    el(`${p}.swatch`, 'ui:Swatch', r.swatch, {
      parent: p,
      tokens: { radius: 'md' },
      binding: `engine:with.${n - 1}.hex`,
      measured: { fill: r.fill },
    }),
    t(`${p}.name`, r.name, p, `corpus:with.${n - 1}.label`, {
      tokens: { fg: 'text.primary' },
      type: text('sans', r.nameSize ?? 'body', 500),
      copy: { shape: 'label', script: 'mixed' },
      ...(r.nameEm ? { raw: { emDp: r.nameEm } } : {}),
    }),
    t(`${p}.detail`, r.detail, p, `engine:with.${n - 1}.relationship`, {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'value', script: 'mixed' },
    }),
    el(`${p}.wear`, 'ui:Button', r.wear, {
      parent: p,
      tokens: { border: 'border.subtle', radius: 'sm' },
      binding: 'oq:OQ-26',
      action: 'navigate:/atlas/wear/[slug]',
      copy: { shape: 'label', script: 'latin' },
    }),
  ];
};

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'device',
    screens: [{ id: '19.screen', box: B(70, 61, 627, 1252), dpPerPx: 0.6124 }],
  },
  elements: [
    // ---- header
    el('19.header', null, B(70, 62, 627, 77), {
      tokens: { bg: 'level1' },
      measured: { bg: '#1C1F26' },
    }),
    el('19.back', 'ui:Button', B(97, 91, 96, 23), {
      icon: 'back',
      binding: 'static:with.back',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('19.header-divider', null, B(210, 84, 3, 35), { tokens: { fg: 'border.subtle' } }),
    el('19.title', 'ui:Text', B(228, 89, 340, 26), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      binding: 'static:with.title',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    el('19.filter', 'ui:Button', B(640, 88, 33, 28), {
      icon: 'filter',
      action: 'open:with.filter',
    }),
    // ---- the anchor
    el('19.anchor.heading', 'ui:Text', B(102, 162, 241, 22), {
      tokens: { fg: 'text.secondary' },
      binding: 'oq:OQ-26',
      type: text('sans', 'body', 500),
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 18.4 },
    }),
    el('19.anchor', 'ui:Card', B(89, 196, 590, 189), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1D2027' },
    }),
    el('19.anchor.ring', null, B(118, 216, 160, 148), {
      parent: '19.anchor',
      tokens: { border: 'text.primary', radius: 'md' },
    }),
    el('19.anchor.swatch', 'ui:Swatch', B(128, 223, 143, 132), {
      parent: '19.anchor.ring',
      tokens: { radius: 'md' },
      binding: 'corpus:anchor.hex',
      measured: { fill: '#576975' },
    }),
    t('19.anchor.name', B(298, 244, 329, 30), '19.anchor', 'corpus:anchor.label', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      copy: { shape: 'label', script: 'mixed' },
    }),
    t('19.anchor.oklch', B(297, 284, 288, 19), '19.anchor', 'engine:anchor.oklch', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'body', 400, { tabular: true }),
      copy: { shape: 'value', script: 'mixed' },
    }),
    t('19.anchor.garment', B(297, 316, 200, 23), '19.anchor', 'store:anchor.garment', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'body'),
      copy: { shape: 'value', script: 'latin' },
    }),
    // ---- the ranked rows (row 5 runs on under the action bar)
    el('19.rows.heading', 'ui:Text', B(103, 425, 371, 24), {
      tokens: { fg: 'text.secondary' },
      binding: 'oq:OQ-26',
      type: text('sans', 'body', 500),
      copy: { shape: 'heading', script: 'latin' },
    }),
    ...row(1, {
      box: B(89, 462, 590, 140),
      bg: '#1D2027',
      swatch: B(118, 481, 101, 102),
      fill: '#A77344',
      name: B(237, 503, 251, 26),
      detail: B(237, 542, 260, 22),
      wear: B(530, 512, 132, 42),
    }),
    ...row(2, {
      box: B(89, 617, 590, 138),
      bg: '#1E2128',
      swatch: B(119, 637, 99, 99),
      fill: '#365A6C',
      name: B(238, 657, 274, 30),
      nameEm: 19.7,
      detail: B(238, 697, 249, 21),
      wear: B(529, 665, 133, 43),
    }),
    ...row(3, {
      box: B(89, 770, 590, 137),
      bg: '#1D2127',
      swatch: B(119, 789, 99, 99),
      fill: '#585369',
      name: B(238, 810, 244, 26),
      detail: B(237, 849, 241, 21),
      wear: B(530, 817, 132, 43),
    }),
    ...row(4, {
      box: B(89, 922, 590, 137),
      bg: '#1D2128',
      swatch: B(118, 940, 101, 101),
      fill: '#A38745',
      name: B(238, 962, 225, 26),
      detail: B(237, 1000, 289, 20),
      wear: B(530, 969, 132, 42),
    }),
    ...row(5, {
      box: B(89, 1073, 590, 135),
      bg: '#1B1E24',
      swatch: B(118, 1091, 101, 100),
      fill: '#A15B42',
      name: B(238, 1113, 191, 26),
      detail: B(238, 1151, 291, 21),
      wear: B(530, 1120, 132, 43),
    }),
    // ---- the action
    el('19.bar', 'app:ActionBar', B(72, 1208, 624, 104), { tokens: { border: 'border.subtle' } }),
    el('19.bar.build', 'ui:Button', B(88, 1230, 592, 67), {
      parent: '19.bar',
      tokens: { bg: 'level3', radius: 'md' },
      measured: { bg: '#3A414C' },
      icon: 'arrow-right',
      binding: 'static:with.buildOutfit',
      action: 'navigate:/wardrobe/outfit',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    { what: 'bezel', note: 'the device frame around the screen', box: B(66, 58, 636, 1264) },
    { what: 'outside-art', note: 'leaf line-art above the device frame', box: B(0, 0, 768, 58) },
    {
      what: 'outside-art',
      note: 'leaf line-art left of the device frame',
      box: B(0, 58, 66, 1264),
    },
    {
      what: 'outside-art',
      note: 'leaf line-art right of the device frame',
      box: B(702, 58, 66, 1264),
    },
    { what: 'outside-art', note: 'leaf line-art below the device frame', box: B(0, 1322, 768, 54) },
    {
      what: 'leaked-label',
      note: 'a component name and level printed after the anchor heading',
      box: B(351, 162, 215, 22),
    },
    {
      what: 'leaked-label',
      note: 'a pixel size printed inside the anchor swatch',
      box: B(170, 283, 56, 22),
    },
  ],
  departures: [
    {
      rule: 'E1',
      element: '19.anchor.oklch',
      why: '#5B6B78’s printed OKLCh does not survive checking (§4 E1); the line shows the engine’s conversion',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '19.anchor.swatch',
        '19.rows.row-1.swatch',
        '19.rows.row-2.swatch',
        '19.rows.row-3.swatch',
        '19.rows.row-4.swatch',
        '19.rows.row-5.swatch',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: [
        '19.anchor.name',
        '19.anchor.oklch',
        '19.rows.row-1.name',
        '19.rows.row-2.name',
        '19.rows.row-3.name',
        '19.rows.row-4.name',
        '19.rows.row-5.name',
      ],
      resolution: 'text sits beside the sample as 19 draws it',
      flippedByUser: false,
    },
    {
      id: 'C18',
      elements: [
        '19.rows.row-1.detail',
        '19.rows.row-2.detail',
        '19.rows.row-3.detail',
        '19.rows.row-4.detail',
        '19.rows.row-5.detail',
      ],
      resolution:
        '19: ΔE00 from the anchor, as drawn. FR-73 also requires every proposed colour to carry its gamut cost, and each combination its family and whether it is generated or curated — 19 draws none of the three, so where they appear is questions.md 17, not an agent’s layout',
      flippedByUser: false,
    },
  ],
};
