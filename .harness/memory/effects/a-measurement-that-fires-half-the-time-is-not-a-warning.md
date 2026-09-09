# A measurement that fires half the time is not a warning

**Effect:** [E-104](../../state/effects.json) · **Feature:** F-198 · **Date:** 2026-09-09

The combinations screen proposes colours to put beside one another and said nothing about whether
they can be told apart. The obvious build: check each set under simulated CVD and flag the ones
that fall below the existing convention.

Built it, then measured over the shipped corpus:

```
warm-cool      115/120   96%   mean separation  6.1
analogous      114/120   95%                    6.4
tetradic        94/120   78%                   10.3
...
complementary   11/120    9%                   13.1
```

**53% of every generated relationship flagged.**

## The rate is correct, and that was the surprise

The first instinct is that the threshold is wrong. It is not. `warm-cool` generates two colours
at similar lightness on opposite temperature, and **that is exactly the axis a red-green
deficiency loses**. A 96% rate there is the check being right about the relationship, not noisy
about the colours.

So the threshold was **not** nudged. Nudging it would have hidden a true finding to make a badge
look sensible — [[a-bound-can-be-rigorous-about-the-wrong-quantity]] pointed the other way, and
this is the same mistake with the sign flipped.

## What changed instead was the presentation, and the repository had already argued it

One feature earlier, on this same screen, about the gamut cost:

> *Zero is a value, not an absence — a screen that simply omitted the line would leave a person
> unable to tell "nothing moved" from "nobody checked".*

Identical shape. So the separation is reported on **every** card — the number, the deficiency,
the severity — and the ones below the convention carry the extra line.

**A number that is always there is data. One that appears half the time is a warning.** And this
product's position on colour vision is that it reports measurements about colours, never claims
about the reader's eyes.

## The decoy that keeps the flag honest

`close` is a convention applied to a number, so a field hard-wired true — or false — satisfies
every other assertion. **Both values must actually occur across the corpus.**

## The lesson

**Measure the rate before designing the affordance.** A flag is a claim about how often something
matters, and you cannot know whether it is a badge, a line, or a number until you know how often
it fires. A high rate is as likely to mean *the presentation is wrong* as *the threshold is
wrong* — and the first is the one nobody checks.

[[a-check-must-report-its-scope-not-only-its-verdict]]
