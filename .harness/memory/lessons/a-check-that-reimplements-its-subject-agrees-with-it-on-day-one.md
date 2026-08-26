# A check that reimplements its subject agrees with it on day one

**From F-029 and F-095.** A gate that carries its own copy of the rule is not checking the rule.
It is checking that two copies of the rule, written by the same person in the same hour, match.

## The shape

A check needs to know something the product also knows — how weights normalise, what the spacing
scale is, which colour space a value arrived in. There are two ways to give it that knowledge:

1. **Load the real thing.** Import the built package; read the manifest.
2. **Write it out again in the script.** Faster, no build dependency, no import path to get
   right.

The second is green on the day it is written, always. It stays green while the real rule moves
away from it, and the day they disagree is the day the gate starts lying — reporting the
*script's* answer as though it were the product's.

## The two places it was decided here

**Gate 11 and rule weights (F-029).** The check asks whether a published weight set normalises.
Re-implementing "sums to 1 within tolerance" is four lines. Instead it loads the **built**
`@irodora/recommendation` and calls `parseWeightContent`, which wraps the engine's own
`parseRuleSet` — so *"these weights normalise"* is decided by the code that will score with them.
`loadRecommendationPackage` exists beside `loadCorpusPackage` for exactly this.

**Gate 8 and the spacing scale (F-095).** The check asks whether a padding value is a step of the
scale. The scale is nine short integers; copying them into the script is irresistible. It reads
`docs/design/design-system.manifest.json` instead.

## How you prove which one you built

You cannot tell by reading the script — both versions look identical at the point of use, and
both are green. **Perturb the source of truth and assert the verdict follows.**
`verify-spacing-scale.mjs --prove` removes a step from the manifest and requires the check to go
red naming the value that is now off-scale. A check carrying a copy stays green there, and that
is the only moment the two versions are distinguishable.

That case is worth more than the ones that plant bad values, because the bad-value cases pass on
both versions.

## The cost, which is real

Loading the built package means the check needs a build first, and that constrains where it can
sit in the gate order — `verify-no-inference` had to move out of `lint` and into `security` for
exactly that reason, because CI runs lint before build. Reading a manifest has no such cost,
which makes it the easy case; the expensive case is the one where the shortcut is tempting.

## Related

- [[a-decoy-that-is-not-broken-proves-nothing]] — same discipline, one level up.
- [[generating-an-artefact-is-not-checking-it]]
- [[a-scale-with-no-names-shifts-under-its-readers]] — the effect note for the F-095 half.
