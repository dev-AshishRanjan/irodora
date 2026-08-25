---
kind: lesson
title: A word boundary fails before an underscore, so the pattern catches the obvious name and misses the real one
category: engineering
confidence: 0.95
created: 2026-08-25
scope: [packages/store, scripts]
links: [[a-decoy-that-is-not-broken-proves-nothing]], [[a-negative-test-needs-a-decoy-not-an-empty-fixture]], [[parse-by-matching-what-you-want-not-by-removing-what-you-recognise]]
---

# `\b` does not fire before `_`, and that is where the column name actually lives

F-026's NFR-22 check refuses a migration that would add a prohibited column. The racial-
classification rule was written as:

```js
/\brac(e|es|ial)\b/i
```

It catches `race`. It **does not catch `racial_group`** — and `ethnic_group`, `skin_tone_id`,
`body_shape_v2` are the same shape. `_` is a word character, so there is no boundary between
`racial` and `_group`, and the pattern that looks strictest is the one that misses.

The fix is a trailing `\w*`; the leading `\b` is what still keeps `bracelet` and `grace` out:

```js
/\brac(e|ial)\w*\i
```

## Why this is worse than a missing rule

A rule that refuses `race` and accepts `racial_group` **reads as coverage**. The next person
sees a check, sees a test suite, sees green, and reasonably concludes the class is handled. A
rule that did not exist would at least be visibly absent.

That is the same failure as [[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]]
arriving from a different direction: enforcement that parses is not enforcement.

## What actually found it

**The decoy, on its first run.** The test was written to plant every prohibited family as a real
migration and assert each is rejected — and the list included both `race` and `racial_group`
precisely because a family should be tested at more than one of its names. `racial_group` failed
immediately.

Neither the pattern nor a reading of it would have found this. The generalisation is not "be
careful with `\b`" — it is:

> **Plant each rule at more than one name, and make one of them the name somebody would actually
> type.** A single canonical fixture per rule tests the pattern against the example it was
> written from, which is the one case it is guaranteed to handle.

Column names in this repository are snake_case. Every identifier pattern aimed at them has to
survive an underscore, and none of them will if it is tested only against a bare word.
