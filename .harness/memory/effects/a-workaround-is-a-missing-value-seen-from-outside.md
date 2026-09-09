# A workaround is a missing value seen from outside

**Effect:** [E-109](../../state/effects.json) · **Feature:** F-203 · **Date:** 2026-09-09

The criterion was *"no screen carries a layout primitive it invented for itself"*, and it is
countable: **12 `flexDirection` declarations across 7 screens**, every one a `Row` written by
hand.

The obvious reading is that seven screens were sloppy. **They were not.**

```
align="baseline"        5 uses    Row's ALIGN had start · center · end · stretch
vertical-only padding   3 uses    Row's `padding` covers all four sides
```

`Row` **could not express what they needed**. A number beside its unit sits on one line, and
`center` puts a 24px figure and an 11px unit on two optical lines that read as a mistake. A row
in a list needs breathing room above and below and not at the ends, where the page inset already
applies.

So the workarounds were correct behaviour under a primitive that was missing two values — and
the 12 offences were a **measurement of the gap**, not of carelessness.

## The order that matters

The values were added **before** the rule was written. A gate that forbids a workaround without
supplying the missing capability makes people worse at their job: it takes away the only way to
say the thing and offers nothing in its place, and what it produces is not compliance but a
cleverer workaround.

## The trap in the conversion itself

React Native defaults `alignItems` to **`stretch`**. `Row` defaults it to **`center`**. So a
`View` with no alignment is **not** equivalent to a bare `<Row>` — converting one silently moves
the layout.

Every conversion carries its original alignment explicitly, and the decisive test is the
**decoy**: `Row` must still default to `center`. Had `baseline` leaked into the default, all
twelve conversions would have silently moved layouts they were meant to preserve, and the test
for `baseline` would have passed anyway.

## And the gate failed open on its first run

Its entry-point guard compared `import.meta.url` against a template-built `file://…` string,
which never matches on win32. It exited **0 with no output** — a check that passes by never
executing. Caught only because a gate that prints nothing is more suspicious here than one that
fails.

## The lesson

**When several places work around the same primitive, measure the gap before writing the rule.**
The count tells you how big the missing capability is; the workarounds tell you exactly what it
should be, in the caller's own words. A rule written first just relocates the problem.

[[a-check-that-gets-quieter-is-worse-than-one-that-fails]]
