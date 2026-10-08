// Mockup 27 — the states board: four state cards on one landscape sheet (1376 × 768). A variant — it
// governs state content only (§3 P2), for Wardrobe's empty state and the Lens's loading, refused and
// permission states. A board draws at no screen's scale, so no element has a dp and every type size is
// the step the element's role takes on the screen that shows it (P3: the screen decides the size);
// radii are recorded in px (raw) beside the token 00's cards use. Boxes are pixel readings
// (measure.ps1, corner.ps1). The board's title and the four state names above the cards are board
// labels, not design. Elements are listed card by card, left to right — the reading rule applies to a
// screen, not a sheet.
//
// F-236 (2026-10-08) RE-READ THE BOARD, AND FOUND ITS SCALE. Every other geometry here is px × k:
//
// - k = 0.973 dp per px, the median of the 13 text elements' ems against their roles' steps. Each em
//   is a line's ascender height (its tallest letters' top, the 2nd percentile of the columns' ink
//   tops, to its baseline, the mode of their ink bottoms) over 0.73, the platform sans' ascender as a
//   share of its em (SF Pro's and Roboto's 'd' sit at 0.72–0.75; the spread is ±2 %, under the
//   readings' own). The four titles read 0.845–0.918 against title 22 (the board draws them larger
//   than the scale does: raw.emDp), the four bodies 0.973–1.062 against body 16, the three button
//   labels 0.973 against body 16, the two steps 1.022 against label 14. The card corners agree:
//   9.5–10.5 px is 9.2–10.2 dp against md's 10.
// - THE CARDS' BOXES are their fills, edge to edge (F-220's ran 10 px into the shadow under them):
//   all four end at row 717, and the two on the right start 26 px lower, under a two-line state name
//   — a board artefact. Each card's picture starts 69 px below its top edge (topPx), its action sits
//   18–19 px from its sides and foot (padPx), and the space above the action is the card's slack:
//   77–79 px on the left two, 107 px on the permission card, whose content is shortest.
// - THE TEXT IS WHITE, body as well as title: the most luminous fifth of every body's ink reads
//   #EFF0F5–#F0F2F6 against the titles' #F8FAFC–#FAFCFE, luma 245–247 at its 95th percentile, which
//   text.secondary (#A6B0BC, luma 173) cannot reach. F-220's binding of the bodies to text.secondary
//   was the helper's default, not a reading.
// - THE PROGRESS RING (circle fit to the stroke's centreline, 180 rays): centre (526.08, 320.87),
//   radius 64.61 px, stroke 7.1 px (area over peak), round caps. Its fill runs clockwise from 12
//   o'clock to 218.2° (the transitions at 356.75° and 221.25° less the caps' 3.1°): 61 %, sample
//   content (E1). Fill #ECEEF3 → text.primary (ΔE00 2.54); track #373B44 → level3 (1.71; F-220's
//   border.subtle is 2.71).
// - THE MARK IS DRAWN AS AN OUTLINE — five petal rings, rays from the eye — in #E0AAE6 (the most
//   luminous quarter of its saturated ink; OKLCh C 0.101, h 323°), reaching 26.3 px at the petals and
//   20.1 at the notches, its ink centre (526.30, 321.90): the ring's centre within 1.1 px. C4 builds
//   14's blossom everywhere; 27's outline is its fifth drawing (§6 C4).
// - D11, THE HALO, IS DRAWN, AND IT IS RADIAL: glow-fit.mjs --radial (calibrated through a JPEG at
//   q85, each profile within 0.01 beyond the ink, 14's blurred mark read as mark-shaped at 0.90) over
//   a mark.ps1 dump of x 469–584, y 264–379, inner 29 px, ground 52–56 px, ink luma 185.8: the
//   petal-against-notch modulation is 0.037, so the glow is a function of radius alone. The best fit
//   is a disc of radius 30.5 px at opacity 0.296 of the mark's ink blurred by sigma 8.08 px (rms
//   0.0087 of ink − ground; a Gaussian spot 0.0092, the free profile 0.0089). Under the ink it is an
//   extrapolation: between 27's outline strokes the glow reads 0.29–0.33 at 18–20 px, the model 0.26–
//   0.27 — and 14's filled blossom (C4) covers all of it but its cuts. Its box is where it is at
//   least one level (r 45.5). Its tint is the mark's: the glow at 28–30 px, #3F3449, is the ink over
//   the card.
// - THE STEPS are chips of 29 px, corner 5.5–6.0 px (sm), filled #30343D → level3 (ΔE00 1.40; F-220's
//   level2 is 2.56), their text #E5E9ED → text.primary (3.58), 8 px apart, 9–11 px of padding. The
//   text is MONOSPACED and NARROW (F-236 increment 3, ADR-0130): an advance of 6.77 px (the comb
//   that best fits each line's character cells, 6.810 and 6.735) against a cap of 9.79 px (the
//   median of ten capitals and figures, 9.30–9.97) — 0.69 of the cap, where the platform monos
//   advance 0.84–0.86 of theirs. Shape cannot name the face at a 10 px cap (34 open-licence monos
//   scored by serif-match.ps1 spread 0.50–0.54 at the top); proportion can: Inconsolata, cut at
//   width 83 (advance 0.432 em, cap 0.623), matches it, and its stems (stem.ps1 against rendered
//   instances) put the drawing at weight 554–650 across the two lines and both spaces — 600. Its
//   em is then 15.71 px, 15.3 dp: body, not label.
// - THE PICTURES: the hanger's body #C09D7A (its interior, OKLCh C 0.064, h 67°), its hook and sprigs
//   text.primary (#F8FAFD, 0.71) at 1.84–2.22 px; the refusal's plate #51412C (C 0.040), its edge
//   #EEAF5E (C 0.123) 2.2–3.6 px wide by half-maximum on its four sides (3.0 by area over peak), the
//   glare's sun and rays #A2917A (C 0.039) at 2.4–3.2 px, its slash in the edge's amber (#E7B16C,
//   ΔE00 2.51 from it); the camera text.primary (#FBFEFF) at 3.5–3.7 px, its padlock #BAA07C (C 0.058;
//   ΔE00 3.50 from the hanger's tan, a colour of its own) with the card showing through its keyhole.
//   The plate's corner is 14.0–14.5 px (corner.ps1): lg, not md. Every line here is wider than
//   size.iconStroke's 1.65 dp and size.artStroke's 0.5 dp: these are pictures, drawn at their size.
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
    copy: { shape: 'body', script: 'latin' },
    ...extra,
  });
const card = (id, component, box, raw) =>
  el(id, component, box, {
    tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
    measured: { bg: '#1B2027', border: '#2F343E' },
    raw,
  });
const title = (id, box, parent, binding, lines, raw) =>
  t(id, box, parent, binding, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'title', 600),
    copy: { shape: 'heading', script: 'latin', lines },
    raw,
  });
const body = (id, box, parent, binding, lines, raw) =>
  t(id, box, parent, binding, {
    tokens: { fg: 'text.primary' },
    copy: { shape: 'body', script: 'latin', lines },
    raw,
  });
const button = (id, box, parent, binding, action) =>
  el(id, 'ui:Button', box, {
    parent,
    tokens: { bg: 'action.primary', radius: 'pill' },
    raw: { cornerPx: 18.25 },
    binding,
    action,
    copy: { shape: 'label', script: 'latin' },
  });
const step = (id, box, binding) =>
  el(id, 'ui:Chip', box, {
    parent: '27.lens-working',
    tokens: { bg: 'level3', fg: 'text.primary', radius: 'sm' },
    measured: { bg: '#30343D', fg: '#E5E9ED' },
    type: text('mono', 'body', 600),
    raw: { cornerPx: 5.75, emDp: 15.3, advancePx: 6.77, capPx: 9.79 },
    binding,
    copy: { shape: 'badge', script: 'latin' },
  });

export default {
  kind: 'board',
  governs: 'state',
  frame: { kind: 'board', screens: [{ id: '27.board', box: B(0, 0, 1376, 768), dpPerPx: null }] },
  elements: [
    // ---- Wardrobe, empty
    card('27.wardrobe-empty', 'ui:EmptyState', B(57, 184, 293, 534), {
      cornerPx: 10.5,
      padPx: 18.7,
      topPx: 69,
    }),
    el('27.wardrobe-empty.art', 'ui:Illustration', B(116, 253, 175, 127), {
      parent: '27.wardrobe-empty',
      illustration: 'hanger',
      tokens: { fg: 'text.primary' },
      measured: { fg: '#F8FAFD', body: '#C09D7A' },
      raw: { linePx: 2.03 },
    }),
    title(
      '27.wardrobe-empty.title',
      B(103, 416, 200, 56),
      '27.wardrobe-empty',
      'static:wardrobe.empty.title',
      2,
      { emDp: 25.3, gapAbovePx: 37 },
    ),
    body(
      '27.wardrobe-empty.body',
      B(84, 491, 239, 84),
      '27.wardrobe-empty',
      'static:wardrobe.empty.body',
      4,
      { gapAbovePx: 22 },
    ),
    button(
      '27.wardrobe-empty.scan',
      B(76, 653, 255, 46),
      '27.wardrobe-empty',
      'static:wardrobe.empty.scan',
      'navigate:/lens',
    ),
    // ---- the Lens, working
    card('27.lens-working', 'ui:Card', B(380, 184, 293, 534), { cornerPx: 9.5, topPx: 69 }),
    el('27.lens-working.progress', 'new:ProgressRing', B(458, 253, 136, 136), {
      parent: '27.lens-working',
      tokens: { fg: 'text.primary', track: 'level3' },
      measured: { fg: '#ECEEF3', track: '#373B44' },
      raw: { radiusPx: 64.61, strokePx: 7.1, sweepDeg: 360, fillDeg: 218.2 },
      binding: 'engine:lens.progress',
    }),
    el('27.lens-working.glow', 'new:WorkingState', B(481, 276, 91, 91), {
      parent: '27.lens-working.progress',
      measured: { fg: '#3F3449' },
      raw: { alpha: 0.296, discPx: 30.5, sigmaPx: 8.08 },
    }),
    el('27.lens-working.mark', 'ui:Mark', B(500, 296, 52, 50), {
      parent: '27.lens-working.progress',
      measured: { fg: '#E0AAE6' },
      raw: { petals: 5, reachPx: 26.3 },
    }),
    step('27.lens-working.step-1', B(406, 428, 241, 29), 'engine:lens.pipeline.0'),
    step('27.lens-working.step-2', B(400, 464, 254, 29), 'engine:lens.pipeline.1'),
    title(
      '27.lens-working.title',
      B(429, 535, 196, 51),
      '27.lens-working',
      'static:lens.working.title',
      2,
      { emDp: 24, gapAbovePx: 43 },
    ),
    body(
      '27.lens-working.body',
      B(409, 610, 234, 37),
      '27.lens-working',
      'static:lens.working.body',
      2,
      { gapAbovePx: 26 },
    ),
    // ---- the Lens, refused
    card('27.lens-refused', 'ui:Card', B(703, 210, 293, 508), {
      cornerPx: 10.5,
      padPx: 18.3,
      topPx: 69,
    }),
    el('27.lens-refused.icon', null, B(801, 279, 98, 97), {
      parent: '27.lens-refused',
      tokens: { radius: 'lg' },
      icon: 'glare',
      measured: { bg: '#51412C', border: '#EEAF5E', fg: '#A2917A', slash: '#E7B16C' },
      raw: { cornerPx: 14.25, edgePx: 3, glyphPx: 53, linePx: 2.8 },
    }),
    title(
      '27.lens-refused.title',
      B(763, 412, 173, 80),
      '27.lens-refused',
      'static:lens.refused.title',
      3,
      { emDp: 24, gapAbovePx: 37 },
    ),
    body(
      '27.lens-refused.body',
      B(724, 516, 251, 62),
      '27.lens-refused',
      'engine:lens.refusal.reason',
      3,
      { gapAbovePx: 25 },
    ),
    button(
      '27.lens-refused.retry',
      B(721, 653, 256, 46),
      '27.lens-refused',
      'static:lens.refused.retry',
      'submit:lens.retry',
    ),
    // ---- the Lens, camera permission denied
    card('27.lens-permission', 'ui:Card', B(1026, 210, 293, 508), {
      cornerPx: 9.5,
      padPx: 18.7,
      topPx: 69,
    }),
    el('27.lens-permission.icon', null, B(1124, 288, 102, 86), {
      parent: '27.lens-permission',
      icon: 'camera-locked',
      tokens: { fg: 'text.primary' },
      measured: { fg: '#FBFEFF', lock: '#BAA07C' },
      // The line's centre: the body 93.8 px wide (x 1125.2–1219.0) and 61.3 tall from its shoulders
      // (y 301.0) to its foot (362.3); the viewfinder hump 12 px over the shoulders, 47 px wide at
      // its foot and 32 at its top; the lens a ring of radius 23.6 at (1169.6, 332.0); a flash dot at
      // about (1204.5, 313.5); the padlock 32 px wide and 41 tall from its shackle to its foot, its
      // body rows 348–373, its keyhole 8 × 12 px. The body's line stops short of the lock on both
      // sides it meets (the right side at y 325, the foot at x 1187).
      raw: {
        linePx: 3.6,
        bodyWidthPx: 93.8,
        bodyHeightPx: 61.3,
        humpPx: 12,
        lensPx: 23.6,
        lockWidthPx: 32,
        lockHeightPx: 41,
      },
    }),
    title(
      '27.lens-permission.title',
      B(1080, 411, 185, 51),
      '27.lens-permission',
      'static:lens.permission.title',
      2,
      { emDp: 24.6, gapAbovePx: 38 },
    ),
    body(
      '27.lens-permission.body',
      B(1053, 486, 238, 61),
      '27.lens-permission',
      'static:lens.permission.body',
      3,
      { gapAbovePx: 26 },
    ),
    button(
      '27.lens-permission.settings',
      B(1045, 653, 255, 46),
      '27.lens-permission',
      'static:lens.permission.openSettings',
      'open:device.settings',
    ),
  ],
  notDesign: [
    { what: 'board-annotation', note: 'the board’s title', box: B(58, 59, 1050, 46) },
    { what: 'board-annotation', note: 'the first card’s state name', box: B(89, 148, 228, 23) },
    { what: 'board-annotation', note: 'the second card’s state name', box: B(397, 149, 260, 22) },
    { what: 'board-annotation', note: 'the third card’s state name', box: B(712, 148, 274, 48) },
    { what: 'board-annotation', note: 'the fourth card’s state name', box: B(1055, 149, 235, 47) },
  ],
  departures: [
    {
      rule: 'E2',
      element: '27.lens-refused.title',
      why: 'a camera estimate is never called a measurement (golden rule 11, §4 row 02 27): the refused state names a reading',
    },
    {
      rule: 'E2',
      element: '27.lens-working.step-1',
      why: 'an RGB camera has no spectral data to extract (§4 row 27); the line names the pipeline’s real step',
    },
    {
      rule: 'E2',
      element: '27.lens-working.step-2',
      why: 'D65 is ≈6504 K, not 5500 K (§4 row 27); the line names the pipeline’s real step and its real illuminant',
    },
  ],
  conflicts: [
    {
      id: 'C4',
      elements: ['27.lens-working.mark'],
      resolution:
        'mark geometry from 14: 27 draws the mark as an outline (petal rings and rays), and the build draws 14’s filled blossom at 27’s reach, in 27’s tint (C10)',
      flippedByUser: false,
    },
    {
      id: 'C10',
      elements: [
        '27.wardrobe-empty.art',
        '27.lens-working.mark',
        '27.lens-working.glow',
        '27.lens-refused.icon',
        '27.lens-permission.icon',
      ],
      resolution:
        'followed: the tan, amber and purple state art carries text (golden rule 13) and is declared a chroma-ceiling exception by F-225; the purple mark here is the one place the mark takes a tint, and its glow takes the same tint',
      flippedByUser: false,
    },
  ],
};
