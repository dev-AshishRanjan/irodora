# ADR-0060 — Irodora ships with one editor, and self-review is declared rather than assumed

## Status

Accepted

## Date

2026-08-23

## Context

[ADR-0047](0047-editorial-identity-is-a-roster-id-not-a-name.md) makes editorial identity a
roster id so that *author ≠ reviewer* is a real check rather than one a typo can satisfy. The
content gate enforces it: an entry cannot reach `verified`, `published` or `superseded` unless
two **distinct** roster identities are recorded.

[`content/editors.json`](../../content/editors.json) holds **one editor**. So no entry can be
published, so the corpus is empty, so **F-012 is blocked — and with it F-018, F-019, F-020,
F-021 and F-023, the entire R2 user interface.** Five features and the whole product surface
wait on a second person existing.

OQ-5 asked for the engagement model for a Japanese editorial reviewer. It has not been
answered by finding one; it is being closed by a decision to proceed with one editor for now.

Two ways to do that, and they are not close:

**Drop the rule.** One line. `verifiedBy` keeps naming a reviewer, the schema keeps implying
independent review, and an entry the author checked alone is indistinguishable from one two
people checked. Golden rule 12 says never ship a colour value without its provenance — and a
provenance record that asserts a review which did not happen is worse than one that asserts
nothing, because it is believed.

**Make the entry say which it was.** The rule stays on by default and a weaker claim becomes
expressible, labelled, and enforced in both directions.

A third option was offered and declined: **an AI agent as the second reviewer.** It would
fabricate exactly the provenance the roster exists to guarantee. ADR-0028 already rejected
machine translation with human review on the ground that *"colour names and cultural context
are exactly where machine translation fails, and the errors are invisible to a reviewer who
does not read Japanese"* — an agent signing as the reviewer is that failure with the last
safeguard removed.

## Decision

**`provenance.reviewIndependence` is required from `verified` onward, and takes
`"independent"` or `"self"`.**

1. **Required, never defaulted.** A field meaning `independent` when absent would let every
   entry claim an independent review by saying nothing. `null` before review completes —
   exactly like `verifiedBy` and `verifiedAt`, because *how* an entry was reviewed is part of
   the review — and one of the two values after.
2. **`independent` keeps every existing rule**: the same id twice, two ids for one person, a
   reviewer without the `reviewer` role, an inactive identity, an unknown id.
3. **`self` requires `authoredBy` to equal `verifiedBy`.** Declaring `self` with two distinct
   editors is a failure too. Mislabelling in the generous direction is still mislabelling: it
   records a weaker check than the one performed.
4. **`self` narrows what is checked; it does not switch the check off.** Two ids for one
   person still fails under `self` — that is a roster defect, and a declaration cannot make it
   correct. The `reviewer` role and the `active` flag are still required: being your own
   reviewer does not exempt you from being a reviewer.
5. **The surface must show it.** F-084 carries an attested obligation, discharged by F-018:
   the colour-detail screen renders the review independence. If the label never reaches a
   reader, the honesty is confined to a JSON field and this decision has bought nothing over
   simply dropping the rule.
6. **OQ-5 is closed as a decision, not an answer.** A Japanese editorial reviewer is still
   wanted. When one joins, they are a roster entry and entries move to `independent`; no code
   changes.

## Consequences

**Good.** The corpus can be published, which unblocks F-012 and the whole R2 interface. The
strict path stays the default and stays enforced, so the day a second editor exists, nothing
needs to be retrofitted. Every entry now states how it was checked, which is strictly more
information than the schema carried before — including for future independently reviewed
entries. And the claim the product makes about its corpus stays true, which is the thing that
was actually at risk.

**Bad, and it should be said in plain words.**

- **This weakens a real control.** One person checking their own work catches less than two
  people. The mechanism makes that visible; it does not make it equivalent, and no gate can
  close the gap. An entry marked `self` has had its provenance, derivation, translation and
  classification checked by the person who chose them.
- **The Japanese half is where it hurts most.** The reviewer's job includes catching a
  mistranslation or a cultural claim that does not hold. A single editor who is not a native
  speaker cannot self-check that at all, and `self` does not distinguish "I checked my own
  arithmetic" from "nobody competent read the Japanese". **This is the reason to keep looking
  for a reviewer rather than treat the question as settled.**
- **A visible weaker claim can still be missed.** If F-018 renders it as a small grey label
  nobody reads, the effect is close to having dropped the rule.
- **One more required field** on every entry, and twenty-two fixture corpora regenerate.

**Neutral.** The check is a branch, not a rewrite: `checkEditorialIdentity` grew from four
failure modes to six.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Drop `author ≠ reviewer`** | One line, unblocks everything immediately. Rejected because `verifiedBy` would keep implying a review that did not happen, and the corpus's provenance claim is the product's central differentiator — the thing it is expensive to build honestly and cheap to build dishonestly |
| **An AI agent as the second reviewer** | Offered and declined. It fabricates the provenance the roster exists to guarantee, and the errors it would miss in Japanese are exactly the ones invisible to a non-speaker (ADR-0028) |
| **Publish nothing until a second editor exists** | The honest status quo, and it is what has been happening. Rejected because it blocks five features and the entire user interface on a hiring problem, indefinitely, while a truthful label costs a field |
| **A second roster id for the same person** | Would satisfy the letter of the rule. It is precisely what ADR-0047's `displayName` check exists to catch, and doing it deliberately would be fraud against our own gate |
| **Allow `self` only up to `verified`, never `published`** | Keeps published entries strictly independent. Rejected: it blocks publication, which is the thing that needed unblocking, and it would push editors to mark entries `verified` forever |
| **A numeric confidence or review-depth score** | More expressive. Rejected as unfalsifiable — nothing could check a "3", whereas `self` is checkable against `authoredBy` |

## Revisit when

- **A Japanese editorial reviewer joins.** Add the roster entry; new entries become
  `independent`. Consider whether existing `self` entries should be re-reviewed rather than
  relabelled — relabelling without re-reading would be the fraud this ADR refuses.
- **F-018 lands** and the label's rendering can actually be judged rather than promised.
- **A second editor exists for any part of the corpus**, at which point whether `self` should
  remain permissible for `published` is worth reopening.
- The corpus is offered to third parties, or its provenance is cited externally — an outside
  consumer's bar for "reviewed" may be higher than ours.
