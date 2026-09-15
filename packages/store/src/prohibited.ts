/**
 * The columns that may never exist, and the check that refuses a database carrying one.
 *
 * > *No dermatological claim, no ethnic or racial classification, no attractiveness or body
 * > judgement. Absent from the data model and the copy; a schema check prevents such a field
 * > from being added.* — **NFR-22**
 *
 * [ADR-0010](../../../docs/adr/0010-personal-colour-is-a-profile-not-a-skin-rgb.md) §1 makes
 * this a test rather than a policy note, and the reason is the one the ADR gives: *"a skin
 * colour field is one product meeting away from ethnicity inference, and a database column is
 * a standing invitation."* A guideline is re-litigated. A migration that will not apply is not.
 *
 * ## Why it reads the SQL and the live schema, not one or the other
 *
 * `MIGRATIONS` is what this build would apply — checking it catches the column while it is
 * still a diff somebody can reject. `sqlite_master` is what the database in front of us
 * actually has, which is the only thing that catches a column that arrived some other way: a
 * fork, a hand-run `ALTER TABLE`, or a build older than this rule.
 *
 * Checking only the first would be checking our own intentions. Checking only the second would
 * pass every code review and fail on a device.
 *
 * ## Comments are stripped before anything is matched
 *
 * The migration SQL in this repository is heavily commented, and the comments discuss exactly
 * the concepts named here — this file's own header would trip a naive scan. So `sqlCode`
 * removes `--` lines and `/* … *\/` blocks first, and what is matched afterwards is code.
 *
 * That is a deliberate trade: a prose mention is not a data field, and a check that fired on
 * prose would be deleted within a release for crying wolf, which is the outcome
 * [[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]] warns about — a rule nobody
 * can live with stops being enforcement and becomes configuration that parses.
 */

import { StoreError } from './repository.js';

/**
 * One prohibited family of identifiers, and the NFR-22 clause it belongs to.
 *
 * Prefix-shaped rather than an exact list: `skin_color`, `skin_colour`, `skin_rgb`,
 * `skin_tone` and `skintone` are the same field wearing five names, and enumerating them
 * invites a sixth. `\w*` after the stem covers the family; the word boundary before it is what
 * keeps `bracelet` out of the `race` pattern and `foreskin`-shaped accidents out of `skin`.
 */
export interface ProhibitedIdentifier {
  readonly id: string;
  /** For SQL, where an identifier is snake_case and sits between word boundaries. */
  readonly pattern: RegExp;
  /**
   * For SOURCE, where an identifier is camelCase and the banned word is often neither at the
   * start nor at a word boundary.
   *
   * `scripts/verify-no-inference.mjs` splits an identifier into words — `inferEthnicity` into
   * `infer` + `ethnicity`, `ageBand` into `age` + `band` — and matches each word against
   * these stems by prefix. **The tokenisation is what makes prefix matching safe**: `average`,
   * `percentage`, `storage`, `language` and `usage` are each ONE word, and none of them
   * begins with "age".
   *
   * Two representations of one vocabulary rather than two vocabularies. The regex could not do
   * the source job — `ethnic` does not match inside `inferEthnicity`, and `ages?` does
   * not match `ageBand` — and the proof found both.
   */
  readonly stems: readonly string[];
  /** Why the product refuses it, in the words of the requirement rather than a scold. */
  readonly why: string;
}

export const PROHIBITED_IDENTIFIERS: readonly ProhibitedIdentifier[] = [
  {
    id: 'skin',
    // `undertone` and the two base words are the personal-colour trade's names for a skin undertone
    // — イエベ and ブルベ, in English (F-223). No identifier in this repository uses them, so the
    // source scan pays nothing for them, and the copy check that found the gap closes it.
    stems: ['skin', 'undertone', 'yellow base', 'blue base'],
    pattern: /\bskin\w*\b|\bundertone\w*\b|\byellow_base\w*\b|\bblue_base\w*\b/i,
    why:
      'A profile is a set of ranges, never a skin value (FR-30, ADR-0010). Skin is not one ' +
      'colour, a camera measures the light as much as the person, and the column is the input ' +
      'an ethnicity inference would need.',
  },
  {
    id: 'complexion',
    stems: ['complexion'],
    pattern: /\bcomplexions?\b/i,
    why: 'A dermatological claim by another name. NFR-22 puts it outside the product.',
  },
  {
    id: 'ethnicity',
    stems: ['ethnic'],
    pattern: /\bethnic\w*\b/i,
    why: 'NFR-22: no ethnic classification. There is no version of this field that is fine.',
  },
  {
    /*
     * The trailing `\w*` is not decoration, and the decoy is what put it there: `\brac(e|ial)\b`
     * catches `race` and MISSES `racial_group`, because `_` is a word character and there is
     * no boundary before it. A rule that refuses the obvious name and accepts the one somebody
     * would actually type is worse than no rule — it reads as coverage.
     *
     * The leading boundary is what keeps `bracelet` and `grace` out.
     */
    id: 'race',
    stems: ['race', 'racial'],
    pattern: /\brac(e|ial)\w*\b/i,
    why: 'NFR-22: no racial classification.',
  },
  {
    id: 'attractiveness',
    stems: ['attractive', 'beauty'],
    pattern: /\battractive\w*\b|\bbeauty\w*\b/i,
    why: 'NFR-22: no attractiveness judgement. The product says what suits, not who is pretty.',
  },
  {
    id: 'body',
    // MULTI-WORD for source, and the scan found out why: `body` alone is an ordinary word in a
    // codebase — a markdown body, an HTTP body, a function body — and `verify-state.mjs` has
    // both. The characteristic is always a compound. Same reasoning as `body_` in the SQL
    // pattern, expressed the way a tokenised identifier needs it.
    stems: ['body shape', 'body type', 'body fat', 'body mass', 'bmi'],
    pattern: /\bbody_\w+\b|\bbmi\b/i,
    why:
      'NFR-22: no body judgement. `body_` is prefixed on purpose so `weight` survives — it ' +
      'is a palette member’s rank weight and has nothing to do with a person.',
  },
  {
    /*
     * AGE IS THE ONE THAT NEEDS CARE, and it is why every rule here is anchored rather than a
     * substring search. `average`, `image`, `storage`, `language`, `usage`, `percentage` and
     * `manage` all contain "age"; every one of them is planted as a decoy in the test, so this
     * rule is watched NOT firing as carefully as it is watched firing.
     *
     * A rule that flagged `percentage` would be removed within a day, and the removal would
     * take the real protection with it.
     */
    id: 'age',
    stems: ['age', 'birth', 'dob'],
    pattern: /\bages?\b|\bage_\w+\b|\bbirth\w*\b|\bdate_of_birth\b|\bdob\b/i,
    why:
      'NFR-22 is written about dermatological, ethnic and body judgements, and F-037 names age ' +
      'alongside them for the same reason: it is a protected characteristic, it is what an ' +
      'inference would be built on, and the product has no use for it. What colour suits ' +
      'somebody is not a function of how old they are.',
  },
  {
    /*
     * `diagnosis`/`diagnoses`, NOT `diagnos\w*`.
     *
     * The first draft used the wider stem and the source scan immediately found two honest uses
     * of the ORDINARY engineering sense: `verify-guards.mjs` has a `diagnose()` helper that
     * explains why a guard could not run, and a test named a regex `DIAGNOSES`. Neither is a
     * medical claim, and a rule that refused them would have been narrowed by whoever hit it
     * next — probably by deleting the family.
     *
     * The noun is what a FIELD is called. The verb is what engineers do to bugs.
     */
    id: 'health',
    stems: ['health', 'medical', 'diagnosis', 'diagnoses', 'pregnan', 'disabilit'],
    pattern: /\bhealth\w*\b|\bmedical\w*\b|\bdiagnos[ei]s\b|\bpregnan\w*\b|\bdisabilit\w*\b/i,
    why:
      'NFR-22: no dermatological or medical claim, and regulated territory the product has no ' +
      'business entering (PRD section 9). A health column is the field a claim would be built ' +
      'on, and the surest way not to make one is to have nowhere to put it.',
  },
];

/** A hit: which rule, what it matched, and where. */
export interface ProhibitedFinding {
  readonly id: string;
  readonly match: string;
  readonly where: string;
  readonly why: string;
}

/**
 * SQL with its comments removed.
 *
 * Exported because the stripping is the part most likely to be wrong, and a helper that can
 * only be exercised through the thing it feeds is a helper nobody tests directly.
 */
export function sqlCode(sql: string): string {
  return sql.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\n]*/g, ' ');
}

/** Every prohibited identifier in one piece of SQL. Empty means clean. */
export function findProhibited(sql: string, where: string): readonly ProhibitedFinding[] {
  const code = sqlCode(sql);
  const findings: ProhibitedFinding[] = [];
  for (const rule of PROHIBITED_IDENTIFIERS) {
    const found = rule.pattern.exec(code);
    if (found !== null) findings.push({ id: rule.id, match: found[0], where, why: rule.why });
  }
  return findings;
}

/**
 * Refuse a migration ladder that would add a prohibited column.
 *
 * Throws rather than returning a report: a caller that has to remember to look at a result is
 * a caller that will eventually not, and this is the one check in the package whose whole
 * value is that it cannot be skipped past.
 */
export function assertMigrationsClean(
  migrations: readonly { readonly version: number; readonly up: string }[],
): void {
  const findings = migrations.flatMap((m) =>
    findProhibited(m.up, `migration ${String(m.version)}`),
  );
  if (findings.length > 0) throw prohibitedError(findings);
}

/** The message. One line per finding, each naming the requirement rather than just refusing. */
export function prohibitedError(findings: readonly ProhibitedFinding[]): StoreError {
  const lines = findings.map((f) => `  ${f.where}: "${f.match}" (${f.id}) — ${f.why}`);
  return new StoreError(
    `NFR-22: ${String(findings.length)} prohibited identifier(s) in the data model.\n` +
      `${lines.join('\n')}\n` +
      'This is not a lint rule to satisfy — the field is outside the product ' +
      '(ADR-0010). If a dimension needs somewhere to live, it is a RANGE with a confidence ' +
      'on personal_color_profile, and that table already exists.',
  );
}

/**
 * NFR-22's Japanese copy terms (F-223) — the words a Japanese rendering of a personal-colour label
 * reaches for that name a person rather than their ranges.
 *
 * **Substrings, not stems.** Japanese has no word boundaries to tokenise on, and every term here
 * is a whole morpheme that carries its meaning in any compound: 肌 is skin in 肌色, 美肌 and 肌映え
 * alike. The list is deliberately short and literal — the gate refuses these and cannot know a
 * word nobody listed, which is why a competent Japanese reader's review stays an outstanding
 * attested criterion (F-223, OQ-5's standing gap).
 *
 * **Matched after normalising**, because one word has many spellings: half-width ｲｴﾍﾞ, a middle dot
 * in イエロー・ベース, a space in ブルー ベース, hiragana いえべ. The terms are written normalised —
 * full-width katakana, no separators — and the copy is brought to that form before it is searched.
 */
export const PROHIBITED_COPY_JA: readonly {
  readonly term: string;
  readonly id: string;
  readonly why: string;
}[] = [
  {
    term: 'イエベ',
    id: 'skin',
    why: '"Yellow base": the personal-colour trade\'s name for a skin undertone (ADR-0010, ADR-0102).',
  },
  {
    term: 'ブルベ',
    id: 'skin',
    why: '"Blue base": the same undertone classification, the other pole.',
  },
  { term: 'イエローベース', id: 'skin', why: 'The long form of イエベ — a skin undertone.' },
  { term: 'ブルーベース', id: 'skin', why: 'The long form of ブルベ — a skin undertone.' },
  { term: 'スキントーン', id: 'skin', why: 'Skin tone, transliterated.' },
  {
    term: 'アンダートーン',
    id: 'skin',
    why: "Undertone, transliterated — the trade's word for a skin undertone.",
  },
  { term: '色白', id: 'skin', why: "Fair-skinned — a judgement about a person's skin." },
  { term: '地黒', id: 'skin', why: 'Dark-skinned — the same judgement, the other way.' },
  {
    term: '肌',
    id: 'skin',
    why: 'Skin, in any compound (肌色, 美肌, 肌映え). A profile is ranges, never a skin value.',
  },
  {
    term: '顔色',
    id: 'complexion',
    why: 'Complexion — a dermatological judgement by another name.',
  },
  { term: '人種', id: 'race', why: 'NFR-22: no racial classification.' },
  { term: '民族', id: 'ethnicity', why: 'NFR-22: no ethnic classification.' },
  {
    term: '美人',
    id: 'attractiveness',
    why: 'NFR-22: the product says what suits, not who is pretty.',
  },
  { term: '体型', id: 'body', why: 'NFR-22: no body judgement.' },
  { term: '体重', id: 'body', why: 'Body weight — NFR-22: no body judgement.' },
  { term: '年齢', id: 'age', why: 'A protected characteristic the product has no use for.' },
];

/**
 * The words of a piece of copy, the way `scripts/verify-no-inference.mjs` splits an identifier:
 * `Fair-Skinned` → `fair`, `skinned`. Tokenising first is what keeps `vintage` clear of the `age`
 * stem while `ageing` is caught.
 */
export function copyWords(text: string): readonly string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[^A-Za-z0-9]+/)
    .filter((w) => w.length > 0)
    .map((w) => w.toLowerCase());
}

/**
 * Whether a stem occurs among copy's words. One word matches a word by prefix (`skinned`); several
 * must be a run of whole words with only the last by prefix (`body types`) — so `somebody types` and
 * `nobody fatigue` are not `body type` and `body fat`, which searching the joined phrase said they
 * were (F-223's review).
 */
function stemIn(stem: string, tokens: readonly string[]): boolean {
  const parts = stem.split(' ');
  const last = parts.length - 1;
  for (let i = 0; i + last < tokens.length; i += 1)
    if (
      parts.every((part, j) => {
        const token = tokens[i + j];
        return token !== undefined && (j === last ? token.startsWith(part) : token === part);
      })
    )
      return true;
  return false;
}

/** Japanese copy in the form the terms are written: NFKC, no spaces or middle dots, katakana. */
function normaliseJa(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\s・]/gu, '')
    .replace(/[ぁ-ゖ]/gu, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

/**
 * Every NFR-22 word in a piece of copy — English by the identifier stems above, Japanese by the
 * terms in `PROHIBITED_COPY_JA`. Empty means clean. One vocabulary, applied to prose.
 *
 * **It fails closed.** A one-word stem matches by prefix, as the identifier scan does, so `Agenda`
 * and `Racer` are refused under `age` and `race`. For copy that could name a person that is the
 * direction to be wrong in: a refused word is reworded by whoever wrote it, and a missed one ships.
 */
export function findProhibitedCopy(text: string, where: string): readonly ProhibitedFinding[] {
  const tokens = copyWords(text.normalize('NFKC'));
  const findings: ProhibitedFinding[] = [];
  for (const rule of PROHIBITED_IDENTIFIERS) {
    const stem = rule.stems.find((s) => stemIn(s, tokens));
    if (stem !== undefined) findings.push({ id: rule.id, match: stem, where, why: rule.why });
  }
  const ja = normaliseJa(text);
  for (const entry of PROHIBITED_COPY_JA)
    if (ja.includes(entry.term))
      findings.push({ id: entry.id, match: entry.term, where, why: entry.why });
  return findings;
}
