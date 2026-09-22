# The export list stopped being the sync list

**Effect:** [E-139](../../state/effects.json) · **Feature:** F-241 · **Date:** 2026-09-21

```ts
export const ARCHIVE_TABLES = [...SYNC_TABLES] as const;
```

One array answered two questions for eight features: *does this table carry the sync columns*, and
*does this table belong in a file a person can read*. They agreed every time, so nothing said they
were different questions — and the day they disagreed, the answer would have been whichever one the
array had originally been written for.

**`profile_avatar` is the table that made them disagree.** It carries the sync columns. It is a
photograph of the user's face, and the archive is deliberately plaintext.

## What the plan proposed, and why the review was right to reverse it

The plan argued for consistency: `garment_image` is already exported in the clear, migration 8's
line is that *"an export is what somebody made"*, and an avatar is something somebody chose. All
true, and all outweighed:

- **A face is a change in kind.** This product has no account, no name, no email — `Avatar` cannot
  draw initials *because nothing here knows a name*. An archive of profile ranges is appearance data
  about an anonymous person. Add the avatar and the same readable file is appearance data **attached
  to an identifiable face**.
- **The cost of excluding it is one tap.** The only source is the photo library, so the picture is
  still there to choose again. A garment photograph can come from the camera and may exist nowhere
  else — which is why the same argument does not move `garment_image`, and why "be consistent" was
  a precedent rather than a reason.
- **The direction is asymmetric.** A later build can include a table an older archive lacks, because
  a missing table parses as empty. Files already written carrying a face cannot be recalled.

And the argument that settled it was a **measurement, not a principle**: BLOB columns do not survive
the archive's JSON round trip at all today. Inclusion would have paid the full disclosure cost for a
restore that cannot happen.

## The trap that came with the split, and was nearly missed

`eraseEverything` iterated `ARCHIVE_TABLES`. The moment a table left that list, *erase everything*
would have stopped erasing it — surviving on the foreign key's `ON DELETE CASCADE`, which does not
fire, because every removal in this store is an `UPDATE`. **That is the second time the same trap
appeared in one feature**: `deleteProfile` had already had to tombstone the avatar by hand for the
identical reason.

So: erasure iterates what EXISTS (`SYNC_TABLES`), the archive iterates what a person may read
(`ARCHIVE_TABLES`), and both say which at their declaration.

## The other half: a tombstone is not a copy

The archive reads tombstoned rows on purpose — a deleted row is a fact a future sync needs. So
excluding live avatars would have achieved nothing while a *removed* one still carried its pixels.
`clearProfileAvatar` and `deleteProfile` now blank the blob and keep the row: the tombstone records
that something was removed, not what it was.

## The lesson

**When one array answers two questions, it is a bug waiting for the case that separates them** — and
the case usually arrives as a new kind of data rather than as a new table. Two more shapes of the
same thing showed up in this feature: a cascade that does not fire because the delete is an update,
and a derived list that quietly stops covering what it used to.

Ask of any derived constant: *if these two ever disagreed, which question is this array actually
answering?* If the answer is "whichever it was written for", split it before the day it matters.

[[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
[[a-comment-that-mentions-a-forbidden-import-is-not-one]]
