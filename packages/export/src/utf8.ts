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
