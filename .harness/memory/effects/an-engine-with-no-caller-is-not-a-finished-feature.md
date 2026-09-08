# An engine with no caller is not a finished feature

**Effect:** [E-100](../../state/effects.json) · **Feature:** F-194 · **Date:** 2026-09-08

`@irodora/color-harmony` shipped in **F-014**: twelve relationship generators, every returned
colour gamut-mapped, every one carrying the ΔE00 the mapping cost, covered by gate 5 and by
property tests. It was **imported by zero application files for the eleven releases since**, and
every gate stayed green the whole time — because every gate was asking whether the package was
correct, and none was asking whether anything used it.

The user's report was the whole of it: *"if shirt is a color, then what color could pants should
be … that was the whole point of this app."*

## What made it invisible

`packages/color-core` **declared** a dependency on the harmony engine and never imported it. A
manifest-based check reads that edge as a use. A manifest says what a package *may* reach; only
an import says what it *does* — which is why F-183's gate takes the import graph as its subject
and not the manifests, and why it could name this package when nothing else could.

## The second-order effect, which was the real work

Reaching the engine turned **twelve engine-defined kinds into user-visible copy in two
languages**. The screen builds each key from the kind, so no literal exists in source — and
`i18n.test.ts`'s unused-key scan is a source-literal scan, so the keys have to be excluded from
it. That exclusion is safe **only** while both directions are pinned: every key the engine can
emit exists in both catalogues, and the catalogue declares no `combo.*` the engine does not emit.

This app had already solved this exact problem twice — `explain.*` in F-052, `outfit.*` in
F-124 — and both solutions are in the same file, each with a docblock stating why. Finding that
took longer than using it. [[read-the-repository-before-deriving-the-answer]]

## Third order: the suite refused the screen, correctly

A generated colour resolves to **no design token**, by construction. The conformance suite is
right to refuse it, and `sampleValues` is how a subject declares *this colour is the subject
matter, not the chrome*. Those hexes are **derived from the engine**, not pasted: a literal list
would go on being measured while the engine drifted underneath it, and the suite would report
clean about nine colours nothing renders. [[a-check-that-gets-quieter-is-worse-than-one-that-fails]]

## What is still not guarded

- **Whether the twelve names are good names.** Both directions can be green while the screen
  reads as a colour-theory lecture. The Japanese half is unreviewed (OQ-5).
- **The ranking.** Hue-first is a product decision with no measurement behind it. It is stated
  in the module so somebody can disagree with it, rather than buried in a render.
- **Whether five relationships read as an answer or as a menu.** Attested; nobody has looked.

## The lesson

**A package with tests and no callers is a liability that reports as an asset.** Its gates go on
passing, its coverage goes on being high, and the thing it was built for does not exist. Ask
what imports it — not what declares it.

[[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
