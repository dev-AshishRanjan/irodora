/**
 * The palette draft, and the criterion that makes it a palette rather than a colour list.
 *
 * > *Palettes validate against the same schema as corpus palettes.* — FR-49
 *
 * Every assertion about validity here goes through `validateDraft`, which calls `parsePalette`
 * — the same function `content/palettes/*.json` goes through. What is being proven is not that
 * the schema works; `packages/corpus` proves that. It is that **this module's output reaches
 * it in a shape it accepts**, and that the drafts a person can actually produce are the ones
 * the schema has an opinion about.
 *
 * Nothing here renders anything. A rule that can only be reached by rendering a screen is a
 * rule no test can state plainly.
 */

import { CorpusError, parsePalette } from '@irodora/corpus';
import {
  addMember,
  deriveWeights,
  draftProblem,
  draftFrom,
  EMPTY_DRAFT,
  moveMember,
  removeMember,
  rename,
  setRole,
  toCorpusRecord,
  toStoreWrite,
  validateDraft,
  type PaletteDraft,
} from '../src/palette';
import { allEntries, CORPUS_LABEL, entryBySlug } from '../src/corpus';

/** Real slugs from the pinned bundle. A draft may only hold published entries. */
const [A, B, C] = allEntries().map((e) => e.entry.slug);

const CONTEXT = { id: '0198e2f1-4c3a-7b21-9d54-6e0a1b2c3d4e', today: '2026-08-25' } as const;

/** A draft that is valid: a name, three members, and one of them the anchor. */
const valid = (): PaletteDraft =>
  rename(addMember(addMember(addMember(EMPTY_DRAFT, A!), B!), C!), 'Evening walk');

describe('the draft holds what the person chose', () => {
  it('makes the FIRST member the anchor, so a new draft is never born invalid', () => {
    // A Studio whose first action produces an unsaveable draft teaches that the schema is an
    // obstacle. The person can change it afterwards; they cannot start out wrong.
    const one = addMember(EMPTY_DRAFT, A!);
    expect(one.members.map((m) => m.role)).toEqual(['anchor']);
    expect(addMember(one, B!).members.map((m) => m.role)).toEqual(['anchor', 'neutral']);
  });

  it('refuses the same colour twice', () => {
    const twice = addMember(addMember(EMPTY_DRAFT, A!), A!);
    expect(twice.members).toHaveLength(1);
  });

  it('renumbers on remove, so the ranks stay contiguous', () => {
    const after = removeMember(valid(), B!);
    // Asserted through the SCHEMA rather than by reading ranks: a gap is what the schema
    // rejects, and checking it here would be a second copy of that rule.
    expect(() => validateDraft(rename(after, 'Two left'), CONTEXT)).not.toThrow();
    expect(after.members.map((m) => m.slug)).toEqual([A, C]);
  });

  it('moves a member one place', () => {
    expect(moveMember(valid(), C!, -1).members.map((m) => m.slug)).toEqual([A, C, B]);
    expect(moveMember(valid(), A!, 1).members.map((m) => m.slug)).toEqual([B, A, C]);
  });

  /*
   * A move at the end is a NO-OP, not a wrap. Wrapping is what a modulo produces and it is
   * never what anybody wants — pressing "up" on the first member and watching it appear at the
   * bottom is a reordering the person did not ask for.
   */
  it('does nothing at either end rather than wrapping', () => {
    expect(moveMember(valid(), A!, -1).members.map((m) => m.slug)).toEqual([A, B, C]);
    expect(moveMember(valid(), C!, 1).members.map((m) => m.slug)).toEqual([A, B, C]);
  });

  it('changes a role without moving anything', () => {
    const after = setRole(valid(), C!, 'accent');
    expect(after.members.map((m) => m.role)).toEqual(['anchor', 'neutral', 'accent']);
    expect(after.members.map((m) => m.slug)).toEqual([A, B, C]);
  });

  it('round-trips through draftFrom, so a saved palette can be reopened', () => {
    const original = setRole(valid(), B!, 'light');
    const reopened = draftFrom(original.members, original.name);
    expect(reopened).toEqual(original);
  });
});

describe('the weight ladder', () => {
  /*
   * A PROPERTY test rather than a table of expected numbers. The schema's requirement is
   * `(0, 1]` for every member of any palette, and a table would only ever check the lengths
   * somebody thought to write down.
   */
  it('stays inside (0, 1] and never increases, at every length', () => {
    for (let n = 1; n <= 50; n += 1) {
      const w = deriveWeights(n);
      expect(w).toHaveLength(n);
      expect(w[0]).toBe(1);
      for (const value of w) {
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThanOrEqual(1);
      }
      for (let i = 1; i < n; i += 1) expect(w[i]!).toBeLessThanOrEqual(w[i - 1]!);
    }
  });

  it('descends from 1 to the floor rather than to nothing', () => {
    // A zero weight is a colour that is in the palette and contributes nothing, which the
    // schema rejects by name. The floor is what keeps a long palette away from it.
    expect(deriveWeights(7)).toEqual([1, 0.9, 0.84, 0.78, 0.72, 0.66, 0.6]);
    expect(deriveWeights(2)).toEqual([1, 0.9]);
    expect(deriveWeights(1)).toEqual([1]);
    expect(deriveWeights(30).at(-1)).toBe(0.6);
  });

  it('is empty for an empty palette rather than throwing', () => {
    expect(deriveWeights(0)).toEqual([]);
  });
});

describe('a draft is validated by the CORPUS schema (FR-49)', () => {
  it('DECOY — a well-formed draft parses', () => {
    // Without this, every "throws" assertion below is equally true of a function that always
    // throws [[a-negative-test-needs-a-decoy-not-an-empty-fixture]].
    const parsed = validateDraft(valid(), CONTEXT);
    expect(parsed.slug).toBe(CONTEXT.id);
    expect(parsed.colors).toHaveLength(3);
    expect(draftProblem(valid(), CONTEXT)).toBeNull();
  });

  it.each([
    ['an empty palette', () => rename(EMPTY_DRAFT, 'Nothing in it'), /no colours/u, 'empty'],
    ['no anchor', () => setRole(valid(), A!, 'neutral'), /role "anchor"/u, 'noAnchor' as const],
    ['no name', () => rename(valid(), '   '), /name\.en/u, 'noName' as const],
  ])('rejects %s, with the schema’s own message', (_what, make, message, problem) => {
    const draft = make();
    expect(() => validateDraft(draft, CONTEXT)).toThrow(CorpusError);
    expect(() => validateDraft(draft, CONTEXT)).toThrow(message);
    expect(draftProblem(draft, CONTEXT)).toBe(problem);
  });

  /*
   * The rank rule, attacked at the record rather than through the draft.
   *
   * `toCorpusRecord` numbers ranks by position, so a draft cannot produce a gap — which is
   * exactly why this mutates the OUTPUT. The assertion is that the schema is still the thing
   * standing between a bad record and a saved palette, not that the numbering happens to be
   * right today.
   */
  it('rejects a rank gap, which is what a bad renumber produces', () => {
    const record = toCorpusRecord(valid(), CONTEXT) as { colors: { rank: number }[] };
    // The unmutated record parses — the baseline, without which the mutation below proves
    // nothing [[a-decoy-that-is-not-broken-proves-nothing]].
    expect(() => parsePalette(record, 'palette studio')).not.toThrow();

    record.colors[2]!.rank = 5;
    expect(() => parsePalette(record, 'palette studio')).toThrow(/ranks are/u);
  });
});

describe('what a device-built palette says about itself', () => {
  const record = (): Record<string, unknown> =>
    toCorpusRecord(valid(), CONTEXT) as Record<string, unknown>;

  it('is our own curation, never a claim about the received canon', () => {
    // `checkClassification` refuses anything outside OUR_OWN_CURATION for an editorial
    // source. That the field is `editorial` is asserted; that its LABEL is never shown for a
    // user's palette is asserted on the screen, because they are two different claims.
    expect(record()['classification']).toBe('editorial');
    expect(validateDraft(valid(), CONTEXT).provenance.sourceType).toBe('editorial');
  });

  it('carries the reserved device identities, not a register row or a roster editor', () => {
    const p = validateDraft(valid(), CONTEXT).provenance;
    expect(p.sourceId).toBe('USER-LOCAL');
    expect(p.authoredBy).toBe('user-local');
  });

  it('records NO reviewer, because nobody reviewed it', () => {
    const parsed = validateDraft(valid(), CONTEXT);
    expect(parsed.status).toBe('draft');
    expect(parsed.provenance.verifiedBy).toBeNull();
    expect(parsed.provenance.verifiedAt).toBeNull();
    // The schema enforces this pairing: a reviewer on an unreviewed record is the claim the
    // workflow exists to prevent, so `status: "draft"` and a named reviewer cannot coexist.
    expect(parsed.provenance.reviewIndependence).toBeNull();
  });

  it('records the corpus version it was built against', () => {
    expect(validateDraft(valid(), CONTEXT).versionId).toBe(CORPUS_LABEL);
  });

  it('gives the same name in both languages, because user content is not translated', () => {
    const parsed = validateDraft(valid(), CONTEXT);
    expect(parsed.name.en).toBe('Evening walk');
    expect(parsed.name.ja).toBe(parsed.name.en);
  });

  it('states every null with a reason rather than leaving a blank (FR-21)', () => {
    const parsed = validateDraft(valid(), CONTEXT);
    // `checkUnknowns` already fails on a null with no reason AND on a reason for a value that
    // is not null, so reaching here means the pairing is exact. This asserts the reasons are
    // about a device rather than copied from a corpus entry.
    for (const reason of Object.values(parsed.unknowns)) expect(reason).not.toBe('');
    expect(parsed.unknowns['provenance.publisher']).toContain('device');
  });
});

describe('the store write takes its colours from the verified bundle', () => {
  let counter = 0;
  const ids = (): string => `id-${String(counter++)}`;

  it('copies the PUBLISHED values, recomputing nothing', () => {
    const write = toStoreWrite(valid(), CONTEXT, ids);
    expect(write.members).toHaveLength(3);

    const entry = entryBySlug(A!)!;
    const member = write.members[0]!;
    // Byte-for-byte what the bundle carries. A value re-derived at save time would be
    // today's engine's answer for a published version — the failure FR-10 exists to prevent.
    expect(member.color.hex).toBe(entry.derived.hex);
    expect(member.color.xyz_x).toBe(entry.entry.color.xyz[0]);
    expect(member.color.oklch_h).toBe(entry.derived.oklch[2]);
    expect(member.color.corpus_slug).toBe(A);
    expect(member.color.source).toBe('reference');
  });

  it('carries the roles, ranks and weights the draft implies', () => {
    const write = toStoreWrite(setRole(valid(), C!, 'accent'), CONTEXT, ids);
    expect(write.members.map((m) => `${m.role}:${String(m.rank)}:${String(m.weight)}`)).toEqual([
      'anchor:1:1',
      'neutral:2:0.9',
      'accent:3:0.6',
    ]);
  });

  /*
   * The write path runs the schema too. Belt and braces on purpose: the screen disables its
   * save control, and a disabled control is a UI state rather than a guarantee. A row that
   * exists is a row that validated.
   */
  it('refuses to build a write for a draft the schema rejects', () => {
    expect(() => toStoreWrite(setRole(valid(), A!, 'light'), CONTEXT, ids)).toThrow(CorpusError);
  });

  it('refuses a slug that is not in this corpus version', () => {
    const bogus: PaletteDraft = {
      name: 'Not from here',
      members: [{ slug: 'no-such-colour', role: 'anchor' }],
    };
    expect(() => toStoreWrite(bogus, CONTEXT, ids)).toThrow(/not in corpus version/u);
  });
});
