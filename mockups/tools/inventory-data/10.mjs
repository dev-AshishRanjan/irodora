// Mockup 10 — Palette Studio. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes are pixel readings
// (measure.ps1, mask.ps1, corner.ps1). Card 1's four-colour strip is one element: its darkest band is
// within a few levels of the card, so its left edge is read from the page's content column (x 71,
// where every other element starts), not from the band. Card 2's second chip's left edge is read
// from the gap after the first chip's outline. Card 2's swatch corner fits 16 px = 8 dp, exactly
// between sm (6) and md (10): §2's tie, recorded as md — the step every other swatch card on the
// measured screens takes. The generator orders elements by the reading rule. Type size as in 02.mjs.
//
// F-251 RE-READ EVERY BOX, TYPE, CORNER, FILL AND INK (2026-11-02), with a Node port of measure.ps1's
// `blobs`/`mean` (each element's ink box re-read around its record against the local ground —
// rebox.cjs), corner.ps1's fit and edge profiles, each repeatable with the .ps1 where PowerShell runs:
// - BOXES: every text and glyph box holds within 2 px. Three containers read 1–6 px tighter at their
//   edges than F-220's boxes — the segmented control's edge rows 208–267 (F-220 205–271), Create's
//   28–74 (F-220 28–76) and the band's 468–585 (F-220 467–586, its half-lit rows) — a method's
//   difference, not a shadow taken for an edge (F-250's S1). They are KEPT as F-220 read them: the
//   segmented control and the action bar feed the shared medians (SEGMENTED_HEIGHT, ACTION_BAR_*),
//   read one way across every screen, as F-250 kept 09.back for APP_BAR_INSET (ADR-0161 D8; F-282).
// - TYPE (caps ≈ box/0.73): the title's P inks 27 px (18.5 dp; the kanji 33) — `body`, not `title`;
//   the card titles 23–26 px — body; Apply and Export 22 px (15.07 dp) — body; Export Selected 18 px
//   (12.3 dp) — label. Every other text inks 15–17 px of capital (10.3–11.6 dp): `caption` — back,
//   Create, both segments, the description, provenance and kind lines, the columns, the badges'
//   label and words, the layers' hexes and the tags (F-249 found 08's small type the same).
// - CORNERS (corner.ps1's fit, px): the cards 14.25–16.25 (card 1's top-right read 22.75, the leaves
//   over it) — 7.1–8.1 dp, `sm`; the band 11, the layers 11.25–13, Apply 9, the export button 11,
//   Create 7.75 — every one `sm` (F-220: md for the cards, the band and the layers). The badges and
//   tags trace a pill (r 19.5 on 39 px: offsets 17, 12, 10, 7, 3, 1, 0 at dy .5–14.5 against the
//   circle's 15.1, 12, 9.9, 6.9, 2.9, 0.9, 0.4).
// - FILLS: the cards #1D2027 (level 1); the segmented container unfilled (#16191D, the ground), edged;
//   its chosen segment #33383F — level 3 (F-232's #343940); the badges and tags #30353C–#32363D —
//   level 3 (F-220 level 2); the export button #454E57, `border.strong`.
// - TWO BULLETS no record held: between the badges (254, 768, 5 × 6) and between the tags (377,
//   1196, 5 × 5), in the secondary ink.
// - BRACKETS around the column roles (*[Anchor]* …) are notation (OQ-23, ADR-0163).
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

const p1 = '10.palette-1';
const p2 = '10.palette-2';
const column = (n, role, hex, name) => [
  t(`${p1}.colour-${n}.role`, role, p1, `corpus:palette.colours.${n - 1}.role`, {
    tokens: { fg: 'text.secondary' },
    type: text('sans', 'caption'),
  }),
  t(`${p1}.colour-${n}.hex`, hex, p1, `corpus:palette.colours.${n - 1}.hex`, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'caption', 400, { tabular: true }),
    copy: { shape: 'value', script: 'figures' },
  }),
  t(`${p1}.colour-${n}.name`, name, p1, `corpus:palette.colours.${n - 1}.name`, {
    tokens: { fg: 'text.secondary' },
    type: text('gothic', 'caption'),
    copy: { shape: 'caption', script: 'mixed', lines: 2 },
  }),
];
const kasane = (n, swatch, hex) => [
  el(`${p2}.swatch-${n}`, 'ui:Swatch', swatch, {
    parent: p2,
    // F-251: 11.25–13 px — `sm` (F-220's 16 px tie, recorded md, was a reading at the halo).
    tokens: { keyline: 'keyline', radius: 'sm' },
    binding: `corpus:kasane.colours.${n - 1}.hex`,
    ...(n === 1 ? { raw: { cornerPx: 12 } } : {}),
  }),
  t(`${p2}.swatch-${n}.hex`, hex, `${p2}.swatch-${n}`, `corpus:kasane.colours.${n - 1}.hex`, {
    type: text('sans', 'caption', 500, { tabular: true }),
    copy: { shape: 'value', script: 'figures' },
  }),
];

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '10.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    // ---- header
    // The app bar (F-234): a container for the header, 84 dp, bounded by symmetric about its elements.
    el('10.header', 'ui:AppBar', B(0, 0, 768, 168)),
    el('10.back', 'ui:Button', B(44, 42, 85, 20), {
      parent: '10.header',
      icon: 'back',
      type: text('sans', 'caption'),
      binding: 'static:tab.atlas',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('10.create', 'ui:Button', B(474, 28, 254, 48), {
      parent: '10.header',
      tokens: { border: 'border.subtle', radius: 'sm' },
      raw: { cornerPx: 7.75 },
      icon: 'plus',
      type: text('sans', 'caption'),
      binding: 'static:palettes.create',
      action: 'navigate:/atlas/palettes?draft=new',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('10.title', 'ui:Text', B(42, 106, 396, 34), {
      parent: '10.header',
      tokens: { fg: 'text.primary' },
      // F-251: 27 px of capital — 18.5 dp, `body`; F-220's `title` read the 34 px box.
      type: text('sans', 'body', 600),
      binding: 'static:palettes.title',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    el('10.art', 'ui:Illustration', B(643, 60, 125, 1150), { illustration: 'leaves' }),
    // ---- which palettes
    el('10.source', 'ui:ChoiceGroup', B(40, 205, 690, 66), {
      tokens: { border: 'border.subtle', radius: 'pill' },
    }),
    el('10.source.selected', null, B(49, 214, 332, 49), {
      parent: '10.source',
      // F-251: #33383F — level 3 (F-232's review read #343940).
      tokens: { bg: 'level3', radius: 'pill' },
      measured: { bg: '#33383F' },
    }),
    // Its leading dot (F-232's review): 17.7 px across, white.
    el('10.source.selected.dot', null, B(110, 229, 18, 18), {
      parent: '10.source.selected',
      tokens: { fg: 'text.primary' },
    }),
    t('10.source.curated', B(110, 229, 210, 23), '10.source', 'static:palettes.curated', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'caption'),
      action: 'select:palettes.curated',
    }),
    t('10.source.custom', B(447, 228, 214, 25), '10.source', 'static:palettes.custom', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'caption'),
      action: 'select:palettes.custom',
    }),
    // ---- a curated palette, in full
    el(p1, 'ui:Card', B(40, 301, 688, 592), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1C2026' },
      raw: { cornerPx: 15.2 },
    }),
    t(`${p1}.title`, B(71, 336, 516, 31), p1, 'corpus:palette.name', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      copy: { shape: 'heading', script: 'mixed' },
    }),
    t(`${p1}.description`, B(71, 386, 553, 25), p1, 'corpus:palette.description', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'caption'),
      copy: { shape: 'body', script: 'latin' },
    }),
    t(`${p1}.provenance`, B(72, 418, 311, 20), p1, 'corpus:palette.provenance', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'caption'),
      copy: { shape: 'body', script: 'latin' },
    }),
    // Joined samples: a Strip (F-233). ui:Bands is the bar chart, which this is not.
    el(`${p1}.strip`, 'ui:Strip', B(71, 467, 627, 120), {
      parent: p1,
      tokens: { keyline: 'keyline', radius: 'sm' },
      raw: { cornerPx: 11 },
      binding: 'corpus:palette.colours',
      measured: { band1: '#1E2225', band2: '#E9E6DE', band3: '#879098', band4: '#A48164' },
    }),
    ...column(1, B(110, 601, 78, 21), B(110, 630, 77, 17), B(79, 655, 140, 40)),
    ...column(2, B(241, 601, 131, 22), B(265, 630, 81, 17), B(249, 655, 115, 40)),
    ...column(3, B(413, 601, 97, 21), B(420, 630, 84, 17), B(397, 655, 130, 41)),
    ...column(4, B(548, 601, 142, 21), B(577, 630, 84, 17), B(534, 654, 171, 43)),
    t(`${p1}.badges-label`, B(71, 723, 193, 22), p1, 'static:palettes.badges', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'caption'),
    }),
    el(`${p1}.badge-contrast`, 'ui:Chip', B(71, 751, 178, 39), {
      parent: p1,
      tokens: { bg: 'level3', radius: 'pill' },
      measured: { bg: '#32363D' },
      type: text('sans', 'caption'),
      binding: 'engine:palette.contrast',
      copy: { shape: 'badge', script: 'mixed' },
    }),
    el(`${p1}.badge-cvd`, 'ui:Chip', B(254, 751, 252, 39), {
      parent: p1,
      tokens: { bg: 'level3', radius: 'pill' },
      type: text('sans', 'caption'),
      binding: 'engine:palette.separation',
      copy: { shape: 'badge', script: 'mixed' },
    }),
    // F-251: the bullet 10 draws between the two badges.
    el(`${p1}.badges.sep`, null, B(254, 768, 5, 6), {
      parent: p1,
      tokens: { fg: 'text.secondary' },
    }),
    el(`${p1}.apply`, 'ui:Button', B(71, 813, 307, 55), {
      parent: p1,
      tokens: { border: 'border.subtle', radius: 'sm' },
      raw: { cornerPx: 9 },
      type: text('sans', 'body'),
      binding: 'static:palettes.applyToLab',
      action: 'navigate:/wardrobe/outfit',
      copy: { shape: 'label', script: 'latin' },
    }),
    el(`${p1}.export`, 'ui:Button', B(390, 813, 307, 55), {
      parent: p1,
      tokens: { border: 'border.subtle', radius: 'sm' },
      type: text('sans', 'body'),
      binding: 'static:palettes.exportTokens',
      action: 'navigate:/profile/export?palette=',
      copy: { shape: 'label', script: 'latin' },
    }),
    // ---- a kasane palette (runs on under the export bar — the page scrolls)
    el(p2, 'ui:Card', B(40, 916, 688, 317), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1C2027' },
    }),
    t(`${p2}.kind`, B(71, 947, 154, 19), p2, 'static:palettes.curatedPalette', {
      tokens: { fg: 'text.secondary' },
      type: text('sans', 'caption'),
    }),
    t(`${p2}.title`, B(73, 978, 568, 32), p2, 'corpus:kasane.name', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      copy: { shape: 'heading', script: 'mixed' },
    }),
    ...kasane(1, B(71, 1033, 147, 123), B(99, 1125, 90, 18)),
    ...kasane(2, B(229, 1032, 150, 125), B(258, 1125, 91, 17)),
    ...kasane(3, B(389, 1032, 150, 125), B(418, 1125, 91, 17)),
    ...kasane(4, B(550, 1033, 147, 122), B(579, 1125, 88, 18)),
    el(`${p2}.tag-layering`, 'ui:Chip', B(71, 1179, 295, 38), {
      parent: p2,
      tokens: { bg: 'level3', radius: 'pill' },
      measured: { bg: '#31363D' },
      type: text('sans', 'caption'),
      binding: 'corpus:kasane.tags',
      copy: { shape: 'badge', script: 'latin' },
    }),
    // F-251: the bullet 10 draws between the two tags.
    el(`${p2}.tags.sep`, null, B(377, 1196, 5, 5), {
      parent: p2,
      tokens: { fg: 'text.secondary' },
    }),
    el(`${p2}.tag-provenance`, 'ui:Chip', B(388, 1179, 166, 38), {
      parent: p2,
      tokens: { bg: 'level3', radius: 'pill' },
      type: text('sans', 'caption'),
      binding: 'corpus:kasane.provenance',
      copy: { shape: 'badge', script: 'latin' },
    }),
    // ---- the export bar
    el('10.export-bar', 'ui:ActionBar', B(0, 1225, 768, 151), {
      tokens: { border: 'border.subtle' },
    }),
    // Its fill reads #464F58 across the button (F-234): border.strong's value (#464D5B, ΔE00 3.43),
    // not a surface level (level3 #323742 is ΔE00 8.23, level2 11.50). level2 was recorded before.
    el('10.export-bar.button', 'ui:Button', B(40, 1275, 688, 58), {
      parent: '10.export-bar',
      tokens: { bg: 'border.strong', radius: 'sm' },
      measured: { bg: '#464F58' },
      raw: { cornerPx: 11 },
      type: text('sans', 'label'),
      binding: 'static:palettes.exportSelected',
      action: 'navigate:/profile/export',
      copy: { shape: 'label', script: 'latin' },
    }),
  ],
  notDesign: [
    {
      what: 'leaked-label',
      note: 'the route string printed under the title, with a stray quoted name',
      box: B(41, 152, 259, 25),
    },
    // F-251 (OQ-23, ADR-0163): brackets around a label are the wireframe's notation, as 05's, 08's and
    // 09's are read (R9 §2).
    ...[B(110, 601, 78, 21), B(241, 601, 131, 22), B(413, 601, 97, 21), B(548, 601, 142, 21)].map(
      (box, i) => ({
        what: 'garbled-text',
        note: `square brackets around column ${String(i + 1)}'s role: notation, not copy`,
        box,
      }),
    ),
  ],
  departures: [
    {
      rule: 'E2',
      element: `${p1}.badge-cvd`,
      why: 'CVD ‹n›% Separation (Machado 2009): the floored worst separation over the palette’s pairs and three deficiencies at severity 1, with its model; it prints 100 only when it is 100 (ADR-0164 D3)',
    },
    {
      rule: 'E2',
      element: `${p1}.badge-contrast`,
      why: 'WCAG ‹threshold› ‹floored ratio›:1 over the anchor and the first light member by rank; 10’s AA 8.4:1 is sample content (ADR-0164 D3)',
    },
    {
      rule: 'E2',
      element: `${p2}.tag-layering`,
      why: 'Kasane-inspired Layering: Traditional Kasane Layering presents our curation as the Heian system (FR-23, C14; ADR-0164 D4)',
    },
    {
      rule: 'E1',
      element: `${p1}.title`,
      why: 'every palette is the corpus’s or the person’s, ordered by category then slug; 10’s names, hexes, description and provenance lines are sample content, and Kasane no Irome: is dropped (ADR-0164)',
    },
    {
      rule: 'E1',
      element: `${p1}.strip`,
      why: 'the band is every member in rank order at the record’s weights, the columns four a row under it; 10 draws four equal members (ADR-0164 D2)',
    },
    {
      rule: 'E4',
      element: '10.export-bar.button',
      why: 'Export Selected opens 03’s floating sheet to choose the palette (no card is drawn selected at rest); a personal card’s overflow, Apply disabled with its reason without a profile, and 00’s caption with no palettes of one’s own are drawn by no mockup (ADR-0165)',
    },
    {
      rule: 'E1',
      element: `${p2}.tag-provenance`,
      why: 'the chip shows the palette’s own provenance label — kasane palettes are authored by F-224 and labelled japanese-inspired (FR-23, C14); 10’s era verification is sample content no palette holds',
    },
  ],
  conflicts: [
    {
      id: 'C11',
      elements: [
        '10.palette-1.strip',
        '10.palette-2.swatch-1',
        '10.palette-2.swatch-2',
        '10.palette-2.swatch-3',
        '10.palette-2.swatch-4',
      ],
      resolution:
        "followed — the user's decision (§6 C11): the sample sits on the tinted surface as drawn, judged against a surround of measured chroma",
      flippedByUser: false,
    },
    {
      id: 'C14',
      elements: [`${p2}.title`, `${p2}.tag-layering`, `${p2}.tag-provenance`],
      resolution: 'F-224 authors the kasane palettes, labelled japanese-inspired (FR-23)',
      flippedByUser: false,
    },
    {
      id: 'C8',
      elements: [
        `${p2}.swatch-1.hex`,
        `${p2}.swatch-2.hex`,
        `${p2}.swatch-3.hex`,
        `${p2}.swatch-4.hex`,
      ],
      resolution:
        'text sits on the sample as 10 draws it, and takes per sample whichever of the two text colours passes 4.5:1 (E3)',
      flippedByUser: false,
    },
  ],
};
