// Mockup 27 — the states board: four state cards on one landscape sheet (1376 × 768). A variant — it
// governs state content only (§3 P2), for Wardrobe's empty state and the Lens's loading, refused and
// permission states. A board draws at no screen's scale, so no element has a dp and every type size is
// the step the element's role takes on the screen that shows it (P3: the screen decides the size);
// radii are recorded in px (raw) beside the token 00's cards use. Boxes are pixel readings
// (measure.ps1, corner.ps1). The board's title and the four state names above the cards are board
// labels, not design. Elements are listed card by card, left to right — the reading rule applies to a
// screen, not a sheet.
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
    type: text('sans', 'body'),
    binding,
    copy: { shape: 'body', script: 'latin' },
    ...extra,
  });
const card = (id, component, box, cornerPx) =>
  el(id, component, box, {
    tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
    raw: { cornerPx },
  });
const title = (id, box, parent, binding, lines) =>
  t(id, box, parent, binding, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'title', 600),
    copy: { shape: 'heading', script: 'latin', lines },
  });
const body = (id, box, parent, binding, lines) =>
  t(id, box, parent, binding, {
    tokens: { fg: 'text.secondary' },
    copy: { shape: 'body', script: 'latin', lines },
  });
const button = (id, box, parent, binding, action) =>
  el(id, 'ui:Button', box, {
    parent,
    tokens: { bg: 'action.primary', radius: 'pill' },
    raw: { cornerPx: 18.25 },
    binding,
    action,
    copy: { shape: 'label', script: 'latin' },
  });

export default {
  kind: 'board',
  governs: 'state',
  frame: { kind: 'board', screens: [{ id: '27.board', box: B(0, 0, 1376, 768), dpPerPx: null }] },
  elements: [
    // ---- Wardrobe, empty
    card('27.wardrobe-empty', 'ui:EmptyState', B(55, 184, 297, 544), 10.5),
    el('27.wardrobe-empty.art', 'ui:Illustration', B(116, 253, 175, 127), {
      parent: '27.wardrobe-empty',
      illustration: 'hanger',
    }),
    title(
      '27.wardrobe-empty.title',
      B(103, 416, 200, 56),
      '27.wardrobe-empty',
      'static:wardrobe.empty.title',
      2,
    ),
    body(
      '27.wardrobe-empty.body',
      B(84, 491, 239, 84),
      '27.wardrobe-empty',
      'static:wardrobe.empty.body',
      4,
    ),
    button(
      '27.wardrobe-empty.scan',
      B(76, 653, 255, 46),
      '27.wardrobe-empty',
      'static:wardrobe.empty.scan',
      'navigate:/lens',
    ),
    // ---- the Lens, working
    card('27.lens-working', 'ui:Card', B(378, 184, 298, 543), 9.5),
    el('27.lens-working.progress', 'new:ProgressRing', B(458, 253, 138, 138), {
      parent: '27.lens-working',
      tokens: { fg: 'text.primary', track: 'border.subtle' },
      binding: 'engine:lens.progress',
    }),
    el('27.lens-working.mark', 'ui:Mark', B(487, 283, 78, 78), {
      parent: '27.lens-working.progress',
      measured: { fg: '#E2B5EC' },
    }),
    el('27.lens-working.step-1', 'ui:Chip', B(406, 427, 241, 30), {
      parent: '27.lens-working',
      tokens: { bg: 'level2', radius: 'sm' },
      binding: 'engine:lens.pipeline.0',
      copy: { shape: 'badge', script: 'latin' },
    }),
    el('27.lens-working.step-2', 'ui:Chip', B(400, 464, 254, 29), {
      parent: '27.lens-working',
      tokens: { bg: 'level2', radius: 'sm' },
      binding: 'engine:lens.pipeline.1',
      copy: { shape: 'badge', script: 'latin' },
    }),
    title(
      '27.lens-working.title',
      B(429, 535, 196, 51),
      '27.lens-working',
      'static:lens.working.title',
      2,
    ),
    body(
      '27.lens-working.body',
      B(409, 610, 234, 37),
      '27.lens-working',
      'static:lens.working.body',
      2,
    ),
    // ---- the Lens, refused
    card('27.lens-refused', 'ui:Card', B(700, 209, 298, 518), 10.5),
    el('27.lens-refused.icon', null, B(800, 278, 99, 99), {
      parent: '27.lens-refused',
      tokens: { radius: 'md' },
      icon: 'glare',
      measured: { bg: '#574835' },
    }),
    title(
      '27.lens-refused.title',
      B(763, 412, 173, 80),
      '27.lens-refused',
      'static:lens.refused.title',
      3,
    ),
    body(
      '27.lens-refused.body',
      B(724, 516, 251, 62),
      '27.lens-refused',
      'engine:lens.refusal.reason',
      3,
    ),
    button(
      '27.lens-refused.retry',
      B(721, 653, 256, 46),
      '27.lens-refused',
      'static:lens.refused.retry',
      'submit:lens.retry',
    ),
    // ---- the Lens, camera permission denied
    card('27.lens-permission', 'ui:Card', B(1024, 209, 297, 518), 9.5),
    el('27.lens-permission.icon', null, B(1122, 286, 105, 89), {
      parent: '27.lens-permission',
      icon: 'camera-locked',
    }),
    title(
      '27.lens-permission.title',
      B(1080, 411, 185, 51),
      '27.lens-permission',
      'static:lens.permission.title',
      2,
    ),
    body(
      '27.lens-permission.body',
      B(1053, 486, 238, 61),
      '27.lens-permission',
      'static:lens.permission.body',
      3,
    ),
    button(
      '27.lens-permission.settings',
      B(1045, 653, 255, 46),
      '27.lens-permission',
      'static:lens.permission.openSettings',
      'open:device.settings',
    ),
  ],
  notDesign: [
    { what: 'board-annotation', note: 'the board’s title', box: B(58, 59, 1050, 46) },
    { what: 'board-annotation', note: 'the first card’s state name', box: B(89, 148, 228, 23) },
    { what: 'board-annotation', note: 'the second card’s state name', box: B(397, 149, 260, 22) },
    { what: 'board-annotation', note: 'the third card’s state name', box: B(712, 148, 274, 48) },
    { what: 'board-annotation', note: 'the fourth card’s state name', box: B(1055, 149, 235, 47) },
  ],
  departures: [
    {
      rule: 'E2',
      element: '27.lens-refused.title',
      why: 'a camera estimate is never called a measurement (golden rule 11, §4 row 02 27): the refused state names a reading',
    },
    {
      rule: 'E2',
      element: '27.lens-working.step-1',
      why: 'an RGB camera has no spectral data to extract (§4 row 27); the line names the pipeline’s real step',
    },
    {
      rule: 'E2',
      element: '27.lens-working.step-2',
      why: 'D65 is ≈6504 K, not 5500 K (§4 row 27); the line names the pipeline’s real step and its real illuminant',
    },
  ],
  conflicts: [
    {
      id: 'C10',
      elements: [
        '27.wardrobe-empty.art',
        '27.lens-working.mark',
        '27.lens-refused.icon',
        '27.lens-permission.icon',
      ],
      resolution:
        'followed: the tan, amber and purple state art carries text (golden rule 13) and is declared a chroma-ceiling exception by F-225; the purple mark here is the one place the mark takes a tint',
      flippedByUser: false,
    },
  ],
};
