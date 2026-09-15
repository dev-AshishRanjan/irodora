// Mockup 13 — Outfit Lab and the capsule solver. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes are
// pixel readings (measure.ps1, corner.ps1). Derived, and saying so: the slot rows' x extent is the
// slot container's inner edge (x 39–729), since kimono sketches drawn behind the rows cross their
// sides; slots 2 and 3 are filled within a few levels of the ground, so their thumbnail BOXES are
// slot 1's geometry at their own top, and only the garment drawings in them are read; the sketches
// behind the rows cannot be separated from them, so the line-art is recorded as its two margin
// strips. The harmony row's icon and the capsule card's sparkle are multicoloured — questions.md 5.
// The generator orders elements by the reading rule. Type size as in 02.mjs.
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

const slot = (n, s) => {
  const p = `13.slots.slot-${n}`;
  return [
    el(p, 'app:OutfitSlot', s.box, {
      parent: '13.slots',
      tokens: { radius: 'sm' },
      binding: `store:outfit.slot.${n}.hex`,
      ...(s.fill ? { measured: { bg: s.fill } } : {}),
    }),
    el(`${p}.thumbnail`, 'app:GarmentThumbnail', s.thumb, {
      parent: p,
      tokens: { radius: 'sm' },
      binding: `store:outfit.slot.${n}.garment`,
    }),
    t(`${p}.hex`, s.hex, p, `store:outfit.slot.${n}.hex`, {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'body', 400, { tabular: true }),
      copy: { shape: 'value', script: 'figures' },
    }),
    t(`${p}.name`, s.name, p, `store:outfit.slot.${n}.name`, {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
    }),
    ...(s.locked
      ? [
          el(`${p}.locked`, 'ui:Chip', s.locked, {
            parent: p,
            tokens: { bg: 'level3', radius: 'sm' },
            icon: 'lock',
            binding: 'static:lab.locked',
            copy: { shape: 'badge', script: 'latin' },
          }),
        ]
      : [
          el(`${p}.swap`, 'ui:Button', s.swap, {
            parent: p,
            tokens: { border: 'border.subtle', radius: 'sm' },
            icon: 'swap',
            binding: 'static:lab.swap',
            action: `select:slot.${n}.swap`,
            copy: { shape: 'label', script: 'latin' },
          }),
          el(`${p}.lock`, 'ui:Button', s.lock, {
            parent: p,
            tokens: { border: 'border.subtle', radius: 'sm' },
            icon: 'lock',
            action: `toggle:slot.${n}.lock`,
          }),
        ]),
  ];
};
const component = (key, row) => [
  el(`13.score.${key}.icon`, null, row.icon, { parent: '13.score', icon: `score-${key}` }),
  t(`13.score.${key}.label`, row.label, '13.score', `static:lab.component.${key}`, {
    tokens: { fg: 'text.primary' },
  }),
  t(`13.score.${key}.value`, row.value, '13.score', `engine:outfit.components.${key}`, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'label', 500, { tabular: true }),
    copy: { shape: 'value', script: 'figures' },
  }),
  t(`13.score.${key}.note`, row.note, '13.score', row.noteBinding, {
    tokens: { fg: 'text.secondary' },
    copy: { shape: 'value', script: 'mixed' },
  }),
];
const rule = (n, y) =>
  el(`13.score.rule-${n}`, null, B(64, y, 640, 2), {
    parent: '13.score',
    tokens: { fg: 'border.subtle' },
  });

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '13.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    // ---- header
    el('13.back', 'ui:Button', B(27, 37, 144, 19), {
      icon: 'back',
      binding: 'static:wardrobe.back',
      action: 'navigate:/wardrobe',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('13.title', 'ui:Text', B(247, 32, 273, 27), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      binding: 'static:lab.title',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    el('13.capsule-solver', 'ui:Button', B(548, 22, 201, 48), {
      tokens: { border: 'border.strong', radius: 'md' },
      binding: 'static:lab.capsuleSolver',
      action: 'open:lab.capsule',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('13.header-rule', null, B(0, 92, 768, 3), { tokens: { fg: 'border.subtle' } }),
    // ---- line-art down both margins, inside the screen (§2: design); it continues behind the slots
    el('13.art-left', 'ui:Illustration', B(0, 100, 36, 1140), { illustration: 'kimono' }),
    el('13.art-right', 'ui:Illustration', B(732, 112, 36, 1110), { illustration: 'kimono' }),
    // ---- the four slots
    el('13.slots', null, B(38, 127, 692, 576), {
      tokens: { border: 'border.subtle', radius: 'md' },
    }),
    ...slot(1, {
      box: B(39, 140, 691, 122),
      fill: '#566471',
      thumb: B(60, 151, 115, 99),
      hex: B(197, 172, 109, 21),
      name: B(197, 207, 259, 22),
      locked: B(586, 161, 122, 41),
    }),
    ...slot(2, {
      box: B(39, 278, 691, 119),
      thumb: B(60, 289, 115, 99),
      hex: B(196, 309, 114, 20),
      name: B(197, 344, 271, 26),
      swap: B(553, 298, 105, 41),
      lock: B(666, 298, 42, 41),
    }),
    ...slot(3, {
      box: B(39, 415, 691, 119),
      thumb: B(60, 426, 115, 99),
      hex: B(197, 445, 109, 21),
      name: B(198, 480, 288, 27),
      swap: B(553, 435, 105, 41),
      lock: B(666, 435, 42, 41),
    }),
    ...slot(4, {
      box: B(39, 550, 691, 118),
      fill: '#303943',
      thumb: B(61, 561, 113, 97),
      hex: B(196, 581, 114, 20),
      name: B(198, 616, 234, 22),
      swap: B(553, 570, 105, 41),
      lock: B(666, 570, 42, 41),
    }),
    // ---- the score
    el('13.score', 'ui:Card', B(38, 731, 692, 395), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1A1A1F' },
      raw: { cornerPx: 18.25 },
    }),
    el('13.score.pill', 'ui:Chip', B(63, 755, 642, 74), {
      parent: '13.score',
      tokens: { bg: 'level2', radius: 'md' },
    }),
    t('13.score.figure', B(83, 769, 335, 47), '13.score.pill', 'engine:outfit.score', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600, { tabular: true }),
      icon: 'score',
      copy: { shape: 'value', script: 'mixed' },
    }),
    t('13.score.verdict', B(420, 766, 230, 49), '13.score.pill', 'oq:OQ-9', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
    }),
    ...component('harmony', {
      icon: B(70, 855, 29, 27),
      label: B(111, 859, 176, 25),
      value: B(357, 859, 47, 21),
      note: B(417, 858, 225, 26),
      noteBinding: 'engine:harmony.relationship',
    }),
    rule(1, 895),
    ...component('fit', {
      icon: B(74, 908, 22, 28),
      label: B(111, 912, 128, 20),
      value: B(357, 911, 47, 21),
      note: B(418, 911, 225, 25),
      noteBinding: 'derived:F-223',
    }),
    rule(2, 947),
    ...component('contrast', {
      icon: B(72, 962, 25, 26),
      label: B(111, 965, 155, 20),
      value: B(357, 965, 48, 21),
      note: B(418, 964, 262, 25),
      noteBinding: 'engine:apca',
    }),
    rule(3, 1001),
    ...component('balance', {
      icon: B(70, 1015, 29, 26),
      label: B(111, 1018, 197, 24),
      value: B(357, 1018, 47, 20),
      note: B(418, 1017, 156, 26),
      noteBinding: 'oq:OQ-30',
    }),
    rule(4, 1054),
    ...component('cvd', {
      icon: B(71, 1072, 27, 18),
      label: B(111, 1071, 170, 21),
      value: B(357, 1071, 47, 20),
      note: B(418, 1070, 264, 24),
      noteBinding: 'engine:separation',
    }),
    // ---- the capsule (runs on under the action bar)
    el('13.capsule', 'ui:Card', B(38, 1147, 692, 103), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#23262B' },
    }),
    t('13.capsule.title', B(64, 1170, 237, 24), '13.capsule', 'static:lab.capsuleSolved', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    el('13.capsule.icon', null, B(65, 1204, 25, 25), { parent: '13.capsule', icon: 'sparkle' }),
    t('13.capsule.body', B(98, 1207, 592, 41), '13.capsule', 'engine:capsule.summary', {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'body', script: 'latin', lines: 2 },
    }),
    // ---- actions
    el('13.actions', 'app:ActionBar', B(0, 1250, 768, 126), {
      tokens: { border: 'border.subtle' },
    }),
    el('13.actions.next', 'ui:Button', B(35, 1276, 342, 63), {
      parent: '13.actions',
      tokens: { bg: 'action.primary', radius: 'md' },
      icon: 'refresh',
      binding: 'static:lab.generateNext',
      action: 'submit:lab.next',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('13.actions.save', 'ui:Button', B(392, 1277, 340, 61), {
      parent: '13.actions',
      tokens: { border: 'border.subtle', radius: 'md' },
      binding: 'static:lab.saveToLookbook',
      action: 'submit:lookbook.save',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [],
  departures: [
    {
      rule: 'E2',
      element: '13.score.fit.note',
      why: 'the FR-29 personal-fit score stays; the word that makes it a match to a seasonal type does not (§4 E2, C12)',
    },
    {
      rule: 'E2',
      element: '13.score.contrast.note',
      why: 'the ratio and the Lc stay with the threshold they pass; the one-word verdict after them does not (FR-32, FR-3)',
    },
    {
      rule: 'E2',
      element: '13.score.cvd.note',
      why: 'the computed separation (FR-5) stays with its model; the safety suffix is a claim about people and does not ship',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: ['13.slots.slot-1', '13.slots.slot-2', '13.slots.slot-3', '13.slots.slot-4'],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: [
        '13.slots.slot-1.hex',
        '13.slots.slot-2.hex',
        '13.slots.slot-3.hex',
        '13.slots.slot-4.hex',
        '13.slots.slot-1.name',
        '13.slots.slot-2.name',
        '13.slots.slot-3.name',
        '13.slots.slot-4.name',
      ],
      resolution:
        'text sits on the slot’s colour as 13 draws it, and takes per row whichever of the two text colours passes 4.5:1 (E3)',
      flippedByUser: false,
    },
    {
      id: 'C10',
      elements: ['13.slots.slot-1', '13.slots.slot-4'],
      resolution:
        'followed: the tinted slot rows carry text (golden rule 13) and are declared a chroma-ceiling exception by F-225',
      flippedByUser: false,
    },
    {
      id: 'C12',
      elements: ['13.score.fit.note'],
      resolution: 'the seasonal label is derived from the four ranges by F-223, with an ADR',
      flippedByUser: false,
    },
  ],
};
