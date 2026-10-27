// Mockup 08 — colour compare. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes are pixel readings
// (measure.ps1). The left metric card's left edge is read from its bottom border's run (x 35); the
// line-art is inside the screen, so it is design. The generator orders elements by the reading rule.
// Type size by the rule in 02.mjs.
//
// F-249 RE-MEASURED EVERY BOX, TYPE, CORNER AND INK (2026-10-26), with a Node port of measure.ps1's
// `blobs`/`mean`, corner.ps1's fit, stem.ps1's run widths and ink coverage, and art-measure.ps1's
// percentiles, each reading repeatable with the .ps1 where PowerShell runs:
// - TYPE (02.mjs's rule, caps/digits ≈ box/0.73): the title's capitals ink 20 px (13.7 dp an em; its
//   advance, "Colour Compare" at 7.26 em in 99 dp, agrees), so `label`, not `title` — F-220's 20.5
//   was the 30 px box (cap to the kanji's foot) read as capitals. The names ink 20–21 px of capital
//   and 25–26 px of kanji (13.7–14.4 dp): `label`. Every other text inks 13–17 px (8.9–11.6 dp):
//   `caption`, the step every em below 12 dp takes (ADR-0113) — the tables, the meta lines, the card
//   titles, the Change labels and both actions (the PDF label's advance, 26 letters at 11.96 em in
//   135.5 dp, agrees). The ems below 12 dp stay in these comments, not raw.emDp (F-248: the caption
//   step is their median, recomputed by type-scale.test).
// - WEIGHT (stem runs, threshold 250; and ink coverage of one glyph against the same glyph): the title
//   and the back word run 3 px stems as often as 2 (1.0–1.07) where the 400 rows run 0.14–0.32: 500.
//   A value's 0 covers 10 % more than the ΔE00 label's 0: 500, as recorded. The card titles' e covers
//   31 % more than Lightness's e, and runs 4.4 three-pixel stems to each two: 600. The WCAG value runs
//   1.33 to the label's 0.16, and its words are drawn in the figure's ink: 500, primary. A separation
//   value's figure runs 0.63, its words 0.14 in the secondary ink (#CBCED3 against the figure's
//   #FDFEFE): the stacked form's figure run at 500 and its words at 400. The Change, PDF and Studio
//   labels run 1.05–1.78: 500, board 00's button weight.
// - CORNERS (corner.ps1's fit, px): the cards 14.25–15, the samples 9–12.75, Change 10–11.25, PDF
//   9.5–11, Studio 10.5–13 — 5.1–7.5 dp, every one `sm` (6; md is 10, the midpoint 8).
// - THE SAMPLES DRAW NO KEYLINE. Each sample's edge is a 1 px ring 6–8 lum above the sample inside and
//   6–9 below the card outside, symmetric and in proportion to the step — the sharpening halo every
//   edge in 08 carries (the PDF button's: 22 below, 8 above). A README keyline (#FFFFFF22, 1 dp) would
//   lighten two pixels by about 20. So the samples bind no keyline, and the shipped guarantee for an
//   element that draws none stands: a line only where the sample would lose its edge (OQ-46's interim,
//   ADR-0116; F-249 decides nothing of OQ-46). F-220 recorded `keyline`.
// - THE SEAM AND EVERY RULE ARE ONE INK: the seam #373B43, the cards' edges #383D44, the table rules
//   #363B43, the header rule #33383E — `border.subtle`, not the keyline (#3E4046 over level 1). The
//   seam runs the card's whole height (180–690); below the card it continues 18 px to the leaked
//   caption, which is that caption's leader (notDesign).
// - THE ACTION BAR starts at its rule (1244–1245, 2 px); its ground is the page's (#16181B). Both
//   buttons are 61 px (1280–1340): 08.json's 63 and 60 were two readings of one height.
// - THE ART inks p90 0.126–0.131 and p50 0.085–0.093 of the foreground over the ground (gamma luma):
//   the backdrop's `opacity.art` (0.15).
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
    type: text('sans', 'caption'),
    binding,
    copy: { shape: 'label', script: 'latin' },
    ...extra,
  });
const rule = (id, box, parent) => el(id, null, box, { parent, tokens: { fg: 'border.subtle' } });

const side = (key, s) => [
  el(`08.pair.${key}.swatch`, 'ui:Swatch', s.swatch, {
    parent: '08.pair',
    // F-249: no keyline (above); the corner reads 9–12.75 px, `sm`.
    tokens: { radius: 'sm' },
    raw: { cornerPx: 11 },
    binding: `store:compare.${key}.hex`,
  }),
  // F-249: 20–21 px of capital, 25–26 of kanji — 13.7–14.4 dp an em: `label`, not body.
  t(`08.pair.${key}.name`, s.name, '08.pair', `corpus:compare.${key}.name`, {
    tokens: { fg: 'text.primary' },
    type: text('gothic', 'label'),
    copy: { shape: 'heading', script: 'mixed' },
  }),
  // F-249: its digits ink 15 px — 10.3 dp an em: caption.
  t(`08.pair.${key}.meta`, s.meta, '08.pair', `engine:compare.${key}.oklch`, {
    tokens: { fg: 'text.secondary' },
    type: text('sans', 'caption', 400, { tabular: true }),
    copy: { shape: 'value', script: 'figures' },
  }),
  el(`08.pair.${key}.change`, 'ui:Button', s.change, {
    parent: '08.pair',
    // F-249: outlined in the border ink over the card's own fill; its label's capitals ink 16 px
    // (11.0 dp): caption, at 500.
    tokens: { border: 'border.subtle', radius: 'sm' },
    type: text('sans', 'caption', 500),
    raw: { cornerPx: 10.5 },
    binding: `static:compare.change.${key}`,
    action: `open:compare.pick.${key}`,
    copy: { shape: 'label', script: 'latin' },
  }),
];
// F-235 (2026-10-05): each card's rows are a ui:ReadoutTable (the ruled form), each row a
// ui:ReadoutRow spanning its members, and the rules belong to the table.
const union = (...boxes) => {
  const xs = boxes.filter(Boolean);
  const x = Math.min(...xs.map((b) => b.x));
  const y = Math.min(...xs.map((b) => b.y));
  return B(
    x,
    y,
    Math.max(...xs.map((b) => b.x + b.w)) - x,
    Math.max(...xs.map((b) => b.y + b.h)) - y,
  );
};
// F-249: a label's capitals and a value's digits ink 16–17 px (11.0–11.6 dp an em), a reading's and a
// formula's 12–14 px (8.9–9.2 dp): every one `caption`. A label with a notation line (ΔL*) is one
// paragraph of two lines, its box both.
const metric = (key, label, value, reading, formula = null) => [
  el(`08.metrics.${key}`, 'ui:ReadoutRow', union(label, value, reading, formula), {
    parent: '08.metrics.table',
  }),
  t(`08.metrics.${key}.label`, label, `08.metrics.${key}`, `static:compare.${key}`, {
    tokens: { fg: 'text.primary' },
  }),
  t(`08.metrics.${key}.value`, value, `08.metrics.${key}`, `engine:compare.${key}`, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'caption', 500, { tabular: true }),
    copy: { shape: 'value', script: 'figures' },
  }),
  ...(reading
    ? [
        // ADR-0125: the total's band, or the axis's weighted term banded on the same table.
        t(
          `08.metrics.${key}.reading`,
          reading,
          `08.metrics.${key}`,
          key === 'delta-e00'
            ? 'engine:deltaE00Band'
            : key === 'hue'
              ? 'engine:axisReading.hue+lexicon'
              : `engine:axisReading.${key}`,
          { tokens: { fg: 'text.secondary' } },
        ),
      ]
    : []),
];
const access = (key, label, value, binding, note = null, extra = {}) => [
  el(`08.access.${key}`, 'ui:ReadoutRow', union(label, value, note), {
    parent: '08.access.table',
  }),
  t(`08.access.${key}.label`, label, `08.access.${key}`, `static:compare.${key}`, {
    tokens: { fg: 'text.primary' },
  }),
  t(`08.access.${key}.value`, value, `08.access.${key}`, binding, {
    tokens: { fg: 'text.secondary' },
    copy: { shape: 'value', script: 'mixed' },
    ...extra,
  }),
];

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '08.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    // ---- header
    // The app bar (F-234), bounded by its rule. F-249: the rule's own rows are 93–94 (2 px, 1 dp), so
    // the bar is 46.5 dp; F-220 recorded a 7 px band (93–100).
    el('08.header', 'ui:AppBar', B(0, 0, 768, 93)),
    // F-249: the arrow inks 24 × 18 px and "Atlas" 19 px of capital (13.0 dp an em): label, at 500
    // (stems 1.07 three-pixel runs to each two, the 400 rows 0.14–0.32).
    el('08.back', 'ui:Button', B(35, 38, 93, 19), {
      parent: '08.header',
      icon: 'back',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      binding: 'static:atlas.back',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 13 },
    }),
    // F-249: from the kanji's top (34) to the p's foot (62); its capitals ink 20 px, 13.7 dp an em.
    el('08.title', 'ui:Text', B(246, 34, 276, 29), {
      parent: '08.header',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      binding: 'static:compare.title',
      copy: { shape: 'heading', script: 'mixed' },
      raw: { emDp: 13.7 },
    }),
    // F-249: the download glyph inks 25–26 × 32 px. It opens the export with the pair (ADR-0156 D3),
    // as 06's and 07's export glyphs open /profile/export.
    el('08.export', 'ui:Button', B(705, 31, 26, 32), {
      parent: '08.header',
      icon: 'download',
      action: 'navigate:/profile/export',
    }),
    el('08.header-rule', null, B(0, 93, 768, 2), {
      parent: '08.header',
      tokens: { fg: 'border.subtle' },
      measured: { fg: '#33383E' },
    }),
    // ---- line-art inside the screen (§2: design). F-249: each box is its ink's extent; the top and
    // the right are one sprig that runs behind the pair card's top-right corner.
    el('08.art-top', 'ui:Illustration', B(520, 100, 205, 76), { illustration: 'plum-branch' }),
    el('08.art-right', 'ui:Illustration', B(738, 190, 30, 251), { illustration: 'plum-branch' }),
    el('08.art-left', 'ui:Illustration', B(0, 942, 32, 278), { illustration: 'plum-branch' }),
    // ---- the pair. F-249: the card's edge 179–691 and 34–733; corner 14.25–14.5 px (sm).
    el('08.pair', 'ui:Card', B(34, 179, 700, 513), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1E2125', border: '#383D44' },
      raw: { cornerPx: 14.5 },
    }),
    el('08.seam', null, B(383, 180, 2, 511), {
      tokens: { fg: 'border.subtle' },
      measured: { fg: '#373B43' },
    }),
    ...side('a', {
      swatch: B(58, 203, 303, 303),
      name: B(59, 530, 183, 26),
      meta: B(59, 572, 287, 16),
      change: B(58, 615, 303, 54),
    }),
    ...side('b', {
      swatch: B(407, 203, 303, 303),
      name: B(408, 530, 216, 26),
      meta: B(408, 572, 288, 16),
      change: B(407, 615, 303, 54),
    }),
    // ---- perceptual distance. F-249: the card's edge 756–1218, 34–371; corner 15 px (sm).
    el('08.metrics', 'ui:Card', B(34, 756, 338, 463), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1E2126' },
      raw: { cornerPx: 15 },
    }),
    // F-249: capitals 17 px (11.6 dp an em), caption, at 600 (above). The second line's "level" is
    // not design.
    t('08.metrics.title', B(60, 784, 233, 45), '08.metrics', 'static:compare.metrics', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'caption', 600),
      copy: { shape: 'heading', script: 'latin', lines: 2 },
    }),
    el('08.metrics.table', 'ui:ReadoutTable', B(58, 850, 291, 342), { parent: '08.metrics' }),
    rule('08.metrics.rule-1', B(58, 850, 290, 2), '08.metrics.table'),
    ...metric(
      'delta-e00',
      B(59, 868, 53, 17),
      B(191, 868, 45, 17),
      B(191, 896, 130, 17),
      B(59, 895, 100, 17),
    ),
    t(
      '08.metrics.delta-e00.formula',
      B(59, 895, 100, 17),
      '08.metrics.delta-e00',
      'static:compare.ciede2000',
      { tokens: { fg: 'text.secondary' } },
    ),
    rule('08.metrics.rule-2', B(59, 926, 289, 2), '08.metrics.table'),
    // F-249: ΔEok's "ok" is drawn lowered — its o's foot 3 px and its k's 2 px under the E's baseline —
    // at about the label's own size (the o inks 12 px to the x-height's 13; the k 16 to the cap's 16).
    ...metric('delta-eok', B(59, 945, 50, 19), B(191, 945, 57, 17), null),
    rule('08.metrics.rule-3', B(59, 978, 289, 2), '08.metrics.table'),
    ...metric('lightness', B(58, 996, 96, 43), B(191, 996, 44, 17), B(191, 1024, 83, 17)),
    rule('08.metrics.rule-4', B(58, 1054, 290, 2), '08.metrics.table'),
    ...metric('chroma', B(58, 1072, 78, 43), B(191, 1072, 44, 17), B(191, 1101, 155, 13)),
    rule('08.metrics.rule-5', B(59, 1130, 289, 2), '08.metrics.table'),
    ...metric('hue', B(58, 1148, 40, 43), B(192, 1148, 59, 17), B(192, 1177, 136, 13)),
    // ---- contrast and colour vision. F-249: the card's edge 756–1218, 395–733; corner 14.25 px.
    el('08.access', 'ui:Card', B(395, 756, 339, 463), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1D2025' },
      raw: { cornerPx: 14.25 },
    }),
    // F-249: as the metrics title; its last word, "Card", is a component name (notDesign).
    t('08.access.title', B(420, 784, 263, 50), '08.access', 'static:compare.access', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'caption', 600),
      copy: { shape: 'heading', script: 'latin', lines: 2 },
    }),
    el('08.access.table', 'ui:ReadoutTable', B(420, 850, 290, 342), { parent: '08.access' }),
    rule('08.access.rule-1', B(420, 850, 289, 2), '08.access.table'),
    // F-249: the WCAG value's two lines are the figure's ink (#FDFEFE) and weight, words and all.
    ...access(
      'wcag',
      B(420, 867, 157, 17),
      B(421, 895, 179, 44),
      'engine:contrast+threshold+warmCool',
      B(422, 943, 119, 17),
      {
        tokens: { fg: 'text.primary' },
        type: text('sans', 'caption', 500),
        // claims-ok: names the drawn construction this element's binding resolves
        measured: { fg: '#FDFEFE' },
      },
    ),
    t('08.access.wcag.apca', B(422, 943, 119, 17), '08.access.wcag', 'engine:apca', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'caption', 400, { tabular: true }),
      copy: { shape: 'value', script: 'figures' },
    }),
    rule('08.access.rule-2', B(420, 972, 290, 2), '08.access.table'),
    // F-249: each separation value is the stacked form's line — its figure in the primary ink at 500,
    // its words in the secondary at 400 (the paragraph's own ink and weight, recorded here).
    ...access('protan', B(422, 990, 105, 21), B(421, 1017, 200, 20), 'engine:separation.protan'),
    rule('08.access.rule-3', B(420, 1050, 289, 1), '08.access.table'),
    ...access('deutan', B(422, 1067, 131, 21), B(421, 1094, 200, 20), 'engine:separation.deutan'),
    rule('08.access.rule-4', B(420, 1127, 289, 2), '08.access.table'),
    ...access('tritan', B(421, 1144, 97, 22), B(421, 1172, 200, 20), 'engine:separation.tritan'),
    // ---- actions. F-249: from the bar's rule (1244); its ground is the page's.
    el('08.actions', 'ui:ActionBar', B(0, 1244, 768, 132), {
      tokens: { border: 'border.subtle' },
      measured: { bg: '#16181B' },
    }),
    // F-249: 61 px, filled #F2F5F8; corner 9.5–11 px (sm). It opens the export with the pair, PDF
    // chosen (ADR-0156 D4); F-263 composes the document.
    el('08.actions.pdf', 'ui:Button', B(33, 1280, 343, 61), {
      parent: '08.actions',
      tokens: { bg: 'action.primary', radius: 'sm' },
      type: text('sans', 'caption', 500),
      raw: { cornerPx: 10.25 },
      binding: 'static:compare.exportPdf',
      action: 'navigate:/profile/export',
      copy: { shape: 'label', script: 'latin' },
    }),
    // F-249: 61 px, outlined over a fill of the cards' level (#1E2025); corner 10.5–13 px (sm).
    el('08.actions.studio', 'ui:Button', B(393, 1280, 342, 61), {
      parent: '08.actions',
      tokens: { border: 'border.subtle', bg: 'level1', radius: 'sm' },
      measured: { bg: '#1E2025' },
      type: text('sans', 'caption', 500),
      raw: { cornerPx: 11.75 },
      binding: 'static:compare.addToStudio',
      action: 'navigate:/atlas/palettes',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    {
      what: 'leaked-label',
      note: 'a component name printed as a section title',
      box: B(47, 142, 466, 23),
    },
    { what: 'leaked-label', note: 'a note on the seam, misspelt', box: B(269, 715, 230, 20) },
    {
      what: 'callout',
      note: 'the seam’s continuation below the card: the leader to the note above (F-249)',
      box: B(383, 692, 2, 18),
    },
    {
      what: 'leaked-label',
      note: 'a component level printed after the card title',
      box: B(270, 814, 77, 15),
    },
    {
      what: 'leaked-label',
      note: '"Card" at the end of the card title — a component name (§2, F-249; 07’s, F-248)',
      box: B(634, 812, 48, 17),
    },
    // F-249 (ADR-0155 D5): notation inside elements that are design, as 05's (ADR-0142 D3).
    {
      what: 'garbled-text',
      note: 'square brackets around the button label "Change A": notation, not copy',
      box: B(154, 633, 111, 22),
    },
    {
      what: 'garbled-text',
      note: 'square brackets around the button label "Change B": notation, not copy',
      box: B(504, 633, 109, 22),
    },
  ],
  departures: [
    {
      rule: 'E1',
      element: '08.pair.a.name',
      why: 'the pair on screen, each by its kanji and romaji from the corpus; 08’s Ai-nezumi and Sabi-asagi are sample content (ADR-0156 D1)',
    },
    {
      rule: 'E1',
      element: '08.pair.a.meta',
      why: '#5B6B78 is printed as OKLCh 0.490 · 240°; it is 0.519 / 0.028 / 242.7° (§4 E1) — the line shows the record’s OKLCh L and h for the colour on screen (ADR-0155 D1)',
    },
    {
      rule: 'E1',
      element: '08.pair.b.meta',
      why: '#5C828C is printed as OKLCh 0.540 · 210°; it is 0.582 / 0.045 / 215.9° (§4 E1) — the line shows the record’s OKLCh L and h for the colour on screen (ADR-0155 D1)',
    },
    {
      rule: 'E1',
      element: '08.metrics.delta-e00.value',
      why: 'every figure in both tables is the engine’s for the pair on screen, at the precision ADR-0155 D1 names; 08’s 3.42, 0.038, +4.8, +5.2, −14.2°, 1.48:1, 16.2 and 92/94/89 % are sample content',
    },
    {
      rule: 'E2',
      element: '08.metrics.lightness.reading',
      why: 'ADR-0125’s band phrases replace the sentence form (B is lighter, B is more chromatic, Shift towards teal): each describes its printed figure, and the hue’s phrase names B’s hue term from the published lexicon only where ADR-0155 D2 allows it',
    },
    {
      rule: 'E2',
      element: '08.access.wcag.value',
      why: 'the ratio, floored, and the Lc stay; the pairing verdict after them does not (FR-32, FR-3) — the line names the WCAG 2.2 threshold the floored ratio reaches and the pair’s warm–cool relation (FR-6), until F-349 names a geometric one (ADR-0155 D3)',
    },
    ...['protan', 'deutan', 'tritan'].map((k) => ({
      rule: 'E2',
      element: `08.access.${k}.value`,
      why: 'the computed separation (FR-5) stays with the model it was computed under — (Machado 2009), approximate for the tritan simulation (ADR-0131); the safety suffix is a claim about people and does not ship (ADR-0155 D4)',
    })),
    {
      rule: 'E4',
      element: '08.pair.a.change',
      why: 'Change A and Change B open 03’s floating sheet — 05’s search field read through the Finder’s query, the other slot’s colour left out, the slot’s own marked, 00’s caption when nothing matches; and a colour this corpus does not hold shows the back above 00’s caption — capabilities FR-47 and ADR-0128 require that 08 does not draw (ADR-0156)',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: ['08.pair.a.swatch', '08.pair.b.swatch'],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
  ],
};
