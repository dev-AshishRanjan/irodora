// Mockup 07 — Wear it: outfit combinations. A SPEC CARD: the screen is drawn inside a frame (outer
// 100–669 × 134–1351) under a board title and route string, with kimono line-art at the top right,
// so §2 measures against the frame's inner width — 564 px → 384 / 564 dp per px. Boxes are pixel
// readings (measure.ps1, mask.ps1). The leaked "Sticky action bar" label reads merged with the bar's
// top border, and is recorded as that measured strip. Type size by the rule in 02.mjs.
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
const label = (id, box, parent, binding, extra = {}) =>
  el(id, 'ui:Text', box, {
    parent,
    type: text('sans', 'label'),
    binding,
    copy: { shape: 'label', script: 'latin' },
    ...extra,
  });
const slotText = (n, parts) => {
  const p = `07.slots.slot-${n}`;
  return {
    title: label(`${p}.title`, parts.title, p, `static:wear.slot.${n}`, {
      copy: { shape: 'label', script: 'latin' },
    }),
    hex: label(`${p}.hex`, parts.hex, p, `engine:wear.slot.${n}.hex`, {
      type: text('sans', 'label', 400, { tabular: true }),
      copy: { shape: 'value', script: 'figures' },
    }),
    name: label(`${p}.name`, parts.name, p, `engine:wear.slot.${n}.name`, {
      type: text('sans', 'body'),
      copy: { shape: 'label', script: 'latin', lines: parts.lines },
    }),
  };
};
const s1 = slotText(1, {
  title: B(134, 516, 176, 19),
  hex: B(133, 565, 83, 16),
  name: B(134, 590, 190, 17),
  lines: 1,
});
const s2 = slotText(2, {
  title: B(408, 516, 141, 19),
  hex: B(407, 547, 85, 16),
  name: B(408, 572, 204, 46),
  lines: 2,
});
const s3 = slotText(3, {
  title: B(134, 714, 121, 19),
  hex: B(133, 749, 82, 18),
  name: B(134, 775, 147, 47),
  lines: 2,
});
const s4 = slotText(4, {
  title: B(407, 713, 159, 21),
  hex: B(407, 750, 86, 17),
  name: B(407, 775, 184, 46),
  lines: 2,
});
const row = (key, labelBox, valueBox, binding) => [
  label(`07.intelligence.${key}.label`, labelBox, '07.intelligence', `static:wear.${key}`, {
    tokens: { fg: 'text.secondary' },
  }),
  label(`07.intelligence.${key}.value`, valueBox, '07.intelligence', binding, {
    tokens: { fg: 'text.primary' },
    copy: { shape: 'value', script: 'mixed' },
  }),
];
const [harmonyL, harmonyV] = row(
  'harmony',
  B(135, 954, 141, 20),
  B(312, 954, 210, 20),
  'engine:wear.harmony',
);
const [fitL, fitV] = row('fit', B(135, 987, 158, 15), B(312, 986, 274, 20), 'engine:wear.fit');
const [cvdL, cvdV] = row(
  'cvd',
  B(134, 1019, 138, 17),
  B(312, 1019, 322, 20),
  'engine:wear.separation',
);
const [contrastL, contrastV] = row(
  'contrast',
  B(134, 1052, 126, 16),
  B(312, 1051, 174, 21),
  'engine:wear.contrast',
);
const pill = (key, box) =>
  el(`07.substitutions.${key}`, 'ui:Chip', box, {
    parent: '07.intelligence',
    // F-248: corners 7–9 px against a 33 px height (sm), outlined. Each is an alternative of the slot in
    // hand, relative to the colour it shows (ADR-0152); the drawn three are a count (E1).
    tokens: { border: 'border.subtle', radius: 'sm' },
    raw: { cornerPx: 8 },
    binding: `engine:wear.alternative.${key}`,
    action: `select:substitution.${key}`,
    copy: { shape: 'label', script: 'latin' },
  });

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'spec-card',
    screens: [{ id: '07.screen', box: B(103, 137, 564, 1212), dpPerPx: 0.6809 }],
  },
  elements: [
    // ---- header
    // The app bar (F-234): a container for the header, 36.8 dp, bounded by symmetric about its elements.
    el('07.header', 'ui:AppBar', B(103, 137, 564, 54)),
    el('07.back', null, B(132, 154, 23, 20), {
      parent: '07.header',
      icon: 'back',
      action: 'navigate:/atlas/[slug]',
    }),
    // F-248 split the header line into what it draws: the back word (the colour's romaji), a 2 px rule,
    // and the title. F-220 recorded one 443 px box with raw.emDp 26, which was pixels: every word inks
    // 19 px (caps and ascenders, 0.73 em), 26 px an em, 17.7 dp — body, within 4 dp. The back word and
    // the title read one weight, heavier than the body-400 texts in the same ink (stems 3 px against 2
    // at a like em): 500, as recorded.
    el('07.back.label', 'ui:Text', B(176, 154, 113, 19), {
      parent: '07.header',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      binding: 'corpus:entry.name.romaji',
      action: 'navigate:/atlas/[slug]',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 17.7 },
    }),
    el('07.divider', null, B(299, 150, 2, 28), {
      parent: '07.header',
      tokens: { fg: 'border.subtle' },
    }),
    el('07.title', 'ui:Text', B(310, 154, 307, 19), {
      parent: '07.header',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      binding: 'static:wear.title',
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 17.7 },
    }),
    // ---- the anchor piece
    // F-248: the card's corners fit 12–12.5 px (8.3 dp, md); the swatch's 9.5–10 px (6.6 dp, sm), with a
    // 1 px light line at its edge (#616D79 against the sample's #5A6A77) — the default keyline.
    el('07.anchor', 'ui:Card', B(129, 237, 512, 104), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1F2126' },
      raw: { cornerPx: 12.25 },
    }),
    el('07.anchor.swatch', 'ui:Swatch', B(146, 251, 76, 76), {
      parent: '07.anchor',
      tokens: { keyline: 'keyline', radius: 'sm' },
      binding: 'corpus:entry.hex',
      // A 1 px line is a hairline, the default: raw.keylinePx records only a line wider than that (C20).
      raw: { cornerPx: 9.75 },
    }),
    el('07.anchor.name', 'ui:Text', B(239, 265, 236, 23), {
      parent: '07.anchor',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      binding: 'corpus:entry.name',
      copy: { shape: 'label', script: 'mixed' },
    }),
    el('07.anchor.category', 'ui:Text', B(241, 294, 99, 20), {
      parent: '07.anchor',
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'label'),
      // F-248 (ADR-0151): the slot word — the colour is the top; *Shirt* is sample content (E1).
      binding: 'static:outfit.top',
      copy: { shape: 'label', script: 'latin' },
    }),
    // ---- occasion: a segmented control
    // F-248: the container's corners fit 8.5 px (5.8 dp) and the chosen segment's 4.5 px (3.1 dp) — sm
    // and sm less the segment's 2.5 dp inset, exactly; F-232's note read md.
    el('07.occasion', 'ui:ChoiceGroup', B(129, 397, 533, 43), {
      tokens: { border: 'border.subtle', radius: 'sm' },
      binding: 'static:wear.occasion',
      raw: { cornerPx: 8.5 },
    }),
    el('07.occasion.selected', null, B(213, 400, 185, 36), {
      parent: '07.occasion',
      tokens: { bg: 'action.primary', radius: 'sm' },
      action: 'select:occasion.office',
      raw: { cornerPx: 4.5 },
    }),
    // F-248: the chosen segment's word, which F-220 recorded only as its pill and dot; on the white
    // pill, in the ground's ink. Office is the published weighting (ADR-0151); *Minimalist* is E2.
    label(
      '07.occasion.office',
      B(246, 411, 147, 17),
      '07.occasion.selected',
      'static:wear.occasion.office',
      {
        tokens: { fg: 'ground' },
        action: 'select:occasion.office',
      },
    ),
    // Its leading dot (F-232's review): 12.4 px across in the pill's ink, #18191E at its core.
    el('07.occasion.selected.dot', null, B(225, 411, 12, 12), {
      parent: '07.occasion.selected',
      tokens: { fg: 'ground' },
    }),
    label('07.occasion.casual', B(144, 411, 53, 14), '07.occasion', 'static:wear.occasion.casual', {
      action: 'select:occasion.casual',
    }),
    label(
      '07.occasion.classic',
      B(413, 411, 141, 17),
      '07.occasion',
      'static:wear.occasion.japaneseInspired',
      { action: 'select:occasion.japaneseInspired' },
    ),
    label(
      '07.occasion.evening',
      B(584, 411, 62, 17),
      '07.occasion',
      'static:wear.occasion.formal',
      { action: 'select:occasion.formal' },
    ),
    // ---- the four slots
    // F-248: the tiles' corners fit 14.5–15 / 11 / 10–13 / 12–12.5 px (10.0 · 7.5 · 7.8 · 8.3 dp): two
    // nearer md and two nearer sm, siblings drawn alike, so the smaller on a tie — sm (§2).
    el('07.slots.slot-1', 'app:OutfitSlot', B(116, 495, 261, 184), {
      tokens: { radius: 'sm' },
      binding: 'engine:wear.slot.1.hex',
      measured: { bg: '#576775' },
    }),
    el('07.slots.slot-2', 'app:OutfitSlot', B(391, 496, 259, 183), {
      tokens: { radius: 'sm' },
      binding: 'engine:wear.slot.2.hex',
      measured: { bg: '#CDC4B9' },
    }),
    s1.title,
    s2.title,
    s2.hex,
    s1.hex,
    s2.name,
    s1.name,
    // F-228: 07 draws its Swap buttons with the single circular arrow it also uses for refresh, not the
    // two-headed arrow 13 draws for swap. The ACTION is a swap; the GLYPH is refresh's, and the icon
    // field records the glyph, so one name draws one shape across the set.
    // F-248: slot 2's Swap and Lock are filled #31363E (surface.3 is #323742) with light words — the
    // tonal level-3 button; corners 7.5–8.5 px (sm). The padlock is 07's gold (C10).
    el('07.slots.slot-2.swap', 'ui:Button', B(407, 627, 118, 40), {
      parent: '07.slots.slot-2',
      tokens: { bg: 'level3', fg: 'text.primary', radius: 'sm' },
      type: text('sans', 'body'),
      binding: 'static:wear.swap',
      icon: 'refresh',
      action: 'select:slot.2.swap',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('07.slots.slot-2.lock', 'ui:Button', B(532, 626, 105, 41), {
      parent: '07.slots.slot-2',
      tokens: { bg: 'level3', fg: 'text.primary', radius: 'sm' },
      type: text('sans', 'body'),
      binding: 'static:wear.lock',
      icon: 'lock-solid',
      action: 'toggle:slot.2.lock',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('07.slots.slot-3', 'app:OutfitSlot', B(117, 694, 259, 146), {
      tokens: { radius: 'sm' },
      binding: 'engine:wear.slot.3.hex',
      measured: { bg: '#1F2025' },
    }),
    el('07.slots.slot-4', 'app:OutfitSlot', B(391, 694, 259, 146), {
      tokens: { radius: 'sm' },
      binding: 'engine:wear.slot.4.hex',
      measured: { bg: '#323B44' },
    }),
    // tops 708–716 chain into one row: read left to right
    s3.title,
    // F-248: the compact Swaps are outlined, their words and edge on the sample itself — in the ink the
    // sample takes (C8, ADR-0153); corners 7.5 px (sm).
    el('07.slots.slot-3.swap', 'ui:Button', B(279, 708, 82, 34), {
      parent: '07.slots.slot-3',
      tokens: { radius: 'sm' },
      type: text('sans', 'label'),
      binding: 'static:wear.swap',
      icon: 'refresh',
      action: 'select:slot.3.swap',
      copy: { shape: 'label', script: 'latin' },
    }),
    s4.title,
    // F-248: F-220 read only its ink (65 × 18 px); it is drawn alike its sibling on slot 3, outlined, so
    // it takes the sibling's box at its own place.
    el('07.slots.slot-4.swap', 'ui:Button', B(565, 708, 82, 34), {
      parent: '07.slots.slot-4',
      tokens: { radius: 'sm' },
      type: text('sans', 'label'),
      binding: 'static:wear.swap',
      icon: 'refresh',
      action: 'select:slot.4.swap',
      copy: { shape: 'label', script: 'latin' },
    }),
    s3.hex,
    s4.hex,
    s3.name,
    s4.name,
    // ---- the colour intelligence card
    // F-248: its leading corners fit 12.5 px (8.5 dp, md); the trailing edge runs 1 px short of the frame.
    el('07.intelligence', 'ui:Card', B(117, 866, 549, 363), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1F1F25' },
      raw: { cornerPx: 12.5 },
    }),
    el('07.intelligence.title', 'ui:Text', B(134, 888, 469, 21), {
      parent: '07.intelligence',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      binding: 'static:wear.intelligence',
      copy: { shape: 'heading', script: 'latin' },
    }),
    harmonyL,
    harmonyV,
    fitV,
    fitL,
    cvdL,
    cvdV,
    contrastV,
    contrastL,
    el('07.intelligence.rule', null, B(134, 1089, 528, 1), {
      parent: '07.intelligence',
      tokens: { fg: 'border.subtle' },
    }),
    pill('warmer', B(134, 1139, 267, 33)),
    pill('contrast', B(409, 1139, 238, 33)),
    pill('monochrome', B(134, 1179, 252, 33)),
    // ---- the sticky action bar
    el('07.actions', 'ui:ActionBar', B(103, 1249, 564, 100), {
      tokens: { border: 'border.subtle' },
    }),
    // F-248 (ADR-0152): the save hands the combination to the Outfit Lab, which opens with it.
    el('07.actions.save', 'ui:Button', B(124, 1279, 257, 54), {
      parent: '07.actions',
      tokens: { bg: 'action.primary', radius: 'pill' },
      binding: 'static:wear.saveToLab',
      action: 'navigate:/wardrobe/outfit',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('07.actions.export', 'ui:Button', B(395, 1281, 255, 50), {
      parent: '07.actions',
      tokens: { border: 'border.subtle', radius: 'pill' },
      binding: 'static:wear.exportTokens',
      action: 'navigate:/profile/export',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    { what: 'bezel', note: 'the spec card’s frame', box: B(100, 134, 570, 1218) },
    {
      what: 'board-annotation',
      note: 'the board title above the frame (with a stray prime mark)',
      box: B(53, 51, 547, 36),
    },
    {
      what: 'leaked-label',
      note: 'the route string printed under the title',
      box: B(53, 93, 180, 24),
    },
    {
      what: 'outside-art',
      note: 'kimono line-art at the top right, drawn largely outside the frame',
      box: B(590, 40, 178, 690),
    },
    {
      what: 'garbled-text',
      note: 'a stray prime mark after the colour name in the header (F-248: the prime alone; the name is the back word)',
      box: B(285, 153, 5, 8),
    },
    {
      what: 'leaked-label',
      note: '"Badge" after "Harmony" — a component name printed in the label (§2, F-248)',
      box: B(214, 954, 62, 20),
    },
    {
      what: 'leaked-label',
      note: '"Card" at the end of the card title — a component name (§2, F-248)',
      box: B(553, 888, 50, 21),
    },
    {
      what: 'garbled-text',
      note: '"Color" in the card title, on a screen the en-GB catalogue spells "Colour" (§2, F-248)',
      box: B(256, 888, 55, 21),
    },
    {
      what: 'garbled-text',
      note: 'a stray bullet after slots 2–4’s names (F-248)',
      box: B(530, 600, 8, 8),
    },
    {
      what: 'leaked-label',
      note: 'a component name printed as a section title',
      box: B(129, 207, 163, 22),
    },
    {
      what: 'leaked-label',
      note: 'a component name printed as a section title',
      box: B(129, 367, 265, 21),
    },
    {
      what: 'leaked-label',
      note: 'a component name printed as a section title, misspelt',
      box: B(129, 467, 228, 18),
    },
    {
      what: 'leaked-label',
      note: 'a component name and level after the card title',
      box: B(135, 915, 201, 19),
    },
    {
      what: 'leaked-label',
      note: 'a component name printed as a section title',
      box: B(134, 1111, 208, 18),
    },
    {
      what: 'leaked-label',
      note: 'a component name, read merged with the action bar’s top border',
      box: B(104, 1249, 560, 14),
    },
  ],
  departures: [
    {
      rule: 'E1',
      element: '07.anchor.name',
      why: 'the colour the page was opened for, as kanji, romaji and hex; 07’s Ai-nezumi is sample content (ADR-0151)',
    },
    {
      rule: 'E1',
      element: '07.slots.slot-2.name',
      why: 'each slot is the engine’s ranking for it, named by the corpus colour (romaji and English); 07’s garment and material words are sample content (ADR-0151)',
    },
    {
      rule: 'E2',
      element: '07.occasion.classic',
      why: 'the four segments are FR-34’s published weightings, each by its own word: Office (office and minimal are two profiles), Japanese-inspired (no classic weighting exists, FR-23), Formal (no evening weighting is published) (ADR-0151)',
    },
    {
      rule: 'E2',
      element: '07.intelligence.harmony.value',
      why: 'the warm–cool relation the outfit’s harmony component measures, in words; no engine names a geometric relationship for a set of colours yet (F-349), and "Kasane" is a claim about tradition (ADR-0151)',
    },
    {
      rule: 'E2',
      element: '07.substitutions.monochrome',
      why: 'the pills are the engine’s four axes (warmer, cooler, lighter, higher contrast); no monochrome axis exists (ADR-0152)',
    },
    {
      rule: 'E4',
      element: '07.slots.slot-2',
      why: 'a slot’s sheet (its rank, its reasons and Open · Shop for this · Add to wardrobe), the Locked badge on a locked slot out of hand, and the disabled save with its line when no profile is stored — capabilities FR-31, FR-11, F-195, F-199 and ADR-0136 require that 07 does not draw (ADR-0152)',
    },
    {
      rule: 'E2',
      element: '07.intelligence.fit.value',
      why: 'the FR-32 personal-fit figure stays; "Match" and the seasonal type do not (§4 E2, C12). OQ-32 closed by ADR-0150: the note names whose profile the figure was computed against — "(your profile)" — and with no profile there is no figure',
    },
    {
      rule: 'E2',
      element: '07.intelligence.cvd.value',
      why: 'the computed separation (FR-5) stays with the model it was computed under; the safety suffix is a claim about people and does not ship (§4 E2)',
    },
    {
      rule: 'E2',
      element: '07.intelligence.contrast.value',
      why: 'the WCAG ratio and the APCA Lc are two figures — APCA has no ratio (FR-3, §4 E2)',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '07.anchor.swatch',
        '07.slots.slot-1',
        '07.slots.slot-2',
        '07.slots.slot-3',
        '07.slots.slot-4',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: [
        '07.slots.slot-1.title',
        '07.slots.slot-1.hex',
        '07.slots.slot-1.name',
        '07.slots.slot-2.title',
        '07.slots.slot-2.hex',
        '07.slots.slot-2.name',
        '07.slots.slot-3.swap',
        '07.slots.slot-4.swap',
      ],
      resolution:
        'text sits on the sample as 07 draws it, and takes per sample whichever of the two text colours passes 4.5:1 (E3); F-248 widens it to the compact Swaps drawn on the sample, whose words and edge take the same ink (ADR-0153)',
      flippedByUser: false,
    },
    {
      id: 'C12',
      elements: ['07.intelligence.fit.value'],
      resolution:
        'the seasonal label is derived from the four ranges by F-223 and appears only on 23 beside them; OQ-32 closed by ADR-0150 — the fit note names the profile, never a type',
      flippedByUser: false,
    },
  ],
};
