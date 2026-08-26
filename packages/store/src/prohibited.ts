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
    stems: ['skin'],
    pattern: /\bskin\w*\b/i,
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
