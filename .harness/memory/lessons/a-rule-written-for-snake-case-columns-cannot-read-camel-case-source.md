---
kind: lesson
title: A rule written for snake_case columns cannot read camelCase source, and it fails silently
category: engineering
confidence: 0.95
created: 2026-08-26
scope: [packages/store, scripts]
links: [[a-word-boundary-fails-before-an-underscore-so-the-obvious-name-is-caught-and-the-real-one-is-not]], [[a-decoy-that-is-not-broken-proves-nothing]], [[parse-by-matching-what-you-want-not-by-removing-what-you-recognise]]
---

# The same vocabulary needs two matchers, because SQL and TypeScript spell identifiers differently

F-026 built a rule refusing prohibited **columns**: `\bskin\w*\b`, `\bethnic\w*\b`, `\bages?\b`.
It works, it is tested, and every family is planted as a decoy.

F-037 pointed the same regexes at **source**. Two of the three plants slipped straight through:

| planted | why it was missed |
|---|---|
| `inferEthnicity` | `\bethnic` needs a word boundary before "ethnic"; here it is preceded by `r` |
| `ageBand` | `\bages?\b` needs a boundary *after* "age"; here it is followed by `B` |

**Both failures were silent.** The scan reported "no code path names a protected
characteristic" over a file that had just had `inferEthnicity` added to it.

## Why the obvious fix is worse

Drop the anchors and match substrings, and the age rule flags `average`, `percentage`,
`storage`, `language`, `usage` and `image`. That check gets switched off within a day, and the
real protection goes with it — the same ending as
[[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]].

## The fix is tokenisation, not looser matching

Split the identifier into words first:

```
inferEthnicity → infer · ethnicity      ageBand → age · band
percentage     → percentage             averageStorage → average · storage
```

Then match stems by **prefix, per token**. `ageBand` is caught because one of its tokens *is*
`age`; `percentage` is not, because its single token does not *begin* with `age`. Tokenising is
what makes prefix matching safe, and prefix matching is what survives camelCase.

## One vocabulary, two representations

`ProhibitedIdentifier` now carries both a `pattern` (for SQL, where identifiers are snake_case
and sit between boundaries) and `stems` (for source). **Not two lists** — one list with two
fields, so adding a family cannot cover one input and miss the other.

Some stems have to be multi-word: `body` alone is an ordinary word in a codebase — a markdown
body, an HTTP body — so the source stems are `body shape`, `body type`, `body fat`. That is the
same reasoning behind `body_` in the SQL pattern, expressed the way a tokenised identifier needs
it.

## The generalisation

> **Ask what the input's naming convention is before reusing a pattern across inputs.** A regex
> that works on one is not a rule about the concept; it is a rule about that spelling of it.

And the reason this was caught at all: **the proof planted the violation in a real file and
asserted the scan named it**, rather than asserting only an exit code. A proof that checked
"went red" would have been satisfied by the two cases that did fire.
