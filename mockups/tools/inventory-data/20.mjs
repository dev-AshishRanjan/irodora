// Mockup 20 — the shareable colour card. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes are pixel
// readings (measure.ps1, corner.ps1). The neighbouring cards of the carousel show as two tall
// outlines at the screen's sides; their inner edges run down into the action panel's outline, so the
// panel's box is the rows between its top rule and its bottom border, across the two edges. The card
// prints #5B6B78's OKLCh and CIELAB as values that do not survive checking, and a dated provenance no
// entry holds — three E1 rows. The generator orders elements by the reading rule. Type size as in
// 02.mjs.
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
const value = (key, label, labelEm, box, binding, lines = 1) => [
  t(`20.card.${key}.label`, label, '20.card', `static:card.${key}`, {
    tokens: { fg: 'text.tertiary' },
    ...cap(labelEm),
  }),
  t(`20.card.${key}.value`, box, '20.card', binding, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'label', 400, { tabular: true }),
    copy: { shape: 'value', script: 'figures', ...(lines > 1 ? { lines } : {}) },
  }),
];

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '20.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    // ---- header
    el('20.back', 'ui:Button', B(29, 38, 96, 20), {
      icon: 'back',
      binding: 'static:card.back',
      action: 'dismiss:card',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('20.title', 'ui:Text', B(182, 36, 423, 25), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 600),
      binding: 'static:card.title',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    el('20.share', 'ui:Button', B(709, 31, 28, 34), { icon: 'share', action: 'open:share.card' }),
    // ---- the carousel: the neighbours' edges either side of the card
    el('20.carousel', 'new:Carousel', B(0, 208, 768, 1168), { binding: 'corpus:entries' }),
    el('20.carousel.previous', 'ui:Card', B(0, 208, 78, 1168), {
      parent: '20.carousel',
      tokens: { border: 'border.subtle', radius: 'md' },
      action: 'select:card.previous',
    }),
    el('20.card', 'ui:Card', B(103, 208, 561, 849), {
      parent: '20.carousel',
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1F2128' },
      raw: { cornerPx: 19.25 },
    }),
    el('20.carousel.next', 'ui:Card', B(689, 208, 79, 1168), {
      parent: '20.carousel',
      tokens: { border: 'border.subtle', radius: 'md' },
      action: 'select:card.next',
    }),
    el('20.card.swatch', 'ui:Swatch', B(141, 239, 486, 432), {
      parent: '20.card',
      tokens: { radius: 'sm' },
      binding: 'corpus:entry.hex',
      measured: { fill: '#586976' },
    }),
    t('20.card.kanji', B(143, 697, 116, 58), '20.card', 'corpus:entry.kanji', {
      tokens: { fg: 'text.primary' },
      type: text('mincho', 'title'),
      copy: { shape: 'heading', script: 'japanese' },
      raw: { emDp: 32.2 },
    }),
    el('20.card.mark', 'ui:Mark', B(567, 699, 60, 58), {
      parent: '20.card',
      tokens: { fg: 'text.tertiary' },
    }),
    t('20.card.kana', B(143, 762, 106, 20), '20.card', 'corpus:entry.kana', {
      tokens: { fg: 'text.secondary' },
      ...cap(11.1),
      copy: { shape: 'label', script: 'japanese' },
    }),
    t('20.card.romaji', B(142, 789, 157, 29), '20.card', 'corpus:entry.romaji', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title'),
      raw: { emDp: 19.9 },
    }),
    t('20.card.english', B(143, 829, 147, 29), '20.card', 'corpus:entry.english', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'body'),
    }),
    ...value('oklch', B(141, 877, 59, 15), 10.3, B(142, 902, 168, 49), 'engine:entry.oklch', 2),
    ...value('hex', B(326, 877, 31, 14), 9.6, B(324, 902, 101, 20), 'corpus:entry.hex'),
    ...value('cielab', B(456, 877, 62, 15), 10.3, B(457, 902, 170, 49), 'engine:entry.cielab', 2),
    el('20.card.rule', null, B(142, 968, 485, 2), {
      parent: '20.card',
      tokens: { fg: 'border.subtle' },
    }),
    t('20.card.provenance', B(142, 987, 405, 40), '20.card', 'corpus:entry.provenance', {
      tokens: { fg: 'text.tertiary' },
      ...cap(9.7),
      copy: { shape: 'caption', script: 'latin', lines: 2 },
    }),
    el('20.card.footer-mark', 'ui:Mark', B(581, 984, 46, 44), {
      parent: '20.card',
      tokens: { fg: 'text.tertiary' },
    }),
    // ---- the actions
    el('20.actions', 'app:ActionBar', B(77, 1166, 615, 133), {
      tokens: { border: 'border.subtle' },
    }),
    el('20.actions.save', 'ui:Button', B(104, 1194, 272, 77), {
      parent: '20.actions',
      tokens: { bg: 'level2', radius: 'md' },
      measured: { bg: '#282C32' },
      binding: 'static:card.savePdf',
      action: 'submit:card.pdf',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('20.actions.share', 'ui:Button', B(391, 1193, 276, 79), {
      parent: '20.actions',
      tokens: { bg: 'action.primary', radius: 'md' },
      raw: { cornerPx: 25.25 },
      icon: 'arrow-right',
      binding: 'static:card.share',
      action: 'open:share.card',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [],
  departures: [
    {
      rule: 'E1',
      element: '20.card.oklch.value',
      why: '#5B6B78’s printed OKLCh does not survive checking (§4 E1); the cell shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '20.card.cielab.value',
      why: '#5B6B78’s printed CIELAB does not survive checking (§4 E1); the cell shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '20.card.provenance',
      why: 'the footer shows the entry’s real provenance (ADR-0065); 20’s dated dye formula is sample content no entry holds — none of the 120 claims an era',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: ['20.card.swatch'],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C6',
      elements: ['20.card.kanji'],
      resolution:
        'each surface follows its own mockup — the card’s kanji are set in a Japanese serif face',
      flippedByUser: false,
    },
  ],
};
