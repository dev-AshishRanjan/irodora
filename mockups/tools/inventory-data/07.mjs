// Mockup 07 — Wear it: outfit combinations. A SPEC CARD: the screen is drawn inside a frame (outer
// 100–669 × 134–1351) under a board title and route string, with kimono line-art at the top right,
// so §2 measures against the frame's inner width — 564 px → 384 / 564 dp per px. Boxes are pixel
// readings (measure.ps1, mask.ps1). The leaked "Sticky action bar" label reads merged with the bar's
// top border, and is recorded as that measured strip. Type size by the rule in 02.mjs.
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
const label = (id, box, parent, binding, extra = {}) =>
  el(id, 'ui:Text', box, {
    parent,
    type: text('sans', 'label'),
    binding,
    copy: { shape: 'label', script: 'latin' },
    ...extra,
  });
const slotText = (n, parts) => {
  const p = `07.slots.slot-${n}`;
  return {
    title: label(`${p}.title`, parts.title, p, `static:wear.slot.${n}`, {
      copy: { shape: 'label', script: 'latin' },
    }),
    hex: label(`${p}.hex`, parts.hex, p, `store:outfit.slot.${n}.hex`, {
      type: text('sans', 'label', 400, { tabular: true }),
      copy: { shape: 'value', script: 'figures' },
    }),
    name: label(`${p}.name`, parts.name, p, `store:outfit.slot.${n}.name`, {
      type: text('sans', 'body'),
      copy: { shape: 'label', script: 'latin', lines: parts.lines },
    }),
  };
};
const s1 = slotText(1, {
  title: B(134, 516, 176, 19),
  hex: B(133, 565, 83, 16),
  name: B(134, 590, 190, 17),
  lines: 1,
});
const s2 = slotText(2, {
  title: B(408, 516, 141, 19),
  hex: B(407, 547, 85, 16),
  name: B(408, 572, 204, 46),
  lines: 2,
});
const s3 = slotText(3, {
  title: B(134, 714, 121, 19),
  hex: B(133, 749, 82, 18),
  name: B(134, 775, 147, 47),
  lines: 2,
});
const s4 = slotText(4, {
  title: B(407, 713, 159, 21),
  hex: B(407, 750, 86, 17),
  name: B(407, 775, 184, 46),
  lines: 2,
});
const row = (key, labelBox, valueBox, binding) => [
  label(`07.intelligence.${key}.label`, labelBox, '07.intelligence', `static:wear.${key}`, {
    tokens: { fg: 'text.secondary' },
  }),
  label(`07.intelligence.${key}.value`, valueBox, '07.intelligence', binding, {
    tokens: { fg: 'text.primary' },
    copy: { shape: 'value', script: 'mixed' },
  }),
];
const [harmonyL, harmonyV] = row(
  'harmony',
  B(135, 954, 141, 20),
  B(312, 954, 210, 20),
  'engine:harmony.relationship',
);
const [fitL, fitV] = row('fit', B(135, 987, 158, 15), B(312, 986, 274, 20), 'engine:personalFit');
const [cvdL, cvdV] = row('cvd', B(134, 1019, 138, 17), B(312, 1019, 322, 20), 'engine:separation');
const [contrastL, contrastV] = row(
  'contrast',
  B(134, 1052, 126, 16),
  B(312, 1051, 174, 21),
  'engine:contrast',
);
const pill = (key, box) =>
  el(`07.substitutions.${key}`, 'ui:Chip', box, {
    parent: '07.intelligence',
    tokens: { border: 'border.subtle', radius: 'pill' },
    binding: `engine:substitution.${key}`,
    action: `select:substitution.${key}`,
    copy: { shape: 'label', script: 'latin' },
  });

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'spec-card',
    screens: [{ id: '07.screen', box: B(103, 137, 564, 1212), dpPerPx: 0.6809 }],
  },
  elements: [
    // ---- header
    el('07.back', null, B(132, 154, 23, 20), { icon: 'back', action: 'navigate:/atlas/[slug]' }),
    el('07.title', 'ui:Text', B(175, 150, 443, 28), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 500),
      binding: 'corpus:entry.name.romaji',
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 26 },
    }),
    // ---- the anchor piece
    el('07.anchor', 'ui:Card', B(129, 237, 512, 104), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1F2126' },
    }),
    el('07.anchor.swatch', 'ui:Swatch', B(146, 251, 76, 76), {
      parent: '07.anchor',
      tokens: { keyline: 'keyline', radius: 'sm' },
      binding: 'corpus:entry.hex',
    }),
    el('07.anchor.name', 'ui:Text', B(239, 265, 236, 23), {
      parent: '07.anchor',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      binding: 'corpus:entry.name',
      copy: { shape: 'label', script: 'mixed' },
    }),
    el('07.anchor.category', 'ui:Text', B(241, 294, 99, 20), {
      parent: '07.anchor',
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'label'),
      binding: 'store:anchor.category',
      copy: { shape: 'label', script: 'latin' },
    }),
    // ---- occasion: a segmented control
    el('07.occasion', 'ui:ChoiceGroup', B(129, 397, 533, 43), {
      tokens: { border: 'border.subtle', radius: 'md' },
      binding: 'static:wear.occasion',
    }),
    el('07.occasion.selected', null, B(213, 400, 185, 36), {
      parent: '07.occasion',
      tokens: { bg: 'action.primary', radius: 'md' },
      action: 'select:occasion.office',
    }),
    label('07.occasion.casual', B(144, 411, 53, 14), '07.occasion', 'static:wear.occasion.casual', {
      action: 'select:occasion.casual',
    }),
    label(
      '07.occasion.classic',
      B(413, 411, 141, 17),
      '07.occasion',
      'static:wear.occasion.classic',
      { action: 'select:occasion.classic' },
    ),
    label(
      '07.occasion.evening',
      B(584, 411, 62, 17),
      '07.occasion',
      'static:wear.occasion.evening',
      { action: 'select:occasion.evening' },
    ),
    // ---- the four slots
    el('07.slots.slot-1', 'app:OutfitSlot', B(116, 495, 261, 184), {
      tokens: { radius: 'md' },
      binding: 'store:outfit.slot.1.hex',
      measured: { bg: '#576775' },
    }),
    el('07.slots.slot-2', 'app:OutfitSlot', B(391, 496, 259, 183), {
      tokens: { radius: 'md' },
      binding: 'store:outfit.slot.2.hex',
      measured: { bg: '#CDC4B9' },
    }),
    s1.title,
    s2.title,
    s2.hex,
    s1.hex,
    s2.name,
    s1.name,
    // F-228: 07 draws its Swap buttons with the single circular arrow it also uses for refresh, not the
    // two-headed arrow 13 draws for swap. The ACTION is a swap; the GLYPH is refresh's, and the icon
    // field records the glyph, so one name draws one shape across the set.
    el('07.slots.slot-2.swap', 'ui:Button', B(407, 627, 118, 40), {
      parent: '07.slots.slot-2',
      icon: 'refresh',
      action: 'select:slot.2.swap',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('07.slots.slot-2.lock', 'ui:Button', B(532, 626, 105, 41), {
      parent: '07.slots.slot-2',
      icon: 'lock-solid',
      action: 'toggle:slot.2.lock',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('07.slots.slot-3', 'app:OutfitSlot', B(117, 694, 259, 146), {
      tokens: { radius: 'md' },
      binding: 'store:outfit.slot.3.hex',
      measured: { bg: '#1F2025' },
    }),
    el('07.slots.slot-4', 'app:OutfitSlot', B(391, 694, 259, 146), {
      tokens: { radius: 'md' },
      binding: 'store:outfit.slot.4.hex',
      measured: { bg: '#323B44' },
    }),
    // tops 708–716 chain into one row: read left to right
    s3.title,
    el('07.slots.slot-3.swap', 'ui:Button', B(279, 708, 82, 34), {
      parent: '07.slots.slot-3',
      icon: 'refresh',
      action: 'select:slot.3.swap',
      copy: { shape: 'label', script: 'latin' },
    }),
    s4.title,
    el('07.slots.slot-4.swap', 'ui:Button', B(573, 716, 65, 18), {
      parent: '07.slots.slot-4',
      icon: 'refresh',
      action: 'select:slot.4.swap',
      copy: { shape: 'label', script: 'latin' },
    }),
    s3.hex,
    s4.hex,
    s3.name,
    s4.name,
    // ---- the colour intelligence card
    el('07.intelligence', 'ui:Card', B(117, 866, 549, 363), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1F1F25' },
    }),
    el('07.intelligence.title', 'ui:Text', B(134, 888, 469, 21), {
      parent: '07.intelligence',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      binding: 'static:wear.intelligence',
      copy: { shape: 'heading', script: 'latin' },
    }),
    harmonyL,
    harmonyV,
    fitV,
    fitL,
    cvdL,
    cvdV,
    contrastV,
    contrastL,
    el('07.intelligence.rule', null, B(134, 1089, 528, 1), {
      parent: '07.intelligence',
      tokens: { fg: 'border.subtle' },
    }),
    pill('warmer', B(134, 1139, 267, 33)),
    pill('contrast', B(409, 1139, 238, 33)),
    pill('monochrome', B(134, 1179, 252, 33)),
    // ---- the sticky action bar
    el('07.actions', 'app:ActionBar', B(103, 1249, 564, 100), {
      tokens: { border: 'border.subtle' },
    }),
    el('07.actions.save', 'ui:Button', B(124, 1279, 257, 54), {
      parent: '07.actions',
      tokens: { bg: 'action.primary', radius: 'pill' },
      binding: 'static:wear.saveToLab',
      action: 'submit:outfit.save',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('07.actions.export', 'ui:Button', B(395, 1281, 255, 50), {
      parent: '07.actions',
      tokens: { border: 'border.subtle', radius: 'pill' },
      binding: 'static:wear.exportTokens',
      action: 'navigate:/profile/export',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    { what: 'bezel', note: 'the spec card’s frame', box: B(100, 134, 570, 1218) },
    {
      what: 'board-annotation',
      note: 'the board title above the frame (with a stray prime mark)',
      box: B(53, 51, 547, 36),
    },
    {
      what: 'leaked-label',
      note: 'the route string printed under the title',
      box: B(53, 93, 180, 24),
    },
    {
      what: 'outside-art',
      note: 'kimono line-art at the top right, drawn largely outside the frame',
      box: B(590, 40, 178, 690),
    },
    {
      what: 'garbled-text',
      note: 'a stray prime mark after the colour name in the header',
      box: B(175, 153, 114, 21),
    },
    {
      what: 'leaked-label',
      note: 'a component name printed as a section title',
      box: B(129, 207, 163, 22),
    },
    {
      what: 'leaked-label',
      note: 'a component name printed as a section title',
      box: B(129, 367, 265, 21),
    },
    {
      what: 'leaked-label',
      note: 'a component name printed as a section title, misspelt',
      box: B(129, 467, 228, 18),
    },
    {
      what: 'leaked-label',
      note: 'a component name and level after the card title',
      box: B(135, 915, 201, 19),
    },
    {
      what: 'leaked-label',
      note: 'a component name printed as a section title',
      box: B(134, 1111, 208, 18),
    },
    {
      what: 'leaked-label',
      note: 'a component name, read merged with the action bar’s top border',
      box: B(104, 1249, 560, 14),
    },
  ],
  departures: [
    {
      rule: 'E2',
      element: '07.intelligence.fit.value',
      why: 'the FR-29 personal-fit score stays; the word that makes it a match to a seasonal type does not (§4 E2, C12). Whether the seasonal label is drawn beside the score instead, with no ranges beside it, is OQ-32',
    },
    {
      rule: 'E2',
      element: '07.intelligence.cvd.value',
      why: 'the computed separation (FR-5) stays with the model it was computed under; the safety suffix is a claim about people and does not ship (§4 E2)',
    },
    {
      rule: 'E2',
      element: '07.intelligence.contrast.value',
      why: 'the WCAG ratio and the APCA Lc are two figures — APCA has no ratio (FR-3, §4 E2)',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '07.anchor.swatch',
        '07.slots.slot-1',
        '07.slots.slot-2',
        '07.slots.slot-3',
        '07.slots.slot-4',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: [
        '07.slots.slot-1.title',
        '07.slots.slot-1.hex',
        '07.slots.slot-1.name',
        '07.slots.slot-2.title',
        '07.slots.slot-2.hex',
        '07.slots.slot-2.name',
      ],
      resolution:
        'text sits on the sample as 07 draws it, and takes per sample whichever of the two text colours passes 4.5:1 (E3)',
      flippedByUser: false,
    },
    {
      id: 'C12',
      elements: ['07.intelligence.fit.value'],
      resolution: 'the seasonal label is derived from the four ranges by F-223, with an ADR',
      flippedByUser: false,
    },
  ],
};
