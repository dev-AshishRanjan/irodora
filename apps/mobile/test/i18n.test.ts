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
// The engine's own key lists, imported so this test moves when the engine does rather than
// restating a set that would then be two copies of one contract (E-013's shape).
import { MESSAGE_KEYS as SCORE_MESSAGE_KEYS, OUTFIT_MESSAGE_KEYS } from '@irodora/recommendation';

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

/**
 * E-053 — the engine emits keys and holds no catalogue, and nothing checked the other end.
 *
 * `scoreColor` and `scoreOutfit` return `messageKey` strings; rendering them is the app's job
 * (FR-11, ADR-0056). That is the right split, and it means **the engine can name a key this
 * catalogue does not have** — with typecheck green, because a `messageKey` is a `string` on
 * that side of the boundary and only a `MessageKey` on this one.
 *
 * Until F-052 nothing in the app called `scoreColor`, so the gap was invisible rather than
 * absent. It is a gap on both sides and they are recorded differently below, because one is
 * now a contract this app depends on and the other is a surface nobody has built.
 */
describe('the engine cannot emit a key the app is unable to render (E-053)', () => {
  it('has every compatibility explanation key `scoreColor` can produce', () => {
    const missing = SCORE_MESSAGE_KEYS.filter((k) => !(k in en));

    expect(missing).toHaveLength(0);
  });

  /*
   * THE OTHER DIRECTION, and it is what lets the unused-key scan below exclude these safely.
   *
   * These twelve are rendered through a computed lookup — `t(f.messageKey)` — so no source
   * literal exists for the scan to find, and without this assertion an `explain.*` key nobody
   * emits could sit in the catalogue forever, which is exactly the placeholder shape that scan
   * exists to catch.
   */
  it('declares no explanation key the engine does not emit', () => {
    const declared = MESSAGE_KEYS.filter((k) => k.startsWith('explain.'));

    expect([...declared].sort()).toEqual([...SCORE_MESSAGE_KEYS].sort());
  });

  /*
   * THE GAP THAT WAS DECLARED HERE IS CLOSED (F-124).
   *
   * This test used to assert the missing set EXACTLY — all eighteen of `scoreOutfit`'s component
   * keys, absent from both catalogues, with `OutfitBuilder` rendering the raw component name
   * beside each score. It is **deleted rather than shortened**: the assertion below is the same
   * shape as the `scoreColor` one above, and a gap test kept alive with an empty expected set
   * would be a check that passes because it is looking at nothing.
   */
  it('has every outfit-component key `scoreOutfit` can produce', () => {
    const missing = OUTFIT_MESSAGE_KEYS.filter((k) => !(k in en));

    expect(missing).toHaveLength(0);
  });

  /*
   * THE REVERSE, for the same reason the `explain.*` one exists: these are rendered through a
   * computed lookup, so the unused-key scan below cannot see their consumer and has to exclude
   * them. The exclusion is safe ONLY while both directions are pinned.
   *
   * THE SEGMENT COUNT IS THE FILTER, and it has to be. `outfit.title`, `outfit.overall` and
   * fourteen others are ordinary screen copy with TWO dot-segments; the engine's have THREE.
   * A `startsWith('outfit.')` here would demand the engine emit `outfit.title`.
   */
  it('declares no outfit-component key the engine does not emit', () => {
    const declared = MESSAGE_KEYS.filter(
      (k) => k.startsWith('outfit.') && k.split('.').length === 3,
    );

    expect([...declared].sort()).toEqual([...OUTFIT_MESSAGE_KEYS].sort());
  });

  it('DECOY — the segment-count partition has both sides, so the filter is not matching nothing', () => {
    // Without this, a filter that matched NOTHING would satisfy the assertion above the day
    // the engine stopped emitting keys, and a filter that matched EVERY outfit key would be
    // caught only by accident.
    const outfitKeys = MESSAGE_KEYS.filter((k) => k.startsWith('outfit.'));
    const screenCopy = outfitKeys.filter((k) => k.split('.').length === 2);
    const engineKeys = outfitKeys.filter((k) => k.split('.').length === 3);

    expect(screenCopy.length).toBeGreaterThan(0);
    expect(engineKeys.length).toBeGreaterThan(0);
    expect(screenCopy.length + engineKeys.length).toBe(outfitKeys.length);
  });

  it('DECOY — the check can fail, and it is the membership that decides', () => {
    // Without this, both assertions above would pass against a `k in en` that was always true.
    expect('explain.temperature.supports' in en).toBe(true);
    expect('explain.temperature.nonsense' in en).toBe(false);
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
    //
    // ENGINE-EMITTED KEYS ARE EXCLUDED, AND NOT AS A FAVOUR (F-052). `scoreColor` returns a
    // `messageKey` and the screen renders `t(f.messageKey)`, so the literal never appears in
    // source and this scan — which is a source-literal scan — cannot see the consumer. The
    // exclusion is safe only because the set is pinned in BOTH directions above: the engine
    // emits no key the catalogue lacks, and the catalogue declares no `explain.*` the engine
    // does not emit. Nothing can hide in the gap.
    // F-124 added the outfit component keys to this set for the same reason and under the
    // same protection: `t(c.messageKey)` in OutfitBuilder, pinned in both directions above.
    const dynamic = new Set<string>([...SCORE_MESSAGE_KEYS, ...OUTFIT_MESSAGE_KEYS]);
    const unused = MESSAGE_KEYS.filter((k) => !dynamic.has(k) && !ALL_SOURCE.includes(`'${k}'`));
    expect(unused).toHaveLength(0);
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
