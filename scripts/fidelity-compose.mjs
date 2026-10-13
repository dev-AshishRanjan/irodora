/**
 * A capture, beside the mockups that govern it (F-221 criterion 1, ADR-0134 D4).
 *
 * The page a person opens to check fidelity: the screen the app drew, at 384 dp, and the drawing
 * it is built to, at the same scale. It is an SVG with each image embedded, so it stands alone and
 * adds no dependency. A framed mockup is cropped to its screen, from its inventory.
 *
 * **A picture can never sit beside a mockup that is not the specification.** Every mockup's bytes
 * are hashed against the sha256 the index pins, and a mismatch throws.
 *
 * Pure: bytes and data in, text out. The runner writes; this composes.
 */

import { createHash } from 'node:crypto';

import { imageSizeOf } from './mockup-inventory.mjs';

/** The reference viewport's width, in dp, and so in the composition's units (one unit, one dp). */
export const REFERENCE_DP = 384;

const GAP = 24;
const MARGIN = 16;
const LINE = 15;

/**
 * Which mockups govern a route in a condition (precedence P1, P2), and what no mockup draws.
 *
 * - P1: the mockup whose `primaryFor` names the route.
 * - P2: a variant whose `variantFor` names it, when its inventory governs the condition: the light
 *   palette (`palette`) in Washi, Japanese (`locale`) in Japanese.
 * - A state variant is not composed: the capture shows the route as a cleared app reaches it, and
 *   each state is its surface feature's to capture.
 *
 * `notes` say what is missing, so an empty panel list cannot read as agreement.
 */
export function governingPanels(route, { theme, locale }, index, inventories) {
  const panels = [];
  const notes = [];
  for (const [id, row] of Object.entries(index.mockups ?? {})) {
    if ((row.primaryFor ?? []).includes(route)) panels.unshift({ id, rule: 'P1' });
    if (!(row.variantFor ?? []).includes(route)) continue;
    const governs = inventories.get(id)?.governs;
    if (governs === 'palette' && theme === 'light') panels.push({ id, rule: 'P2', governs });
    else if (governs === 'locale' && locale === 'ja') panels.push({ id, rule: 'P2', governs });
    else if (governs === 'state')
      notes.push(
        `state variant ${id} is not composed: this capture is the route as a cleared app reaches it`,
      );
  }
  const undrawn = index.undrawn?.[route];
  if (undrawn !== undefined) notes.push(`no governing mockup: ${route} waits on ${undrawn}`);
  else if (!panels.some((p) => p.rule === 'P1'))
    notes.push(`no governing mockup is indexed for ${route}`);
  if (theme === 'light' && !panels.some((p) => p.governs === 'palette'))
    notes.push('no mockup draws this route in Washi: compared with its Sumi drawing');
  if (locale === 'ja' && !panels.some((p) => p.governs === 'locale'))
    notes.push('no mockup draws this route in Japanese: compared with its English drawing');
  return { panels, notes };
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

const mimeOf = (bytes) => (bytes[0] === 0x89 && bytes[1] === 0x50 ? 'image/png' : 'image/jpeg');

/** Text for an SVG: the five characters XML gives meaning, escaped. */
const xml = (text) => String(text).replace(/[&<>"']/gu, (c) => `&#${String(c.codePointAt(0))};`);

/**
 * One composed page: the capture, then each governing mockup, side by side at 384 units wide.
 *
 * `capture`: `{ bytes }`, a PNG from the device. `mockups`: `[{ id, rule, governs?, bytes, sha256,
 * box }]`, where `sha256` is the index's pin and `box` the inventory's screen (`null` for the whole
 * image). `label`: the route and condition. `notes`: what no mockup draws.
 */
export function composeSvg({ capture, mockups, label, notes = [] }) {
  const panels = [];

  const captureSize = imageSizeOf(capture.bytes);
  if (captureSize === null) throw new Error('the capture is not a PNG or JPEG');
  panels.push({
    bytes: capture.bytes,
    size: captureSize,
    box: { x: 0, y: 0, w: captureSize.w, h: captureSize.h },
    caption: ['the app, captured', 'first viewport only'],
  });

  for (const m of mockups) {
    const actual = sha256(m.bytes);
    if (actual !== m.sha256)
      throw new Error(
        `mockup ${m.id}: its bytes are not the ones the index pins (${actual.slice(0, 12)}, not ` +
          `${String(m.sha256).slice(0, 12)}). A changed image is a changed specification.`,
      );
    const size = imageSizeOf(m.bytes);
    if (size === null) throw new Error(`mockup ${m.id} is not a PNG or JPEG`);
    panels.push({
      bytes: m.bytes,
      size,
      box: m.box ?? { x: 0, y: 0, w: size.w, h: size.h },
      caption: [
        `mockup ${m.id} · ${m.rule}${m.governs === undefined ? '' : ` (${m.governs})`}`,
        `sha256 ${actual.slice(0, 12)}${m.box === null || m.box === undefined ? '' : ' · its screen, cropped'}`,
      ],
    });
  }

  const heights = panels.map((p) => (p.box.h * REFERENCE_DP) / p.box.w);
  const top = MARGIN + LINE * (1 + notes.length) + 8;
  const captionTop = top + Math.max(...heights) + LINE;
  const width = MARGIN * 2 + panels.length * REFERENCE_DP + (panels.length - 1) * GAP;
  const height = captionTop + LINE * 2 + MARGIN;

  const body = panels.map((p, i) => {
    const x = MARGIN + i * (REFERENCE_DP + GAP);
    const h = heights[i];
    const href = `data:${mimeOf(p.bytes)};base64,${Buffer.from(p.bytes).toString('base64')}`;
    return [
      `  <svg x="${String(x)}" y="${String(top)}" width="${String(REFERENCE_DP)}" height="${h.toFixed(2)}" ` +
        `viewBox="${String(p.box.x)} ${String(p.box.y)} ${String(p.box.w)} ${String(p.box.h)}" ` +
        'preserveAspectRatio="xMidYMin meet">',
      `    <image width="${String(p.size.w)}" height="${String(p.size.h)}" href="${href}"/>`,
      '  </svg>',
      ...p.caption.map(
        (line, k) =>
          `  <text x="${String(x)}" y="${(captionTop + k * LINE).toFixed(2)}">${xml(line)}</text>`,
      ),
    ].join('\n');
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${height.toFixed(2)}" ` +
      `viewBox="0 0 ${String(width)} ${height.toFixed(2)}" font-family="monospace" font-size="11">`,
    `  <rect width="100%" height="100%" fill="#ffffff"/>`,
    `  <text x="${String(MARGIN)}" y="${String(MARGIN + LINE)}" font-size="13">${xml(label)}</text>`,
    ...notes.map(
      (note, k) =>
        `  <text x="${String(MARGIN)}" y="${String(MARGIN + LINE * (k + 2))}">${xml(note)}</text>`,
    ),
    ...body,
    '</svg>',
    '',
  ].join('\n');
}
