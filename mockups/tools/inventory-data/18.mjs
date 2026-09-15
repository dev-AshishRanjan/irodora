// Mockup 18 — Export & Reports. Full-bleed, 768 px → 2 px = 1 dp (§2). Boxes are pixel readings
// (measure.ps1, corner.ps1). The report preview is a page drawn at thumbnail scale: its readable
// blocks are elements, and its unreadable lines are not design (§2 names them). Derived, and saying
// so: the envelope's last line shares one blob with the signature above it, so its box is that blob's
// columns over the line's own rows. Every button is printed in square brackets — questions.md 13.
// The generator orders elements by the reading rule. Type size as in 02.mjs.
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
const heading = (key, box) =>
  el(`18.${key}.heading`, 'ui:Text', box, {
    tokens: { fg: 'text.primary' },
    type: text('sans', 'body', 600),
    binding: `static:export.${key}.heading`,
    copy: { shape: 'heading', script: 'latin' },
  });
const button = (id, box, parent, binding, action, icon = null) =>
  el(id, 'ui:Button', box, {
    parent,
    tokens: { border: 'border.subtle', radius: 'sm' },
    icon,
    binding,
    action,
    copy: { shape: 'label', script: 'latin' },
  });
const pv = '18.report.preview';
const tool = (key, c) => {
  const p = `18.tools.${key}`;
  return [
    el(p, 'ui:Card', c.box, {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'md' },
      measured: { bg: c.fill },
    }),
    el(`${p}.art`, 'ui:Illustration', c.art, { parent: p, illustration: 'document' }),
    el(`${p}.icon`, null, c.icon, { parent: p, icon: c.iconName }),
    t(`${p}.title`, c.title, p, `static:export.${key}.title`, {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
      copy: { shape: 'heading', script: 'latin', lines: 2 },
    }),
    ...(c.suffix
      ? [
          t(`${p}.formats`, c.suffix, p, `static:export.${key}.formats`, {
            tokens: { fg: 'text.secondary' },
            ...cap(c.suffixEm),
            copy: { shape: 'label', script: 'latin' },
          }),
        ]
      : []),
    t(`${p}.detail`, c.detail, p, `static:export.${key}.detail`, {
      tokens: { fg: 'text.secondary' },
      ...cap(c.detailEm),
      copy: { shape: 'body', script: 'latin', lines: 2 },
    }),
    button(`${p}.export`, c.button, p, `static:export.${key}.action`, `submit:export.${key}`),
  ];
};

export default {
  kind: 'screen',
  governs: 'layout',
  frame: {
    kind: 'full-bleed',
    screens: [{ id: '18.screen', box: B(0, 0, 768, 1376), dpPerPx: 0.5 }],
  },
  elements: [
    // ---- header
    el('18.header', null, B(0, 0, 768, 89), {
      tokens: { bg: 'level1' },
      measured: { bg: '#1A1D24' },
    }),
    el('18.back', 'ui:Button', B(23, 34, 94, 19), {
      icon: 'back',
      binding: 'static:export.back',
      action: 'navigate:/profile',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('18.title', 'ui:Text', B(210, 30, 346, 27), {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 600),
      binding: 'static:export.title',
      copy: { shape: 'heading', script: 'mixed' },
    }),
    el('18.help', 'ui:Button', B(668, 30, 79, 26), {
      icon: 'help',
      binding: 'static:export.help',
      action: 'open:export.help',
      copy: { shape: 'label', script: 'latin' },
    }),
    el('18.header-rule', null, B(0, 86, 768, 2), { tokens: { fg: 'border.subtle' } }),
    // ---- the report
    heading('report', B(30, 129, 468, 29)),
    el('18.report', 'ui:Card', B(28, 177, 712, 395), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
      measured: { bg: '#1A1C23' },
    }),
    el('18.report.fold', 'ui:Illustration', B(648, 185, 84, 45), {
      parent: '18.report',
      illustration: 'page-fold',
    }),
    el(pv, 'new:ReportPreview', B(51, 201, 325, 347), {
      parent: '18.report',
      tokens: { radius: 'sm' },
      binding: 'engine:report.preview',
      measured: { bg: '#FEFEFE' },
    }),
    t(`${pv}.title`, B(81, 229, 225, 14), pv, 'static:report.title', {
      ...cap(7.5, 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t(`${pv}.matrix-heading`, B(80, 264, 60, 8), pv, 'static:report.matrixHeading', {
      ...cap(5.5, 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    el(`${pv}.matrix`, 'new:DataTable', B(80, 277, 268, 114), {
      parent: pv,
      binding: 'engine:report.deltaE00-matrix',
    }),
    t(`${pv}.oklch-heading`, B(81, 399, 67, 9), pv, 'static:report.oklchHeading', {
      ...cap(6.2, 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t(`${pv}.oklch`, B(81, 413, 133, 20), pv, 'engine:report.oklch', {
      ...cap(6.2),
      copy: { shape: 'value', script: 'figures', lines: 2 },
    }),
    el(`${pv}.envelope`, null, B(80, 439, 267, 83), {
      parent: pv,
      tokens: { border: 'border.subtle' },
    }),
    t(`${pv}.envelope.text`, B(92, 451, 152, 23), `${pv}.envelope`, 'engine:report.envelope', {
      ...cap(5.9),
      copy: { shape: 'body', script: 'latin', lines: 2 },
    }),
    el(`${pv}.envelope.signature`, 'ui:Illustration', B(244, 469, 88, 29), {
      parent: `${pv}.envelope`,
      illustration: 'signature',
    }),
    t('18.report.title', B(393, 206, 248, 24), '18.report', 'static:export.report.title', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 600),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t('18.report.detail', B(393, 239, 280, 52), '18.report', 'static:export.report.detail', {
      tokens: { fg: 'text.secondary' },
      ...cap(11.3),
      copy: { shape: 'body', script: 'latin', lines: 2 },
    }),
    el('18.report.art', 'ui:Illustration', B(645, 354, 87, 68), {
      parent: '18.report',
      illustration: 'document',
    }),
    button(
      '18.report.generate',
      B(393, 432, 323, 47),
      '18.report',
      'static:export.report.generate',
      'submit:export.report',
      'arrow-right',
    ),
    button(
      '18.report.share',
      B(393, 497, 323, 47),
      '18.report',
      'static:export.report.share',
      'open:share.report',
    ),
    // ---- the tooling exports
    heading('tools', B(30, 630, 512, 30)),
    ...tool('ase', {
      box: B(28, 678, 228, 315),
      fill: '#1A1C22',
      art: B(192, 684, 58, 73),
      icon: B(55, 710, 37, 44),
      iconName: 'file-text',
      title: B(52, 789, 168, 53),
      detail: B(53, 855, 191, 42),
      detailEm: 10.8,
      button: B(52, 922, 182, 47),
    }),
    ...tool('tokens', {
      box: B(271, 678, 226, 315),
      fill: '#181B22',
      art: B(434, 684, 59, 73),
      icon: B(296, 710, 36, 44),
      iconName: 'file-code',
      title: B(293, 789, 148, 51),
      suffix: B(373, 820, 102, 21),
      suffixEm: 10.0,
      detail: B(294, 855, 161, 45),
      detailEm: 11.6,
      button: B(293, 922, 182, 47),
    }),
    ...tool('csv', {
      box: B(512, 678, 228, 315),
      fill: '#191B21',
      art: B(676, 684, 58, 73),
      icon: B(537, 710, 36, 44),
      iconName: 'file-table',
      title: B(533, 789, 173, 52),
      detail: B(533, 855, 192, 42),
      detailEm: 11.3,
      button: B(534, 922, 182, 47),
    }),
    // ---- the encrypted backup
    heading('backup', B(30, 1045, 368, 30)),
    el('18.backup', 'ui:Card', B(28, 1095, 712, 180), {
      tokens: { bg: 'level1', border: 'border.subtle', radius: 'sm' },
    }),
    el('18.backup.art', 'ui:Illustration', B(668, 1101, 66, 49), {
      parent: '18.backup',
      illustration: 'document',
    }),
    t('18.backup.title', B(53, 1124, 370, 25), '18.backup', 'static:export.backup.title', {
      tokens: { fg: 'text.primary' },
      ...cap(11.9, 500),
      copy: { shape: 'heading', script: 'latin' },
    }),
    t('18.backup.detail', B(52, 1160, 645, 22), '18.backup', 'static:export.backup.detail', {
      tokens: { fg: 'text.secondary' },
      ...cap(11.8),
      copy: { shape: 'body', script: 'latin' },
    }),
    button(
      '18.backup.export',
      B(51, 1202, 327, 49),
      '18.backup',
      'static:export.backup.export',
      'submit:export.backup',
    ),
    button(
      '18.backup.restore',
      B(390, 1202, 327, 48),
      '18.backup',
      'static:export.backup.restore',
      'open:backup.restore',
    ),
    // ---- 18's own tab bar — four items; C1 puts 01's five in its place
    el('18.tabs', 'app:TabBar', B(0, 1292, 768, 84), {
      tokens: { bg: 'ground', border: 'border.subtle' },
      measured: { bg: '#1B1E24' },
    }),
    el('18.tabs.indicator', null, B(3, 1295, 191, 4), {
      parent: '18.tabs',
      tokens: { fg: 'text.primary' },
    }),
    el('18.tabs.profile.icon', 'ui:NavIcon', B(83, 1308, 27, 31), {
      parent: '18.tabs',
      icon: 'profile',
      action: 'navigate:/profile',
    }),
    el('18.tabs.document.icon', 'ui:NavIcon', B(275, 1320, 26, 30), {
      parent: '18.tabs',
      icon: 'document',
    }),
    el('18.tabs.export.icon', 'ui:NavIcon', B(466, 1320, 27, 30), {
      parent: '18.tabs',
      icon: 'file-export',
    }),
    el('18.tabs.settings.icon', 'ui:NavIcon', B(656, 1320, 31, 30), {
      parent: '18.tabs',
      icon: 'settings',
      action: 'navigate:/profile/settings',
    }),
    t('18.tabs.profile.label', B(68, 1345, 57, 18), '18.tabs', 'static:tabs.profile', {
      tokens: { fg: 'text.primary' },
      type: text('sans', 'label', 500),
    }),
  ],
  notDesign: [
    {
      what: 'garbled-text',
      note: 'the report description’s first line is unreadable',
      box: B(394, 239, 260, 17),
    },
    {
      what: 'garbled-text',
      note: 'the preview’s Japanese subtitle is unreadable',
      box: B(81, 245, 188, 9),
    },
    {
      what: 'garbled-text',
      note: 'the preview’s second OKLCh line misspells its label',
      box: B(81, 425, 133, 8),
    },
    {
      what: 'garbled-text',
      note: 'the preview envelope’s signed-by line is unreadable',
      box: B(244, 502, 88, 9),
    },
    {
      what: 'leaked-label',
      note: 'a requirement id printed after the backup section’s heading',
      box: B(404, 1045, 90, 30),
    },
  ],
  departures: [
    {
      rule: 'E2',
      element: '18.report.title',
      why: 'a factual descriptor of the same length — grade language is banned by F-219 (§4 row 18)',
    },
    {
      rule: 'E2',
      element: '18.report.detail',
      why: 'the same grade word, repeated in lowercase, goes with the title (§4 row 18)',
    },
  ],
  conflicts: [
    {
      id: 'C1',
      elements: [
        '18.tabs',
        '18.tabs.indicator',
        '18.tabs.profile.icon',
        '18.tabs.document.icon',
        '18.tabs.export.icon',
        '18.tabs.settings.icon',
        '18.tabs.profile.label',
      ],
      resolution: "P5 → 01: 18's four-item tab bar is replaced by 01's five, icon and label",
      flippedByUser: false,
    },
  ],
};
