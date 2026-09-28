/**
 * Read the parts of a TrueType/OpenType font this repository checks (ADR-0057, F-226).
 *
 * ONE reader for the coverage check, the subset generator and the measuring tools, so the three
 * cannot disagree about what a font contains. It reads; it never writes. The generator's name-table
 * rewrite lives in the generator, beside the one place that needs it.
 *
 * Every reader FAILS LOUDLY on a table it cannot understand rather than returning an empty answer:
 * "I found no subtable I understand" is not "I found no missing glyphs", and an unreadable name table
 * is not one with no names.
 */

const u16 = (b, o) => b.readUInt16BE(o);
const u32 = (b, o) => b.readUInt32BE(o);

/** The table directory: tag → { offset, length }. */
export function tables(buf) {
  if (buf.length < 12) throw new Error('not a font: too short for a table directory');
  const out = new Map();
  const numTables = u16(buf, 4);
  for (let i = 0; i < numTables; i += 1) {
    const rec = 12 + i * 16;
    out.set(buf.toString('ascii', rec, rec + 4), { offset: u32(buf, rec + 8), length: u32(buf, rec + 12) });
  }
  return out;
}

/** Whether the font carries a table — `fvar` means it is still variable. */
export const hasTable = (buf, tag) => tables(buf).has(tag);

/*
 * `cmap`. Formats 4 and 12 only, and that is a deliberate limit rather than an oversight: 4 is the
 * BMP mapping every font has, and 12 is what carries anything above U+FFFF. A font whose Unicode
 * mapping is in neither is a font we cannot check, and this REPORTS that.
 */
export function cmapCodepoints(buf) {
  const cmap = tables(buf).get('cmap');
  if (cmap === undefined) throw new Error('no cmap table — the font declares no Unicode mapping');
  const cmapOffset = cmap.offset;

  const covered = new Set();
  const numSub = u16(buf, cmapOffset + 2);
  let understood = 0;

  for (let i = 0; i < numSub; i += 1) {
    const enc = cmapOffset + 4 + i * 8;
    const sub = cmapOffset + u32(buf, enc + 4);
    const format = u16(buf, sub);

    if (format === 4) {
      understood += 1;
      const segX2 = u16(buf, sub + 6);
      const ends = sub + 14;
      const starts = ends + segX2 + 2;
      const deltas = starts + segX2;
      const ranges = deltas + segX2;
      for (let s = 0; s < segX2 / 2; s += 1) {
        const end = u16(buf, ends + s * 2);
        const start = u16(buf, starts + s * 2);
        if (start === 0xffff) continue;
        const rangeOffset = u16(buf, ranges + s * 2);
        for (let c = start; c <= end && c !== 0xffff; c += 1) {
          // A segment maps a codepoint only if the resulting glyph id is non-zero. Treating
          // presence in a segment as coverage would count every codepoint in a range whose
          // glyphs were subset AWAY — which is exactly what a subsetter produces.
          let glyph;
          if (rangeOffset === 0) glyph = (c + u16(buf, deltas + s * 2)) & 0xffff;
          else {
            const gi = ranges + s * 2 + rangeOffset + (c - start) * 2;
            if (gi + 1 >= buf.length) continue;
            const raw = u16(buf, gi);
            glyph = raw === 0 ? 0 : (raw + u16(buf, deltas + s * 2)) & 0xffff;
          }
          if (glyph !== 0) covered.add(c);
        }
      }
    } else if (format === 12) {
      understood += 1;
      const nGroups = u32(buf, sub + 12);
      for (let g = 0; g < nGroups; g += 1) {
        const rec = sub + 16 + g * 12;
        const start = u32(buf, rec);
        const end = u32(buf, rec + 4);
        const startGlyph = u32(buf, rec + 8);
        if (startGlyph === 0) continue;
        for (let c = start; c <= end; c += 1) covered.add(c);
      }
    }
  }

  if (understood === 0)
    throw new Error(
      `cmap has ${String(numSub)} subtable(s), none in format 4 or 12 — this checker cannot ` +
        'read its Unicode mapping, and an unreadable mapping is not an empty one',
    );
  return covered;
}

/**
 * The `name` table as nameID → string, from the Windows Unicode records (3, 1) — the ones iOS and
 * Android read — falling back to Macintosh Roman (1, 0) only where Windows has none.
 */
export function names(buf) {
  const name = tables(buf).get('name');
  if (name === undefined) throw new Error('no name table — the font has no family or PostScript name');
  const base = name.offset;
  const count = u16(buf, base + 2);
  const strings = base + u16(buf, base + 4);
  const windows = new Map();
  const mac = new Map();
  for (let i = 0; i < count; i += 1) {
    const rec = base + 6 + i * 12;
    const [platform, encoding, , id, length, offset] = [0, 2, 4, 6, 8, 10].map((k) => u16(buf, rec + k));
    const at = strings + offset;
    if (platform === 3 && (encoding === 1 || encoding === 10) && !windows.has(id)) {
      let s = '';
      for (let k = 0; k < length; k += 2) s += String.fromCharCode(u16(buf, at + k));
      windows.set(id, s);
    } else if (platform === 1 && encoding === 0 && !mac.has(id)) mac.set(id, buf.toString('latin1', at, at + length));
  }
  const out = new Map(mac);
  for (const [id, s] of windows) out.set(id, s);
  return out;
}

/** `OS/2.usWeightClass` — the weight a platform matches a `fontWeight` request against. */
export function weightClass(buf) {
  const os2 = tables(buf).get('OS/2');
  if (os2 === undefined) throw new Error('no OS/2 table — the font declares no weight class');
  return u16(buf, os2.offset + 4);
}

/** The feature tags `GSUB` declares — `tnum` is what tabular figures need. */
export function gsubFeatures(buf) {
  const gsub = tables(buf).get('GSUB');
  if (gsub === undefined) return new Set();
  const list = gsub.offset + u16(buf, gsub.offset + 6);
  const count = u16(buf, list);
  const out = new Set();
  for (let i = 0; i < count; i += 1) out.add(buf.toString('ascii', list + 2 + i * 6, list + 6 + i * 6));
  return out;
}
