// Mockup 10 — Palette Studio. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes are pixel readings
// (measure.ps1, mask.ps1, corner.ps1). Card 1's four-colour strip is one element: its darkest band is
// within a few levels of the card, so its left edge is read from the page's content column (x 71,
// where every other element starts), not from the band. Card 2's second chip's left edge is read
// from the gap after the first chip's outline. Card 2's swatch corner fits 16 px = 8 dp, exactly
// between sm (6) and md (10): §2's tie, recorded as md — the step every other swatch card on the
// measured screens takes. The generator orders elements by the reading rule. Type size as in 02.mjs.
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
  }),
  t(`${p1}.colour-${n}.hex`, hex, p1, `corpus:palette.colours.${n - 1}.hex`, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'label', 400, { tabular: true }),
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
    tokens: { keyline: 'keyline', radius: 'md' },
    binding: `corpus:kasane.colours.${n - 1}.hex`,
    ...(n === 2 ? { raw: { cornerPx: 16 } } : {}),
  }),
  t(`${p2}.swatch-${n}.hex`, hex, `${p2}.swatch-${n}`, `corpus:kasane.colours.${n - 1}.hex`, {
    type: text('sans', 'label', 500, { tabular: true }),
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
    el('10.back', 'ui:Button', B(44, 42, 85, 20), {
      icon: 'back',
      binding: 'static:atlas.back',
      action: 'navigate:/atlas',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('10.create', 'ui:Button', B(474, 28, 254, 48), {
      tokens: { border: 'border.subtle', radius: 'md' },
      icon: 'plus',
      binding: 'static:palettes.create',
      action: 'navigate:/atlas/palettes/new',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('10.title', 'ui:Text', B(42, 106, 396, 34), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'title', 600),
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
      tokens: { bg: 'level2', radius: 'pill' },
    }),
    t('10.source.curated', B(110, 229, 210, 23), '10.source', 'static:palettes.curated', {
      tokens: { fg: 'text.primary' },
      action: 'select:palettes.curated',
    }),
    t('10.source.custom', B(447, 228, 214, 25), '10.source', 'static:palettes.custom', {
      tokens: { fg: 'text.secondary' },
      action: 'select:palettes.custom',
    }),
    // ---- a curated palette, in full
    el(p1, 'ui:Card', B(40, 301, 688, 592), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1C2026' },
      raw: { cornerPx: 20.5 },
    }),
    t(`${p1}.title`, B(71, 336, 516, 31), p1, 'corpus:palette.name', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'body', 600),
      copy: { shape: 'heading', script: 'mixed' },
    }),
    t(`${p1}.description`, B(71, 386, 553, 25), p1, 'corpus:palette.description', {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'body', script: 'latin' },
    }),
    t(`${p1}.provenance`, B(72, 418, 311, 20), p1, 'corpus:palette.provenance', {
      tokens: { fg: 'text.secondary' },
      copy: { shape: 'body', script: 'latin' },
    }),
    el(`${p1}.strip`, 'ui:Bands', B(71, 467, 627, 120), {
      parent: p1,
      tokens: { keyline: 'keyline', radius: 'md' },
      binding: 'corpus:palette.colours',
      measured: { band1: '#1E2225', band2: '#E9E6DE', band3: '#879098', band4: '#A48164' },
    }),
    ...column(1, B(110, 601, 78, 21), B(110, 630, 77, 17), B(79, 655, 140, 40)),
    ...column(2, B(241, 601, 131, 22), B(265, 630, 81, 17), B(249, 655, 115, 40)),
    ...column(3, B(413, 601, 97, 21), B(420, 630, 84, 17), B(397, 655, 130, 41)),
    ...column(4, B(548, 601, 142, 21), B(577, 630, 84, 17), B(534, 654, 171, 43)),
    t(`${p1}.badges-label`, B(71, 723, 193, 22), p1, 'static:palettes.badges', {
      tokens: { fg: 'text.secondary' },
    }),
    el(`${p1}.badge-contrast`, 'ui:Chip', B(71, 751, 178, 39), {
      parent: p1,
      tokens: { bg: 'level2', radius: 'pill' },
      binding: 'engine:palette.contrast',
      copy: { shape: 'badge', script: 'mixed' },
    }),
    el(`${p1}.badge-cvd`, 'ui:Chip', B(254, 751, 252, 39), {
      parent: p1,
      tokens: { bg: 'level2', radius: 'pill' },
      binding: 'engine:palette.separation',
      copy: { shape: 'badge', script: 'mixed' },
    }),
    el(`${p1}.apply`, 'ui:Button', B(71, 813, 307, 55), {
      parent: p1,
      tokens: { border: 'border.subtle', radius: 'md' },
      binding: 'static:palettes.applyToLab',
      action: 'navigate:/wardrobe/lab',
      copy: { shape: 'label', script: 'latin' },
    }),
    el(`${p1}.export`, 'ui:Button', B(390, 813, 307, 55), {
      parent: p1,
      tokens: { border: 'border.subtle', radius: 'md' },
      binding: 'static:palettes.exportTokens',
      action: 'navigate:/profile/export',
      copy: { shape: 'label', script: 'latin' },
    }),
    // ---- a kasane palette (runs on under the export bar — the page scrolls)
    el(p2, 'ui:Card', B(40, 916, 688, 317), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: '#1C2027' },
    }),
    t(`${p2}.kind`, B(71, 947, 154, 19), p2, 'static:palettes.curatedPalette', {
      tokens: { fg: 'text.secondary' },
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
      tokens: { bg: 'level2', radius: 'pill' },
      binding: 'corpus:kasane.tags',
      copy: { shape: 'badge', script: 'latin' },
    }),
    el(`${p2}.tag-provenance`, 'ui:Chip', B(388, 1179, 166, 38), {
      parent: p2,
      tokens: { bg: 'level2', radius: 'pill' },
      binding: 'corpus:kasane.provenance',
      copy: { shape: 'badge', script: 'latin' },
    }),
    // ---- the export bar
    el('10.export-bar', 'app:ActionBar', B(0, 1225, 768, 151), {
      tokens: { border: 'border.subtle' },
    }),
    el('10.export-bar.button', 'ui:Button', B(40, 1275, 688, 58), {
      parent: '10.export-bar',
      tokens: { bg: 'level2', radius: 'md' },
      measured: { bg: '#454F58' },
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
  ],
  departures: [
    {
      rule: 'E2',
      element: `${p1}.badge-cvd`,
      why: 'the computed separation score (FR-5) for the palette shown; it prints 100 only when it is 100',
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
