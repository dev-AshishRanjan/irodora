// Mockup 16 — Create Custom Palette, the draft state of /atlas/palettes (§3: 16 draft). Full-bleed,
// 768 px → 2 px = 1 dp (§2). Boxes are pixel readings (measure.ps1, corner.ps1). Derived, and saying
// so: the right tray divider's vertical extent is the left divider's (only its column reads at y 1100);
// the cut card under the matrix takes the matrix card's radius, since its corners are hidden by the
// tray; and the matrix card's corner fit, 8 dp, is equidistant from sm (6) and md (10) — md, because
// the cleaner right-hand fit reads 8.75. Slot 1's lock is drawn in colour — questions.md 5; the slot
// headings, roles and actions are printed in square brackets — questions.md 13. The generator orders
// elements by the reading rule. Type size as in 02.mjs.
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
const cap = (emDp, weight = 400) => ({ type: text('sans', 'caption', weight), raw: { emDp } });

const kind = (key, box, selected = false) =>
  el(`16.name.kind.${key}`, 'ui:Chip', box, {
    parent: '16.name',
    tokens: selected
      ? { border: 'text.primary', radius: 'sm' }
      : { border: 'border.subtle', radius: 'sm' },
    binding: `static:palette.kind.${key}`,
    action: `select:palette.kind.${key}`,
    copy: { shape: 'label', script: 'latin' },
  });
const slot = (n, role, s) => {
  const p = `16.slots.slot-${n}`;
  return [
    el(p, 'new:PaletteSlot', s.box, {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      binding: `store:draft.palette.slot.${n}`,
    }),
    t(`${p}.heading`, s.heading, p, `static:palette.slot.${n}.heading`, {
      tokens: { fg: 'text.primary' },
      ...cap(s.em.heading, 500),
      copy: { shape: 'heading', script: 'latin' },
    }),
    el(`${p}.swatch`, 'ui:Swatch', s.swatch, {
      parent: p,
      tokens: { radius: 'sm' },
      binding: `store:draft.palette.slot.${n}.hex`,
      measured: { fill: s.fill },
    }),
    t(`${p}.hex`, s.hex, p, `store:draft.palette.slot.${n}.hex`, {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 600, { tabular: true }),
      copy: { shape: 'value', script: 'figures' },
    }),
    t(`${p}.name`, s.name, p, `corpus:draft.palette.slot.${n}.name`, {
      tokens: { fg: 'text.secondary' },
      ...cap(s.em.name),
      copy: { shape: 'label', script: 'mixed' },
    }),
    t(`${p}.role`, s.role, p, `static:palette.role.${role}`, {
      tokens: { fg: 'text.secondary' },
      ...cap(s.em.role),
    }),
    ...(s.locked
      ? [
          el(`${p}.locked`, 'ui:Chip', s.locked, {
            parent: p,
            tokens: { fg: 'text.tertiary' },
            icon: 'lock-solid',
            binding: 'static:palette.locked',
            action: `toggle:slot.${n}.lock`,
            copy: { shape: 'badge', script: 'latin' },
          }),
        ]
      : [
          el(`${p}.replace`, 'ui:Button', s.replace, {
            parent: p,
            tokens: { fg: 'text.secondary' },
            icon: 'refresh',
            binding: 'static:palette.replace',
            action: `select:slot.${n}.replace`,
            copy: { shape: 'label', script: 'latin' },
          }),
        ]),
  ];
};
const row = (key, label, value, labelType, valueEm, lines = 1) => [
  t(`16.matrix.${key}.label`, label, '16.matrix', `static:palette.matrix.${key}`, {
    tokens: { fg: 'text.primary' },
    ...labelType,
  }),
  t(`16.matrix.${key}.value`, value, '16.matrix', `engine:palette.${key}`, {
    tokens: { fg: 'text.primary' },
    ...cap(valueEm),
    copy: { shape: 'value', script: 'mixed', ...(lines > 1 ? { lines } : {}) },
  }),
];
const rule = (n, box) =>
  el(`16.matrix.rule-${n}`, null, box, { parent: '16.matrix', tokens: { fg: 'border.subtle' } });
const chip = (n, box, selected = false) =>
  el(`16.tray.chip-${n}`, 'new:CorpusChip', box, {
    parent: '16.tray',
    tokens: selected ? { border: 'text.primary', radius: 'sm' } : { radius: 'sm' },
    binding: `corpus:tray.${n - 1}`,
    action: `select:tray.${n - 1}`,
    copy: { shape: 'label', script: 'japanese' },
  });

export default {
  kind: 'screen',
  governs: 'state',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '16.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    // ---- header
    el('16.back', 'ui:Button', B(33, 41, 116, 18), {
      icon: 'back',
      binding: 'static:palettes.back',
      action: 'navigate:/atlas/palettes',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('16.title', 'ui:Text', B(259, 40, 250, 20), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 600),
      binding: 'static:palettes.createTitle',
      copy: { shape: 'heading', script: 'latin' },
    }),
    el('16.save', 'ui:Button', B(582, 24, 159, 51), {
      tokens: { border: 'border.strong', radius: 'sm' },
      binding: 'static:palettes.save',
      action: 'submit:palette.save',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('16.header-rule', null, B(0, 98, 768, 2), { tokens: { fg: 'border.subtle' } }),
    // ---- margin line-art, inside the screen (§2: design)
    el('16.art-left', 'ui:Illustration', B(0, 332, 80, 417), { illustration: 'kimono' }),
    el('16.art-right-top', 'ui:Illustration', B(690, 190, 78, 167), { illustration: 'sashiko' }),
    el('16.art-right-bottom', 'ui:Illustration', B(690, 882, 73, 178), { illustration: 'sashiko' }),
    // ---- name and kind
    el('16.name', 'ui:Card', B(76, 126, 616, 148), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1E2126' },
    }),
    el('16.name.field', 'ui:TextField', B(97, 148, 574, 54), {
      parent: '16.name',
      tokens: { border: 'border.subtle', radius: 'sm' },
      binding: 'store:draft.palette.name',
      action: 'adjust:draft.palette.name',
      copy: { shape: 'value', script: 'latin' },
    }),
    kind('capsule', B(96, 211, 219, 42), true),
    el('16.name.kind.capsule.selected', null, B(110, 225, 15, 15), {
      parent: '16.name.kind.capsule',
      tokens: { fg: 'text.primary' },
    }),
    kind('kasane', B(326, 212, 181, 40)),
    kind('editorial', B(518, 212, 99, 40)),
    // ---- the four role slots
    ...slot(1, 'anchor', {
      box: B(81, 297, 295, 224),
      heading: B(101, 315, 238, 22),
      swatch: B(100, 346, 261, 68),
      fill: '#1D2424',
      hex: B(100, 426, 85, 18),
      name: B(101, 451, 219, 18),
      role: B(216, 488, 110, 18),
      locked: B(102, 487, 103, 19),
      em: { heading: 10.5, name: 10.0, role: 8.6 },
    }),
    ...slot(2, 'light-ground', {
      box: B(392, 297, 296, 225),
      heading: B(407, 316, 182, 22),
      swatch: B(407, 346, 261, 70),
      fill: '#E8E4DB',
      hex: B(407, 426, 88, 18),
      name: B(408, 450, 191, 19),
      role: B(407, 488, 155, 19),
      replace: B(576, 487, 95, 19),
      em: { heading: 10.5, name: 10.6, role: 9.0 },
    }),
    ...slot(3, 'mid-tone', {
      box: B(81, 534, 295, 227),
      heading: B(100, 554, 149, 20),
      swatch: B(100, 584, 261, 70),
      fill: '#566876',
      hex: B(100, 664, 89, 19),
      name: B(101, 689, 219, 19),
      role: B(101, 726, 126, 18),
      replace: B(266, 726, 96, 19),
      em: { heading: 9.5, name: 10.6, role: 8.6 },
    }),
    ...slot(4, 'accent', {
      box: B(392, 535, 296, 225),
      heading: B(407, 553, 192, 22),
      swatch: B(406, 584, 263, 70),
      fill: '#A27F61',
      hex: B(407, 664, 91, 19),
      name: B(407, 689, 158, 19),
      role: B(408, 726, 108, 19),
      replace: B(576, 725, 96, 21),
      em: { heading: 10.5, name: 10.6, role: 9.0 },
    }),
    // ---- the matrix
    el('16.matrix', 'ui:Card', B(80, 781, 608, 254), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1D2126' },
    }),
    t('16.matrix.title', B(97, 801, 467, 23), '16.matrix', 'static:palette.matrix.title', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    rule(1, B(97, 835, 574, 1)),
    ...row('contrast', B(106, 856, 132, 19), B(402, 854, 256, 22), {}, 10.5),
    t('16.matrix.contrast.pair', B(244, 857, 96, 19), '16.matrix', 'static:palette.matrix.pair', {
      tokens: { fg: 'text.secondary' },
      ...cap(9.0),
    }),
    rule(2, B(97, 892, 574, 2)),
    ...row('harmony', B(106, 913, 139, 22), B(402, 913, 247, 22), { raw: { emDp: 11.8 } }, 11.8),
    rule(3, B(97, 949, 574, 2)),
    ...row('separation', B(106, 969, 144, 18), B(402, 967, 263, 44), {}, 11.8, 2),
    // ---- the next card, cut by the tray
    el('16.next-card', 'ui:Card', B(81, 1057, 606, 13), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
    }),
    // ---- the corpus tray
    el('16.tray', 'new:CorpusTray', B(0, 1070, 768, 149), { tokens: { border: 'border.subtle' } }),
    chip(1, B(0, 1092, 42, 113)),
    el('16.tray.divider-left', null, B(63, 1094, 2, 112), {
      parent: '16.tray',
      tokens: { fg: 'border.subtle' },
    }),
    el('16.tray.previous', 'ui:Button', B(51, 1135, 27, 30), {
      parent: '16.tray',
      icon: 'chevron-left',
      action: 'select:tray.previous',
    }),
    chip(2, B(87, 1092, 66, 113)),
    chip(3, B(167, 1092, 79, 113)),
    chip(4, B(259, 1092, 81, 113)),
    chip(5, B(353, 1092, 60, 113)),
    chip(6, B(425, 1091, 80, 115), true),
    chip(7, B(517, 1092, 71, 113)),
    chip(8, B(601, 1092, 69, 113)),
    el('16.tray.next', 'ui:Button', B(679, 1130, 27, 35), {
      parent: '16.tray',
      icon: 'chevron-right',
      action: 'select:tray.next',
    }),
    el('16.tray.divider-right', null, B(692, 1094, 2, 112), {
      parent: '16.tray',
      tokens: { fg: 'border.subtle' },
    }),
    chip(9, B(714, 1092, 54, 113)),
    // ---- the action
    el('16.create', 'ui:Button', B(79, 1235, 610, 61), {
      tokens: { bg: 'action.primary', radius: 'sm' },
      icon: 'arrow-right',
      binding: 'static:palettes.createAndSave',
      action: 'submit:palette.save',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    {
      what: 'presentation',
      note: 'the OS home indicator, which no surface of the app draws',
      box: B(269, 1355, 229, 10),
    },
  ],
  departures: [
    {
      rule: 'E2',
      element: '16.matrix.contrast.value',
      why: 'the WCAG ratio and the APCA Lc are shown as two figures — APCA has no ratio (FR-3, §4 row 07 16)',
    },
    {
      rule: 'E2',
      element: '16.matrix.separation.value',
      why: 'the computed separation score (FR-5) for the palette shown, printing 100 only when it is 100; a safety claim about people does not ship',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '16.slots.slot-1.swatch',
        '16.slots.slot-2.swatch',
        '16.slots.slot-3.swatch',
        '16.slots.slot-4.swatch',
        '16.tray.chip-1',
        '16.tray.chip-2',
        '16.tray.chip-3',
        '16.tray.chip-4',
        '16.tray.chip-5',
        '16.tray.chip-6',
        '16.tray.chip-7',
        '16.tray.chip-8',
        '16.tray.chip-9',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
  ],
};
