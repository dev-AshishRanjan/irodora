# A rule that already existed was the answer to a question nobody had asked it

**Effect:** [E-093](../../state/effects.json) · `docs/design/design-system.manifest.json` →
`packages/design-tokens/src/manifest.ts`, the four emitters, `packages/ui/src/theme.tsx`,
`packages/store` · **medium**

## What happened

F-153 derives six themes from the two authored ones. The open question was the one every theming
feature has: **how strong may a theme be?**

Every answer I could think of was taste. Then the chroma ceiling failed the build:

```
✗ chromaCeiling  aota.light.foreground has chroma 0.028, above the 0.01 ceiling
                 for a surface or text token, and no entry in `exceptions`.
```

The manifest had carried that ceiling since long before this feature, with its own reason:

> *"The interface is near-achromatic by rule so that the garment colour is the only chroma
> competing for the eye."*

**That is the answer, and it is a better one than I would have chosen.** A theme may lift chroma
toward the ceiling and never past it — so no theme adds an exception, and the near-achromatic
guarantee holds in all eight palettes rather than in the two somebody happened to author. The hue
does the work, which makes these themes subtler than a Material You palette and correct for a
product whose whole job is that the garment colour wins.

## The part worth keeping

**A constraint written for one reason is often the answer to a question asked later, and the
question does not know that.** I was about to invent a "theme strength" parameter and pick a
number for it. The rule that already governed the palette was sitting one gate away, stating the
product reason in a sentence, and it made the design better rather than merely legal.

The gate is what put it in front of me. A design system where the rules live in a manifest and a
gate reads them is a design system that can answer a question its author never asked — which is
worth more than the rule being written down somewhere a person might remember to look.

## What else the widening turned up

**Eight palettes cost almost no call sites**, and that was measured before it was proposed: the
gates, the four emitters and the conformance suite all iterate `THEMES` rather than naming a
theme. There was exactly one exhaustive `Record<Theme, …>` in the repository, and one screen
typing a shareable card as `'light' | 'dark'`.

**But two things had quietly assumed the names were identifiers.** The React Native and TypeScript
emitters wrote theme keys bare, which was fine while every theme was called `light` or `dark` and
produced `fuka.dark: {` — a syntax error in a generated file that then could not be regenerated,
because the generator imports the package it had just broken.

**And the root layout asked the wrong question.** `name === 'dark'` chose the status-bar style,
which was the same question as "is this a dark reading" for exactly as long as there were two
palettes. `fuka.dark` is a dark reading whose name is neither.

## Three gates were right about things I would have got wrong

**The chroma ceiling**, above.

**The cache-scope gate**, on a test that reads a corpus entry to check a theme's hue pin: without
`content/colors/**` in turbo's global dependencies, a corpus republish would leave that result
cached and *the pin would be green about a file it never re-read* — the exact failure the pin
exists to prevent. It also turned out the gate's own matcher missed the directory its glob is
rooted at, which was a small defect in the gate rather than in the test.

**The font-coverage gate**, on one codepoint: 観, from the new Japanese word for *appearance*. A
character the app can render and the bundled subset cannot is a tofu box on a settings screen.

## And the plant leaks are now seven

Two more this session, both a Windows `UNKNOWN` on `writeFileSync` — one left the CI workflow with
a step disabled, one left the benchmark's `percentile` returning constants. Both were caught by
the next run failing rather than by the guard, and **the guard fired on neither**, because it
compares against git and this feature had legitimately edited neither file.

[[F-173]] is the fix and it is overdue: snapshot the plant targets at the start of a run and
compare against the snapshot, not against git.

Related: [[a-mechanism-nobody-used-is-a-mechanism-nobody-measured]] ·
[[a-derived-check-catches-the-change-a-written-down-one-waves-through]]
