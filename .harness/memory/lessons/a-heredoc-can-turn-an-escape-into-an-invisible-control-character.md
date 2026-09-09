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
