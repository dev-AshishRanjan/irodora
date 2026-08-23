/**
 * The editorial workflow, and the identity rule that makes review mean something.
 *
 * ```
 * draft ──→ review ──→ verified ──→ published ──→ superseded
 *   │         │           │             │
 * author   a DIFFERENT  provenance   immutable
 *          reviewer     complete
 * ```
 *
 * ## Why identity is a roster id and not a name
 *
 * The rule is "author and reviewer must be different identities" (FR-68, spec §5). Compared
 * as free text, `"A. Ranjan"` and `"Ashish Ranjan"` are different strings and the same
 * person — so the check passes and nobody reviewed anything. A check that can be satisfied
 * by a typo is a check pretending to work.
 *
 * So both fields are ids into `content/editors.json`, resolved against the roster, and an
 * unknown id is a failure rather than an unrecognised-therefore-different pass
 * (ADR-0047).
 *
 * **What this proves and what it does not.** It proves two distinct roster identities are
 * recorded. It does not prove a person read the entry — F-012 carries that as an attested
 * obligation, and nothing here discharges it.
 */

import { CorpusError } from './errors.js';
import type { ReviewIndependence } from './provenance.js';

/** Spec §5. Order matters: it is the permitted forward path. */
export const ENTRY_STATUSES = ['draft', 'review', 'verified', 'published', 'superseded'] as const;

export type EntryStatus = (typeof ENTRY_STATUSES)[number];

export function isEntryStatus(v: unknown): v is EntryStatus {
  return typeof v === 'string' && (ENTRY_STATUSES as readonly string[]).includes(v);
}

/**
 * The statuses at which provenance must be complete and a reviewer recorded.
 *
 * `superseded` is included, and that is deliberate rather than an oversight: a superseded
 * entry was published once, it is retained so an old recommendation still resolves (FR-10),
 * and it must not become loadable-but-unverified on the way out.
 */
const REVIEWED_STATUSES = [
  'verified',
  'published',
  'superseded',
] as const satisfies readonly EntryStatus[];

export function requiresReviewer(status: EntryStatus): boolean {
  return (REVIEWED_STATUSES as readonly EntryStatus[]).includes(status);
}

/** Statuses whose entries are included in a published version bundle. */
export function isPublishable(status: EntryStatus): boolean {
  return status === 'published' || status === 'superseded';
}

/** The only transitions the workflow allows. A correction is a new version, not an edit. */
const TRANSITIONS: Readonly<Record<EntryStatus, readonly EntryStatus[]>> = {
  draft: ['review'],
  // Back to draft is legal and is the normal outcome of a review that found something.
  review: ['draft', 'verified'],
  verified: ['review', 'published'],
  // Nothing leaves `published` except being superseded. Spec §5: immutable from this point.
  published: ['superseded'],
  superseded: [],
};

export function canTransition(from: EntryStatus, to: EntryStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function assertTransition(from: EntryStatus, to: EntryStatus, source: string): void {
  if (canTransition(from, to)) return;
  const allowed = TRANSITIONS[from];
  throw new CorpusError(
    source,
    'status',
    allowed.length === 0
      ? `"${from}" is terminal; it has no onward transition. A correction publishes a NEW ` +
          'entry in a new corpus version — a published entry is never edited (FR-10).'
      : `"${from}" cannot become "${to}". Allowed: ${allowed.join(', ')}.`,
  );
}

/** One editor in `content/editors.json`. */
export interface Editor {
  readonly id: string;
  readonly displayName: string;
  readonly roles: readonly EditorRole[];
  readonly active: boolean;
}

export const EDITOR_ROLES = ['author', 'reviewer'] as const;
export type EditorRole = (typeof EDITOR_ROLES)[number];

export type Roster = ReadonlyMap<string, Editor>;

/**
 * Parse `content/editors.json`.
 *
 * Two ids for one person is a legitimate state — someone can have a second account — so it is
 * NOT rejected here. It is caught at the point it matters, in `checkEditorialIdentity`, where
 * the question is whether *this* author and *this* reviewer are the same human. Rejecting it
 * at load would also make the roster impossible to write a test fixture for.
 */
export function parseRoster(value: unknown, source: string): Roster {
  if (!Array.isArray(value))
    throw new CorpusError(source, '(root)', 'expected an array of editors');

  const roster = new Map<string, Editor>();
  for (const [i, raw] of value.entries()) {
    const path = `[${String(i)}]`;
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
      throw new CorpusError(source, path, 'expected an object');
    const o = raw as Record<string, unknown>;

    const id: unknown = o['id'];
    if (typeof id !== 'string' || !/^ed-\d{3,}$/u.test(id))
      throw new CorpusError(
        source,
        `${path}.id`,
        `expected an id of the form "ed-001"; got ${JSON.stringify(id)}`,
      );

    const displayName: unknown = o['displayName'];
    if (typeof displayName !== 'string' || displayName.trim().length === 0)
      throw new CorpusError(source, `${path}.displayName`, 'expected a non-empty string');

    const roles: unknown = o['roles'];
    if (!Array.isArray(roles) || roles.length === 0)
      throw new CorpusError(source, `${path}.roles`, 'expected a non-empty array of roles');
    for (const role of roles)
      if (typeof role !== 'string' || !(EDITOR_ROLES as readonly string[]).includes(role))
        throw new CorpusError(
          source,
          `${path}.roles`,
          `expected roles from ${EDITOR_ROLES.join(', ')}; got ${JSON.stringify(role)}`,
        );

    const active: unknown = o['active'];
    if (typeof active !== 'boolean')
      throw new CorpusError(source, `${path}.active`, 'expected a boolean');

    if (roster.has(id)) throw new CorpusError(source, `${path}.id`, `"${id}" appears twice`);

    roster.set(id, {
      id,
      displayName,
      roles: roles as readonly EditorRole[],
      active,
    });
  }

  return roster;
}

/**
 * The identity check, in full.
 *
 * Six failures, each with its own message, because they are six different things having gone
 * wrong and an editor needs to know which:
 *
 *   1. an id that is not in the roster — the check cannot run, so it fails;
 *   2. the same id twice **without declaring it** — the rule everyone expects;
 *   3. two ids naming the same person — the rule the id scheme exists for;
 *   4. `reviewIndependence: "self"` with two distinct editors — the same mislabelling in the
 *      generous direction, which understates a review that actually happened;
 *   5. a reviewer who does not hold the `reviewer` role;
 *   6. a reviewer marked inactive.
 *
 * **`self` narrows what is checked; it does not switch the check off** (F-084, ADR-0060).
 * Case 3 in particular is NOT covered by it: two ids for one person is a roster defect, and a
 * declaration cannot make it correct.
 */
export function checkEditorialIdentity(
  authoredBy: string,
  verifiedBy: string,
  independence: ReviewIndependence,
  roster: Roster,
  source: string,
): void {
  const author = roster.get(authoredBy);
  if (author === undefined)
    throw new CorpusError(
      source,
      'provenance.authoredBy',
      `"${authoredBy}" is not in content/editors.json. An unknown id is a FAILURE rather ` +
        'than an unrecognised-therefore-different pass — otherwise a typo satisfies the ' +
        'author-and-reviewer rule by accident.',
    );

  const reviewer = roster.get(verifiedBy);
  if (reviewer === undefined)
    throw new CorpusError(
      source,
      'provenance.verifiedBy',
      `"${verifiedBy}" is not in content/editors.json.`,
    );

  // `self` is a DECLARATION, not an escape hatch (F-084, ADR-0060). It is checked in both
  // directions: an entry that declares it must actually be self-reviewed, and an entry that
  // does not declare it must actually be independently reviewed. Mislabelling in the generous
  // direction — two real editors recorded as `self` — is still mislabelling, and it would
  // understate a review that genuinely happened.
  if (independence === 'self') {
    if (author.id !== reviewer.id)
      throw new CorpusError(
        source,
        'provenance.reviewIndependence',
        `is "self", but "${author.id}" authored and "${reviewer.id}" reviewed. A self-reviewed ` +
          'entry is one the author checked; recording two distinct editors as self-review ' +
          'describes a weaker check than the one performed.',
      );
  } else {
    if (author.id === reviewer.id)
      throw new CorpusError(
        source,
        'provenance.verifiedBy',
        `author and reviewer are the same identity ("${author.id}"). The reviewer checks ` +
          'provenance, derivation, translation and classification; reviewing your own entry ' +
          'checks none of them (FR-68). If that is what happened, say so: set ' +
          'provenance.reviewIndependence to "self" rather than leaving the entry claiming an ' +
          'independent review (ADR-0060).',
      );

    if (author.displayName === reviewer.displayName)
      throw new CorpusError(
        source,
        'provenance.verifiedBy',
        `"${author.id}" and "${reviewer.id}" are different ids for the same person ` +
          `("${author.displayName}"). This is exactly the case a free-text comparison would ` +
          'have passed, and it is why identity is a roster id (ADR-0047). Note that "self" ' +
          'does NOT cover this: two ids for one person is a roster defect, not a declaration.',
      );
  }

  if (!reviewer.roles.includes('reviewer'))
    throw new CorpusError(
      source,
      'provenance.verifiedBy',
      `"${reviewer.id}" does not hold the "reviewer" role in content/editors.json.`,
    );

  if (!reviewer.active)
    throw new CorpusError(
      source,
      'provenance.verifiedBy',
      `"${reviewer.id}" is marked inactive in content/editors.json.`,
    );
}
