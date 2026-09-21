// Mockup 02 — the Lens live viewfinder. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes over the camera
// photograph were read with brightness masks (mask.ps1) or line scans against a control's own fill,
// because a difference-from-background mask fails on a photo. Type size: the em estimated from the
// line box by glyph class (Latin with descenders ≈ box/0.93, with brackets ≈ box/1.05, caps/ascenders/
// digits only ≈ box/0.73, Japanese ≈ box/0.9), snapped to the nearest §5 step (72 · 22 · 16 · 14);
// `caption` marks an em below 12 dp, where §5 names no step (raw.emDp keeps the estimate).
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
const vf = '02.viewfinder';
const mode = (key, box, active = false) =>
  el(`02.modes.${key}`, 'ui:Text', box, {
    parent: '02.modes',
    tokens: { fg: active ? 'text.primary' : 'text.secondary' },
    type: text('sans', 'caption', active ? 500 : 400),
    binding: `static:lens.mode.${key}`,
    action: `select:lens.mode.${key}`,
    copy: { shape: 'label', script: 'latin' },
    raw: { emDp: 11.6 },
  });
const nearest = [
  [B(114, 1005, 178, 67), '#3F5363', B(127, 1015, 143, 23), B(128, 1045, 87, 19)],
  [B(306, 1006, 169, 65), '#203247', B(318, 1015, 142, 23), B(319, 1045, 90, 19)],
  [B(490, 1005, 160, 67), '#364351', B(502, 1015, 134, 23), B(503, 1045, 91, 19)],
];

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '02.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    el('02.title', 'ui:Text', B(220, 47, 328, 31), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 500),
      binding: 'static:lens.title',
      copy: { shape: 'heading', script: 'mixed' },
      raw: { emDp: 21.2 },
    }),
    // ---- the four capture modes
    el('02.modes', 'ui:ChoiceGroup', B(27, 108, 714, 62), {
      tokens: { border: 'border.subtle', radius: 'pill' },
    }),
    el('02.modes.selected', null, B(45, 116, 139, 47), {
      parent: '02.modes',
      tokens: { bg: 'level2', radius: 'pill' },
      measured: { bg: '#2B3139' },
    }),
    el('02.modes.live-dot', null, B(57, 132, 14, 14), {
      parent: '02.modes',
      tokens: { fg: 'text.primary' },
    }),
    mode('live', B(83, 131, 88, 17), true),
    mode('scan', B(214, 131, 142, 17)),
    el('02.modes.divider-1', null, B(373, 123, 3, 32), {
      parent: '02.modes',
      tokens: { fg: 'border.subtle' },
    }),
    mode('target', B(389, 131, 147, 21)),
    el('02.modes.divider-2', null, B(550, 123, 2, 32), {
      parent: '02.modes',
      tokens: { fg: 'border.subtle' },
    }),
    mode('card', B(567, 131, 157, 17)),
    // ---- the viewfinder: the camera preview, and everything laid over it
    el(vf, 'app:CameraPreview', B(27, 199, 714, 1057), {
      tokens: { radius: 'lg' },
      binding: 'engine:lens.preview',
    }),
    el('02.conditions', 'ui:Chip', B(156, 237, 455, 53), {
      parent: vf,
      tokens: { radius: 'pill' },
      binding: 'engine:captureConditions',
      copy: { shape: 'badge', script: 'latin' },
    }),
    el('02.conditions.icon', null, B(179, 250, 28, 27), { parent: '02.conditions', icon: 'sun' }),
    el('02.conditions.text', 'ui:Text', B(219, 255, 371, 21), {
      parent: '02.conditions',
      type: text('sans', 'label', 500),
      binding: 'engine:captureConditions',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('02.reticle', 'app:Reticle', B(271, 582, 226, 212), {
      parent: vf,
      tokens: { fg: 'text.primary' },
    }),
    el('02.reticle.corner-tl', null, B(271, 582, 40, 38), { parent: '02.reticle' }),
    el('02.reticle.corner-tr', null, B(457, 582, 40, 38), { parent: '02.reticle' }),
    el('02.reticle.ring', null, B(322, 626, 124, 123), { parent: '02.reticle' }),
    el('02.reticle.cross', null, B(363, 667, 41, 43), { parent: '02.reticle' }),
    el('02.reticle.corner-bl', null, B(271, 756, 40, 38), { parent: '02.reticle' }),
    el('02.reticle.corner-br', null, B(457, 756, 40, 38), { parent: '02.reticle' }),
    // ---- the reading card
    el('02.reading', 'ui:Card', B(97, 833, 574, 257), {
      parent: vf,
      tokens: { bg: 'level1', radius: 'md' },
      measured: { bg: '#212227' },
    }),
    el('02.reading.sample', 'ui:Swatch', B(114, 851, 132, 117), {
      parent: '02.reading',
      tokens: { keyline: 'keyline', radius: 'md' },
      binding: 'engine:reading.hex',
      raw: { cornerPx: 16.25 },
    }),
    el('02.reading.label', 'ui:Text', B(269, 861, 164, 18), {
      parent: '02.reading',
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'label'),
      binding: 'static:lens.liveOklch',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 12.3 },
    }),
    el('02.reading.value', 'ui:Text', B(268, 895, 283, 26), {
      parent: '02.reading',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600, { tabular: true }),
      binding: 'engine:oklch',
      copy: { shape: 'value', script: 'figures' },
      raw: { emDp: 17.8 },
    }),
    el('02.reading.srgb', 'ui:Text', B(269, 936, 153, 19), {
      parent: '02.reading',
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'label', 400, { tabular: true }),
      binding: 'engine:srgb.hex',
      copy: { shape: 'value', script: 'figures' },
    }),
    el('02.reading.caption', 'ui:Text', B(116, 975, 456, 21), {
      parent: '02.reading',
      tokens: { fg: 'text.tertiary' },
      type: text('sans', 'caption'),
      binding: 'static:lens.nearestCaption',
      copy: { shape: 'caption', script: 'latin' },
      raw: { emDp: 11.3 },
    }),
    ...nearest.map(([box, fill], i) =>
      el(`02.reading.nearest-${i + 1}`, 'ui:Chip', box, {
        parent: '02.reading',
        tokens: { radius: 'md' },
        measured: { bg: fill },
        binding: `corpus:nearest.${i}.hex`,
        action: 'navigate:/atlas/[slug]',
      }),
    ),
    ...nearest.map(([, , name], i) =>
      el(`02.reading.nearest-${i + 1}.name`, 'ui:Text', name, {
        parent: `02.reading.nearest-${i + 1}`,
        type: text('gothic', 'label'),
        binding: `corpus:nearest.${i}.name`,
        copy: { shape: 'label', script: 'mixed' },
        raw: { emDp: 12.8 },
      }),
    ),
    ...nearest.map(([, , , delta], i) =>
      el(`02.reading.nearest-${i + 1}.delta`, 'ui:Text', delta, {
        parent: `02.reading.nearest-${i + 1}`,
        type: text('sans', 'caption', 400, { tabular: true }),
        binding: `engine:nearest.${i}.deltaE00`,
        copy: { shape: 'value', script: 'figures' },
        raw: { emDp: 9 },
      }),
    ),
    // ---- capture and its two neighbours
    el('02.capture', 'ui:Button', B(326, 1117, 116, 116), {
      parent: vf,
      tokens: { bg: 'action.primary', radius: 'pill' },
      action: 'capture:lens',
    }),
    el('02.import', 'ui:Button', B(52, 1147, 225, 57), {
      parent: vf,
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'pill' },
      measured: { bg: '#1F2026' },
      action: 'open:photoPicker',
    }),
    el('02.capture.mark', 'ui:Mark', B(361, 1153, 46, 44), {
      parent: '02.capture',
      tokens: { fg: 'ground' },
    }),
    el('02.hold', 'ui:Button', B(491, 1147, 194, 57), {
      parent: vf,
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'pill' },
      measured: { bg: '#212227' },
      action: 'navigate:/lens/against',
    }),
    el('02.import.icon', null, B(85, 1164, 26, 22), { parent: '02.import', icon: 'image-solid' }),
    el('02.import.label', 'ui:Text', B(124, 1167, 131, 20), {
      parent: '02.import',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'caption', 500),
      binding: 'static:lens.importPhoto',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 10.8 },
    }),
    el('02.hold.label', 'ui:Text', B(530, 1167, 117, 21), {
      parent: '02.hold',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'caption', 500),
      binding: 'static:lens.holdTarget',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 11.3 },
    }),
    // ---- 02's own tab bar — three items; C1 puts 01's five in its place
    el('02.tabs', 'app:TabBar', B(0, 1256, 768, 120), {
      tokens: { bg: 'ground', border: 'border.subtle' },
    }),
    el('02.tabs.indicator', null, B(340, 1259, 88, 5), {
      parent: '02.tabs',
      tokens: { fg: 'text.primary' },
    }),
    el('02.tabs.lens.icon', 'ui:NavIcon', B(367, 1279, 34, 28), {
      parent: '02.tabs',
      icon: 'lens',
      action: 'navigate:/lens',
    }),
    el('02.tabs.gallery.icon', 'ui:NavIcon', B(130, 1288, 32, 30), {
      parent: '02.tabs',
      icon: 'image',
    }),
    el('02.tabs.profile.icon', 'ui:NavIcon', B(605, 1288, 29, 30), {
      parent: '02.tabs',
      icon: 'profile',
      action: 'navigate:/profile',
    }),
    el('02.tabs.lens.label', 'ui:Text', B(362, 1317, 44, 17), {
      parent: '02.tabs',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'caption', 500),
      binding: 'static:tabs.lens',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 11.6 },
    }),
  ],
  notDesign: [
    { what: 'bezel', note: 'device corner drawn into the render, top left', box: B(0, 0, 18, 12) },
    {
      what: 'bezel',
      note: 'device corner drawn into the render, top right',
      box: B(750, 0, 18, 12),
    },
  ],
  departures: [
    {
      rule: 'E2',
      element: '02.title',
      why: 'the Japanese half of the title calls a camera estimate a measurement (測定, the E-089 defect); it reads as an estimate in both languages (golden rule 11)',
    },
    {
      rule: 'E2',
      element: '02.conditions.text',
      why: 'the exposure verdict is replaced by the capture-conditions assessment the engine produces (FR-17), in its own words',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: ['02.reading.sample'],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C1',
      elements: [
        '02.tabs',
        '02.tabs.indicator',
        '02.tabs.lens.icon',
        '02.tabs.gallery.icon',
        '02.tabs.profile.icon',
        '02.tabs.lens.label',
      ],
      resolution:
        "P5 → 01: 02's three-item tab bar is replaced by 01's five, icon and label; the Lens label reads Lens",
      flippedByUser: false,
    },
    {
      id: 'C10',
      elements: ['02.conditions', '02.conditions.icon', '02.conditions.text'],
      resolution:
        'followed: the gold chip carries text and an icon (golden rule 13) and is declared a chroma-ceiling exception by F-225',
      flippedByUser: false,
    },
  ],
};
