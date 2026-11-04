// Mockup 19 — What Goes With This, drawn inside a device frame. The frame's inner screen is 627 px
// wide (x 70–696, y 61–1312), so 384 / 627 = 0.6124 dp per px (§2). Boxes are pixel readings
// (measure.ps1, corner.ps1). Row 5 runs on under the action bar, so its box stops at the bar's top
// rule. C18 is settled by ADR-0169. The generator orders elements by the reading rule. Type size as
// in 02.mjs, the em converted at 0.6124 dp per px.
//
// F-252 RE-READ EVERY BOX, TYPE, CORNER, FILL AND INK (2026-11-04), with the Node port of
// measure.ps1's `blobs`/`mean`, corner.ps1's fit and an ink-row profile (each element's ink read
// around its record against the local ground), each repeatable with the .ps1 where PowerShell runs:
// - THE HEADER is read, no longer derived: its fill's rows cross half-height at y 61.5 and 139.5 at
//   the centre line, 78 px = 47.8 dp. Its fill reads #1E2128 — level 1 (F-220's #1C1F26 was the
//   frame's corner curve averaged in). The action bar's fill reads #1D2027, level 1 too, under a rule
//   at y 1207–1210; Build's fill #3A424C — level 3.
// - BACK's arrow inks 27 × 24 px and its word is the Atlas tab's (F-246, F-250); the filter glyph
//   inks 33 × 28; Build's arrow 20 × 19. Each glyph's size is read from its ink (06's rule).
// - THE DIVIDER inks x 210–212, peaking #585A65 — brighter than border.subtle. Recorded only: it is
//   the shared AppBar divider, read the same on 07.
// - TYPE (em ≈ cap × 0.6124 / 0.73, a flat capital where the line has one): the title's W 20 px
//   (16.8 dp) and back's A 20 — body; the anchor's name A 21 (17.6) — body; the five row names A, D,
//   S, G, T 19–21 (15.9–17.6) — body, as siblings (F-220's 19.7 for row 2 read the kanji); Build's B
//   21 — body. The two headings A 17 and R 18 (14.3, 15.1) — label, as siblings (F-220: body); the
//   OKLCh line's KL 17 (14.3) and the slot line's A 17 — label (F-220: body); the details 16 on a
//   flat capital (13.4; row 1's C and row 5's S overshoot to 17 and 18) — label; Wear's W 14–15
//   (11.7–12.6, median 12.6) — label.
// - CORNERS (corner.ps1's fit, px): the anchor card and the rows 14–16.25 (8.6–10 dp) and the ring
//   16 — md; Wear 9–10 and Build 10.25 (6.3 dp) — sm (F-220: md for Build); the row samples 10.5–12.75
//   (median 6.4 dp) — sm (R9 §5's 11.5 was the px, unscaled); the anchor's sample about 4 px,
//   concentric inside the ring — sm, the smallest step.
// - THE RING inks x 119–122 at #A0A5AC (text.secondary); the gap x 123–128 reads #2B2E35, the blur
//   of two edges six pixels apart rather than a fill; the sample starts at x 129. F-233's ring and
//   gap, read at half-height crossings, are kept.
// - NOTATION (OQ-26, ADR-0167): the headings' component nouns *Hero Card* and *Rows*, and *Action:*
//   before each row's *Wear*, are the wireframe's labels for what a part is, as R9 §2 reads *Card* at
//   the end of 07's and 08's titles and ADR-0163 reads brackets. Each word is boxed from its own ink.
//   The heading boxes stop where the noun begins.
// - NOT DEPARTURES: a long name or detail wraps (E3, never clipped) and Wear's target reaches the
//   platform's through its hit area (E3) — neither changes what the drawn state draws.
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

const row = (n, r) => {
  const p = `19.rows.row-${n}`;
  return [
    // F-235: RankedRow's `harmony` form.
    el(p, 'ui:RankedRow', r.box, {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: r.bg },
    }),
    el(`${p}.swatch`, 'ui:Swatch', r.swatch, {
      parent: p,
      tokens: { radius: 'sm' },
      binding: `corpus:with.${n - 1}.hex`,
      measured: { fill: r.fill },
      raw: { cornerPx: r.cornerPx },
    }),
    t(`${p}.name`, r.name, p, `corpus:with.${n - 1}.label`, {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      copy: { shape: 'label', script: 'mixed' },
      raw: { emDp: r.nameEm },
    }),
    t(`${p}.detail`, r.detail, p, `engine:with.${n - 1}.relationship`, {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'value', script: 'mixed' },
      raw: { emDp: r.detailEm },
    }),
    el(`${p}.wear`, 'ui:Button', r.wear, {
      parent: p,
      tokens: { border: 'border.subtle', radius: 'sm' },
      type: text('sans', 'label'),
      raw: { emDp: r.wearEm },
      binding: 'static:with.wear',
      action: 'navigate:/atlas/wear/[slug]?with=',
      copy: { shape: 'label', script: 'latin' },
    }),
  ];
};

// *Action:* before each row's Wear, boxed from its ink (ADR-0167).
const ACTION_PREFIX = [526, 679, 831, 983, 1134];

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'device',
    screens: [{ id: '19.screen', box: B(70, 61, 627, 1252), dpPerPx: 0.6124 }],
  },
  elements: [
    // ---- header
    el('19.header', 'ui:AppBar', B(70, 62, 627, 78), {
      tokens: { bg: 'level1' },
      measured: { bg: '#1E2128' },
    }),
    el('19.back', 'ui:Button', B(97, 91, 96, 23), {
      parent: '19.header',
      icon: 'back',
      // The arrow's own ink, which the glyph's size is read from (06's rule).
      raw: { glyphWPx: 27, glyphHPx: 24, emDp: 16.8 },
      type: text('sans', 'body'),
      binding: 'static:tab.atlas',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('19.header-divider', null, B(210, 84, 3, 35), {
      parent: '19.header',
      tokens: { fg: 'border.subtle' },
      measured: { fg: '#585A65' },
    }),
    el('19.title', 'ui:Text', B(228, 89, 340, 26), {
      parent: '19.header',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      raw: { emDp: 16.8 },
      binding: 'static:with.title',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    el('19.filter', 'ui:Button', B(640, 88, 33, 28), {
      parent: '19.header',
      icon: 'filter',
      raw: { glyphWPx: 33, glyphHPx: 28 },
      action: 'open:with.filter',
    }),
    // ---- the anchor
    el('19.anchor.heading', 'ui:Text', B(102, 162, 136, 22), {
      tokens: { fg: 'text.secondary' },
      binding: 'static:with.anchorHeading',
      type: text('sans', 'label', 500),
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 14.3 },
    }),
    el('19.anchor', 'ui:Card', B(89, 196, 590, 189), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1D2027' },
    }),
    // The ring 3.75 px wide, then a 6.2 px gap to the sample (F-233, crossings at half height). Its
    // plateau reads #9FA8AF–#A0A9B0: text.secondary (#A6B0BC), not text.primary (#F7F8FA), which an
    // earlier reading recorded (F-233's review).
    el('19.anchor.ring', null, B(118, 216, 160, 148), {
      parent: '19.anchor',
      tokens: { border: 'text.secondary', radius: 'md' },
      raw: { ringPx: 3.75, gapPx: 6.2, cornerPx: 16 },
    }),
    el('19.anchor.swatch', 'ui:Swatch', B(128, 223, 143, 132), {
      parent: '19.anchor.ring',
      tokens: { radius: 'sm' },
      binding: 'corpus:anchor.hex',
      measured: { fill: '#576975' },
      raw: { cornerPx: 4 },
    }),
    t('19.anchor.name', B(298, 244, 329, 30), '19.anchor', 'corpus:anchor.label', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 500),
      copy: { shape: 'label', script: 'mixed' },
      raw: { emDp: 17.6 },
    }),
    t('19.anchor.oklch', B(297, 284, 288, 19), '19.anchor', 'engine:anchor.oklch', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'label', 400, { tabular: true }),
      copy: { shape: 'value', script: 'mixed' },
      raw: { emDp: 14.3 },
    }),
    t('19.anchor.garment', B(297, 316, 200, 23), '19.anchor', 'engine:anchor.slot', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'label'),
      copy: { shape: 'value', script: 'latin' },
      raw: { emDp: 14.3 },
    }),
    // ---- the ranked rows (row 5 runs on under the action bar)
    el('19.rows.heading', 'ui:Text', B(103, 425, 310, 24), {
      tokens: { fg: 'text.secondary' },
      binding: 'static:with.rowsHeading',
      type: text('sans', 'label', 500),
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 15.1 },
    }),
    ...row(1, {
      box: B(89, 462, 590, 140),
      bg: '#1D2027',
      swatch: B(118, 481, 101, 102),
      fill: '#A77344',
      cornerPx: 10.5,
      name: B(237, 503, 251, 26),
      nameEm: 15.9,
      detail: B(237, 542, 260, 22),
      detailEm: 14.3,
      wear: B(530, 512, 132, 42),
      wearEm: 11.7,
    }),
    ...row(2, {
      box: B(89, 617, 590, 138),
      bg: '#1E2128',
      swatch: B(119, 637, 99, 99),
      fill: '#365A6C',
      cornerPx: 10.5,
      name: B(238, 657, 274, 30),
      nameEm: 17.6,
      detail: B(238, 697, 249, 21),
      detailEm: 13.4,
      wear: B(529, 665, 133, 43),
      wearEm: 12.6,
    }),
    ...row(3, {
      box: B(89, 770, 590, 137),
      bg: '#1D2127',
      swatch: B(119, 789, 99, 99),
      fill: '#585369',
      cornerPx: 10.5,
      name: B(238, 810, 244, 26),
      nameEm: 16.8,
      detail: B(237, 849, 241, 21),
      detailEm: 13.4,
      wear: B(530, 817, 132, 43),
      wearEm: 12.6,
    }),
    ...row(4, {
      box: B(89, 922, 590, 137),
      bg: '#1D2128',
      swatch: B(118, 940, 101, 101),
      fill: '#A38745',
      cornerPx: 12.75,
      name: B(238, 962, 225, 26),
      nameEm: 17.6,
      detail: B(237, 1000, 289, 20),
      detailEm: 13.4,
      wear: B(530, 969, 132, 42),
      wearEm: 11.7,
    }),
    ...row(5, {
      box: B(89, 1073, 590, 135),
      bg: '#1B1E24',
      swatch: B(118, 1091, 101, 100),
      fill: '#A15B42',
      cornerPx: 10.5,
      name: B(238, 1113, 191, 26),
      nameEm: 15.9,
      detail: B(238, 1151, 291, 21),
      detailEm: 15.1,
      wear: B(530, 1120, 132, 43),
      wearEm: 12.6,
    }),
    // ---- the action
    el('19.bar', 'ui:ActionBar', B(72, 1208, 624, 104), {
      tokens: { bg: 'level1', border: 'border.subtle' },
      measured: { bg: '#1D2027' },
    }),
    el('19.bar.build', 'ui:Button', B(88, 1230, 592, 67), {
      parent: '19.bar',
      tokens: { bg: 'level3', radius: 'sm' },
      measured: { bg: '#3A424C' },
      icon: 'arrow-right',
      raw: { glyphWPx: 20, glyphHPx: 19, cornerPx: 10.25, emDp: 17.6 },
      type: text('sans', 'body'),
      binding: 'static:with.build',
      action: 'navigate:/atlas/wear/[slug]',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    { what: 'bezel', note: 'the device frame around the screen', box: B(66, 58, 636, 1264) },
    { what: 'outside-art', note: 'leaf line-art above the device frame', box: B(0, 0, 768, 58) },
    {
      what: 'outside-art',
      note: 'leaf line-art left of the device frame',
      box: B(0, 58, 66, 1264),
    },
    {
      what: 'outside-art',
      note: 'leaf line-art right of the device frame',
      box: B(702, 58, 66, 1264),
    },
    { what: 'outside-art', note: 'leaf line-art below the device frame', box: B(0, 1322, 768, 54) },
    {
      what: 'leaked-label',
      note: 'a component name and level printed after the anchor heading',
      box: B(351, 162, 215, 22),
    },
    {
      what: 'leaked-label',
      note: 'a pixel size printed inside the anchor swatch',
      box: B(170, 283, 56, 22),
    },
    // F-252 (OQ-26, ADR-0167): a component's noun inside a heading, and a control's type before its
    // word, are the wireframe's notation, as R9 §2 reads 07's and 08's *Card*.
    {
      what: 'garbled-text',
      note: 'Hero Card: the anchor heading names its component — notation, not copy',
      box: B(242, 162, 102, 20),
    },
    {
      what: 'garbled-text',
      note: 'Rows: the rows heading names its component — notation, not copy',
      box: B(417, 424, 58, 21),
    },
    ...ACTION_PREFIX.map((y, i) => ({
      what: 'garbled-text',
      note: `Action: before row ${String(i + 1)}'s Wear names the control's type — notation, not copy`,
      box: B(541, y - 1, 60, 18),
    })),
  ],
  departures: [
    {
      rule: 'E1',
      element: '19.anchor.name',
      why: '19’s Ai-nezumi is sample content and not a corpus record; the line is the record’s kanji, romaji and English (ADR-0170)',
    },
    {
      rule: 'E1',
      element: '19.anchor.oklch',
      why: '#5B6B78’s printed OKLCh does not survive checking (§4 E1); the line shows the engine’s conversion, and the one record outside sRGB adds its rendering cost after it (rule 11, ADR-0169)',
    },
    ...[1, 2, 3, 4, 5].map((n) => ({
      rule: 'E1',
      element: `19.rows.row-${String(n)}`,
      why: 'the row’s colour, name and ΔE00 are the corpus record ADR-0168 places at this position; how many rows there are and their order are the engine’s, not 19’s sample content',
    })),
    ...[2, 3].map((n) => ({
      rule: 'E2',
      element: `19.rows.row-${String(n)}.detail`,
      why: 'Analogous Cool and Analogous Soft: no computation produces the qualifier, so the line reads Analogous; two analogous rows are told apart by their names and samples (ADR-0170, ADR-0151 D4’s precedent)',
    })),
    {
      rule: 'E2',
      element: '19.rows.heading',
      why: 'Ranked: the rows are in ADR-0168’s fixed order of relationships, curated first, and nothing ranks them, so the heading reads Harmonic Relationships (ADR-0170 D6; F-252’s review, M2)',
    },
    {
      rule: 'E4',
      element: '19.filter',
      why: '19 draws the glyph and nothing behind it: it opens 03’s sheet with one choice in 05’s pills, and while a relationship is chosen Showing n / N and Clear sit on the rows heading’s line (ADR-0171 D4)',
    },
    {
      rule: 'E4',
      element: '19.rows.heading',
      why: 'curated members come first in 19’s row form (FR-73’s curated half, ADR-0168); in the rows’ place, 00’s caption when the colour is not in this corpus or no corpus colour stands in its hue relationships (ADR-0171 D5)',
    },
    {
      rule: 'E4',
      element: '19.bar',
      why: '01’s tab bar sits under the action bar, as on 16, 22 and 24 (FR-71)',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '19.anchor.swatch',
        '19.rows.row-1.swatch',
        '19.rows.row-2.swatch',
        '19.rows.row-3.swatch',
        '19.rows.row-4.swatch',
        '19.rows.row-5.swatch',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: [
        '19.anchor.name',
        '19.anchor.oklch',
        '19.rows.row-1.name',
        '19.rows.row-2.name',
        '19.rows.row-3.name',
        '19.rows.row-4.name',
        '19.rows.row-5.name',
      ],
      resolution: 'text sits beside the sample as 19 draws it',
      flippedByUser: false,
    },
    {
      id: 'C18',
      elements: [
        '19.rows.row-1.detail',
        '19.rows.row-2.detail',
        '19.rows.row-3.detail',
        '19.rows.row-4.detail',
        '19.rows.row-5.detail',
      ],
      resolution:
        '19: ΔE00 from the anchor, as drawn, floored to one place (ADR-0170). FR-73’s relationship, family and generated-or-curated mark are the detail’s relationship words, and its gamut cost is each record’s own, the one non-zero noted (ADR-0169)',
      flippedByUser: false,
    },
  ],
};
