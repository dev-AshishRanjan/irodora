/**
 * The editorial workflow, and the identity rule.
 *
 * The case that matters most is the one a free-text comparison would have passed: two
 * different roster ids naming the same person. If that test ever goes green for the wrong
 * reason, ADR-0047's entire justification is gone.
 */

import { describe, expect, it } from 'vitest';
import {
  assertTransition,
  canTransition,
  checkEditorialIdentity,
  CorpusError,
  ENTRY_STATUSES,
  isEntryStatus,
  isPublishable,
  requiresReviewer,
  type Editor,
  type EntryStatus,
  type Roster,
} from '../src/index.js';

const editors: readonly Editor[] = [
  { id: 'ed-001', displayName: 'Ashish Ranjan', roles: ['author', 'reviewer'], active: true },
  { id: 'ed-002', displayName: 'Mori Keiko', roles: ['author', 'reviewer'], active: true },
  { id: 'ed-003', displayName: 'Tanaka Sho', roles: ['author'], active: true },
  // A SECOND id for the person behind ed-001. This is the decoy: it exists so the
  // same-person test cannot pass by there being nobody to confuse.
  { id: 'ed-004', displayName: 'Ashish Ranjan', roles: ['author', 'reviewer'], active: true },
  { id: 'ed-005', displayName: 'Retired Editor', roles: ['reviewer'], active: false },
];

const roster: Roster = new Map(editors.map((e) => [e.id, e]));

describe('the status set', () => {
  it('is the spec §5 sequence', () => {
    expect(ENTRY_STATUSES).toEqual(['draft', 'review', 'verified', 'published', 'superseded']);
  });

  it('rejects a status outside it', () => {
    expect(isEntryStatus('approved')).toBe(false);
    expect(isEntryStatus('Published')).toBe(false);
  });
});

describe('which statuses owe a reviewer', () => {
  it('requires one from verified onward', () => {
    expect(ENTRY_STATUSES.filter(requiresReviewer)).toEqual([
      'verified',
      'published',
      'superseded',
    ]);
  });

  it('includes superseded deliberately', () => {
    // A superseded entry was published once and is retained so an old recommendation still
    // resolves (FR-10). Dropping the requirement on the way out would make it loadable and
    // unverified, which is the state the workflow exists to prevent.
    expect(requiresReviewer('superseded')).toBe(true);
  });

  it('does not require one for draft or review', () => {
    expect(requiresReviewer('draft')).toBe(false);
    expect(requiresReviewer('review')).toBe(false);
  });
});

describe('what enters a published bundle', () => {
  it('is published and superseded, and nothing else', () => {
    expect(ENTRY_STATUSES.filter(isPublishable)).toEqual(['published', 'superseded']);
  });
});

describe('transitions', () => {
  it('walks the forward path', () => {
    const path: readonly EntryStatus[] = ['draft', 'review', 'verified', 'published', 'superseded'];
    for (let i = 0; i < path.length - 1; i += 1)
      expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
  });

  it('allows a review to send an entry back', () => {
    expect(canTransition('review', 'draft')).toBe(true);
    expect(canTransition('verified', 'review')).toBe(true);
  });

  it('refuses to let a published entry return to any editable state', () => {
    for (const to of ['draft', 'review', 'verified'] as const)
      expect(canTransition('published', to)).toBe(false);
  });

  it('makes superseded terminal, and says a correction is a new version', () => {
    expect(() => {
      assertTransition('superseded', 'published', 'x.json');
    }).toThrow(/terminal.*correction publishes a NEW entry/su);
  });

  it('refuses to skip review', () => {
    expect(canTransition('draft', 'verified')).toBe(false);
    expect(canTransition('draft', 'published')).toBe(false);
  });

  it('names the allowed set when it refuses', () => {
    expect(() => {
      assertTransition('draft', 'published', 'x.json');
    }).toThrow(/Allowed: review/u);
  });
});

describe('author and reviewer must be different identities', () => {
  it('accepts two genuinely different people', () => {
    expect(() => {
      checkEditorialIdentity('ed-001', 'ed-002', 'independent', roster, 'x.json');
    }).not.toThrow();
  });

  it('rejects the same id twice', () => {
    expect(() => {
      checkEditorialIdentity('ed-001', 'ed-001', 'independent', roster, 'x.json');
    }).toThrow(/author and reviewer are the same identity/u);
  });

  it('rejects two ids that are the same person — the case a name comparison would pass', () => {
    // ed-001 and ed-004 are different strings, different ids, and one human being. This is
    // the entire argument for ADR-0047; if it ever stops failing, the id scheme is decorative.
    expect(() => {
      checkEditorialIdentity('ed-001', 'ed-004', 'independent', roster, 'x.json');
    }).toThrow(/different ids for the same person \("Ashish Ranjan"\)/u);
  });

  it('rejects an unknown id rather than treating it as a third person', () => {
    // Failing OPEN here would be the worst outcome available: a typo in verifiedBy would
    // satisfy "the two differ" and launder an unreviewed entry.
    expect(() => {
      checkEditorialIdentity('ed-001', 'ed-999', 'independent', roster, 'x.json');
    }).toThrow(/"ed-999" is not in content\/editors\.json/u);
    expect(() => {
      checkEditorialIdentity('ed-999', 'ed-001', 'independent', roster, 'x.json');
    }).toThrow(/unknown id is a FAILURE/u);
  });

  it('rejects a reviewer who does not hold the reviewer role', () => {
    expect(() => {
      checkEditorialIdentity('ed-001', 'ed-003', 'independent', roster, 'x.json');
    }).toThrow(/does not hold the "reviewer" role/u);
  });

  it('rejects an inactive reviewer', () => {
    expect(() => {
      checkEditorialIdentity('ed-001', 'ed-005', 'independent', roster, 'x.json');
    }).toThrow(/marked inactive/u);
  });

  it('reports every identity failure against a provenance field', () => {
    for (const [author, reviewer] of [
      ['ed-999', 'ed-001'],
      ['ed-001', 'ed-999'],
      ['ed-001', 'ed-001'],
      ['ed-001', 'ed-004'],
      ['ed-001', 'ed-003'],
    ] as const) {
      try {
        checkEditorialIdentity(author, reviewer, 'independent', roster, 'x.json');
        expect.unreachable(`${author}/${reviewer} must be rejected`);
      } catch (error) {
        expect(error).toBeInstanceOf(CorpusError);
        expect((error as CorpusError).path).toMatch(
          /^provenance\.(authoredBy|verifiedBy|reviewIndependence)$/u,
        );
      }
    }
  });
});

describe('self-review is a declaration, and it is checked in both directions (F-084)', () => {
  it('accepts an entry whose author reviewed it, when it says so', () => {
    // The whole point of the feature: with one editor, this must be publishable.
    expect(() => {
      checkEditorialIdentity('ed-001', 'ed-001', 'self', roster, 'x.json');
    }).not.toThrow();
  });

  it('rejects the same id twice when the entry claims an independent review', () => {
    // Unchanged behaviour, and the message now points at the fix rather than just refusing.
    expect(() => {
      checkEditorialIdentity('ed-001', 'ed-001', 'independent', roster, 'x.json');
    }).toThrow(/set provenance\.reviewIndependence to "self"/u);
  });

  it('rejects "self" claimed by two distinct editors', () => {
    // Mislabelling in the GENEROUS direction is still mislabelling: it records a weaker check
    // than the one that happened, and it would let a real review be hidden.
    expect(() => {
      checkEditorialIdentity('ed-001', 'ed-002', 'self', roster, 'x.json');
    }).toThrow(/is "self", but "ed-001" authored and "ed-002" reviewed/u);
  });

  it('does NOT let "self" excuse two ids for one person', () => {
    // ed-004 is a second id for the same human as ed-001. That is a roster defect, and a
    // declaration cannot make it correct — if "self" swallowed this, ADR-0047 would be dead.
    expect(() => {
      checkEditorialIdentity('ed-001', 'ed-004', 'self', roster, 'x.json');
    }).toThrow(/"ed-001" authored and "ed-004" reviewed/u);
  });

  it('still requires the reviewer role and an active identity under "self"', () => {
    // Being your own reviewer does not exempt you from being a reviewer.
    expect(() => {
      checkEditorialIdentity('ed-003', 'ed-003', 'self', roster, 'x.json');
    }).toThrow(/does not hold the "reviewer" role/u);
    expect(() => {
      checkEditorialIdentity('ed-005', 'ed-005', 'self', roster, 'x.json');
    }).toThrow(/marked inactive/u);
  });
});
