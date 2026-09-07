# A mechanism nobody used is a mechanism nobody measured

**Effect:** [E-092](../../state/effects.json) · `packages/ui/src/Status.tsx` →
`packages/ui/src/testing/conformance.ts`, `docs/design/design-system.manifest.json`,
`apps/mobile/src/screens/` · **high**

## What happened

F-152's second criterion asks for a designed empty, loading and error state on every screen. Two
screens got a real error state for the first time — the refused photograph on AddGarment, the
failed write on Export — and both drew a `Status`.

**Nothing in this product had ever painted a status token.** Three things came apart at once.

## 1. The rule and the component had always disagreed

`Status` has taken an `adjacentToSample` prop since F-069. What it does is paint `swatch.well` on
the status's **own** container, so a colour sample beside it abuts a neutral field instead of a
status colour. Its docstring says the prop is *"declared rather than assumed, so the rendered scan
can see the claim."*

`checkStatusAdjacency` asks whether the **shared parent** of the two siblings is a well. That is
the other arrangement — both inside one well — and the only one it recognised.

So the component and the checker have disagreed since the day both were written, and the first
status this product ever shipped was flagged for doing exactly what its own prop promises. A band
of neutral between two colours is a band of neutral between two colours, whichever side of the
boundary owns it; the check now accepts both shapes, with a fixture for the second.

**Neither piece was wrong in isolation.** They were never run against each other, because there
was nothing to run.

## 2. Declaring the pairing made gate 9 measure it, and it failed

No status token declared `pairsWith: swatch.well`, so gate 9 — which is exhaustive over every
declared pairing, both themes, WCAG and APCA, eleven CVD severities — had never measured the one
combination `adjacentToSample` exists to create.

Declared, it fails: light `status.ok` is **4.21:1** and `status.warn` is **4.32:1** against a
floor of 4.5. **The component promises a well that two of its three kinds cannot legibly sit on**,
and has done since F-069.

And it does not have a small fix. Darkening `ok` to clear the well inverts the salience rank — ok
and warn then measure equal against the light background, which ADR-0053 forbids because a rank
differing between themes tells someone toggling the theme that a different thing is urgent.
Restoring the rank means darkening `warn` past `ok`, and at its chroma **warn leaves sRGB before
it gets there**.

So it is two shipped colours under a gamut ceiling, and the manifest keeps a
`valuesChangedSinceApproval` field precisely so values that postdate a human signature cannot
pretend otherwise. Recorded as **F-174** rather than bisected into place. `bad` clears at 8.29:1
and is the only kind declared, so the gates are green and the trap is *guarded* — F-171's pairing
rule will catch the next `adjacentToSample` ok or warn before it ships.

## 3. Half the product's copy had never been rendered by the suite

The conformance registry has rendered every screen in both themes since it existed, and in **one
language**. So F-152 pointed it at the other one, using the same subjects rather than a copy of
them — a second registry would be a second thing to drift, and the one that drifted would be the
one nobody was reading.

It found that **four screens never destructured `script` from `useMessages` at all**: AddGarment,
Measure, OutfitBuilder and Shopping, fifty-eight text nodes between them, drawing Japanese with
the Latin leading and the platform font. `useMessages` returns `script` for exactly that reason.

**No gate could see it, and that is the part worth keeping.** Contrast does not change when text
is set at the wrong leading. Neither does structure, nor an accessible name. The rendered tree is
different in a way every existing check reads straight past — so the new assertion is on the
bundled face, because that is the property with a failure mode: ADR-0057 §6 ships a Japanese
subset so a missing glyph cannot come out as tofu.

Four `@irodora/ui` components turned out to have no way to be told: `Button`, `Chip`, `Status` and
`Swatch` all take caller-supplied copy and drew it at the default. `Button`'s label is HeroUI's,
so it never went through the type scale at all.

## And my own new check was vacuous first

The non-vacuity assertion for the Japanese pass looked for CJK anywhere in the tree. **Every
corpus entry carries `name.kanji`, and that renders in both locales** — so it would have passed on
an English screen. It now asserts a string that exists only in the catalogue, in both directions:
the Japanese one present, the English one absent.

That is the third time in two features that a check I wrote to close a blind spot had one of its
own, and the pattern is consistent: the check is right about its subject and wrong about whether
its subject is there.

Related: [[a-check-must-report-its-scope-not-only-its-verdict]] ·
[[a-component-reached-through-another-is-only-tested-in-its-parents-shape]] ·
[[the-claims-lint-only-speaks-english]] · [[two-thorough-checks-and-neither-looked-at-a-pair]]
