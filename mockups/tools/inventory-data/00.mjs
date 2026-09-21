// Board 00 — components and design system. A landscape sheet (1376 × 768) of outlined panels in three
// columns on the ground. It fixes the component vocabulary and draws at no screen's scale, so every
// element carries dp: null and a screen decides its size (P3). Every box is a pixel reading
// (measure.ps1 blobs/edges; corners by corner.ps1 with the baseline-corrected fit).
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
const serif = (size) => ({ face: 'serif', size, weight: 400 });
const sans = (size, weight = 400) => ({ face: 'sans', size, weight });
const swatch = { keyline: 'keyline', radius: 'sm' };
const caption = (parent, lines) => ({
  parent,
  tokens: { fg: 'text.secondary' },
  type: sans('caption'),
  copy: { shape: 'caption', script: 'latin', lines },
});

export default {
  kind: 'board',
  governs: 'vocabulary',
  frame: { kind: 'board', screens: [{ id: '00.board', box: B(0, 0, 1376, 768), dpPerPx: null }] },
  elements: [
    // ---- column 1: brand mark and lockup
    el('00.mark', 'ui:Mark', B(82, 94, 88, 86)),
    el('00.wordmark', 'ui:Wordmark', B(189, 109, 222, 56), {
      tokens: { fg: 'text.primary' },
      type: serif('display1'),
      copy: { shape: 'heading', script: 'latin' },
    }),
    // ---- column 1: typography hierarchy (the four sizes §5 adopts)
    el('00.type.display1', 'ui:Text', B(55, 280, 199, 52), {
      tokens: { fg: 'text.primary' },
      type: serif('display1'),
      copy: { shape: 'heading', script: 'latin' },
    }),
    el('00.type.title', 'ui:Text', B(55, 349, 60, 25), {
      tokens: { fg: 'text.primary' },
      type: serif('title'),
      copy: { shape: 'heading', script: 'latin' },
    }),
    el('00.type.body', 'ui:Text', B(55, 396, 38, 18), {
      tokens: { fg: 'text.primary' },
      type: sans('body'),
      copy: { shape: 'body', script: 'latin' },
    }),
    el('00.type.tabular', 'ui:Text', B(291, 396, 148, 61), {
      tokens: { fg: 'text.primary' },
      type: { ...sans('body'), tabular: true },
      copy: { shape: 'value', script: 'figures', lines: 3 },
    }),
    el('00.type.label', 'ui:Text', B(55, 431, 30, 13), {
      tokens: { fg: 'text.primary' },
      type: sans('label'),
      copy: { shape: 'label', script: 'latin' },
    }),
    // ---- column 1: swatch wells — each swatch, then what is drawn under it
    el('00.wells.hero', 'ui:Swatch', B(53, 549, 116, 115), {
      tokens: swatch,
      raw: { cornerPx: 7 },
    }),
    el('00.wells.hero.caption', 'ui:Text', B(54, 673, 68, 39), caption('00.wells.hero', 3)),
    el('00.wells.detail', 'ui:Swatch', B(182, 553, 103, 111), { tokens: swatch }),
    el('00.wells.detail.caption', 'ui:Text', B(182, 674, 74, 39), caption('00.wells.detail', 3)),
    el('00.wells.list-a', 'ui:Swatch', B(300, 553, 52, 53), { tokens: swatch }),
    el('00.wells.list-b', 'ui:Swatch', B(300, 611, 52, 53), { tokens: swatch }),
    el('00.wells.strip-a', 'ui:Swatch', B(377, 597, 45, 31), { tokens: swatch }),
    el('00.wells.strip-b', 'ui:Swatch', B(377, 633, 45, 31), { tokens: swatch }),

    // ---- column 2: swatch wells — text drawn ON the two large samples
    el('00.wells2.hero', 'ui:Swatch', B(488, 88, 144, 161), {
      tokens: swatch,
      raw: { cornerPx: 7.5 },
    }),
    el('00.wells2.hero.name', 'ui:Text', B(500, 200, 71, 35), {
      parent: '00.wells2.hero',
      type: sans('label'),
      copy: { shape: 'label', script: 'latin', lines: 3 },
    }),
    el('00.wells2.detail', 'ui:Swatch', B(645, 88, 123, 161), {
      tokens: swatch,
      raw: { cornerPx: 6.5 },
    }),
    el('00.wells2.detail.name', 'ui:Text', B(656, 200, 79, 35), {
      parent: '00.wells2.detail',
      type: sans('label'),
      copy: { shape: 'label', script: 'latin', lines: 3 },
    }),
    el('00.wells2.list48', 'ui:Swatch', B(781, 88, 107, 85), {
      tokens: swatch,
      raw: { cornerPx: 7.5 },
    }),
    el('00.wells2.list', 'ui:Swatch', B(488, 285, 61, 44), {
      tokens: swatch,
      raw: { cornerPx: 6.5 },
    }),
    el('00.wells2.akabeni', 'ui:Swatch', B(560, 298, 74, 31), { tokens: swatch }),
    el(
      '00.wells2.akabeni.caption',
      'ui:Text',
      B(561, 330, 71, 43),
      caption('00.wells2.akabeni', 3),
    ),
    el('00.wells2.tetsukon', 'ui:Swatch', B(643, 298, 76, 31), { tokens: swatch }),
    el(
      '00.wells2.tetsukon.caption',
      'ui:Text',
      B(645, 330, 71, 43),
      caption('00.wells2.tetsukon', 3),
    ),
    el('00.wells2.delta', 'ui:Chip', B(727, 297, 77, 32), {
      tokens: { radius: 'md' },
      copy: { shape: 'badge', script: 'figures' },
      raw: { cornerPx: 8.25 },
    }),
    el('00.wells2.delta.caption', 'ui:Text', B(730, 330, 71, 19), caption('00.wells2.delta', 1)),
    el('00.wells2.daylight', 'ui:Pair', B(812, 297, 76, 32), {
      tokens: swatch,
      raw: { cornerPx: 6.75 },
    }),
    el(
      '00.wells2.daylight.caption',
      'ui:Text',
      B(814, 330, 72, 20),
      caption('00.wells2.daylight', 1),
    ),

    // ---- column 2: buttons and controls
    el('00.buttons.primary', 'ui:Button', B(487, 476, 194, 42), {
      tokens: { bg: 'action.primary', radius: 'pill' },
      type: sans('body', 500),
      copy: { shape: 'label', script: 'latin' },
      raw: { cornerPx: 23.25 },
    }),
    el('00.buttons.icon-camera', 'ui:Button', B(710, 478, 36, 37), {
      tokens: { bg: 'level2' },
      icon: 'camera',
      raw: { cornerPx: 5.5 },
    }),
    el('00.buttons.icon-image', 'ui:Button', B(757, 478, 36, 37), {
      tokens: { bg: 'level2' },
      icon: 'image',
    }),
    el('00.buttons.icon-palette', 'ui:Button', B(804, 478, 37, 37), {
      tokens: { bg: 'level2' },
      icon: 'palette-solid',
    }),
    el('00.buttons.icon-settings', 'ui:Button', B(851, 478, 36, 37), {
      tokens: { bg: 'level2' },
      icon: 'settings',
    }),
    el('00.buttons.secondary', 'ui:Button', B(488, 535, 192, 37), {
      tokens: { border: 'border.strong', radius: 'pill' },
      type: sans('body'),
      copy: { shape: 'label', script: 'latin' },
    }),
    el('00.buttons.switch', 'ui:Switch', B(595, 592, 47, 25)),
    el('00.buttons.choice', 'ui:ChoiceGroup', B(594, 635, 177, 30), {
      copy: { shape: 'label', script: 'latin' },
    }),
    el('00.buttons.slider', 'ui:Slider', B(594, 684, 294, 28)),

    // ---- column 3: buttons and controls, second rendering
    el('00.controls.primary', 'ui:Button', B(937, 91, 186, 35), {
      tokens: { bg: 'action.primary', radius: 'pill' },
      type: sans('body', 500),
      copy: { shape: 'label', script: 'latin' },
    }),
    el('00.controls.icon-camera', 'ui:Button', B(1153, 91, 33, 33), {
      tokens: { bg: 'level2' },
      icon: 'camera',
    }),
    el('00.controls.icon-edit', 'ui:Button', B(1198, 91, 33, 33), {
      tokens: { bg: 'level2' },
      icon: 'edit',
    }),
    // Rebound by F-228: drawn as a box with an arrow leaving its corner — an EXTERNAL glyph. It was
    // recorded as `share`, which every screen draws as a tray with an arrow up (06 20 23 24 26), so
    // one name would have drawn two shapes.
    el('00.controls.icon-external', 'ui:Button', B(1243, 91, 32, 33), {
      tokens: { bg: 'level2' },
      icon: 'external',
    }),
    el('00.controls.icon-contrast', 'ui:Button', B(1288, 91, 32, 33), {
      tokens: { bg: 'level2' },
      icon: 'contrast',
    }),
    el('00.controls.secondary', 'ui:Button', B(938, 138, 185, 34), {
      tokens: { border: 'border.strong', radius: 'pill' },
      type: sans('body'),
      copy: { shape: 'label', script: 'latin' },
    }),
    el('00.controls.icon-camera-2', 'ui:Button', B(1153, 138, 33, 34), {
      tokens: { bg: 'level2' },
      icon: 'camera',
    }),
    el('00.controls.icon-palette', 'ui:Button', B(1198, 138, 33, 34), {
      tokens: { bg: 'level2' },
      icon: 'palette',
    }),
    el('00.controls.icon-edit-2', 'ui:Button', B(1242, 138, 34, 34), {
      tokens: { bg: 'level2' },
      icon: 'edit',
    }),
    el('00.controls.icon-wheel', 'ui:Button', B(1287, 138, 34, 34), {
      tokens: { bg: 'level2' },
      icon: 'colour-wheel',
    }),
    el('00.controls.switch-on', 'ui:Switch', B(936, 226, 50, 27)),
    el('00.controls.switch-off', 'ui:Switch', B(998, 227, 46, 25)),
    el('00.controls.choice', 'ui:ChoiceGroup', B(1075, 225, 123, 29), {
      copy: { shape: 'label', script: 'figures' },
    }),
    el('00.controls.slider', 'ui:Slider', B(1229, 228, 91, 22)),

    // ---- column 3: elevated cards and sheets
    el('00.cards.level1', 'ui:Card', B(935, 376, 122, 120), {
      tokens: { bg: 'level1' },
      raw: { cornerPx: 6.25 },
    }),
    el('00.cards.level2', 'ui:Card', B(1067, 379, 125, 117), { tokens: { bg: 'level2' } }),
    el('00.cards.level3', 'ui:Card', B(1201, 379, 121, 115), { tokens: { bg: 'level3' } }),

    // ---- column 3: vector art and empty states (line-art INSIDE a panel is a drawn component)
    el('00.art.kimono', 'ui:Illustration', B(939, 598, 125, 107), { illustration: 'kimono' }),
    el('00.art.viewfinder', 'ui:Illustration', B(1083, 600, 106, 99), {
      illustration: 'viewfinder',
    }),
    el('00.empty', 'ui:EmptyState', B(1220, 610, 81, 83)),
    el('00.empty.art', 'ui:Illustration', B(1233, 610, 55, 42), {
      parent: '00.empty',
      illustration: 'no-results',
    }),
    el('00.empty.message', 'ui:Text', B(1220, 665, 81, 28), {
      parent: '00.empty',
      tokens: { fg: 'text.secondary' },
      type: sans('caption'),
      copy: { shape: 'body', script: 'latin', lines: 2 },
    }),
  ],
  notDesign: [
    // the sheet's own organisation
    { what: 'board-annotation', note: 'section title, brand', box: B(54, 45, 173, 12) },
    { what: 'board-annotation', note: 'section title, typography', box: B(54, 236, 189, 14) },
    { what: 'board-annotation', note: 'section title, swatch wells', box: B(54, 506, 213, 15) },
    { what: 'board-annotation', note: 'section title, swatch wells', box: B(487, 44, 214, 15) },
    {
      what: 'board-annotation',
      note: 'section title, buttons and controls',
      box: B(488, 425, 224, 14),
    },
    {
      what: 'board-annotation',
      note: 'section title, buttons and controls',
      box: B(937, 45, 226, 13),
    },
    {
      what: 'board-annotation',
      note: 'section title, cards and sheets',
      box: B(937, 337, 200, 13),
    },
    {
      what: 'board-annotation',
      note: 'section title, vector art and empty states',
      box: B(936, 546, 218, 13),
    },
    { what: 'board-annotation', note: 'panel frame', box: B(39, 67, 415, 139) },
    { what: 'board-annotation', note: 'panel frame', box: B(39, 259, 415, 219) },
    { what: 'board-annotation', note: 'panel frame', box: B(39, 529, 415, 205) },
    { what: 'board-annotation', note: 'panel frame', box: B(472, 67, 431, 329) },
    { what: 'board-annotation', note: 'panel frame', box: B(472, 447, 431, 287) },
    { what: 'board-annotation', note: 'panel frame', box: B(922, 67, 414, 239) },
    { what: 'board-annotation', note: 'panel frame', box: B(922, 358, 414, 158) },
    { what: 'board-annotation', note: 'panel frame', box: B(922, 567, 414, 167) },
    {
      what: 'board-annotation',
      note: 'component names under the icon buttons',
      box: B(938, 180, 61, 11),
    },
    {
      what: 'board-annotation',
      note: 'component names under the icon buttons',
      box: B(1153, 180, 62, 10),
    },
    { what: 'board-annotation', note: 'control name', box: B(938, 261, 75, 14) },
    { what: 'board-annotation', note: 'control name', box: B(1076, 262, 71, 12) },
    { what: 'board-annotation', note: 'control name', box: B(1230, 261, 31, 12) },
    { what: 'board-annotation', note: 'control name', box: B(488, 644, 79, 15) },
    { what: 'board-annotation', note: 'control name', box: B(488, 691, 35, 13) },
    { what: 'board-annotation', note: 'swatch name under a sample', box: B(488, 330, 61, 46) },
    // sizes printed from the generation prompt (§2)
    { what: 'leaked-label', note: 'a type size in px', box: B(292, 306, 35, 18) },
    { what: 'leaked-label', note: 'a type size in px', box: B(292, 359, 36, 18) },
    { what: 'leaked-label', note: 'a type size in px', box: B(199, 396, 34, 17) },
    { what: 'leaked-label', note: 'a type size in px', box: B(198, 431, 28, 15) },
    { what: 'leaked-label', note: 'swatch name and size in px', box: B(300, 673, 68, 39) },
    { what: 'leaked-label', note: 'swatch name and size in px', box: B(378, 673, 62, 27) },
    { what: 'leaked-label', note: 'swatch name and size in px', box: B(489, 255, 94, 12) },
    { what: 'leaked-label', note: 'swatch name and size in px', box: B(645, 255, 99, 12) },
    { what: 'leaked-label', note: 'swatch name and size in px', box: B(781, 179, 84, 13) },
    // misspellings (§2)
    {
      what: 'garbled-text',
      note: 'the toggle is labelled with a misspelling',
      box: B(488, 598, 93, 16),
    },
    {
      what: 'garbled-text',
      note: 'the third choice reads as a misspelling',
      box: B(594, 635, 177, 30),
    },
    {
      what: 'garbled-text',
      note: 'the empty-state message ends in a misspelling',
      box: B(1220, 665, 81, 28),
    },
    // line-art outside every panel (§2)
    { what: 'outside-art', note: 'sakura, top right', box: B(1265, 13, 66, 53) },
    { what: 'outside-art', note: 'sakura beside a section title', box: B(1289, 328, 47, 28) },
    { what: 'outside-art', note: 'sakura beside a section title', box: B(1305, 538, 26, 28) },
    {
      what: 'outside-art',
      note: 'geometric line-art at the right edge',
      box: B(1337, 155, 39, 206),
    },
    {
      what: 'outside-art',
      note: 'geometric line-art at the right edge',
      box: B(1337, 663, 39, 105),
    },
  ],
  departures: [
    {
      rule: 'E2',
      element: '00.wells2.delta.caption',
      why: 'the caption under the ΔE00 badge draws an absolute colour-vision safety claim; it shows the computed separation (FR-5) for the colours shown, and the model it was computed under',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '00.wells.hero',
        '00.wells.detail',
        '00.wells.list-a',
        '00.wells.list-b',
        '00.wells.strip-a',
        '00.wells.strip-b',
        '00.wells2.hero',
        '00.wells2.detail',
        '00.wells2.list48',
        '00.wells2.list',
        '00.wells2.akabeni',
        '00.wells2.tetsukon',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C4',
      elements: ['00.mark', '00.wordmark'],
      resolution:
        "00's coral outline mark and its lockup are not used: mark geometry comes from 14 and the in-app lockup from 01, monochrome",
      flippedByUser: false,
    },
    {
      id: 'C5',
      elements: ['00.cards.level1'],
      resolution:
        'P3: the screens draw level 1 as #20232A; the white card on the board is not the level 1 surface',
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: ['00.wells2.hero.name', '00.wells2.detail.name'],
      resolution:
        'text on a sample takes, per sample, whichever of the two text colours passes 4.5:1 (E3), so no token is fixed here',
      flippedByUser: false,
    },
  ],
};
