// Mockup 06 — colour detail. A SPEC CARD with callouts on the right and above. It draws two widths
// (questions.md 9): the upper panel (x 50–528, top 97) holds the navigation, so the screen is its inner
// width — 474 px → 384 / 474 dp per px. OQ-19 is answered (F-247, ADR-0145): the provenance card, the
// combinations card and the action bar, drawn wider into the callout column, are FITTED to the screen
// as the readout card is — recorded at their fitted boxes, each drawn box kept in a comment. The readout
// table is recorded as measured geometry — row bands and the column rule at x 160 — not as text boxes.
// Type size by the rule in 02.mjs, at this screen's scale.
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

// F-247: each label binds the catalogue's notation word (colour.hex, coord.*), the words the table
// already prints; the values are the record's own derivation (corpus:) and the engine's conversion.
const rows = [
  ['hex', 747, 'corpus:entry.derived.hex', 'colour.hex'],
  ['oklch', 775, 'corpus:entry.derived.oklch', 'coord.oklch'],
  ['cielab', 802, 'corpus:entry.derived.lab', 'coord.lab'],
  ['srgb', 830, 'corpus:entry.derived.hex', 'coord.rgb'],
];
// F-235 (2026-10-05): the labels read #CDCED2 and the values #C1C3C6 (ink above lum 120) — both the
// primary ink, the label heavier — where the labels were first recorded text.secondary.
const tableRows = rows.flatMap(([key, y, binding, label]) => [
  el(`06.readout.table.${key}`, 'ui:ReadoutRow', B(74, y, 430, 26), {
    parent: '06.readout.table',
    tokens: { border: 'border.subtle' },
  }),
  el(`06.readout.table.${key}.label`, 'ui:Text', B(74, y, 86, 26), {
    parent: `06.readout.table.${key}`,
    tokens: { fg: 'text.primary' },
    measured: { fg: '#CDCED2' },
    type: text('sans', 'label', 500),
    binding: `static:${label}`,
    copy: { shape: 'label', script: 'latin' },
  }),
  el(
    `06.readout.table.${key}.value`,
    'ui:Text',
    // The sRGB row's value is its own triple; the Display-P3 pair after the bar is recorded below.
    key === 'srgb' ? B(170, 837, 77, 14) : B(161, y, 343, 26),
    {
      parent: `06.readout.table.${key}`,
      tokens: { fg: 'text.primary' },
      measured: { fg: '#C1C3C6' },
      type: text('sans', 'label', 400, { tabular: true }),
      binding,
      copy: { shape: 'value', script: 'figures' },
    },
  ),
]);
// F-235: the sRGB row carries a second value — a 1 px bar, the bold "Display-P3:" and its triple — read
// by the gaps between ink columns (x 170–246 | 255 | 264–343 | 349–476 px).
const p3 = [
  el('06.readout.table.srgb.separator', null, B(255, 834, 1, 18), {
    parent: '06.readout.table.srgb',
    tokens: { fg: 'border.subtle' },
  }),
  el('06.readout.table.srgb.p3-label', 'ui:Text', B(264, 837, 80, 14), {
    parent: '06.readout.table.srgb',
    tokens: { fg: 'text.primary' },
    type: text('sans', 'label', 500),
    binding: 'static:coord.displayP3',
    copy: { shape: 'label', script: 'latin' },
  }),
  el('06.readout.table.srgb.p3-value', 'ui:Text', B(349, 837, 128, 14), {
    parent: '06.readout.table.srgb',
    tokens: { fg: 'text.primary' },
    type: text('sans', 'label', 400, { tabular: true }),
    // The engine's conversion of the record's canonical XYZ, at render (ADR-0146): the bundle holds no P3.
    binding: 'engine:displayP3',
    copy: { shape: 'value', script: 'figures' },
  }),
];
const garment = (n, photo, badge, caption) => [
  el(`06.combinations.item-${n}.photo`, 'app:GarmentPhoto', photo, {
    parent: '06.combinations',
    tokens: { radius: 'pill' },
    binding: `engine:combinations.${n - 1}`,
    // F-247 (ADR-0147): a garment opens at its combinations, as Home's tiles do; /wardrobe/[id] is no route.
    action: 'navigate:/wardrobe/with/[id]',
  }),
  el(`06.combinations.item-${n}.rank`, 'ui:Chip', badge, {
    parent: '06.combinations',
    tokens: { bg: 'level2', radius: 'pill' },
    // F-247: the figure inks 10 px (cap height, 0.73 em) — about 11.1 dp an em, the caption step.
    type: text('sans', 'caption', 400, { tabular: true }),
    binding: `engine:combinations.${n - 1}.rank`,
    copy: { shape: 'badge', script: 'figures' },
  }),
];
const caption = (n, box) =>
  el(`06.combinations.item-${n}.caption`, 'ui:Text', box, {
    parent: '06.combinations',
    tokens: { fg: 'text.secondary' },
    // F-247 re-measured it: "Ecru Trousers" inks 10 px (caps, no descender, 0.73 em), so about 11.1 dp
    // an em — the caption step, not label; its two lines pitch 15 px (12.2 dp).
    type: text('sans', 'caption'),
    binding: `store:garments.${n - 1}.name`,
    copy: { shape: 'caption', script: 'mixed', lines: 2 },
  });
const [g1, g2, g3] = [
  garment(1, B(73, 1102, 83, 83), B(73, 1102, 27, 28)),
  garment(2, B(175, 1102, 83, 83), B(175, 1102, 27, 28)),
  garment(3, B(275, 1102, 84, 83), B(276, 1102, 26, 28)),
];

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'spec-card',
    screens: [{ id: '06.screen', box: B(53, 99, 474, 1201), dpPerPx: 0.8101 }],
  },
  elements: [
    // ---- header
    // The app bar (F-234): a container for the header, 57.5 dp, bounded by the rule.
    el('06.header', 'ui:AppBar', B(53, 99, 474, 71)),
    el('06.back.icon', null, B(72, 134, 18, 16), {
      parent: '06.header',
      icon: 'back',
      action: 'navigate:/atlas',
    }),
    // F-247: F-220 recorded 500 without a reading, and a five-letter word 17 px tall on this JPEG cannot be
    // read apart from 400 (stem.ps1's spread is about ±50 on the axis), so the back control takes board
    // 00's plain label, 400 (P3).
    el('06.back.label', 'ui:Text', B(101, 134, 47, 17), {
      parent: '06.header',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body'),
      // F-247 (ADR-0146): the Atlas tab's own word; the control is named "Back to Atlas".
      binding: 'static:tab.atlas',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 18.9 },
    }),
    el('06.bookmark', 'ui:Button', B(405, 131, 18, 22), {
      parent: '06.header',
      icon: 'bookmark',
      action: 'toggle:bookmark',
    }),
    el('06.share', 'ui:Button', B(446, 131, 19, 23), {
      parent: '06.header',
      icon: 'share',
      // F-247 (ADR-0147): the card route, as 26 binds it; the card's own share action is F-253's.
      action: 'navigate:/atlas/card/[slug]',
    }),
    el('06.export', 'ui:Button', B(487, 132, 22, 21), {
      parent: '06.header',
      icon: 'export',
      // F-247 (ADR-0147): the export, of THIS colour (?slug=); bare, it exports the latest palette.
      action: 'navigate:/profile/export',
    }),
    el('06.header-rule', null, B(54, 168, 472, 2), {
      parent: '06.header',
      tokens: { fg: 'border.subtle' },
    }),
    // ---- the swatch, and the card stacked behind it
    // The line around the hero reads 8.5 px across each side (a light grey band, #BE–#C9, x 73–81 at
    // mid-height, y 182–190 at mid-width): 6.9 dp at 0.81. Its value is the README keyline (P4, C20).
    el('06.swatch', 'ui:Swatch', B(73, 181, 416, 369), {
      tokens: { keyline: 'keyline', radius: 'sm' },
      binding: 'corpus:entry.hex',
      measured: { fill: '#576777' },
      // F-247: its corner fits 8 px (6.5 dp, sm).
      raw: { keylinePx: 8.5, cornerPx: 8 },
    }),
    // F-247 measured the layer: #56646F against the hero's #576876 — the entry's own colour, a hair darker
    // in the JPEG; its free corners fit 7.5 px (6.1 dp, sm) and it abuts the hero, square.
    el('06.swatch.stack', null, B(489, 182, 17, 368), {
      parent: '06.swatch',
      tokens: { radius: 'sm' },
      raw: { cornerPx: 7.5 },
    }),
    // ---- names and taxonomy
    el('06.kanji', 'ui:Text', B(84, 574, 120, 59), {
      tokens: { fg: 'text.primary' },
      type: text('gothic', 'kanjiHero'),
      binding: 'corpus:entry.name.ja',
      copy: { shape: 'heading', script: 'japanese' },
      // F-247 re-measured it from NotoSansJP's outlines (serif-weight --em, calibrated within 1.1 %):
      // 62.4 px, 50.5 dp — F-220's 53 read the box as the em. Its stems read 310–346 on the axis, lighter
      // than the bundled 400 cut (ADR-0112: named, not faked; ADR-0146).
      raw: { emDp: 50.5 },
    }),
    el('06.kana', 'ui:Text', B(216, 583, 94, 19), {
      tokens: { fg: 'text.secondary' },
      type: text('gothic', 'body'),
      binding: 'corpus:entry.name.kana',
      copy: { shape: 'label', script: 'japanese' },
    }),
    el('06.name', 'ui:Text', B(215, 611, 210, 21), {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'body'),
      binding: 'corpus:entry.name.en',
      copy: { shape: 'label', script: 'latin' },
      raw: { emDp: 18.3 },
    }),
    el('06.taxonomy', 'ui:Chip', B(82, 645, 368, 27), {
      tokens: { bg: 'level2', radius: 'pill' },
      // F-247 measured it: "Period" inks 11 px (caps and ascenders, 0.73 em) and "Family:" 14 px with its
      // descender — about 12.2 dp an em, nearer label (14) than caption (10.3).
      type: text('sans', 'label'),
      // era is empty for all 120 entries (§8) — questions.md 7; the pill says so (ADR-0146)
      binding: 'corpus:entry.taxonomy',
      copy: { shape: 'badge', script: 'latin' },
    }),
    // ---- the readout card
    // F-247: drawn as the frame's lower section — square under the rule, the bezel's corner below (not
    // design). Its corner is its siblings', md (§2: siblings drawn alike take one step).
    el('06.readout', 'ui:Card', B(54, 692, 472, 180), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1F232A' },
    }),
    el('06.readout.title', 'ui:Text', B(73, 711, 360, 22), {
      parent: '06.readout',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
      binding: 'static:detail.readout',
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 19.2 },
    }),
    // F-235: the table's corner fits 6 px (corner.ps1); its column divider is a 1 px line at x 160.
    el('06.readout.table', 'ui:ReadoutTable', B(73, 746, 432, 111), {
      parent: '06.readout',
      tokens: { border: 'border.subtle' },
      // Ink starts 9 px in from the table's edge and 10 px in from the divider; rows pitch 27.25 px
      // between 1 px rules (edges at x 73–504 and y 746–856, t 60 and 25).
      raw: { cornerPx: 6, labelInsetPx: 9, valueInsetPx: 10, rowPitchPx: 27.25 },
    }),
    el('06.readout.table.divider', null, B(160, 746, 1, 111), {
      parent: '06.readout.table',
      tokens: { fg: 'border.subtle' },
    }),
    ...tableRows,
    ...p3,
    // ---- provenance, FITTED (ADR-0145): drawn B(51, 889, 667, 146) into the callout column; recorded at
    // the screen's width as the readout card is. Its corners fit 10–10.5 px (8.3 dp, md).
    el('06.provenance', 'ui:Card', B(54, 889, 472, 146), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#20232A' },
      raw: { cornerPx: 10.25 },
    }),
    // The art keeps its drawn size and its place from the card's top and trailing edge (drawn
    // B(475, 895, 231, 134), 12 px in from the drawn edge): behind the text, clipped by the card.
    el('06.provenance.art', 'ui:Illustration', B(283, 895, 231, 134), {
      parent: '06.provenance',
      illustration: 'plum-branch',
    }),
    el('06.provenance.title', 'ui:Text', B(74, 909, 305, 22), {
      parent: '06.provenance',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
      binding: 'static:detail.provenance',
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 19.2 },
    }),
    el('06.provenance.body', 'ui:Text', B(73, 940, 400, 50), {
      parent: '06.provenance',
      tokens: { fg: 'text.secondary' },
      // F-247 measured it: "Historical Provenance" inks 12 px (caps and ascenders) — about 13.3 dp an em,
      // label; its lines pitch 16.5 px (13.4 dp), tighter than label's line box (ADR-0145 records it).
      type: text('sans', 'label'),
      // F-247 (ADR-0146): the record's provenance — the classification, the source, its type, its licence.
      binding: 'corpus:entry.provenance',
      copy: { shape: 'body', script: 'latin', lines: 3 },
    }),
    el('06.provenance.review', 'ui:Text', B(74, 998, 197, 17), {
      parent: '06.provenance',
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'label'),
      icon: 'seal-check',
      // F-247 (ADR-0146): the recorded check — its independence and date; "Verified" is 06's sample.
      binding: 'corpus:entry.provenance.verification',
      copy: { shape: 'label', script: 'latin' },
    }),
    // ---- combinations (C19: it spans the row; drawn B(51, 1049, 329, 173) beside a garbled card), FITTED
    // to the screen's width (ADR-0145). Its corners fit 10–10.5 px (md).
    el('06.combinations', 'ui:Card', B(54, 1049, 472, 173), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1F2229' },
      raw: { cornerPx: 10.25 },
    }),
    el('06.combinations.title', 'ui:Text', B(73, 1068, 233, 19), {
      parent: '06.combinations',
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
      binding: 'static:detail.combinations',
      copy: { shape: 'heading', script: 'latin' },
      raw: { emDp: 21.1 },
    }),
    ...g1,
    ...g2,
    ...g3,
    caption(1, B(74, 1194, 82, 27)),
    caption(2, B(170, 1194, 93, 27)),
    caption(3, B(281, 1194, 72, 27)),
    // ---- the sticky action bar, FITTED (ADR-0145): drawn B(51, 1222, 667, 78); recorded at the screen's
    // width, its two buttons sharing it at the drawn insets (17 and 18 px) and gap (10 px).
    el('06.actions', 'ui:ActionBar', B(53, 1222, 474, 78), {
      tokens: { bg: 'level1', border: 'border.subtle' },
      measured: { bg: '#20232A' },
    }),
    // Drawn B(68, 1245, 312, 44). Its corners fit 8.5–10 px (7.5 dp, sm). "Wear" inks 14 px (caps and
    // ascenders) — about 15.5 dp an em, body.
    el('06.actions.wear', 'ui:Button', B(70, 1245, 214, 44), {
      parent: '06.actions',
      tokens: { bg: 'action.primary', radius: 'sm' },
      type: text('sans', 'body', 500),
      icon: 'arrow-right',
      binding: 'static:detail.wearIt',
      // F-247 (ADR-0147): 07's route (R9 §7); /atlas/with/[slug] was the route string 07 prints (§2).
      action: 'navigate:/atlas/wear/[slug]',
      copy: { shape: 'label', script: 'latin' },
      raw: { cornerPx: 9.25 },
    }),
    // Drawn B(390, 1246, 310, 42). Its corners fit 7.5–8.5 px (6.5 dp, sm). "Hold" inks 14 px — body. Its
    // stems read lighter than Wear's (stem.ps1: 3.85 against 4.27 ink widths a height, encoded; opposite
    // polarity, so not decisive), and an outlined label is board 00's 400 (00.buttons.secondary, P3).
    el('06.actions.hold', 'ui:Button', B(294, 1246, 215, 42), {
      parent: '06.actions',
      tokens: { border: 'border.subtle', radius: 'sm' },
      type: text('sans', 'body'),
      binding: 'static:detail.holdAsTarget',
      // F-247 (ADR-0147): arms the target, then opens the Lens, which shows 04 while one is armed (F-200);
      // /lens/against is no route.
      action: 'navigate:/lens',
      copy: { shape: 'label', script: 'latin' },
      raw: { cornerPx: 8 },
    }),
    // Drawn B(419, 1256, 21, 21): 29 px into its button, kept.
    el('06.actions.hold.icon', null, B(323, 1256, 21, 21), {
      parent: '06.actions.hold',
      icon: 'reticle',
    }),
  ],
  notDesign: [
    {
      what: 'bezel',
      note: 'the spec card’s frame around the upper panel',
      box: B(50, 97, 479, 776),
    },
    {
      what: 'callout',
      note: 'the three bracketed action names above the frame',
      box: B(293, 57, 250, 16),
    },
    { what: 'callout', note: 'their leader lines', box: B(290, 74, 239, 58) },
    { what: 'callout', note: 'the swatch note and its leader', box: B(505, 340, 224, 60) },
    { what: 'callout', note: 'the kanji note and its leader', box: B(458, 600, 223, 15) },
    {
      what: 'leaked-label',
      note: 'a component name, level and hex printed as a note, with its leader',
      box: B(485, 709, 230, 31),
    },
    { what: 'callout', note: 'the elevated-cards note and its leader', box: B(505, 783, 154, 13) },
    {
      what: 'callout',
      note: 'the hairline-borders note (misspelt) and its leader',
      box: B(528, 860, 190, 32),
    },
    {
      what: 'callout',
      note: 'the line-art note and its leader, below the provenance card',
      box: B(530, 1033, 187, 42),
    },
    { what: 'callout', note: 'the action-bar note below the frame', box: B(303, 1300, 162, 31) },
    {
      what: 'garbled-text',
      note: 'C19: the right-hand card holds only garbled text',
      box: B(392, 1049, 326, 173),
    },
    {
      what: 'garbled-text',
      note: '"Color" in the readout title, on a screen the en-GB catalogue spells "Colour" (§2; F-247)',
      box: B(212, 711, 52, 22),
    },
  ],
  departures: [
    {
      rule: 'E1',
      element: '06.readout.table.oklch.value',
      why: '#5B6B78 is printed as OKLCh 0.490 / 0.035 / 240.2°; it is 0.519 / 0.028 / 242.7° (§4 E1) — the cell shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '06.readout.table.cielab.value',
      why: '06 prints CIELAB values that do not survive checking for its own hex (§4 E1); the cell shows the engine’s conversion',
    },
    {
      rule: 'E1',
      element: '06.readout.table.srgb.value',
      why: '06’s "Display-P3" triplet is its sRGB values ÷ 255, not a P3 conversion (§4 E1); the cell shows the engine’s real conversion',
    },
    {
      rule: 'E1',
      element: '06.provenance.body',
      why: 'the provenance line is the corpus entry’s own: its classification, source, source type and licence (ADR-0146); 06’s dated manuscript is sample content no entry holds — none of the 120 claims an era',
    },
    {
      rule: 'E1',
      element: '06.provenance.title',
      why: '"Cultural Heritage" presents a 2026 construction as heritage (FR-23); the heading names the corpus source and the review, as 26’s コーパス典拠と査読 does (ADR-0146)',
    },
    {
      rule: 'E1',
      element: '06.provenance.review',
      why: '"Verified" is sample content; the line says the check the record holds — its independence and date (ADR-0146, F-084)',
    },
    {
      rule: 'E1',
      element: '06.taxonomy',
      why: 'the pill names the entry’s own family group, era and season; no entry holds an era (Era: None) and 96 of 120 no season (Season: Not assigned) — 06’s Edo Period and Autumn are sample content (ADR-0146)',
    },
    {
      rule: 'E1',
      element: '06.readout.table.hex.value',
      why: 'the entry’s own hex; for the one entry outside sRGB the row adds the nearest-rendering note (E2, ADR-0146)',
    },
    {
      rule: 'E1',
      element: '06.combinations.item-1.photo',
      why: 'the person’s own garments the engine ranks best with this colour (ADR-0148); 06’s trousers, derby and scarf are sample content — and a garment with no photograph is drawn as its colour (E4)',
    },
  ],
  conflicts: [
    {
      id: 'C20',
      elements: ['06.swatch'],
      resolution:
        "P4 for the value (the README keyline, moved per sample where it fails 3:1, ADR-0116); P1 for the width (raw.keylinePx where it is wider than a hairline) — F-233's review",
      flippedByUser: false,
    },
    {
      id: 'C11',
      elements: ['06.swatch'],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: ['06.kanji', '06.kana', '06.name'],
      resolution: 'text sits beside the sample as 06 draws it',
      flippedByUser: false,
    },
    {
      id: 'C6',
      elements: ['06.kanji'],
      resolution: 'each surface follows its own mockup — kanji are sans here',
      flippedByUser: false,
    },
    {
      id: 'C3',
      elements: ['06.readout.title', '06.provenance.title', '06.combinations.title'],
      resolution:
        "P1 + P2: 06's layout governs colour detail; 26 governs its Japanese headings and typography — the hero kanji at 26's measured step, the provenance lines at 26's body. The readout stays 06's table in Japanese: a screen never has two layouts (§6), and 26's grid is 26's layout (F-247, ADR-0146)",
      flippedByUser: false,
    },
    {
      id: 'C19',
      elements: ['06.combinations'],
      resolution:
        'the right-hand card is not design (§2); Wearable Combinations spans the row, fitted to the screen with the other lower regions (F-247, ADR-0145)',
      flippedByUser: false,
    },
  ],
};
