// Mockup 12 — add a garment. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes are pixel readings
// (measure.ps1, corner.ps1). The fabric swatch has a pinked edge, so no corner radius is recorded for
// it — a zigzag has none. The form's three groups are labelled in the image only by leaked prompt
// labels (§2), so as drawn they have no label at all — questions.md 12. The duplicate check's "Safe"
// names the duplicate threshold, not people, so it is no claim. The generator orders elements by the
// reading rule. Type size as in 02.mjs.
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
const choice = (group, key, box, selected = false) =>
  el(`12.form.${group}.${key}`, 'ui:Chip', box, {
    parent: '12.form',
    tokens: selected
      ? { bg: 'level2', radius: 'pill' }
      : { border: 'border.subtle', radius: 'pill' },
    binding: `static:garment.${group}.${key}`,
    action: `select:garment.${group}.${key}`,
    copy: { shape: 'label', script: 'latin' },
  });
const segment = (group, key, box, parent) =>
  t(`${parent}.${key}`, box, parent, `static:garment.${group}.${key}`, {
    tokens: { fg: 'text.secondary' },
    action: `select:garment.${group}.${key}`,
  });

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '12.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    // ---- header
    el('12.cancel', 'ui:Button', B(28, 40, 109, 21), {
      icon: 'back',
      binding: 'static:garment.cancel',
      action: 'dismiss:garment',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('12.title', 'ui:Text', B(243, 38, 281, 24), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      binding: 'static:garment.addTitle',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    el('12.save', 'ui:Button', B(655, 22, 94, 56), {
      tokens: { bg: 'action.primary', radius: 'md' },
      binding: 'static:garment.save',
      action: 'submit:garment.save',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('12.header-rule', null, B(0, 99, 768, 6), { tokens: { fg: 'border.subtle' } }),
    // ---- leaf sprays on the right margin, inside the screen (§2: design)
    el('12.art-top', 'ui:Illustration', B(732, 122, 36, 269), { illustration: 'leaves' }),
    el('12.art-bottom', 'ui:Illustration', B(732, 1011, 36, 184), { illustration: 'leaves' }),
    // ---- where the colour came from
    el('12.source', 'ui:Card', B(37, 129, 695, 261), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1E2128' },
      raw: { cornerPx: 21 },
    }),
    el('12.source.swatch', 'new:FabricSwatch', B(67, 156, 167, 167), {
      parent: '12.source',
      tokens: { keyline: 'keyline' },
      binding: 'store:draft.colour.hex',
    }),
    t('12.source.name', B(258, 197, 287, 25), '12.source', 'engine:draft.colour.label', {
      tokens: { fg: 'text.primary' },
      type: text('gothic', 'body', 500),
      copy: { shape: 'label', script: 'mixed' },
    }),
    el('12.source.provenance', 'ui:Chip', B(257, 237, 201, 37), {
      parent: '12.source',
      tokens: { bg: 'level2', radius: 'pill' },
      binding: 'engine:draft.colour.provenance',
      copy: { shape: 'badge', script: 'latin' },
    }),
    el('12.source.method', 'ui:ChoiceGroup', B(257, 308, 444, 46), {
      parent: '12.source',
      tokens: { border: 'border.subtle', radius: 'pill' },
    }),
    el('12.source.method.lens', null, B(267, 312, 154, 38), {
      parent: '12.source.method',
      tokens: { bg: 'level2', radius: 'pill' },
      binding: 'static:garment.source.lens',
      action: 'select:garment.source.lens',
      copy: { shape: 'label', script: 'latin' },
    }),
    segment('source', 'photo', B(437, 323, 54, 17), '12.source.method'),
    segment('source', 'atlas-pick', B(515, 322, 90, 18), '12.source.method'),
    segment('source', 'hex', B(629, 322, 53, 18), '12.source.method'),
    t('12.source.label', B(68, 342, 164, 22), '12.source', 'static:garment.colourSource', {
      tokens: { fg: 'text.secondary' },
    }),
    // ---- the garment
    el('12.form', 'ui:Card', B(37, 409, 695, 491), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1E2128' },
    }),
    t('12.form.title-label', B(68, 440, 137, 18), '12.form', 'static:garment.titleLabel', {
      tokens: { fg: 'text.secondary' },
    }),
    el('12.form.title', 'ui:TextField', B(67, 470, 634, 53), {
      parent: '12.form',
      tokens: { border: 'border.subtle', radius: 'sm' },
      binding: 'store:draft.title',
      action: 'adjust:draft.title',
      copy: { shape: 'placeholder', script: 'latin' },
    }),
    el('12.form.category', 'ui:ChoiceGroup', B(67, 579, 634, 46), {
      parent: '12.form',
      tokens: { border: 'border.subtle', radius: 'sm' },
    }),
    el('12.form.category.top', null, B(75, 583, 85, 38), {
      parent: '12.form.category',
      tokens: { bg: 'level2', radius: 'sm' },
      binding: 'static:garment.category.top',
      action: 'select:garment.category.top',
      copy: { shape: 'label', script: 'latin' },
    }),
    segment('category', 'trousers', B(181, 594, 87, 17), '12.form.category'),
    segment('category', 'outerwear', B(304, 593, 107, 19), '12.form.category'),
    segment('category', 'footwear', B(446, 594, 94, 17), '12.form.category'),
    segment('category', 'accessory', B(575, 594, 106, 22), '12.form.category'),
    choice('material', 'linen', B(67, 681, 112, 43), true),
    choice('material', 'cotton', B(189, 681, 114, 43)),
    choice('material', 'wool', B(313, 681, 90, 43)),
    choice('material', 'silk', B(413, 681, 70, 43)),
    choice('material', 'denim', B(493, 681, 99, 43)),
    choice('formality', 'casual', B(67, 779, 126, 43), true),
    choice('formality', 'smart-casual', B(203, 779, 169, 43)),
    choice('formality', 'formal', B(382, 779, 108, 43)),
    choice('season', 'spring-summer', B(67, 831, 214, 43), true),
    choice('season', 'autumn-winter', B(291, 831, 186, 43)),
    // ---- the duplicate check (green: C10)
    el('12.intelligence', 'ui:Card', B(37, 917, 695, 130), {
      tokens: { radius: 'md' },
      measured: { bg: '#1F332A' },
    }),
    el('12.intelligence.icon', null, B(70, 940, 21, 23), {
      parent: '12.intelligence',
      icon: 'shield',
    }),
    t(
      '12.intelligence.title',
      B(102, 942, 297, 23),
      '12.intelligence',
      'static:garment.intelligence',
      {
        tokens: { fg: 'text.primary' },
        type: text('sans', 'body', 600),
        copy: { shape: 'heading', script: 'latin' },
      },
    ),
    el('12.intelligence.check', null, B(71, 975, 19, 14), {
      parent: '12.intelligence',
      icon: 'check',
    }),
    t(
      '12.intelligence.body',
      B(104, 972, 573, 53),
      '12.intelligence',
      'engine:duplicates.summary',
      {
        tokens: { fg: 'text.secondary' },
        copy: { shape: 'body', script: 'mixed', lines: 2 },
      },
    ),
    // ---- tracking
    el('12.tracking', 'ui:Card', B(37, 1065, 695, 159), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1D2128' },
    }),
    t('12.tracking.title', B(68, 1094, 196, 24), '12.tracking', 'static:garment.tracking', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    el('12.tracking.toggle', null, B(678, 1098, 18, 11), {
      parent: '12.tracking',
      icon: 'chevron-up',
      action: 'toggle:garment.tracking',
    }),
    t('12.tracking.price', B(69, 1137, 249, 22), '12.tracking', 'store:draft.price', {
      tokens: { fg: 'text.primary' },
      copy: { shape: 'value', script: 'mixed' },
    }),
    t('12.tracking.brand', B(69, 1176, 172, 23), '12.tracking', 'store:draft.brand', {
      tokens: { fg: 'text.primary' },
      copy: { shape: 'value', script: 'latin' },
    }),
    // ---- the save bar
    el('12.bar', 'app:ActionBar', B(0, 1238, 768, 138), { tokens: { border: 'border.subtle' } }),
    el('12.bar.save', 'ui:Button', B(36, 1273, 696, 66), {
      parent: '12.bar',
      tokens: { bg: 'action.primary', radius: 'md' },
      binding: 'static:garment.saveToWardrobe',
      action: 'submit:garment.save',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    {
      what: 'garbled-text',
      note: 'a stray bracketed number after the colour-source label',
      box: B(68, 342, 164, 22),
    },
    {
      what: 'leaked-label',
      note: 'a component name printed as the category group’s label',
      box: B(68, 549, 284, 22),
    },
    {
      what: 'leaked-label',
      note: 'a component name printed as the material group’s label',
      box: B(68, 650, 212, 23),
    },
    {
      what: 'leaked-label',
      note: 'a component name printed as the formality and season groups’ label',
      box: B(68, 749, 236, 23),
    },
    {
      what: 'garbled-text',
      note: 'the formal pill’s label is misspelt',
      box: B(382, 779, 108, 43),
    },
  ],
  departures: [],
  conflicts: [
    {
      id: 'C11',
      elements: ['12.source.swatch'],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C10',
      elements: [
        '12.intelligence',
        '12.intelligence.icon',
        '12.intelligence.title',
        '12.intelligence.check',
        '12.intelligence.body',
      ],
      resolution:
        'followed: the green card carries text and an icon (golden rule 13) and is declared a chroma-ceiling exception by F-225',
      flippedByUser: false,
    },
  ],
};
