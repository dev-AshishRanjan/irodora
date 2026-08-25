---
kind: effect
title: A family word is content because the family is, and the compiler cannot check it
category: contract
confidence: 0.9
created: 2026-08-25
scope: [content, apps/mobile, packages/corpus]
links: [[a-word-in-the-lexicon-is-also-a-word-in-the-taxonomy]], [[a-corpus-publish-can-outrun-the-font-that-renders-it]], [[the-message-key-set-is-a-contract-with-every-render-site]], [[the-source-register-is-a-markdown-table-that-125-records-depend-on]]
---

# E-028 — a family word is content because the family is

**`content/taxonomy.json` → `content/colors` · the generated vocabulary · the Atlas · the
colour detail screen · the font subset · gate 11**

## Why this could not be a lookup table in the app

Every other user-facing string here is a key in an enumerated TypeScript record whose
completeness `tsc` proves (ADR-0056, E-016). **A family is not like that.**
`taxonomy.family` is authored in `content/colors`, so the set of words that must exist is
decided by a **publish**, and `tsc` cannot see a key set that comes from JSON data.

F-018 saw the Atlas rendering `blue-grey` and `off-white` in the ja locale and left it *on
purpose* for exactly this reason: a table in the app would be enumerated against a set the
corpus controls, so a family added by a future publish would render blank or fall back to
English — and **ADR-0028 forbids fallback precisely because it makes a gap invisible**.

## So completeness moved from the compiler to the gate

| | English catalogue | this vocabulary |
|---|---|---|
| key set comes from | source | **corpus data** |
| completeness checked by | `tsc` | **gate 11** |
| a missing entry is | a compile error | **a build failure naming the family** |

The guarantee ADR-0028 wants is unchanged. What changed is which mechanism keeps it.

## The link runs both ways, and a dead row fails too

- publishing an entry with a new family **breaks the vocabulary**;
- removing a vocabulary row **breaks the corpus**;
- a row nobody uses **also fails** — a dead row is how a live gap gets waved through later,
  the same rule the source register (E-021) and the advisory register both carry.

Both directions were watched failing before the check was trusted.

## The destination nobody thinks of is the font, again

The Japanese family words render on the Atlas filter, every Atlas row and the detail screen —
the same reach as a colour name. Teaching `verify-font-coverage.mjs` to read them immediately
reported **鼠** and **陶**, which nothing else in the repository required.

**鼠 appears in six of the twenty-five families** — every grey one. A Japanese reader would have
seen tofu boxes across most of the grey filter chips, on the screen the product exists for.

This is the third time content has reached a screen from a direction the font check was not
looking ([[a-corpus-publish-can-outrun-the-font-that-renders-it]],
[[a-word-in-the-lexicon-is-also-a-word-in-the-taxonomy]]). The pattern is now explicit: **any
`ja` string in `content/` that a screen renders belongs in the font requirement**, and the
subset generator keeps its own copy of that collection, so the two must stay in step.

## The lookup is total or it throws

`familyLabel` has no fallback to the authoring slug. Gate 11 makes an unknown family
unreachable; if it ever happens, the shipped vocabulary and the shipped corpus came from
different generations, and that is the corpus loader's SEV1 posture.

Returning `blue-grey` quietly is not a lesser evil — it is the exact behaviour that let this
defect survive from F-018 to F-090 without anyone noticing.

## What this link does not cover

Whether the Japanese words are *right*. They are written by one editor and unreviewed
(ADR-0060, OQ-5), and a family name is far more visible than a rationale — it is on every row.
`era` and `material` will need the same treatment the day a measured entry carries one; both are
null on every seed entry today.
