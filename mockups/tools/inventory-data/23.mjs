// Mockup 23 — Personal Colour Profile, finished: the governing state of /profile (§6 C15). Drawn as a
// phone screen with no bezel; its fill is within a few levels of the ground, so its edges were read at
// a low threshold: the screen is 540 px wide (x 114–653, y 88–1298), so 384 / 540 = 0.7111 dp per px
// (§2). Boxes are pixel readings (measure.ps1, corner.ps1). Derived, and saying so: the third kasane
// strip and its caption run off the card to the screen's edge and merge in one blob, so their rows are
// the first two strips' and their columns the blob's; the history card runs on under the action bar,
// so its box stops at the bar's rule. The generator orders elements by the reading rule. Type size as
// in 02.mjs, the em converted at 0.7111 dp per px; ties between two steps take the smaller.
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
const sized = (size, emDp, weight = 400) => ({
  type: text('sans', size, weight),
  ...(emDp ? { raw: { emDp } } : {}),
});

const dimension = (key, d) => {
  const p = `23.profile.${key}`;
  return [
    t(`${p}.label`, d.label, '23.profile', `static:profile.dimension.${key}`, {
      tokens: { fg: 'text.primary' },
      ...sized(d.labelSize, d.labelEm),
    }),
    t(`${p}.value`, d.value, '23.profile', `engine:profile.dimensions.${key}.label`, {
      tokens: { fg: 'text.primary' },
      ...sized(d.valueSize, d.valueEm),
      copy: { shape: 'value', script: 'mixed' },
    }),
    el(`${p}.range`, 'ui:Slider', d.range, {
      parent: '23.profile',
      tokens: { fg: 'text.primary' },
      binding: `engine:profile.dimensions.${key}.range`,
    }),
    t(`${p}.low`, d.low, '23.profile', `static:profile.dimension.${key}.low`, {
      tokens: { fg: 'text.secondary' },
      ...sized('body'),
    }),
    t(`${p}.confidence`, d.note, '23.profile', `engine:profile.dimensions.${key}.confidence`, {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'caption', script: 'latin' },
    }),
    t(`${p}.high`, d.high, '23.profile', `static:profile.dimension.${key}.high`, {
      tokens: { fg: 'text.secondary' },
      ...sized('body'),
    }),
  ];
};
const rule = (n, box) =>
  el(`23.profile.rule-${n}`, null, box, { parent: '23.profile', tokens: { fg: 'border.subtle' } });
const kasane = (n, strip, caption) => [
  el(`23.palettes.kasane-${n}`, 'new:KasaneStrip', strip, {
    parent: '23.palettes',
    tokens: { radius: 'md' },
    binding: `engine:profile.palettes.${n - 1}`,
  }),
  t(`23.palettes.kasane-${n}.name`, caption, '23.palettes', `corpus:kasane.${n - 1}.name`, {
    tokens: { fg: 'text.primary' },
    ...sized('body'),
    copy: { shape: 'label', script: 'latin', lines: 2 },
  }),
];

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'device',
    screens: [{ id: '23.screen', box: B(114, 88, 540, 1211), dpPerPx: 0.7111 }],
  },
  elements: [
    // ---- header
    el('23.avatar', 'new:Avatar', B(135, 162, 51, 50), { binding: 'store:profile.avatar' }),
    el('23.title', 'ui:Text', B(251, 163, 267, 22), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
      binding: 'static:profile.title',
      copy: { shape: 'heading', script: 'latin' },
    }),
    el('23.subtitle', 'ui:Text', B(306, 194, 154, 18), {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'label'),
      binding: 'static:profile.titleJa',
      copy: { shape: 'label', script: 'japanese' },
    }),
    el('23.share', 'ui:Button', B(601, 170, 28, 33), {
      icon: 'share',
      action: 'open:share.profile',
    }),
    // ---- the profile
    el('23.profile', 'ui:Card', B(135, 236, 497, 568), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1F2229' },
    }),
    el('23.profile.label', 'ui:Chip', B(203, 256, 362, 41), {
      parent: '23.profile',
      tokens: { radius: 'md' },
      binding: 'derived:F-223',
      copy: { shape: 'badge', script: 'latin' },
    }),
    rule(1, B(154, 312, 460, 2)),
    ...dimension('temperature', {
      label: B(155, 334, 129, 22),
      labelSize: 'body',
      value: B(501, 334, 113, 20),
      valueSize: 'title',
      valueEm: 19.5,
      range: B(153, 365, 462, 26),
      low: B(154, 397, 39, 18),
      note: B(245, 398, 249, 19),
      high: B(562, 398, 51, 16),
    }),
    rule(2, B(154, 434, 459, 2)),
    ...dimension('depth', {
      label: B(155, 456, 61, 22),
      labelSize: 'body',
      value: B(417, 456, 197, 24),
      valueSize: 'title',
      valueEm: 18.4,
      range: B(153, 487, 457, 27),
      low: B(155, 520, 44, 20),
      note: B(249, 520, 241, 19),
      high: B(567, 520, 47, 20),
    }),
    rule(3, B(154, 556, 459, 2)),
    ...dimension('chroma', {
      label: B(154, 578, 185, 20),
      labelSize: 'body',
      labelEm: 19.5,
      value: B(497, 578, 117, 20),
      valueSize: 'title',
      valueEm: 19.5,
      range: B(153, 609, 461, 28),
      low: B(154, 641, 55, 18),
      note: B(246, 642, 248, 19),
      high: B(570, 641, 43, 17),
    }),
    rule(4, B(154, 678, 460, 2)),
    ...dimension('contrast', {
      label: B(154, 700, 203, 20),
      labelSize: 'body',
      labelEm: 19.5,
      value: B(465, 700, 149, 20),
      valueSize: 'title',
      valueEm: 19.5,
      range: B(153, 731, 461, 28),
      low: B(155, 765, 35, 16),
      note: B(250, 764, 267, 19),
      high: B(573, 763, 40, 21),
    }),
    // ---- the recommended kasane (the third runs off the screen's edge)
    el('23.palettes', 'ui:Card', B(137, 821, 495, 191), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1E2228' },
    }),
    t(
      '23.palettes.heading',
      B(154, 843, 443, 22),
      '23.palettes',
      'static:profile.palettes.heading',
      {
        tokens: { fg: 'text.primary' },
        ...sized('body', null, 500),
        copy: { shape: 'heading', script: 'latin' },
      },
    ),
    ...kasane(1, B(153, 876, 167, 64), B(154, 952, 115, 41)),
    ...kasane(2, B(329, 876, 167, 64), B(331, 953, 152, 37)),
    ...kasane(3, B(506, 876, 144, 64), B(507, 952, 143, 41)),
    // ---- calibration history (runs on under the action bar)
    el('23.history', 'ui:Card', B(137, 1029, 494, 74), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
    }),
    el('23.history.icon', null, B(154, 1047, 49, 49), {
      parent: '23.history',
      tokens: { bg: 'level2', radius: 'sm' },
      icon: 'history',
    }),
    t('23.history.title', B(214, 1051, 266, 22), '23.history', 'static:profile.history', {
      tokens: { fg: 'text.primary' },
      ...sized('body', null, 500),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t('23.history.detail', B(215, 1077, 334, 19), '23.history', 'oq:OQ-9', {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'value', script: 'mixed' },
    }),
    // ---- actions
    el('23.actions', 'app:ActionBar', B(114, 1102, 540, 196), {
      tokens: { border: 'border.subtle' },
    }),
    el('23.actions.retake', 'ui:Button', B(134, 1122, 499, 57), {
      parent: '23.actions',
      tokens: { bg: 'action.primary', radius: 'md' },
      binding: 'static:profile.retake',
      action: 'submit:profile.retake',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('23.actions.export', 'ui:Button', B(136, 1188, 496, 55), {
      parent: '23.actions',
      tokens: { border: 'border.subtle', radius: 'md' },
      binding: 'static:profile.exportPdf',
      action: 'navigate:/profile/export',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    {
      what: 'status-bar',
      note: 'a device status bar drawn into the render (9:41, signal, battery)',
      box: B(130, 104, 510, 28),
    },
    {
      what: 'presentation',
      note: 'the OS home indicator, which no surface of the app draws',
      box: B(286, 1268, 196, 10),
    },
    {
      what: 'outside-art',
      note: 'kimono and blossom line-art left of the screen',
      box: B(0, 0, 110, 1376),
    },
    {
      what: 'outside-art',
      note: 'kimono and blossom line-art right of the screen',
      box: B(660, 0, 108, 1376),
    },
    { what: 'outside-art', note: 'kimono line-art above the screen', box: B(110, 0, 550, 81) },
    { what: 'outside-art', note: 'kimono line-art below the screen', box: B(110, 1311, 550, 65) },
  ],
  departures: [],
  conflicts: [
    {
      id: 'C11',
      elements: ['23.palettes.kasane-1', '23.palettes.kasane-2', '23.palettes.kasane-3'],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C15',
      elements: ['23.title', '23.profile'],
      resolution: '23 is the finished state of profile/index; 17 is its in-progress state',
      flippedByUser: false,
    },
    {
      id: 'C14',
      elements: ['23.palettes.kasane-1', '23.palettes.kasane-2', '23.palettes.kasane-3'],
      resolution: 'F-224 authors the kasane palettes, labelled japanese-inspired (FR-23)',
      flippedByUser: false,
    },
    {
      id: 'C10',
      elements: [
        '23.profile.label',
        '23.profile.temperature.range',
        '23.profile.depth.range',
        '23.profile.chroma.range',
        '23.profile.contrast.range',
      ],
      resolution:
        'followed: the gradient tracks and the brown label pill carry text (golden rule 13) and are declared chroma-ceiling exceptions by F-225',
      flippedByUser: false,
    },
    {
      id: 'C12',
      elements: ['23.profile.label', '23.avatar'],
      resolution:
        'followed: F-223 derives the label from the four ranges with an ADR; F-241 adds an optional on-device avatar with a security review',
      flippedByUser: false,
    },
  ],
};
