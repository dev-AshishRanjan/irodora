---
kind: lesson
title: A schema validates a shape, and a primary key is not a shape — uniqueness is the one constraint you always have to write yourself
category: convention
confidence: 1.0
created: 2026-08-31
scope: [root, .harness/state, .harness/verification, content]
links: [[prose-in-a-state-file-rots-and-no-schema-can-see-it]], [[a-duplicate-json-key-silently-deletes-the-earlier-one]], [[a-decoy-that-is-not-broken-proves-nothing]]
---

# A schema validates a shape, and a primary key is not a shape

**JSON Schema can say an id matches `^E-[0-9]{3}$`. It cannot say that no two entries carry
the same one.** Draft 2020-12 offers `uniqueItems`, which compares *whole objects* — and two
records sharing an id while differing anywhere else are distinct objects, so `uniqueItems`
passes them even when it is set.

So in any hand-maintained document whose entries are referenced by an identifier, **the
primary key is the one field the schema is structurally incapable of checking**, and it is
usually the field everything else depends on.

## Where it came from

`effects.json` carried two links both numbered `E-032` for a day. Not through carelessness:
F-098 allocated it at 09:22:54 and F-028 allocated it again at 09:46:43 — twenty-four minutes
apart, by two features neither of which could see the other's write. The schema validated.
Gate 0 passed. Every gate stayed green.

The tell was in gate 0's own output and nobody read it as a tell: it printed *"E-032 (high)
has no guard"* while one E-032 named a proven guard and the other honestly named none. A
warning that is simultaneously right and wrong is a **symptom of an ambiguous key**, and it
had been printing for a week.

## Why this failure mode is quiet by construction

Every other kind of corruption has a moment where something breaks. A duplicate key does not:

- both records are individually well-formed, so validation is green;
- every *lookup* still returns a record — just not reliably the same one;
- the reader who resolves it by hand picks correctly, so nothing looks wrong;
- and the reader who resolves it by id gets a coin toss they never know they took.

F-099 hit exactly that and worked around it without fixing it, resolving its link by
`from.ref` because resolving by id *"would have been a coin toss"* — its own words, in its own
notes, describing a defect it had chosen not to be distracted by.

## What to do about it

**Assume every id space you maintain is unchecked until you have watched a duplicate fail.**
The check is five lines; finding out you needed it is the expensive part. When you write it:

- **Name both colliding records in the message**, not just the id. "Duplicate id E-032" sends
  the reader to `git log -S` to find out which two collided — the exact search the check
  exists to spare them.
- **Report the distinct count on success too.** `36 links, 36 distinct ids` makes the check
  visible when it passes; a check that only ever speaks on failure is one nobody notices
  going missing.
- **Decoy the plausible wrong implementation, not the margin.** Deduplicating on the *record's
  source* rather than on the id looks correct against every simple test. The case that catches
  it is two records sharing an id **and** that source.

## The measurement that would not have happened without the decoy

Mutating the check to key on `from.ref` instead of `id` turned the **baseline** red on five
pairs: several links legitimately share a `from`, because one source can have several distinct
consequences. **Records sharing a source is normal; records sharing an id is corruption**, and
a check that conflates them fires constantly on correct data — which is how a real check gets
deleted for being noisy.

## How far it reaches

Asked as an experiment rather than as a guess, by planting a duplicate and running gate 0:

| id space | duplicate caught? |
|---|---|
| `effects.json` links | **yes**, since F-102 |
| `feature_list.json` features | **no** — filed as F-106 |
| `gates.json` gates | **no** — filed as F-106 |
| ADR numbers | yes, via the two-way index reconciliation |
| corpus slugs | yes, gate 11 |

The content pipeline learned this and the harness state files did not, which is worth
noticing on its own: **the lesson does not travel between files in the same repository unless
somebody carries it.** And the feature-id case is the worst of them — `blockedBy` resolves by
id and `next-feature` selects by id, so an ambiguous feature id makes a *blocker* ambiguous,
not merely a citation.
