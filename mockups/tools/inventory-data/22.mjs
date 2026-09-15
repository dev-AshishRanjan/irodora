// Mockup 22 — Shopping Check, drawn as a phone screen with no bezel. The screen is 522 px wide
// (x 122–643, y 76–1333), so 384 / 522 = 0.7356 dp per px (§2). Boxes are pixel readings
// (measure.ps1, mask.ps1 over the photographs, corner.ps1). Derived, and saying so: the first photo
// badge's height is the second's, since the dark mask's lower rows take in the trousers beside it;
// the garment cards' two corner fits disagree (24.75 px and 17 px), so the radius is their mean and
// raw keeps it. The four figures measure 45–47 dp, far past every §5 step (OQ-13); siblings drawn
// alike take the step most of them snap to (§2), so all four are title and raw keeps each estimate. The green
// chip and badges are questions.md 18. The meta line prints #7D8B78's OKLCh as 0.58 / 0.04 / 135°,
// which is 0.620 / 0.032 / 137.4° — sample content (E1). The generator orders elements by the reading
// rule. Type size as in 02.mjs, the em converted at 0.7356 dp per px.
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

const stat = (key, s) => {
  const p = `22.stats.${key}`;
  return [
    el(p, 'ui:Card', s.box, {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: s.bg },
    }),
    t(`${p}.figure`, s.figure, p, s.binding, {
      tokens: { fg: 'text.primary' },
      type: text('sans', s.figureSize ?? 'title', 600, { tabular: true }),
      copy: { shape: 'value', script: 'figures' },
      raw: { emDp: s.figureEm },
    }),
    t(`${p}.label`, s.label, p, `static:shopping.${key}`, {
      tokens: { fg: 'text.primary' },
      type: text('sans', s.labelSize ?? 'body', 500),
      ...(s.labelEm ? { raw: { emDp: s.labelEm } } : {}),
    }),
    t(`${p}.detail`, s.detail, p, s.detailBinding, {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'body', script: 'mixed' },
    }),
  ];
};
const garment = (n, g) => {
  const p = `22.compat.garment-${n}`;
  return [
    el(p, 'ui:Card', g.box, {
      parent: '22.compat',
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'lg' },
      raw: { cornerPx: 20.9 },
    }),
    el(`${p}.photo`, 'app:GarmentPhoto', g.photo, {
      parent: p,
      binding: `store:shopping.pairs.${n - 1}.photo`,
    }),
    el(`${p}.distance`, 'ui:Chip', g.badge, {
      parent: `${p}.photo`,
      binding: 'oq:OQ-28',
      copy: { shape: 'badge', script: 'figures' },
    }),
    t(`${p}.name`, g.name, p, `store:shopping.pairs.${n - 1}.name`, {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body'),
      copy: { shape: 'label', script: 'latin', ...(g.lines ? { lines: g.lines } : {}) },
    }),
  ];
};

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'device',
    screens: [{ id: '22.screen', box: B(122, 76, 522, 1258), dpPerPx: 0.7356 }],
  },
  elements: [
    // ---- header
    el('22.back', 'ui:Button', B(153, 171, 26, 23), { icon: 'back', action: 'navigate:/wardrobe' }),
    el('22.title', 'ui:Text', B(300, 162, 168, 23), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      binding: 'static:shopping.title',
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 18.2 },
    }),
    el('22.subtitle', 'ui:Text', B(316, 188, 135, 20), {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'body'),
      binding: 'static:shopping.titleJa',
      copy: { shape: 'label', script: 'japanese' },
    }),
    el('22.mark', 'ui:Mark', B(583, 165, 35, 34), { tokens: { fg: 'text.tertiary' } }),
    // ---- the candidate
    el('22.capture', 'app:CaptureImage', B(148, 241, 473, 227), {
      tokens: { radius: 'md' },
      binding: 'store:shopping.capture',
    }),
    el('22.capture.live', 'ui:Chip', B(165, 257, 169, 33), {
      parent: '22.capture',
      tokens: { radius: 'pill' },
      measured: { bg: '#5A6855' },
      binding: 'static:shopping.liveCapture',
      copy: { shape: 'badge', script: 'latin' },
    }),
    t('22.capture.title', B(178, 407, 399, 20), '22.capture', 'store:shopping.candidate.title', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t(
      '22.capture.notation',
      B(177, 436, 210, 10),
      '22.capture',
      'engine:shopping.candidate.notation',
      {
        tokens: { fg: 'text.secondary' },
        type: text('sans', 'caption'),
        copy: { shape: 'value', script: 'mixed' },
        raw: { emDp: 10.1 },
      },
    ),
    // ---- the four figures
    ...stat('unlocked', {
      box: B(148, 493, 230, 153),
      bg: '#1F232B',
      figure: B(213, 522, 102, 45),
      figureEm: 45.3,
      binding: 'engine:shoppingCheck.outfitsUnlocked',
      label: B(183, 583, 159, 19),
      labelEm: 19.1,
      detail: B(166, 611, 193, 16),
      detailBinding: 'static:shopping.unlockedDetail',
    }),
    ...stat('pairings', {
      box: B(391, 493, 229, 153),
      bg: '#1F232A',
      figure: B(487, 521, 37, 47),
      figureEm: 47.4,
      binding: 'oq:OQ-9',
      label: B(418, 583, 175, 22),
      detail: B(422, 611, 168, 16),
      detailBinding: 'oq:OQ-9',
    }),
    ...stat('duplicates', {
      box: B(148, 660, 230, 153),
      bg: '#1F2429',
      figure: B(244, 689, 37, 46),
      figureEm: 46.3,
      binding: 'engine:shoppingCheck.duplicates',
      label: B(177, 750, 172, 21),
      detail: B(190, 778, 145, 13),
      detailBinding: 'engine:shoppingCheck.threshold',
    }),
    ...stat('gaps', {
      box: B(391, 660, 229, 153),
      bg: '#1F242C',
      figure: B(492, 689, 22, 45),
      figureEm: 45.3,
      binding: 'derived:F-222',
      label: B(427, 750, 155, 21),
      detail: B(404, 778, 203, 16),
      detailBinding: 'derived:F-222',
    }),
    // ---- compatibility with what is owned (the third card runs off the screen's edge)
    el('22.compat.heading', 'ui:Text', B(153, 843, 331, 24), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      binding: 'static:shopping.compatibility',
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 19.0 },
    }),
    el('22.compat.owned', 'ui:Button', B(552, 845, 62, 16), {
      tokens: { fg: 'text.tertiary' },
      binding: 'static:shopping.owned',
      action: 'navigate:/wardrobe',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('22.compat', null, B(152, 876, 488, 231), {}),
    ...garment(1, {
      box: B(152, 876, 186, 230),
      photo: B(161, 885, 168, 156),
      badge: B(264, 894, 55, 26),
      name: B(162, 1052, 122, 40),
      lines: 2,
    }),
    ...garment(2, {
      box: B(345, 876, 175, 231),
      photo: B(355, 885, 157, 156),
      badge: B(449, 895, 53, 26),
      name: B(356, 1051, 147, 41),
      lines: 2,
    }),
    ...garment(3, {
      box: B(529, 876, 111, 230),
      photo: B(537, 885, 105, 156),
      badge: B(620, 895, 24, 40),
      name: B(539, 1052, 81, 20),
    }),
    // ---- actions
    el('22.save', 'ui:Button', B(147, 1140, 474, 60), {
      tokens: { bg: 'action.primary', radius: 'md' },
      binding: 'static:shopping.save',
      action: 'submit:garment.save',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('22.scan', 'ui:Button', B(149, 1210, 470, 58), {
      tokens: { border: 'border.subtle', radius: 'md' },
      binding: 'static:shopping.scanAnother',
      action: 'navigate:/lens',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    {
      what: 'status-bar',
      note: 'a device status bar drawn into the render (9:41, signal, battery)',
      box: B(128, 100, 512, 30),
    },
    {
      what: 'presentation',
      note: 'the OS home indicator, which no surface of the app draws',
      box: B(291, 1297, 186, 10),
    },
    {
      what: 'outside-art',
      note: 'hanger and blossom line-art left of the screen',
      box: B(0, 0, 122, 1376),
    },
    {
      what: 'outside-art',
      note: 'hanger and blossom line-art right of the screen',
      box: B(644, 0, 124, 1376),
    },
    { what: 'outside-art', note: 'the ground above the screen', box: B(122, 0, 522, 76) },
    { what: 'outside-art', note: 'the ground below the screen', box: B(122, 1334, 522, 42) },
  ],
  departures: [
    {
      rule: 'E1',
      element: '22.capture.notation',
      why: '#7D8B78’s printed OKLCh (0.58 / 0.04 / 135°) does not survive checking — it is 0.620 / 0.032 / 137.4° — sample content (§4 E1); the line shows the engine’s conversion',
    },
  ],
  conflicts: [],
};
