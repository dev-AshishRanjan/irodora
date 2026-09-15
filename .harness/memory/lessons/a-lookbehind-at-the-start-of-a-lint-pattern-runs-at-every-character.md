# A lookbehind at the start of a lint pattern runs at every character of every line

**Date:** 2026-09-14 · **Found in:** F-219

The claims lint tests every banned pattern against every line of the repository — 272,909 lines on
the day this was measured, one of them 478,913 characters long (a generated file). A pattern's cost
is therefore paid at every starting position of every line, whether or not it ever matches.

F-219 needed an English disclaimer to clear a claim — *"This isn't a medical-grade colour-vision
test"* is honest copy. The first version put the negation first:

```
(?<!(?:\bnot|n't|\bnever|\bno)\b[^.\n]{0,24})\b(?:museum|…|medical|…)[\s-](?:grade|…)\b
```

A negative lookbehind at the START is evaluated before anything else, at every position: a backward
scan of up to 24 characters with an alternation, around 270,000 lines' worth of times. Its sibling
alternative began with an unbounded `\b[\w-]+`, which rescans every hyphenated run in that long line.
Measured with each pattern compiled once and run over the same lines:

| | `institution-grade` | all patterns, one pass |
|---|---|---|
| lookbehind first, unbounded prefix | **2,322 ms** | 3,503 ms |
| lookbehind **at the end of the match**, prefix bounded to 30 | **147 ms** | 1,216 ms |
| the 20 patterns at `HEAD`, for scale | — | 436 ms |

**The rule.** In a pattern that runs over a whole repository:

1. **Match the construction first; check the context after.** Put a negative lookbehind at the END,
   spelling out the whole construction inside it — `…grade\b(?<!not…medical[\s-]grade)` — so it runs
   only where the construction already matched. The semantics are the same.
2. **Bound every prefix quantifier** (`\w{2,30}`, not `[\w-]+`) when the pattern can start inside a
   long token.
3. **Time a pattern set before shipping it**, per pattern, against the lines the gate really scans —
   the fixtures prove what a pattern catches, not what it costs. The claims proof runs the whole lint
   about 45 times, so a slow pattern is paid 45 times on every run of the proof.

Links: [[a-heredoc-can-turn-an-escape-into-an-invisible-control-character]]
