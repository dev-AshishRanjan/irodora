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
      box: { x: 119, y: 578, w: 186, h: 161 },
      tokens: {},
      measured: { bgTop: '#2B2F34', bgBottom: '#1B2024' },
      // The gradient reaches the ground by y ≈ 748, so 161 px is the VISIBLE height; the asset is the
      // platform's square, and the OS applies the corner mask the render shows (fitted 34 px, left).
      raw: { visibleHeightPx: 161, cornerPx: 34 },
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
      binding: null,
      action: null,
      copy: null,
    },
    {
      id: '14.splash.mark',
      screen: splash,
      component: 'ui:Mark',
      box: { x: 503, y: 534, w: 111, h: 108 },
      tokens: { fg: 'text.primary' },
      binding: null,
      action: null,
      copy: null,
    },
    {
      id: '14.splash.wordmark',
      screen: splash,
      component: 'ui:Wordmark',
      box: { x: 485, y: 665, w: 147, h: 35 },
      tokens: { fg: 'text.primary' },
      type: { face: 'serif', size: 'display1', weight: 400 },
      binding: null,
      action: null,
      copy: { shape: 'heading', script: 'latin' },
    },
    {
      id: '14.splash.tagline',
      screen: splash,
      component: 'ui:Text',
      box: { x: 501, y: 711, w: 115, h: 17 },
      tokens: { fg: 'text.primary' },
      type: { face: 'gothic', size: 'body', weight: 400 },
      binding: 'static:brand.taglineJa',
      action: null,
      copy: { shape: 'label', script: 'japanese' },
    },
    {
      id: '14.splash.subline',
      screen: splash,
      component: 'ui:Text',
      box: { x: 431, y: 743, w: 251, h: 12 },
      tokens: { fg: 'text.secondary' },
      type: { face: 'sans', size: 'caption', weight: 400 },
      binding: 'static:brand.splashSubline',
      action: null,
      copy: { shape: 'caption', script: 'latin' },
    },
    {
      id: '14.splash.wave',
      screen: splash,
      component: 'ui:Illustration',
      box: { x: 414, y: 835, w: 284, h: 71 },
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
      box: { x: 434, y: 901, w: 244, h: 5 },
      tokens: { track: 'border.subtle', fill: 'text.primary', radius: 'pill' },
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
      elements: ['14.icon.tile.mark', '14.splash.mark', '14.splash.wordmark'],
      resolution:
        'mark geometry and the splash lockup come from 14; monochrome everywhere, the icon included (supersedes ADR-0093)',
      flippedByUser: false,
    },
    {
      id: 'C17',
      elements: [
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
