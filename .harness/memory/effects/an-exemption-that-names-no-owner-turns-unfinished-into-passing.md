# E-058 — An exemption that names no owner turns unfinished into passing

**Link:** `.harness/verification/unreached-tokens.json#closedBy` → `verify-token-reach.mjs`,
`verify-spacing-scale.mjs`, `feature_list.json`,
[ADR-0088](../../../docs/adr/0088-an-unreached-design-token-is-unfinished-work-not-a-declared-exemption.md)
**Guard:** `gate:a11y` **Severity:** high **Feature:** F-140

---

## The failure this records

`unreached-tokens.json` existed so a legitimately-not-yet-painted token could be **declared with
a reason** rather than deleted. That was right: deleting `chart.3` for want of a chart would mean
re-deciding a near-achromatic data ramp under deadline, which is how a rainbow palette ships.

Read one at a time, every entry was true and well argued. Read as a list, the file was an
itemised description of a product nobody had designed:

> *"Nothing in the product animates."*
> *"there is no dialog, bottom sheet or modal anywhere in the app yet"*
> *"There is no chart in the product."*
> *"no screen leads with a display size; every one of them opens at `title`"*
> *"RHYTHM FOR A LAYOUT TIER THAT DOES NOT EXIST, KEPT ON PURPOSE"*

Eleven entries, 36 of the design system's 80 names, and every gate green.

**The gate was answering *"is this declared?"* when the question that mattered was *"is this
built?"*** A check that cannot tell a decision deferred from a decision abandoned fails open on
scope, which is [[a-gate-that-errors-is-failing-open]] one level up.

## The fix, and what it couples

`closedBy` names the feature that ends the exemption. `null` is allowed and means exempt by
architecture rather than by schedule — and costs an extra `permanentBecause` field, deliberately,
because a permanent exemption should be a decision somebody recorded.

**This couples the token gate to the scope subsystem**, where they were independent.
`verify-token-reach.mjs` now reads `feature_list.json`. Renaming a feature id, or marking one
`done` while its exemption stands, fails gate 8. That is the intended behaviour and it will
surprise whoever meets it first — which is the reason this note exists.

## The half that is deliberately NOT symmetric

`verify-spacing-scale.mjs` does **not** enforce the same rule, and that is a decision rather than
an omission. The two gates see different evidence: the spacing gate reads style declarations and
cannot resolve `nativeSpacing[step]`, the computed form the layout primitives use; token-reach
reads step names and sees `padding = 'xl2'` in a default.

So they disagree about `xl2` — one says unused, the other says reached, and both are correct
about what they can see. Two enforcers of one rule would have that disagreement settled by
whoever was editing that day. Ownership is single: **token-reach decides, the spacing gate
reports**, and the spacing gate's line says so.

## What F-140 changed and what it did not

Reached and removed from the file: `xl2`, `xl3` (now `Screen`'s inset and rhythm) and
`display.2` (now every screen title).

**Still declared, with owners:** `display.1` → F-146, `xl4`/`xl5` → F-147, motion → F-144,
`backdrop` and `border` → F-143, `chart.*` → F-150, `foreground.3` → F-148, status `ok`/`bad` →
F-149. Those were not reached because reaching them honestly needs the surfaces that want them.
Painting `display.1` on seventeen screen titles would have satisfied the check and produced a
worse product — reach is a floor, not a design review, and ADR-0088 says so in its own
honest-limit section.

## Related

- [[spacing-is-a-step-name-so-a-number-cannot-reach-a-screen]] — the other half of F-140.
- [[a-gate-that-errors-is-failing-open]] — the same shape, one level down.
