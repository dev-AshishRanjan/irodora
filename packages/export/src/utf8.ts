/**
 * UTF-8 encoding, because this package may not assume a global.
 *
 * ## Why not `TextEncoder`
 *
 * `tsconfig.base.json` pins `lib: ["ES2023"]` and nothing else — no DOM, no `node` types — and
 * that is deliberate: it is what stops a package that has to run in Node, a browser and Hermes
 * from quietly depending on one of them. `TextEncoder` is a WHATWG global, so typing it means
 * either widening `lib` for everything or declaring the global by hand, and **declaring a
 * global is the comment version of a guarantee**: it asserts the runtime has something rather
 * than checking it.
 *
 * ## Why not a dependency
 *
 * `@noble/hashes` exports `utf8ToBytes` and the app already uses it. Taking a hashing library
 * as a dependency for its text encoder is the kind of edge that is invisible until somebody
 * audits the graph — and this package's argument for having no dependencies is that its output
 * must be diffable, which a dependency it does not control makes weaker rather than stronger.
 *
 * ## The case a naive implementation gets wrong
 *
 * **Astral characters.** JavaScript strings are UTF-16, so an emoji is two code units, and
 * `charCodeAt` on either half returns a lone surrogate — which is not a character and has no
 * UTF-8 encoding. Iterating with `for…of` yields code points rather than code units, which is
 * what makes the four-byte case work at all. A lone surrogate that reaches here anyway (a
 * string sliced through a pair) becomes `U+FFFD`, because the alternative is emitting bytes
 * that are not UTF-8 and calling the result a file.
 */

/** The replacement character, for a lone surrogate that cannot be encoded as anything else. */
const REPLACEMENT = 0xfffd;

/**
 * UTF-8 bytes for a string.
 *
 * The four ranges are the specification's: one byte below U+0080, two below U+0800, three
 * below U+10000, and four above it.
 */
export function utf8(text: string): Uint8Array {
  const out: number[] = [];

  for (const character of text) {
    let code = character.codePointAt(0) ?? REPLACEMENT;
    // A lone surrogate is not a code point. `for…of` pairs valid ones, so anything left in this
    // range arrived unpaired — from a slice through a pair, most often.
    if (code >= 0xd800 && code <= 0xdfff) code = REPLACEMENT;

    if (code < 0x80) {
      out.push(code);
    } else if (code < 0x800) {
      out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    } else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f),
      );
    }
  }

  return Uint8Array.from(out);
}

/**
 * Latin-1 bytes, for the one place a byte is not UTF-8.
 *
 * A PDF's base-14 fonts are single-byte encoded, so its text strings are not UTF-8 and writing
 * them as if they were produces mojibake in every viewer. `pdf.ts` refuses anything this cannot
 * represent rather than dropping it — see there.
 */
export function latin1(text: string): Uint8Array {
  const out = new Uint8Array(text.length);
  for (let i = 0; i < text.length; i += 1) out[i] = text.charCodeAt(i) & 0xff;
  return out;
}

/** Concatenate byte runs. Used by every binary writer, so the length maths lives in one place. */
export function concat(parts: readonly Uint8Array[]): Uint8Array {
  let total = 0;
  for (const part of parts) total += part.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

/**
 * A string from UTF-8 bytes — `utf8`'s inverse (F-129).
 *
 * `TextDecoder` is refused for the reason `TextEncoder` is, and the reason is at the top of this
 * file: declaring a global asserts the runtime has something rather than checking it.
 *
 * ## Strict, and that is the point
 *
 * It **throws** on a malformed sequence rather than substituting `U+FFFD`. The encoder
 * substitutes because it is handed a JavaScript string, where a lone surrogate is a real thing
 * that has to become *something*; this is handed a file, where a malformed byte means the file
 * is not what it claims to be. An importer that silently replaced bad bytes would hand back a
 * subject nobody wrote, and `fromJson` would then refuse it for a reason that names the wrong
 * field.
 *
 * The three malformed shapes it names are the ones a real file has: a truncated sequence, a
 * continuation byte that is not one, and an **overlong** encoding — the last being the one a
 * naive decoder accepts, because it decodes to a valid code point by arithmetic and is
 * forbidden precisely so that two byte sequences cannot mean one character.
 */
export function fromUtf8(bytes: Uint8Array): string {
  let out = '';

  for (let i = 0; i < bytes.length;) {
    const first = bytes[i] ?? 0;
    let code: number;
    let width: number;
    let lowest: number;

    if (first < 0x80) {
      code = first;
      width = 1;
      lowest = 0;
    } else if ((first & 0xe0) === 0xc0) {
      code = first & 0x1f;
      width = 2;
      lowest = 0x80;
    } else if ((first & 0xf0) === 0xe0) {
      code = first & 0x0f;
      width = 3;
      lowest = 0x800;
    } else if ((first & 0xf8) === 0xf0) {
      code = first & 0x07;
      width = 4;
      lowest = 0x10000;
    } else {
      throw new RangeError(`utf8: byte ${String(i)} is 0x${first.toString(16)}, not a lead byte`);
    }

    if (i + width > bytes.length)
      throw new RangeError(`utf8: a ${String(width)}-byte sequence at ${String(i)} is truncated`);

    for (let k = 1; k < width; k += 1) {
      const next = bytes[i + k] ?? 0;
      if ((next & 0xc0) !== 0x80)
        throw new RangeError(
          `utf8: byte ${String(i + k)} is 0x${next.toString(16)}, not a continuation`,
        );
      code = (code << 6) | (next & 0x3f);
    }

    // OVERLONG. `0xc0 0x80` decodes to U+0000 by arithmetic and is forbidden, because a decoder
    // that accepts it lets one character be written two ways — which is how a filter checking
    // for a byte sequence gets walked past.
    if (code < lowest)
      throw new RangeError(
        `utf8: an overlong encoding at ${String(i)} — U+${code.toString(16).toUpperCase()} in ` +
          `${String(width)} bytes`,
      );
    if (code >= 0xd800 && code <= 0xdfff)
      throw new RangeError(
        `utf8: a surrogate (U+${code.toString(16).toUpperCase()}) at ${String(i)}`,
      );
    if (code > 0x10ffff)
      throw new RangeError(
        `utf8: U+${code.toString(16).toUpperCase()} at ${String(i)} is beyond Unicode`,
      );

    out += String.fromCodePoint(code);
    i += width;
  }

  return out;
}
