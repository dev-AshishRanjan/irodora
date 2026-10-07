// Mockup 14 — app icon and splash. Two device frames on a presentation board. Inner screens measured
// at the bezel: 284 px wide → 384 / 284 dp per px. Every box is a pixel reading (measure.ps1).
const icon = '14.icon';
const splash = '14.splash';

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'device',
    screens: [
      { id: icon, box: { x: 70, y: 345, w: 284, h: 595 }, dpPerPx: 1.3521 },
      { id: splash, box: { x: 414, y: 345, w: 284, h: 595 }, dpPerPx: 1.3521 },
    ],
  },
  elements: [
    {
      id: '14.icon.tile',
      screen: icon,
      component: 'app:AppIcon',
      // F-231 (2026-10-07), re-read: a SQUARE, 184.7 px between the outer half-maxima of its rim on
      // every side (rows 578.8–763.5, columns 118.5–303.3; F-220's 161 px stopped where the gradient
      // nears the ground, but the rim closes the square at y 763). The asset is the platform's square
      // and the OS applies the corner mask the render shows (fitted 34 px, left). Its fill is a LINEAR
      // gradient in the encoded channels: a plane fitted to 12,645 pixels clear of the rim and the
      // mark (rms 1.4 levels; a vertical-only fit leaves 2.2–2.5, and the residual by 12 px band stays
      // within ±0.6, so it is not eased), lightest at the top-left corner and darkest at the
      // bottom-right, its axis 15.2° clockwise from vertical. Each end is the nearest surface token
      // within the instrument's error (§2: this image's ground reads #17191E for #15171B): the top-left
      // #2E3239 is ΔE00 2.29 from level 2, the bottom-right #15171C is 0.73 from the ground. The 1.6 px
      // rim is the platform's presentation, not the asset's (a notDesign row, ADR-0126).
      box: { x: 119, y: 579, w: 185, h: 185 },
      tokens: { bgTop: 'level2', bgBottom: 'ground' },
      measured: { bgTop: '#2E3239', bgBottom: '#15171C' },
      raw: { cornerPx: 34, gradientDeg: 15.2, rimPx: 1.6 },
      binding: null,
      action: null,
      copy: null,
    },
    {
      id: '14.icon.tile.mark',
      parent: '14.icon.tile',
      screen: icon,
      component: 'ui:Mark',
      box: { x: 157, y: 617, w: 109, h: 109 },
      tokens: { fg: 'text.secondary' },
      // F-230 (2026-10-06), read with mark.ps1 and mark-fit.mjs (calibrated through a JPEG at q85 to
      // 0.3 px, five decoys refused): five tangent petals over a hub filled to their tangency, petal 1
      // straight up; a ring cut around the eye; a stamen cut along each petal and a seam along each
      // notch, ring to edge. The icon's render draws its cuts wider and softer on the tile; the splash
      // governs (ADR-0122). F-231 (2026-10-07): the mark is centred on the tile BY ITS INK, not by its
      // grid. Its grid centre (mark-fit's centroid, 211.23, 676.00) sits 4.83 px below the tile's
      // centre (210.85, 671.17), and its ink box's centre (rows 619.8–725.1) sits 1.27 px below it —
      // a five-petal blossom reaches further above its centre than below, and 14 centres what is seen.
      // The tile's grid is 2 × reach = 112.9 px, 0.611 of the tile.
      raw: {
        centreDyPx: 4.83,
        inkCentreDyPx: 1.27,
        petals: 5,
        phaseDeg: -0.12,
        orbitPx: 35.63,
        petalPx: 20.55,
        hubPx: 28.82,
        eyePx: 9.06,
        ringOuterPx: 13.04,
        stamenOuterPx: 28.14,
        stamenPx: 3.81,
        antherPx: 0,
        seamPx: 4.34,
        reachPx: 56.44,
      },
      binding: null,
      action: null,
      copy: null,
    },
    {
      // F-231 (2026-10-07), read with glow-fit.mjs (calibrated through a JPEG at q85: alpha and sigma
      // recovered within 5 %, a radial decoy read as radial) over a mark.ps1 dump of x 440–677,
      // y 465–654 (the wordmark starts at 665): the mark's own ink, blurred by a Gaussian of
      // sigma 18.09 px (0.157 of its 114.9 px grid), behind the mark at opacity 0.602 of its ink. That
      // two-parameter model leaves rms 0.006 of ink − ground; the best RADIAL profile, one value per
      // pixel of radius, leaves 0.009 — the glow is brighter in the notches, where two petals reach,
      // as a blur is and a radial gradient is not. The box is where it is at least one level.
      id: '14.splash.glow',
      screen: splash,
      component: 'app:LaunchGlow',
      box: { x: 464, y: 497, w: 190, h: 190 },
      tokens: { fg: 'text.primary' },
      raw: { alpha: 0.602, sigmaPx: 18.09 },
      binding: null,
      action: null,
      copy: null,
    },
    {
      // F-230: the splash lockup (C4, P2) — one figure on one axis, its box the members' ink: the
      // name's width, the mark's top to the tagline's foot (ADR-0123).
      id: '14.splash.lockup',
      screen: splash,
      component: 'ui:Wordmark',
      box: { x: 485, y: 534, w: 147, h: 194 },
      tokens: {},
      binding: null,
      action: null,
      copy: null,
    },
    {
      id: '14.splash.mark',
      parent: '14.splash.lockup',
      screen: splash,
      component: 'ui:Mark',
      box: { x: 503, y: 534, w: 111, h: 108 },
      tokens: { fg: 'text.primary' },
      // F-230 (2026-10-06), read with mark.ps1 and mark-fit.mjs (calibrated through a JPEG at q85 to
      // 0.3 px, five decoys refused): five tangent petals over a hub filled to their tangency, petal 1
      // straight up; a ring cut around the eye; a stamen cut along each petal and a seam along each
      // notch, ring to edge. The icon's render draws its cuts wider and softer on the tile; the splash
      // governs (ADR-0122).
      raw: {
        petals: 5,
        phaseDeg: -0.01,
        orbitPx: 36.02,
        petalPx: 21.11,
        hubPx: 29.14,
        eyePx: 9.79,
        ringOuterPx: 11.86,
        stamenOuterPx: 28.16,
        stamenPx: 2.3,
        antherPx: 0,
        seamPx: 2.56,
        reachPx: 57.44,
      },
      binding: null,
      action: null,
      copy: null,
    },
    {
      id: '14.splash.wordmark',
      parent: '14.splash.lockup',
      screen: splash,
      component: 'ui:Text',
      box: { x: 485, y: 665, w: 147, h: 35 },
      tokens: { fg: 'text.primary' },
      // ADR-0121: 12.3 dp from every board step, so a measured step.
      type: { face: 'serif', size: 'wordmarkSplash', weight: 400 },
      // F-230: the em from Gelasio's outlines (serif-weight.mjs --em): 59.7 dp by the ink's height,
      // 59.9 by its width; 24.0 px under the mark's ink, centred on it within half a pixel.
      raw: { emDp: 59.7, inkHeightPx: 34.2, inkWidthPx: 146.18, markGapPx: 24.04 },
      binding: null,
      action: null,
      copy: { shape: 'heading', script: 'latin' },
    },
    {
      id: '14.splash.tagline',
      parent: '14.splash.lockup',
      screen: splash,
      component: 'ui:Text',
      box: { x: 501, y: 711, w: 115, h: 17 },
      tokens: { fg: 'text.primary' },
      // F-230: the em from Noto Sans JP's outlines, 22.0 dp by height and 22.2 by width — `title`, not
      // the `body` first recorded; 11.75 px under the wordmark's ink, centred on it.
      type: { face: 'gothic', size: 'title', weight: 400 },
      raw: { emDp: 22, inkHeightPx: 15.03, inkWidthPx: 113.78, gapAbovePx: 11.75 },
      binding: 'static:brand.taglineJa',
      action: null,
      copy: { shape: 'label', script: 'japanese' },
    },
    {
      id: '14.splash.subline',
      screen: splash,
      component: 'ui:Text',
      // F-231 (2026-10-07), the ink box (mark-fit --box): x 432.7–681.2, y 743.8–753.6. Its ink starts
      // 16.93 px (22.9 dp) under the tagline's ink, which ends at 726.8 — 24 by §2, not the 20 the
      // two boxes gave. It is not a lockup member, so it snaps (ADR-0123 keeps the snap outside).
      box: { x: 433, y: 744, w: 248, h: 10 },
      tokens: { fg: 'text.secondary' },
      type: { face: 'sans', size: 'caption', weight: 400 },
      raw: { gapAbovePx: 16.93 },
      binding: 'static:brand.splashSubline',
      action: null,
      copy: { shape: 'caption', script: 'latin' },
    },
    {
      id: '14.splash.wave',
      screen: splash,
      component: 'ui:Illustration',
      // F-231 (2026-10-07): the INK, re-read above the bar — rows 835–889 at half maximum, the full
      // width of the screen. F-220's 71 px ran into the progress line. `silk-wave` drawn across the
      // screen at its own 4:1 box puts its lines in the same band (its ink spans 1.6–20.4 of 24).
      box: { x: 414, y: 835, w: 284, h: 54 },
      tokens: { fg: 'text.tertiary' },
      illustration: 'silk-wave',
      binding: null,
      action: null,
      copy: null,
    },
    {
      id: '14.splash.progress',
      screen: splash,
      component: 'new:ProgressBar',
      // F-231 (2026-10-07): the line at half maximum, x 433.8–676.8 and rows 901.3–904.4 — 3.1 px
      // thick, its ends 20.3 and 20.7 px in from the screen's edges (413.5, 697.5), its foot 35.3 px
      // above the screen's (939.7). The fill stops at 628.5, 0.80 of the line: sample content (E1).
      box: { x: 434, y: 901, w: 243, h: 4 },
      tokens: { track: 'border.subtle', fill: 'text.primary', radius: 'pill' },
      raw: { trackPx: 3.1, insetPx: 20.5, footPx: 35.3 },
      binding: 'engine:launch.progress',
      action: null,
      copy: null,
    },
  ],
  notDesign: [
    { what: 'bezel', note: 'left device', box: { x: 52, y: 330, w: 318, h: 625 } },
    { what: 'bezel', note: 'right device', box: { x: 396, y: 330, w: 318, h: 625 } },
    {
      what: 'presentation',
      note: 'the OS home screen the icon is shown on, and the plum branch behind it',
      box: { x: 98, y: 478, w: 240, h: 357 },
    },
    {
      what: 'presentation',
      note:
        'the light the system draws along an icon’s mask: a 1.6 px rim on the tile’s edge, brightest ' +
        'at its top (luma 88 against 54 at its foot) — iOS 26 lays its glass over an icon like this ' +
        'one, and an asset cannot place a line on a mask it does not draw (ADR-0126)',
      box: { x: 119, y: 579, w: 185, h: 185 },
    },
    { what: 'board-annotation', note: 'board title', box: { x: 301, y: 118, w: 167, h: 42 } },
    { what: 'board-annotation', note: 'board subtitle', box: { x: 114, y: 196, w: 546, h: 52 } },
    { what: 'board-annotation', note: 'left caption', box: { x: 128, y: 981, w: 167, h: 39 } },
    { what: 'board-annotation', note: 'right caption', box: { x: 437, y: 982, w: 244, h: 38 } },
    {
      what: 'board-annotation',
      note: 'the first description paragraph — readable, a note about the board',
      box: { x: 55, y: 1080, w: 642, h: 53 },
    },
    {
      what: 'garbled-text',
      note: 'the second description paragraph, which is unreadable',
      box: { x: 55, y: 1172, w: 513, h: 53 },
    },
    {
      what: 'board-annotation',
      note: 'the third description paragraph — readable, a note about the board',
      box: { x: 55, y: 1263, w: 607, h: 54 },
    },
  ],
  departures: [],
  conflicts: [
    {
      id: 'C4',
      elements: [
        '14.icon.tile.mark',
        '14.splash.lockup',
        '14.splash.mark',
        '14.splash.wordmark',
        '14.splash.tagline',
      ],
      resolution:
        'mark geometry and the splash lockup come from 14; monochrome everywhere, the icon included (supersedes ADR-0093)',
      flippedByUser: false,
    },
    {
      id: 'C17',
      elements: [
        '14.splash.glow',
        '14.splash.mark',
        '14.splash.wordmark',
        '14.splash.tagline',
        '14.splash.subline',
        '14.splash.wave',
        '14.splash.progress',
      ],
      resolution:
        "light appearance is 14's composition in 25's palette, so a light launch does not flash dark then light",
      flippedByUser: false,
    },
  ],
};
