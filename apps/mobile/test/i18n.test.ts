/**
 * The catalogue.
 *
 * ## The assertion this file deliberately does NOT contain
 *
 * ```ts
 * expect(Object.keys(en)).toEqual(Object.keys(ja));   // CANNOT FAIL
 * ```
 *
 * `ja` is typed `Record<MessageKey, string>` where `MessageKey` is `keyof typeof en`, so the
 * two key sets are equal **by construction**. That test would pass whether or not anything is
 * right, and the plan lists it by name as an assertion to reject. The completeness check is
 * `tsc`; what is left for a runtime test is everything the type cannot see.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  en,
  IDENTICAL_BY_DESIGN,
  ja,
  JA_REVIEWED,
  LOCALES,
  MESSAGE_KEYS,
  NOTATION_KEYS,
  NOTATION_MAX,
  NOTATION_SHAPE,
  resolveLocale,
  t,
  type MessageKey,
} from '../src/i18n/index';

// jest transpiles to CJS, where `import.meta.url` is null. The runner's cwd is the package
// root, which is what this needs anyway.
const APP = process.cwd();

/** Every `.ts`/`.tsx` under app/ and src/, excluding the catalogues themselves. */
function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      sourceFiles(full, out);
      continue;
    }
    if (!/\.tsx?$/u.test(entry)) continue;
    if (full.includes(join('src', 'i18n'))) continue;
    out.push(full);
  }
  return out;
}

const SOURCES = [join(APP, 'app'), join(APP, 'src')].flatMap((d) => sourceFiles(d));
const ALL_SOURCE = SOURCES.map((f) => readFileSync(f, 'utf8')).join('\n');

describe('the catalogue has content to check', () => {
  it('declares keys, and finds source files to scan', () => {
    expect(MESSAGE_KEYS.length).toBeGreaterThan(0);
    expect(SOURCES.length).toBeGreaterThan(0);
  });
});

describe('Japanese is written, not copied', () => {
  it('has no value identical to its English, outside the declared list', () => {
    // THE CHECK THAT CATCHES A PLACEHOLDER. A copy-paste of the English text type-checks
    // perfectly — `Record<MessageKey, string>` is satisfied by any string at all.
    const identical = MESSAGE_KEYS.filter((k) => ja[k] === en[k]);
    const allowed = [...IDENTICAL_BY_DESIGN, ...NOTATION_KEYS];
    expect(identical.sort()).toEqual(allowed.sort());
  });

  it('keeps the ad-hoc exemption list short enough to read, and every entry real', () => {
    // Each entry is a place the check above is switched off for no reason but our say-so. A
    // list of favours that grows without anyone noticing is how a check stops checking.
    //
    // It is EMPTY now (F-018), and the loop is deliberately kept rather than deleted: the day
    // someone adds a favour, it has to survive these two assertions.
    expect(IDENTICAL_BY_DESIGN.length).toBeLessThanOrEqual(3);
    for (const k of IDENTICAL_BY_DESIGN) {
      expect(MESSAGE_KEYS).toContain(k);
      // It must ACTUALLY be identical — an exemption for a value that differs is a stale
      // exemption, and it would silently cover a future copy-paste at that key.
      expect(ja[k]).toBe(en[k]);
    }
  });

  /*
   * The category that replaced five more favours (F-018).
   *
   * A rule beats a longer list. "CIELAB" is CIELAB in Japanese and translating it would invent
   * a term nobody uses — but "it is notation" has to be CHECKABLE, or it is only a nicer word
   * for an exemption. An anchored shape plus a length cap: a phrase cannot qualify, however it
   * is described.
   */
  it('admits notation only where it really is notation', () => {
    expect(NOTATION_KEYS.length).toBeGreaterThan(0);
    for (const k of NOTATION_KEYS) {
      expect(MESSAGE_KEYS).toContain(k);
      expect(ja[k]).toBe(en[k]);
      // The key is folded into the compared VALUE rather than into the pattern: jest reads a
      // string argument to toMatch as a substring, and a key containing a dot would then be a
      // regex metacharacter in a pattern nobody meant to write.
      expect(`${k} shaped like notation: ${String(NOTATION_SHAPE.test(en[k]))}`).toBe(
        `${k} shaped like notation: true`,
      );
      expect(en[k].length).toBeLessThanOrEqual(NOTATION_MAX);
    }
  });

  /*
   * The decoy. Without it NOTATION_SHAPE could match anything and every assertion above would
   * still pass [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
   */
  it('DECOY — a prose string cannot pass as notation', () => {
    // 'Not recorded' is the one that matters: it is twelve characters, so the length cap alone
    // admits it, and the FIRST shape written here admitted it too. The decoy is why the rule
    // now allows a space only before a parenthesised qualifier.
    for (const phrase of [
      'Search by name or reading',
      'Not recorded',
      'Colour Atlas',
      'In use today',
    ])
      expect(
        `${phrase}: ${String(NOTATION_SHAPE.test(phrase) && phrase.length <= NOTATION_MAX)}`,
      ).toBe(`${phrase}: false`);

    // And the shape must still ADMIT the real symbols, or it would be passing by rejecting
    // everything [[a-decoy-that-is-not-broken-proves-nothing]].
    for (const symbol of ['CIELAB', 'sRGB', 'OKLCh', 'ΔE00', 'XYZ (D65)'])
      expect(
        `${symbol}: ${String(NOTATION_SHAPE.test(symbol) && symbol.length <= NOTATION_MAX)}`,
      ).toBe(`${symbol}: true`);
  });

  it('contains Japanese script wherever the English is prose', () => {
    // Hiragana, katakana or kanji. Stronger than "not equal to English": it rejects a value
    // someone edited into a near-copy, which `!==` alone would accept.
    const japanese = /[぀-ゟ゠-ヿ一-鿿]/u;
    const exempt = [...IDENTICAL_BY_DESIGN, ...NOTATION_KEYS];
    const prose = MESSAGE_KEYS.filter((k) => !exempt.includes(k));
    expect(prose.length).toBeGreaterThan(0);
    // The key is folded into the compared value so a failure names WHICH entry, since
    // jest's expect takes no message argument.
    for (const k of prose) expect(`${k}: ${ja[k]}`).toMatch(japanese);
  });
});

describe('review status is recorded, and its gap is visible', () => {
  it('reports how many entries are unreviewed rather than implying none are', () => {
    const reviewed = MESSAGE_KEYS.filter((k) => JA_REVIEWED[k] !== undefined);
    const unreviewed = MESSAGE_KEYS.length - reviewed.length;
    // Printed, not asserted to be zero. Asserting zero would mean the mechanism could never
    // ship while OQ-5 is open; asserting nothing would let "unreviewed" become invisible.
    console.log(
      `  ja review: ${String(reviewed.length)}/${String(MESSAGE_KEYS.length)} reviewed, ` +
        `${String(unreviewed)} OUTSTANDING (OQ-5 — no Japanese editorial reviewer engaged yet). ` +
        'F-017 carries this as an attested criterion.',
    );
    expect(reviewed.length + unreviewed).toBe(MESSAGE_KEYS.length);
  });

  it('names a roster id, never a person, for anything that IS reviewed', () => {
    // ADR-0047: editorial identity is a roster id. Vacuous today, and it must not be — so it
    // is asserted over whatever exists rather than over a fixture that will never grow.
    for (const [key, reviewer] of Object.entries(JA_REVIEWED))
      expect(`${key}=${reviewer}`).toMatch(/^[a-zA-Z0-9._]+=[a-z0-9-]+$/u);
  });
});

describe('every declared key is used, and every used key is declared', () => {
  it('has no key nobody renders', () => {
    // An unused key is a string nobody removed — and it is the shape a copy-paste placeholder
    // hides in, because nothing renders it and nobody reads it.
    const unused = MESSAGE_KEYS.filter((k) => !ALL_SOURCE.includes(`'${k}'`));
    expect(unused).toEqual([]);
  });

  it('references no key the catalogue does not declare', () => {
    // The type already prevents this at a call site that goes through `t()`. This catches the
    // other direction: a key written as a bare string somewhere the type cannot see it.
    const referenced = [...ALL_SOURCE.matchAll(/'((?:home|colour|sample)\.[A-Za-z.]+)'/gu)].map(
      (m) => m[1],
    );
    expect(referenced.length).toBeGreaterThan(0);
    for (const key of referenced) expect(MESSAGE_KEYS).toContain(key as MessageKey);
  });
});

describe('locale resolution', () => {
  it('matches on the language subtag, so ja-JP is Japanese', () => {
    // A device set to Japanese must not fall through to English because of a region nobody
    // enumerated. This is the case a naive `LOCALES.includes(tag)` gets wrong.
    expect(resolveLocale(['ja-JP'])).toBe('ja');
    expect(resolveLocale(['en-GB'])).toBe('en');
    expect(resolveLocale(['JA'])).toBe('ja');
  });

  it('takes the first SUPPORTED preference, not the first preference', () => {
    expect(resolveLocale(['fr-FR', 'ja-JP', 'en-US'])).toBe('ja');
  });

  it('defaults to English when nothing supported is requested', () => {
    expect(resolveLocale(['fr-FR'])).toBe('en');
    expect(resolveLocale([])).toBe('en');
    expect(resolveLocale([null, undefined, ''])).toBe('en');
  });

  it('honours an explicit override over the device', () => {
    expect(resolveLocale(['en-US'], 'ja')).toBe('ja');
  });
});

describe('lookup is total', () => {
  it('returns a non-empty string for every key in every locale', () => {
    for (const locale of LOCALES)
      for (const key of MESSAGE_KEYS) expect(t(locale, key).trim().length).toBeGreaterThan(0);
  });
});
