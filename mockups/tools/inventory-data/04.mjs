// Mockup 04 — the Lens held against a target. A SPEC CARD: the screen is drawn inside a frame (outer
// 129–654 × 150–1375, running off the image's bottom edge) with callouts to its left, so §2 measures
// against the frame's inner width — 523 px → 384 / 523 dp per px. 04 is variantFor /lens: it governs
// the against-target STATE (P2). Two elements are drawn past the frame's right edge (questions.md 6);
// they are recorded as drawn and each is a declared overhang waiting on OQ-16. Type size by the rule in 02.mjs.
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
const delta = (key, label, bar, value, parentBar = '04.gauge') => ({
  label: el(`04.gauge.${key}.label`, 'ui:Text', label, {
    parent: parentBar,
    tokens: { fg: 'text.secondary' },
    type: text('sans', 'label'),
    binding: `static:lens.delta.${key}`,
    copy: { shape: 'label', script: 'latin' },
  }),
  bar: el(`04.gauge.${key}.bar`, 'ui:Bands', bar, {
    parent: parentBar,
    binding: `engine:delta.${key}`,
  }),
  value: el(`04.gauge.${key}.value`, 'ui:Text', value, {
    parent: parentBar,
    tokens: { fg: 'text.secondary' },
    type: text('sans', 'label', 400, { tabular: true }),
    binding: `engine:delta.${key}`,
    copy: { shape: 'value', script: 'mixed' },
  }),
});
const L = delta('lightness', B(186, 918, 84, 21), B(310, 917, 130, 19), B(511, 918, 181, 20));
const C = delta('chroma', B(185, 953, 68, 16), B(439, 951, 49, 20), B(510, 952, 182, 21));
const H = delta('hue', B(186, 987, 35, 17), B(403, 987, 37, 19), B(514, 987, 178, 19));

export default {
  kind: 'screen',
  governs: 'state',
  frame: {
    kind: 'spec-card',
    screens: [{ id: '04.screen', box: B(131, 152, 523, 1224), dpPerPx: 0.7342 }],
  },
  overhangs: [
    { element: '04.gauge', question: 'OQ-16' },
    { element: '04.sheet', question: 'OQ-16' },
  ],
  elements: [
    // ---- the armed target
    el('04.target', 'ui:Card', B(150, 174, 485, 94), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1E2128' },
    }),
    el('04.target.swatch', 'ui:Swatch', B(167, 193, 40, 39), {
      parent: '04.target',
      tokens: { keyline: 'keyline', radius: 'sm' },
      binding: 'store:target.hex',
    }),
    el('04.target.label', 'ui:Text', B(224, 198, 185, 45), {
      parent: '04.target',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      binding: 'store:target.name',
      copy: { shape: 'label', script: 'mixed', lines: 2 },
    }),
    el('04.target.change', 'ui:Button', B(479, 200, 138, 41), {
      parent: '04.target',
      tokens: { border: 'border.strong', radius: 'md' },
      binding: 'static:lens.changeTarget',
      action: 'navigate:/lens/target',
      copy: { shape: 'label', script: 'latin' },
    }),
    // ---- the viewfinder and its reticle
    el('04.viewfinder', 'app:CameraPreview', B(146, 290, 493, 430), {
      tokens: { radius: 'lg' },
      binding: 'engine:lens.preview',
    }),
    el('04.reticle', 'app:Reticle', B(183, 314, 418, 346), {
      parent: '04.viewfinder',
      tokens: { fg: 'text.primary' },
    }),
    el('04.reticle.corner-tl', null, B(183, 314, 39, 39), { parent: '04.reticle' }),
    el('04.reticle.corner-tr', null, B(562, 314, 39, 39), { parent: '04.reticle' }),
    el('04.reticle.centre', null, B(364, 468, 56, 53), { parent: '04.reticle' }),
    el('04.reticle.corner-bl', null, B(183, 622, 39, 38), { parent: '04.reticle' }),
    el('04.reticle.corner-br', null, B(563, 622, 38, 38), { parent: '04.reticle' }),
    // ---- the proximity gauge (drawn past the frame's right edge)
    el('04.gauge', 'ui:Card', B(167, 686, 545, 355), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1F2126' },
    }),
    el('04.gauge.sparkle', null, B(606, 705, 44, 45), { parent: '04.gauge', icon: 'sparkle' }),
    el('04.gauge.distance', 'ui:Text', B(243, 716, 129, 22), {
      parent: '04.gauge',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600, { tabular: true }),
      binding: 'engine:deltaE00',
      copy: { shape: 'value', script: 'figures' },
    }),
    el('04.gauge.band', 'ui:Text', B(380, 715, 215, 28), {
      parent: '04.gauge',
      type: text('sans', 'body', 500),
      binding: 'derived:F-222',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('04.gauge.pair', 'new:SplitBar', B(185, 763, 510, 63), {
      parent: '04.gauge',
      tokens: { keyline: 'keyline', radius: 'sm' },
      binding: 'engine:reading.hex',
    }),
    el('04.gauge.caption', 'ui:Text', B(208, 838, 467, 46), {
      parent: '04.gauge',
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'caption'),
      binding: 'engine:reading.hex',
      copy: { shape: 'caption', script: 'mixed', lines: 2 },
    }),
    el('04.gauge.divider', null, B(185, 898, 509, 1), {
      parent: '04.gauge',
      tokens: { fg: 'border.subtle' },
    }),
    L.label,
    L.bar,
    el('04.gauge.axis', null, B(439, 909, 2, 106), {
      parent: '04.gauge',
      tokens: { fg: 'text.secondary' },
    }),
    L.value,
    C.label,
    C.bar,
    C.value,
    H.label,
    H.bar,
    H.value,
    // ---- the action sheet (drawn past the frame's right edge, and off the image's bottom)
    el('04.sheet', 'ui:Sheet', B(144, 1060, 533, 316), {
      tokens: { bg: 'level1', radius: 'lg' },
      measured: { bg: '#1F2228' },
    }),
    el('04.sheet.handle', null, B(383, 1073, 54, 6), {
      parent: '04.sheet',
      tokens: { fg: 'border.strong', radius: 'pill' },
    }),
    el('04.sheet.tolerance', 'ui:Chip', B(220, 1094, 380, 39), {
      parent: '04.sheet',
      tokens: { radius: 'pill' },
      icon: 'check',
      binding: 'engine:harmonyTolerance',
      copy: { shape: 'badge', script: 'latin' },
    }),
    el('04.sheet.save', 'ui:Button', B(161, 1149, 498, 52), {
      parent: '04.sheet',
      tokens: { bg: 'action.primary', radius: 'md' },
      action: 'submit:reading.save',
    }),
    el('04.sheet.save.label', 'ui:Text', B(331, 1165, 142, 23), {
      parent: '04.sheet.save',
      tokens: { fg: 'ground' },
      type: text('sans', 'label', 500),
      binding: 'static:lens.saveReading',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('04.sheet.outfits', 'ui:Button', B(162, 1210, 495, 52), {
      parent: '04.sheet',
      tokens: { border: 'border.subtle', radius: 'md' },
      action: 'navigate:/atlas/with/reading/[id]',
    }),
    el('04.sheet.outfits.label', 'ui:Text', B(270, 1226, 237, 24), {
      parent: '04.sheet.outfits',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      binding: 'static:lens.viewOutfits',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('04.sheet.outfits.icon', null, B(519, 1227, 19, 18), {
      parent: '04.sheet.outfits',
      icon: 'arrow-right',
    }),
    el('04.sheet.reset', 'ui:Button', B(162, 1272, 495, 53), {
      parent: '04.sheet',
      tokens: { border: 'border.subtle', radius: 'md' },
      action: 'submit:target.reset',
    }),
    el('04.sheet.reset.label', 'ui:Text', B(335, 1289, 135, 24), {
      parent: '04.sheet.reset',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      binding: 'static:lens.resetTarget',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    { what: 'bezel', note: 'the spec card’s frame', box: B(129, 150, 526, 1226) },
    { what: 'board-annotation', note: 'the card’s title and subtitle', box: B(198, 50, 384, 76) },
    { what: 'callout', note: 'Target Header Card', box: B(36, 134, 92, 81) },
    { what: 'callout', note: 'its arrow', box: B(120, 210, 40, 9) },
    { what: 'callout', note: 'Viewfinder Area', box: B(26, 422, 102, 52) },
    { what: 'callout', note: 'its arrow, drawn over the photograph', box: B(73, 463, 226, 14) },
    {
      what: 'callout',
      note: 'Real-Time Proximity Gauge, with a leaked component name',
      box: B(22, 711, 106, 110),
    },
    { what: 'callout', note: 'its bracket', box: B(147, 691, 9, 137) },
    { what: 'callout', note: '3 Delta Breakdown Bars', box: B(28, 937, 97, 62) },
    { what: 'callout', note: 'its bracket', box: B(136, 899, 20, 133) },
    { what: 'callout', note: 'Action Sheet', box: B(52, 1182, 76, 40) },
    { what: 'callout', note: 'its bracket', box: B(120, 1061, 20, 280) },
    {
      what: 'leaked-label',
      note: 'a swatch size in px, under the target swatch',
      box: B(170, 237, 34, 15),
    },
  ],
  departures: [
    {
      rule: 'E2',
      element: '04.gauge.band',
      why: 'the ΔE00 descriptor band stays; the word that asserts a match does not (FR-74) — bands defined in F-222',
    },
    {
      rule: 'E2',
      element: '04.gauge.hue.value',
      why: 'the ΔH figure keeps its descriptor band and loses the claim of an identical hue — FR-74 never asserts identity',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '04.target.swatch',
        '04.gauge.lightness.bar',
        '04.gauge.chroma.bar',
        '04.gauge.hue.bar',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C10',
      elements: ['04.gauge.band', '04.gauge.sparkle', '04.gauge.chroma.bar', '04.sheet.tolerance'],
      resolution:
        'followed: the green verdict colour carries text or an icon (golden rule 13) and is declared a chroma-ceiling exception by F-225',
      flippedByUser: false,
    },
  ],
};
