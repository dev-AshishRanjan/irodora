// Mockup 26 — the colour detail in Japanese, a variant: it governs Japanese copy and Japanese
// typography only (§3 P2); the layout is 06's (§6 C3). Drawn as a phone screen with a camera cut-out;
// the screen is 496 px wide (x 136–631, y 114–1287), so 384 / 496 = 0.7742 dp per px (§2). Boxes are
// pixel readings (measure.ps1, mask.ps1 over the hero photograph, corner.ps1). Derived, and saying so:
// the Display P3 label shares a blob with its value, so its height is the other labels' (21 px); the
// first kasane segment's two lines merge in one blob, so its misprinted second line takes the second
// segment's rows and width. The generator orders elements by the reading rule. Type size as in 02.mjs,
// the em converted at 0.7742 dp per px; ties between two steps take the smaller.
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
    copy: { shape: 'label', script: 'japanese' },
    ...extra,
  });
const em = (emDp) => (emDp ? { raw: { emDp } } : {});
const heading = (id, box, key, emDp) =>
  el(id, 'ui:Text', box, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'title', 600),
    binding: `static:atlas.${key}`,
    copy: { shape: 'heading', script: 'japanese' },
    ...em(emDp),
  });
const cell = (key, label, labelEm, value, valueEm, binding, script = 'japanese') => [
  t(`26.readout.${key}.label`, label, '26.readout', `static:notation.${key}Ja`, {
    tokens: { fg: 'text.secondary' },
    copy: { shape: 'label', script },
    ...em(labelEm),
  }),
  t(`26.readout.${key}.value`, value, '26.readout', binding, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'body', 400, { tabular: true }),
    copy: { shape: 'value', script: 'figures' },
    ...em(valueEm),
  }),
];
const TRADITIONAL =
  '伝統色 — “traditional colour” — presents an inspired palette as historical (FR-23, §4 E1); the words keep their place and length and state the real classification';

export default {
  kind: 'screen',
  governs: 'locale',
  frame: {
    kind: 'device',
    screens: [{ id: '26.screen', box: B(136, 114, 496, 1174), dpPerPx: 0.7742 }],
  },
  elements: [
    // ---- header
    el('26.back', 'ui:Button', B(142, 185, 142, 27), {
      icon: 'back',
      binding: 'static:atlas.backJa',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'japanese' },
    }),
    heading('26.title', B(314, 186, 139, 25), 'detailTitleJa'),
    el('26.share', 'ui:Button', B(585, 181, 29, 35), {
      icon: 'share',
      action: 'open:share.colour',
    }),
    el('26.header-rule', null, B(136, 228, 496, 2), { tokens: { fg: 'border.subtle' } }),
    // ---- the hero, and the next entry at the screen's edge
    el('26.hero', 'ui:Card', B(149, 249, 470, 319), {
      tokens: { border: 'text.primary', radius: 'md' },
    }),
    el('26.next-card', 'ui:Card', B(627, 255, 5, 307), {
      tokens: { border: 'border.subtle', radius: 'md' },
      action: 'select:atlas.next',
    }),
    el('26.hero.photo', 'ui:Swatch', B(155, 254, 458, 309), {
      parent: '26.hero',
      binding: 'corpus:entry.hex',
      measured: { fill: '#596875' },
    }),
    t('26.hero.kana', B(172, 403, 95, 18), '26.hero', 'corpus:entry.kana', {
      tokens: { fg: 'text.secondary' },
    }),
    t('26.hero.kanji', B(172, 428, 95, 47), '26.hero', 'corpus:entry.kanji', {
      tokens: { fg: 'text.primary' },
      type: text('gothic', 'title', 600),
      copy: { shape: 'heading', script: 'japanese' },
      raw: { emDp: 40.4 },
    }),
    t('26.hero.description', B(171, 492, 413, 47), '26.hero', 'corpus:entry.description', {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'body', script: 'japanese', lines: 2 },
    }),
    // ---- the readout
    heading('26.readout.title', B(151, 594, 186, 29), 'readoutJa', 24.9),
    el('26.readout', 'ui:Card', B(151, 637, 466, 228), {
      tokens: { bg: 'level1', radius: 'md' },
      measured: { bg: '#1D2027' },
    }),
    el('26.readout.divider', null, B(383, 637, 2, 228), {
      parent: '26.readout',
      tokens: { fg: 'border.subtle' },
    }),
    ...cell(
      'oklch',
      B(167, 652, 122, 21),
      18.1,
      B(167, 680, 200, 22),
      null,
      'engine:entry.oklch',
      'mixed',
    ),
    ...cell(
      'cielab',
      B(401, 652, 123, 21),
      18.1,
      B(401, 681, 198, 17),
      18.0,
      'engine:entry.cielab',
      'mixed',
    ),
    el('26.readout.rule-1', null, B(151, 712, 466, 2), {
      parent: '26.readout',
      tokens: { fg: 'border.subtle' },
    }),
    ...cell(
      'hex',
      B(168, 728, 123, 21),
      18.1,
      B(168, 757, 80, 17),
      18.0,
      'corpus:entry.hex',
      'mixed',
    ),
    ...cell(
      'srgb',
      B(400, 729, 68, 19),
      null,
      B(401, 757, 179, 17),
      18.0,
      'engine:entry.srgb',
      'mixed',
    ),
    el('26.readout.rule-2', null, B(151, 788, 466, 2), {
      parent: '26.readout',
      tokens: { fg: 'border.subtle' },
    }),
    ...cell(
      'p3',
      B(167, 805, 96, 21),
      null,
      B(167, 833, 182, 17),
      18.0,
      'engine:entry.p3',
      'latin',
    ),
    // ---- the kasane (26 only — not adopted by default, C3)
    heading('26.kasane.title', B(151, 891, 239, 28), 'kasaneJa', 24.1),
    el('26.kasane', 'ui:Card', B(151, 933, 466, 119), {
      tokens: { bg: 'level1', radius: 'md' },
      measured: { bg: '#1E2027' },
    }),
    t('26.kasane.label', B(168, 948, 242, 21), '26.kasane', 'static:atlas.kasaneLabelJa', {
      tokens: { fg: 'text.secondary' },
      ...em(18.1),
    }),
    el('26.kasane.bar', 'new:KasaneBar', B(168, 979, 433, 59), {
      parent: '26.kasane',
      tokens: { radius: 'sm' },
      binding: 'engine:entry.kasane',
    }),
    t(
      '26.kasane.bar.segment-1',
      B(237, 989, 138, 40),
      '26.kasane.bar',
      'corpus:entry.kasane.0.label',
      { tokens: { fg: 'text.primary' }, copy: { shape: 'label', script: 'mixed', lines: 2 } },
    ),
    t(
      '26.kasane.bar.segment-2',
      B(453, 989, 103, 39),
      '26.kasane.bar',
      'corpus:entry.kasane.1.label',
      { tokens: { fg: 'text.primary' }, copy: { shape: 'label', script: 'mixed', lines: 2 } },
    ),
    // ---- provenance and review
    heading('26.provenance.title', B(154, 1081, 237, 29), 'provenanceJa', 24.9),
    t('26.provenance.corpus', B(169, 1123, 231, 20), null, 'corpus:entry.provenance.source', {
      tokens: { fg: 'text.primary' },
      copy: { shape: 'value', script: 'mixed' },
    }),
    el('26.provenance.seal', 'new:HankoSeal', B(562, 1123, 38, 38), {
      tokens: { fg: 'text.tertiary' },
    }),
    t('26.provenance.review', B(168, 1149, 213, 20), null, 'corpus:entry.provenance.review', {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'value', script: 'japanese' },
    }),
    // ---- actions
    el('26.actions', 'app:ActionBar', B(136, 1183, 496, 104), {
      tokens: { border: 'border.subtle' },
      measured: { bg: '#15151B' },
    }),
    el('26.actions.add', 'ui:Button', B(150, 1203, 229, 52), {
      parent: '26.actions',
      tokens: { bg: 'action.primary', radius: 'md' },
      binding: 'static:atlas.addToWardrobeJa',
      action: 'navigate:/wardrobe/add',
      copy: { shape: 'label', script: 'japanese' },
    }),
    el('26.actions.share', 'ui:Button', B(389, 1203, 229, 52), {
      parent: '26.actions',
      tokens: { border: 'border.subtle', radius: 'md' },
      binding: 'static:atlas.shareCardJa',
      action: 'navigate:/atlas/card/[slug]',
      copy: { shape: 'label', script: 'mixed' },
    }),
  ],
  notDesign: [
    {
      what: 'bezel',
      note: 'the camera cut-out drawn into the top of the screen',
      box: B(314, 122, 140, 37),
    },
    {
      what: 'status-bar',
      note: 'a device status bar drawn into the render (9:41, signal, battery)',
      box: B(150, 126, 470, 28),
    },
    {
      what: 'garbled-text',
      note: 'the first kasane segment’s ΔE00 is printed with a triangle glyph',
      box: B(237, 1014, 69, 14),
    },
    {
      what: 'garbled-text',
      note: 'the second kasane segment’s ΔE00 is printed with a triangle glyph',
      box: B(454, 1014, 69, 14),
    },
    {
      what: 'presentation',
      note: 'the OS home indicator, which no surface of the app draws',
      box: B(292, 1281, 184, 6),
    },
    { what: 'outside-art', note: 'blossom line-art left of the screen', box: B(0, 0, 130, 1376) },
    { what: 'outside-art', note: 'wave line-art right of the screen', box: B(638, 0, 130, 1376) },
    { what: 'outside-art', note: 'the ground above the screen', box: B(130, 0, 508, 110) },
    { what: 'outside-art', note: 'wave line-art below the screen', box: B(130, 1288, 508, 88) },
  ],
  departures: [
    { rule: 'E1', element: '26.back', why: TRADITIONAL },
    { rule: 'E1', element: '26.title', why: TRADITIONAL },
    { rule: 'E1', element: '26.provenance.corpus', why: TRADITIONAL },
    {
      rule: 'E1',
      element: '26.hero.description',
      why: 'the description dates the colour to the mid-Edo period — provenance no entry holds (§4 E1, ADR-0065); the line shows the entry’s own description',
    },
    {
      rule: 'E1',
      element: '26.readout.oklch.value',
      why: '#5B6B78’s printed OKLCh does not survive checking (§4 E1); the cell shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '26.readout.cielab.value',
      why: '#5B6B78’s printed CIELAB does not survive checking (§4 E1); the cell shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '26.readout.p3.value',
      why: 'the "Display P3" triplet is the sRGB values ÷ 255, not a P3 conversion (§4 E1); the cell shows the engine’s real conversion',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: ['26.hero.photo', '26.kasane.bar'],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C14',
      elements: ['26.kasane', '26.kasane.bar'],
      resolution: 'F-224 authors the kasane palettes, labelled japanese-inspired (FR-23)',
      flippedByUser: false,
    },
    {
      id: 'C3',
      elements: ['26.kasane', '26.kasane.bar', '26.provenance.seal'],
      resolution:
        "P1 + P2: 06's layout; 26's headings and Japanese typography. The hanko seal and the kasane bar are 26-only and not adopted by default",
      flippedByUser: false,
    },
    {
      id: 'C6',
      elements: ['26.hero.kanji'],
      resolution: 'each surface follows its own mockup — 26’s kanji are sans',
      flippedByUser: false,
    },
  ],
};
