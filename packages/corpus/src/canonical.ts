/**
 * Canonical JSON — the exact string a corpus checksum is taken over.
 *
 * ## Why not just hash the file bytes
 *
 * `.gitattributes` normalises line endings, so raw bytes would *mostly* work. The problem is
 * what "mostly" costs: a reformat, a re-indent, or a key reordered by a tool would produce a
 * different digest from an identical record. The threat model says a checksum mismatch is a
 * SEV1 with no threshold and no grace period, and that rule is only survivable if a mismatch
 * genuinely means the content changed. A digest that also fires on whitespace trains people to
 * treat SEV1 as noise, which is worse than having no check.
 *
 * So the digest is taken over a canonical *form*: the same record always produces the same
 * string, whatever the file looked like.
 *
 * ## The shape (RFC 8785, JCS)
 *
 * - object keys sorted by UTF-16 code unit — which is what `Array.prototype.sort` does by
 *   default, and it is the sort JCS specifies;
 * - no insignificant whitespace;
 * - array order preserved, because array order is data;
 * - numbers via ECMAScript `Number::toString` — shortest round-trip, which `JSON.stringify`
 *   already produces;
 * - strings with minimal JSON escaping, **non-ASCII emitted as characters**. 藍鼠 is two
 *   characters, not twelve escape sequences, and the hasher encodes UTF-8 itself.
 *
 * ## Where this deliberately stops short of RFC 8785
 *
 * JCS specifies a number serialisation that differs from `JSON.stringify` for values needing
 * an exponent (`1e21` and beyond, and very small magnitudes). **Corpus numbers are tristimulus
 * values, weights, ranks and years** — none of which reach that range, and `parseEntry` already
 * rejects the non-finite cases. Rather than carry an untested reimplementation of a number
 * formatter, `canonicalize` REJECTS a number it cannot serialise identically to JCS. A value
 * that would expose the difference fails loudly instead of hashing differently on another
 * implementation later.
 */

/** Thrown when a value has no canonical form. Never caught internally — it is a defect. */
export class CanonicalError extends Error {
  constructor(path: string, detail: string) {
    super(`canonicalize: ${path} — ${detail}`);
    this.name = 'CanonicalError';
  }
}

/**
 * The magnitude range in which `JSON.stringify` and JCS agree exactly.
 *
 * Outside it JCS switches to a normalised exponent form that `Number::toString` does not
 * produce. Nothing in a corpus record belongs outside it.
 */
const MAX_PLAIN = 1e21;
const MIN_PLAIN = 1e-6;

function canonicalNumber(n: number, path: string): string {
  if (!Number.isFinite(n))
    throw new CanonicalError(path, `${String(n)} has no JSON representation`);
  if (Object.is(n, -0)) return '0';
  const magnitude = Math.abs(n);
  if (magnitude !== 0 && (magnitude >= MAX_PLAIN || magnitude < MIN_PLAIN))
    throw new CanonicalError(
      path,
      `${String(n)} is outside the range where ECMAScript number formatting and RFC 8785 ` +
        'agree. No corpus value belongs here — a tristimulus value, a weight, a rank and a ' +
        'year are all well inside it — so this is a defect rather than a limitation to work ' +
        'around. Hashing it would produce a digest another implementation disagrees with.',
    );
  return JSON.stringify(n);
}

function canonicalValue(value: unknown, path: string, out: string[]): void {
  if (value === null) {
    out.push('null');
    return;
  }
  switch (typeof value) {
    case 'boolean':
      out.push(value ? 'true' : 'false');
      return;
    case 'number':
      out.push(canonicalNumber(value, path));
      return;
    case 'string':
      // JSON.stringify performs minimal escaping and leaves non-ASCII as characters. Since
      // ES2019 it also emits lone surrogates as escapes rather than invalid UTF-16, so the
      // result is always well-formed.
      out.push(JSON.stringify(value));
      return;
    case 'undefined':
      throw new CanonicalError(
        path,
        'undefined has no JSON representation. A field that is not known is `null` with a ' +
          'reason in `unknowns` (FR-21) — an absent one would hash the same as a present one.',
      );
    // Listed rather than left to a `default`, so adding a JavaScript type is a compile error
    // here instead of a value that silently acquires a canonical form nobody chose.
    case 'bigint':
    case 'symbol':
    case 'function':
      throw new CanonicalError(path, `${typeof value} has no JSON representation`);
    case 'object':
      break;
  }

  if (Array.isArray(value)) {
    out.push('[');
    for (const [i, item] of value.entries()) {
      if (i > 0) out.push(',');
      canonicalValue(item, `${path}[${String(i)}]`, out);
    }
    out.push(']');
    return;
  }

  if (typeof value === 'object') {
    const o = value as Record<string, unknown>;
    // Default sort is UTF-16 code-unit order, which is exactly what RFC 8785 specifies.
    const keys = Object.keys(o).sort();
    out.push('{');
    for (const [i, key] of keys.entries()) {
      if (i > 0) out.push(',');
      out.push(JSON.stringify(key), ':');
      canonicalValue(o[key], path === '' ? key : `${path}.${key}`, out);
    }
    out.push('}');
    return;
  }

  throw new CanonicalError(path, `${typeof value} has no JSON representation`);
}

/**
 * The canonical string for a value.
 *
 * Deterministic across key order, whitespace and indentation; different for any change to any
 * value. Those two properties together are the whole contract, and both are asserted by
 * property tests rather than assumed.
 */
export function canonicalize(value: unknown): string {
  const out: string[] = [];
  canonicalValue(value, '', out);
  return out.join('');
}
