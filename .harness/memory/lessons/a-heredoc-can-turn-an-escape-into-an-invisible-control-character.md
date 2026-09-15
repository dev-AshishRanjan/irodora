# A heredoc can turn an escape into an invisible control character

**Date:** 2026-09-09 · **Found in:** F-214

I generated a scanner rule through a quoted heredoc. The regex I wrote was `/<(Surface|Card)\b/`.
What reached the file was `/<(Surface|Card)␈/` — an actual **backspace character, U+0008**.

The rule then matched nothing, and reported a clean result over a file full of the shape it was
written to catch.

## Why it took four rounds to find

Every tool agreed the code was correct:

```
grep      prints the line and the backspace is invisible
a dump    I wrote one looking for backslashes (char 92) — a backspace is char 8
the Edit tool   refused to match the string I typed, and I read that as a whitespace quirk
prettier  formatted it happily; it is a valid regex
eslint    no complaint; it is a valid regex
tsc       not its file
```

Only `JSON.stringify` of the source told the truth: `\b` in the output means a real backspace,
where a literal backslash-b would print as `\b`.

## The two things worth keeping

**When a generated regex silently matches nothing, dump the bytes before re-reading the logic.**
I traced the algorithm three times against a hand-typed copy that worked perfectly, because the
algorithm was never wrong.

```js
console.log(JSON.stringify(src.slice(start, end)));   // \b is fine; \b is a control character
```

**The Bash tool eats backslashes even inside a quoted heredoc** — this is now the third distinct
form of that: `\[` in a regex, `\n` becoming a real newline, and now `\b` becoming U+0008. The
first two produce syntax errors and announce themselves. **This one produces valid code that is
silently wrong**, which is far worse.

Write generator scripts with the Write tool, or build escapes from `String.fromCharCode(92)`.

## The general shape

A tool chain that transforms text can produce output that is **valid at every layer and wrong at
the last one**. The layers each say "fine" because it is fine by their rules. When something
reports success over a subject you can see is broken, suspect the representation before the
logic.

[[a-pipe-hides-the-exit-code-that-decides-the-commit]]

## Three more, in F-218 and F-219 — with this lesson already in the repository

**The rule above was known and still broken, three times in one session**, each time in a script
written "quickly" rather than as a generator:

| where | what I wrote | what arrived | what it did |
|---|---|---|---|
| F-218, an anchored edit | an anchor containing `'\\'` | one backslash fewer | the anchor matched nothing; the edit refused — **loud** |
| F-219, a calibration | `new RegExp('\\b\\d{1,3}…')` | `\b` became U+0008 | two patterns that were **correct in `claims.json`** reported every drawn line as a miss — a false ALARM, the inverse of the original false pass |
| F-219, a lost turn | `.split('\n')` in inserted code | a real newline | the proof no longer parsed — **loud**, but hidden inside a turn whose output never reached context |

The middle one is worth dwelling on. The trap usually makes a check **quieter**. Here it made a
calibration **louder** — the patterns were fine and the harness that tested them was broken. A
calibration is itself a check, and it needs the same distrust as the thing it measures.

## What held, once applied

- **Regex literals, serialised by `.source`.** A literal never passes through a string escape; a
  pattern composed from parts is composed from `.source`, never from string fragments.
- **Code-bearing text through the Write tool** — scripts, and snippet files that an edit script
  reads and inserts, so no backtick, `${}` or backslash crosses a shell.
- **A read-back round trip.** After writing a pattern into JSON, re-read the file, recompile the
  pattern, and compare its `.source` with the literal it came from. This is what makes the
  first two rows above impossible to ship silently.
- **Reject control characters outright**: `if (/[\x00-\x08]/.test(re.source)) throw …` — cheap, and
  aimed at exactly the failure this lesson is about.

Links: [[a-lost-turns-edits-look-like-a-second-author]]
