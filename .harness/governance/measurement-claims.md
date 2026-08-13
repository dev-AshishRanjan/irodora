# Measurement Claims Governance

[ADR-0031](../../docs/adr/0031-measurement-claims-policy.md) · NFR-21. Enforced by the
claims lint (F-025), not by review.

---

## The rule

> **No user-facing claim about colour accuracy may exist without a published measurement
> behind it.**

This category's norm is dishonest — "99% accurate colour detection" with no method, no
device matrix, no illuminant, no ΔE distribution. Being honest is a differentiator, but only
if it is enforced, because the pressure to overstate comes from everywhere and every
individual instance seems reasonable.

Reviewer vigilance does not survive a launch week.

---

## Language is bound to provenance

`Provenance.source` determines what may be said:

| Source | May say | Never |
|---|---|---|
| `reference` | "reference value", "standard" | — |
| `calibrated` | "calibrated measurement", "measured" | "exact", "perfect" |
| `estimated` | "estimated", "approximately", "closest reference" | "measured", "exact", "actual colour" |
| `declared` | "selected", "entered" | "measured", "detected" |

---

## Banned constructions

Across UI strings, marketing copy, app-store text, documentation, **code comments and
variable names**:

```
"exact colour"          "100% accurate"         "perfect match"
"the true colour"       "lab-accurate"          "guaranteed"
"AI-powered"            "measures the colour"   (for an estimated source)
"professional-grade"    (outside calibrated mode)
```

The allowlist is explicit, small, and each entry links to the measurement that supports it.

`isExactMatch` is as much a violation as a button label — a name propagates into a field,
then into a response, then into copy.

---

## No number without a row

Any published accuracy figure traces to a row in the device colour lab results
(NFR-2, F-063):

```
device · mode · illuminant · sample size · mean ΔE00 · p95 ΔE00
```

If there is no row, there is no number.

---

## Naming is never identity

Output is "closest digital reference", never "this is 藍鼠".

A rendered hex is a modern approximation of a colour historically produced by a dye on a
fibre under daylight. Asserting identity would be false, and disrespectful to the material
([ADR-0007](../../docs/adr/0007-colour-corpus-provenance-and-licensing.md)).

---

## It applies to your own reports

**Golden rule 11 covers what you say about your own work.**

Do not write "tests pass" if you did not run them. Do not write "verified" without the gate
output. **State which gates did not run.**

A report claiming six green gates when four ran is a false claim about verification — the
same category of dishonesty as a false claim about accuracy, and a more immediately damaging
one.

---

## Who decides

Adding an allowlist entry is a **human decision**, recorded with the measurement that
supports it.

An agent may not decide that a claim is justified. That is the one judgement this policy
exists to keep out of the loop that has an incentive to make it.
