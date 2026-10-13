/**
 * What a fidelity run captured, and what it could not (F-221 criteria 3 and 5, ADR-0134).
 *
 * **"Nothing captured" and "no difference found" can never read alike.** The record counts every
 * route in every condition, each exactly once, captured or not and why; its summary line says
 * NOTHING CAPTURED when that is the truth.
 *
 * **Rendered text never enters the record.** `record.json` and `record.md` live under
 * `.harness/verification/evidence/`, which repository walkers (the claims lint among them) read. A
 * claim found on a screen goes only to that capture's `claims.txt`, so finding a claim cannot plant
 * it in a file the lint then refuses.
 *
 * Pure: data in, data out. The runner writes.
 */

/** The four conditions every route is captured in: both themes, both languages. */
export const CONDITIONS = [
  { theme: 'dark', locale: 'en' },
  { theme: 'dark', locale: 'ja' },
  { theme: 'light', locale: 'en' },
  { theme: 'light', locale: 'ja' },
];

const key = (route, theme, locale) => `${route} [${theme}/${locale}]`;

/**
 * The record of one run. Throws when a route and condition is missing, appears twice, or is not
 * one the run was asked for: a record with a hole in it would count the hole as nothing to report.
 */
export function buildRecord({ commit, app, device, routes, results, claims }) {
  const wanted = new Set(
    routes.flatMap((route) => CONDITIONS.map((c) => key(route, c.theme, c.locale))),
  );
  const seen = new Set();
  for (const r of results) {
    const k = key(r.route, r.theme, r.locale);
    if (!wanted.has(k)) throw new Error(`the record holds ${k}, which the run was not asked for`);
    if (seen.has(k)) throw new Error(`the record holds ${k} twice`);
    seen.add(k);
    if (r.status !== 'captured' && r.status !== 'not-captured')
      throw new Error(`${k}: status is "${String(r.status)}", not captured or not-captured`);
    if (r.status === 'not-captured' && (typeof r.reason !== 'string' || r.reason.trim() === ''))
      throw new Error(`${k}: not captured, and says no reason why`);
  }
  const missing = [...wanted].filter((k) => !seen.has(k));
  if (missing.length > 0)
    throw new Error(
      `the record has no result for ${String(missing.length)} capture(s): ${missing.slice(0, 3).join(', ')}`,
    );

  const captured = results.filter((r) => r.status === 'captured').length;
  return {
    version: 1,
    commit,
    app,
    device,
    conditions: CONDITIONS,
    expected: wanted.size,
    captured,
    notCaptured: wanted.size - captured,
    claims: {
      capturesChecked: claims?.capturesChecked ?? 0,
      texts: claims?.texts ?? 0,
      findings: claims?.findings ?? 0,
      unread: claims?.unread ?? 0,
    },
    results,
  };
}

/** One line a person reads first. The two failures that look like success are spelled out. */
export function summaryLine(record) {
  if (record.captured === 0) return `NOTHING CAPTURED — 0 of ${String(record.expected)}`;
  const head = `captured ${String(record.captured)} of ${String(record.expected)}`;
  return record.notCaptured === 0 ? head : `${head}; ${String(record.notCaptured)} not captured`;
}

/** Whether a run proved what criterion 1, 2 and 5 ask: everything captured, nothing claimed. */
export function runPassed(record) {
  return (
    record.notCaptured === 0 &&
    record.claims.findings === 0 &&
    record.claims.unread === 0 &&
    record.claims.capturesChecked === record.captured
  );
}

/** The record for a person: the summary, the device, then every route and condition. */
export function recordMarkdown(record) {
  const d = record.device ?? {};
  return [
    '# Fidelity run',
    '',
    `**${summaryLine(record)}.** ${runPassed(record) ? 'Every capture taken and read, no claim found.' : 'Not a complete run: see below.'}`,
    '',
    `- commit \`${String(record.commit)}\`, app ${String(record.app?.package)} ${String(record.app?.versionName ?? '')}`,
    `- device ${String(d.model)}, API ${String(d.sdk)}, ${d.emulator === true ? 'an emulator' : 'a physical device'}, ${String(d.dpWidth)} dp wide`,
    `- claims: ${String(record.claims.capturesChecked)} capture(s) read, ${String(record.claims.texts)} text(s), ` +
      `${String(record.claims.findings)} finding(s), ${String(record.claims.unread)} unread (each capture's claims.txt)`,
    '',
    '| route | condition | result |',
    '|---|---|---|',
    ...record.results.map(
      (r) =>
        `| \`${r.route}\` | ${r.theme}/${r.locale} | ${
          r.status === 'captured'
            ? `captured → \`${String(r.composed ?? r.capture)}\``
            : `NOT CAPTURED — ${String(r.reason).replace(/\|/gu, '\\|')}`
        } |`,
    ),
    '',
  ].join('\n');
}

/* ------------------------------------------------------------- the text a device drew (D3) */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const unescapeXml = (text) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/giu, (_, e) =>
    e[0] === '#'
      ? String.fromCodePoint(
          e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : Number(e.slice(1)),
        )
      : ENTITIES[e.toLowerCase()],
  );

/** One node's attributes, read from its tag. */
function attributesOf(tag) {
  const out = {};
  for (const m of tag.matchAll(/([\w-]+)="([^"]*)"/gu)) out[m[1]] = unescapeXml(m[2]);
  return out;
}

/** `[x1,y1][x2,y2]` as a box, or null. */
function boundsOf(text) {
  const m = /^\[(-?\d+),(-?\d+)\]\[(-?\d+),(-?\d+)\]$/u.exec(text ?? '');
  return m === null ? null : { x1: +m[1], y1: +m[2], x2: +m[3], y2: +m[4] };
}

/**
 * `uiautomator dump`'s XML, as a tree. Throws on anything it cannot read whole: an unreadable dump
 * is counted as UNREAD, which fails the run, never as a screen with nothing on it.
 */
function parseHierarchy(xmlText) {
  if (
    !/^\s*(?:<\?xml[^>]*\?>\s*)?<hierarchy\b/u.test(xmlText) ||
    !/<\/hierarchy>\s*$/u.test(xmlText)
  )
    throw new Error('not a whole uiautomator hierarchy');
  const root = { attributes: {}, children: [] };
  const stack = [root];
  for (const m of xmlText.matchAll(/<(\/?)node\b([^>]*?)(\/?)>/gu)) {
    const [, closing, attrs, selfClosing] = m;
    if (closing === '/') {
      if (stack.length <= 1) throw new Error('a node closes that never opened');
      stack.pop();
      continue;
    }
    const node = { attributes: attributesOf(attrs), children: [] };
    stack.at(-1).children.push(node);
    if (selfClosing !== '/') stack.push(node);
  }
  if (stack.length !== 1) throw new Error('a node opens that never closes');
  return root;
}

/** Every text in a subtree, in document order, with its box. */
function textsIn(node, out = []) {
  const text = (node.attributes.text ?? '').trim();
  if (text !== '') out.push({ text, box: boundsOf(node.attributes.bounds) });
  for (const child of node.children) textsIn(child, out);
  return out;
}

/** Whether two boxes share a line: their vertical extents overlap by half the shorter. */
const sameLine = (a, b) =>
  a !== null &&
  b !== null &&
  Math.min(a.y2, b.y2) - Math.max(a.y1, b.y1) >= Math.min(a.y2 - a.y1, b.y2 - b.y1) / 2;

/**
 * The texts a device drew, in the three forms a claim takes (ADR-0134 D3), as the jest sweep reads
 * a test tree: paragraphs (each text), names (`content-desc`), and lines. A line is two or more
 * children of one node, each holding exactly one text, that sit on the same line on the screen,
 * read left to right: a figure and a label set side by side.
 */
export function hierarchyTexts(xmlText) {
  const root = parseHierarchy(xmlText);
  const out = [];
  const walk = (node) => {
    const text = (node.attributes.text ?? '').trim();
    if (text !== '') out.push({ kind: 'paragraph', text });
    const name = (node.attributes['content-desc'] ?? '').trim();
    if (name !== '' && name !== text) out.push({ kind: 'name', text: name });

    const single = node.children
      .map((child) => textsIn(child))
      .filter((held) => held.length === 1)
      .map((held) => held[0])
      .filter((t) => t.box !== null)
      .sort((a, b) => a.box.x1 - b.box.x1);
    const used = new Set();
    for (const [i, first] of single.entries()) {
      if (used.has(i)) continue;
      const line = [first];
      for (const [j, other] of single.entries())
        if (j > i && !used.has(j) && sameLine(first.box, other.box)) {
          line.push(other);
          used.add(j);
        }
      if (line.length >= 2) out.push({ kind: 'line', text: line.map((t) => t.text).join(' ') });
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  return out;
}

/** The banned constructions a capture's texts contain, through `claims-patterns`' compile. */
export function captureClaims(texts, compiled) {
  return texts.flatMap((t) =>
    compiled
      .filter((b) => b.re.test(t.text))
      .map((b) => ({ id: b.id, kind: t.kind, text: t.text })),
  );
}

/** A capture's `claims.txt`: the only file a finding's words are written to. */
export function claimsFile(findings) {
  return findings.length === 0
    ? 'No banned construction in this capture’s text.\n'
    : `${findings.map((f) => `${f.id} (${f.kind}): ${f.text}`).join('\n')}\n`;
}
