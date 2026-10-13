# A new kind of thing does not move into a table because its columns fit

**Date:** 2026-10-13 · **Found in:** F-237's planning

## What happened

F-237's notes planned to store a bookmark as a `saved_color` row. The table had a `corpus_slug`
column, a change log, and a place in the backup, so it looked nearly free. It would have been wrong
four ways:

1. **Nothing could tell a bookmark apart** from a palette member's or a garment's colour.
2. **`reusableColorId` shares one row per slug**, so removing a bookmark would have tombstoned a
   colour a palette uses.
3. **`upsertColor` never clears `deleted_at`**, so a colour bookmarked a second time would never come
   back.
4. **Home shows the newest `saved_color` row as the person's *Last reading***, so a bookmarked corpus
   colour would have been presented as a measurement.

By the code, the fourth already happens to palette colours. That is F-337, found by reading, not
yet run: a table holding several kinds of thing, read as if it held one.

## The rule

1. **Columns fitting is not the test. Ask what every reader of the table assumes about its
   rows.** A table's readers encode what its rows mean; a new kind of row breaks the ones that
   never had to ask.
2. **Look for shared rows and one-way writes.** A row reused across owners, or an upsert that
   never revives, turns a new owner's ordinary operation into damage to someone else's data.
3. **A pointer is cheaper than it looks.** A new table holding only the key, with the value read
   from where it is published, is one migration, and it keeps provenance by construction.

## How to apply

Before adding a new kind of record to an existing table, list every query that reads it and every
writer that shares rows in it. If any of them would treat the new row as one of the old kind, give
the new kind its own table.

Links: [[a-gallery-can-undo-a-schema-decision-without-touching-it]] · [[presence-is-asked-inside-the-thing-not-anywhere-on-the-screen]]
