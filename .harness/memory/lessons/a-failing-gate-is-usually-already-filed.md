---
kind: lesson
title: A failing gate is usually already filed, and the second filing proposes the dead end the first one ruled out
category: process
confidence: 0.9
created: 2026-08-23
scope: [root]
links: [[prose-in-a-state-file-rots-and-no-schema-can-see-it]], [[generating-an-artefact-is-not-checking-it]]
---

# A failing gate is usually already filed

During F-080 I ran `pnpm audit --audit-level high`, saw two HIGH advisories, and filed
**F-082** to fix them. F-079 already existed, titled *"Gate 15 has a disposition for an
advisory with no fix"*, and its `notes` contained:

> THERE IS NO FIXED VERSION TO UPGRADE TO: the latest published image-size is 2.0.2 and the
> advisory covers <=2.0.2, so a pnpm `overrides` entry cannot resolve it **and attempting one
> will waste the next person an hour.**

F-082's notes proposed *"a pnpm.overrides entry for image-size@^2.0.3"*. I was the next
person, and it cost about that.

## Why it happened, which is the part worth keeping

The feature list was read as a **scheduler** — "what is `todo`, what is eligible, what is
blocked by what" — and never as an **index of known problems**. Both readings are legitimate
and only one of them was in my head. F-079 sat in the `todo` list I had *printed to the user
forty minutes earlier*, one line above the feature I then created to duplicate it. Seeing an
id is not reading its notes.

The failure mode is specific to a repository where the state file carries long prose: the
title *"Gate 15 has a disposition for an advisory with no fix"* describes a **solution shape**,
not the symptom. Grepping for `image-size` would have found it instantly. Reading titles did
not.

## What to actually do

**Before filing anything for a failing check, grep the state file for the failure's own
vocabulary** — the package name, the GHSA id, the error string, the gate id — not for what
you plan to call the fix.

```bash
grep -in "image-size\|GHSA-\|gate 15" .harness/state/feature_list.json
```

And when a feature *is* found, read its `notes` before its `acceptance`. In this repository
the notes are where the dead ends are recorded, and they are recorded precisely so the next
person does not walk into them.

## The corollary about writing

F-079's note did its job perfectly and was still missed, so the note is not the weak point —
the lookup is. But one thing helps: **name the symptom in the title, not the remedy.** A
feature called *"gate 15 is red: image-size advisories have no fix"* is findable by someone
who has just watched gate 15 go red. One called *"has a disposition for an advisory with no
fix"* is findable only by someone who already knows the answer.

F-082 is withdrawn rather than deleted, because `progress.md` referenced the id and a
dangling reference is worse than an honest tombstone.
