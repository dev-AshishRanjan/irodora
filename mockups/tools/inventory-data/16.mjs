// Mockup 16 — Create Custom Palette, the draft state of /atlas/palettes (§3: 16 draft). Full-bleed,
// 768 px → 2 px = 1 dp (§2). Boxes are pixel readings (measure.ps1, corner.ps1). Derived, and saying
// so: the right tray divider's vertical extent is the left divider's (only its column reads at y 1100);
// the cut card under the matrix takes the matrix card's radius, since its corners are hidden by the
// tray; and the matrix card's corner fit, 8 dp, is equidistant from sm (6) and md (10) — md, because
// the cleaner right-hand fit reads 8.75. Slot 1's lock is drawn in colour — questions.md 5; the slot
// headings, roles and actions are printed in square brackets — questions.md 13. The generator orders
// elements by the reading rule. Type size as in 02.mjs.
//
// F-251 RE-READ EVERY BOX, TYPE, CORNER AND INK (2026-11-02), with the Node ports of measure.ps1,
// corner.ps1 and the edge profiles (rebox.cjs re-reads each element's ink box against its local ground):
// - BOXES: every text and glyph box holds within 2 px. The slots, the tray and its dividers read at
//   their edges agree with F-220's (slot 1 297–519 and 81–375; the tray's rules 1075 and 1218; the bar's
//   rule 98–99), the larger boxes the script read being the cards' shadows.
// - TYPE (caps ≈ box/0.73): the title's C 19 px (12.3 dp) — label, as recorded; the field's K 19 px —
//   label. Every other text inks 16–17 px of capital (11–11.6 dp): `caption` — back, Save, the chips,
//   the slot headings, hexes (F-220: label 600), names and roles, Locked and Replace, the matrix's title
//   (F-220: label 600), labels and values, and Create & Save. The tray's kanji ink 23 px (12.6 dp) —
//   label.
// - CORNERS (corner.ps1, px): the name card 10.5, slot 1 10.25, the matrix 9 (F-220: md, a tie it broke
//   on a cleaner fit; this reading is not a tie), the samples 7.75, the field 10–10.5, Save 9.5,
//   Create & Save 9 — every one `sm`.
// - THE TRAY'S TILES are the colour with a band over their lower half darkened about 15 % (#E6E3DC over
//   #C5C1BA, #566672 over #4B5760, #A18063 over #886E55, from row 1146 of 1092–1205) that holds the
//   kanji. A darkened part of a sample is not the colour: the tile is drawn whole (E1, as 12's woven
//   texture is). Their widths vary 60–81 px with their sample names: siblings, one width.
// - THE LOWER RIGHT ART is a basket weave clipped to a circle, not asanoha; the product's `sashiko`
//   stands for it (ADR-0166 D7), a difference the person's comparison lists.
// - THE CARD CUT UNDER THE MATRIX is a card's top whose content no image draws: not design.
// - BRACKETS around the slot headings, roles, Locked and Replace are notation (OQ-23, ADR-0163).
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
    type: text('sans', 'caption'),
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
    // A light keyline reads on slots 1 and 3 (F-233: +0.17 and +0.09 over both sides on every edge);
    // the four are drawn alike.
    el(`${p}.swatch`, 'ui:Swatch', s.swatch, {
      parent: p,
      tokens: { keyline: 'keyline', radius: 'sm' },
      binding: `store:draft.palette.slot.${n}.hex`,
      measured: { fill: s.fill },
    }),
    t(`${p}.hex`, s.hex, p, `store:draft.palette.slot.${n}.hex`, {
      tokens: { fg: 'text.primary' },
      // F-251: 16 px of digit — 11 dp, `caption` (F-220: label).
      type: text('sans', 'caption', 600, { tabular: true }),
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
    type: text('gothic', 'label'),
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
    // The app bar (F-234): a container for the header, 50 dp, bounded by the rule.
    el('16.header', 'ui:AppBar', B(0, 0, 768, 100)),
    el('16.back', 'ui:Button', B(33, 41, 116, 18), {
      type: text('sans', 'caption'),
      parent: '16.header',
      icon: 'back',
      binding: 'static:palettes.back',
      action: 'navigate:/atlas/palettes',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('16.title', 'ui:Text', B(259, 40, 250, 20), {
      parent: '16.header',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 600),
      binding: 'static:palettes.createTitle',
      copy: { shape: 'heading', script: 'latin' },
    }),
    el('16.save', 'ui:Button', B(582, 24, 159, 51), {
      type: text('sans', 'caption'),
      parent: '16.header',
      tokens: { border: 'border.strong', radius: 'sm' },
      binding: 'static:palettes.save',
      action: 'submit:palette.save',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('16.header-rule', null, B(0, 98, 768, 2), {
      parent: '16.header',
      tokens: { fg: 'border.subtle' },
    }),
    // ---- margin line-art, inside the screen (§2: design)
    el('16.art-left', 'ui:Illustration', B(0, 332, 80, 417), { illustration: 'kimono' }),
    el('16.art-right-top', 'ui:Illustration', B(690, 190, 78, 167), { illustration: 'sashiko' }),
    // F-251: 16 draws a basket weave in a circle here; the product's sashiko stands for it (ADR-0166 D7).
    el('16.art-right-bottom', 'ui:Illustration', B(690, 882, 73, 178), { illustration: 'sashiko' }),
    // ---- name and kind
    el('16.name', 'ui:Card', B(76, 126, 616, 148), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1E2126' },
    }),
    el('16.name.field', 'ui:TextField', B(97, 148, 574, 54), {
      type: text('sans', 'label'),
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
      // F-251: 9 px — `sm`; F-220 broke a tie at 8 dp that this reading does not make.
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1D2126' },
    }),
    t('16.matrix.title', B(97, 801, 467, 23), '16.matrix', 'static:palette.matrix.title', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'caption', 600),
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
    // The action bar (F-234): no container is drawn, so its band runs from the action to the
    // frame's bottom, over the home indicator the image draws.
    el('16.actions', 'ui:ActionBar', B(0, 1235, 768, 141)),
    el('16.create', 'ui:Button', B(79, 1235, 610, 61), {
      parent: '16.actions',
      tokens: { bg: 'action.primary', radius: 'sm' },
      type: text('sans', 'caption'),
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
    {
      what: 'presentation',
      note: 'the top of a card under the matrix whose content no image draws (F-251; §2’s cut page)',
      box: B(81, 1057, 606, 13),
    },
    // F-251 (OQ-23, ADR-0163): brackets around a label, role or action are the wireframe's notation.
    {
      what: 'garbled-text',
      note: 'square brackets around slot-1.heading: notation, not copy',
      box: B(101, 315, 238, 22),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around slot-2.heading: notation, not copy',
      box: B(407, 316, 182, 22),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around slot-3.heading: notation, not copy',
      box: B(100, 554, 149, 20),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around slot-4.heading: notation, not copy',
      box: B(407, 553, 192, 22),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around slot-1.role: notation, not copy',
      box: B(216, 488, 110, 18),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around slot-2.role: notation, not copy',
      box: B(407, 488, 155, 19),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around slot-3.role: notation, not copy',
      box: B(101, 726, 126, 18),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around slot-4.role: notation, not copy',
      box: B(408, 726, 108, 19),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around slot-2.replace: notation, not copy',
      box: B(576, 487, 95, 19),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around slot-3.replace: notation, not copy',
      box: B(266, 726, 96, 19),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around slot-4.replace: notation, not copy',
      box: B(576, 725, 96, 21),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around slot-1.locked: notation, not copy',
      box: B(102, 487, 103, 19),
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
    {
      rule: 'E2',
      element: '16.matrix.harmony.value',
      why: 'the colours’ warm–cool relation in 07’s words (FR-6, E-226); Tonal Kasane Complement names a relation no engine computes and claims a tradition (ADR-0164 D6)',
    },
    {
      rule: 'E2',
      element: '16.name.kind.editorial',
      why: 'Seasonal (the seasonal category): Editorial would present a person’s palette as editorial work (ADR-0067; ADR-0164 D7)',
    },
    {
      rule: 'E1',
      element: '16.name.field',
      why: 'the field holds the person’s name for the palette; 16’s Kyoto Autumn Linen Capsule, its slots’ names and hexes, and the tray’s tiles are sample content (ADR-0164)',
    },
    {
      rule: 'E1',
      element: '16.tray.chip-6',
      why: 'a tile is the colour whole: 16 darkens each tile’s lower half to hold its kanji, and a darkened part of a sample is not the colour (as 12’s woven texture, §4 E1)',
    },
    {
      rule: 'E4',
      element: '16.slots.slot-1',
      why: 'the empty draft and its empty slots, the edit state’s title and action, the save note, FR-35’s block and the tab bar are drawn by no mockup (ADR-0165)',
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
