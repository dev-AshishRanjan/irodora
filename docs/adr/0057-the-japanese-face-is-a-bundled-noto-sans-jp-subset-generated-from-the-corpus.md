# ADR-0057 — The Japanese face is a bundled Noto Sans JP subset, generated from the corpus it must render

## Status

Accepted

## Date

2026-08-20

## Context

`design-system.manifest.json` declares the Japanese family as a **CSS font stack**:

```
"jp": "'Noto Sans JP', 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', sans-serif"
```

**React Native has no font fallback chain.** `fontFamily` takes one family name; there is no
cascade, and no second chance if the first family lacks a glyph. The manifest's `jp` value is not
consumable by `apps/mobile` at all, and the same is true of `sans` and `mono`. This is not a
formatting detail — it is the difference between a declared fallback and no fallback.

The failure mode matters more than usual here. A missing glyph renders as **tofu** — an empty
box. In this product the Japanese text most likely to contain a rare character is the *colour
name itself*: 蘇芳 (suō), 纁 (sohi), 苅安 (kariyasu). So the failure lands on the corpus entries
that are the reason the product exists, in front of the audience whose judgement matters most,
with every gate green.

NFR-11 requires *"font fallback covers every kanji in the corpus"*, which forces the question:
**can that sentence be checked, or only hoped?**

Two facts constrain the answer:

- **The corpus is an immutable, signed bundle inside the app**
  ([ADR-0046](0046-published-corpus-is-an-immutable-generated-bundle.md),
  [ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) §4), pinned to a
  version. **The set of codepoints the app can render is therefore knowable at build time.**
  That is the property that makes a coverage check possible at all.
- **`content/colors/` currently contains one file: `.gitkeep`.** There are zero corpus entries;
  F-012 is blocked on OQ-5. Any coverage check written today runs over an empty set, and
  [[a-gate-that-ships-before-its-data-must-carry-its-own-fixtures]] records what happened the
  last time a gate activated over an empty corpus.

## Decision

**Bundle Noto Sans JP, subset from the codepoints the app can actually render, and gate the
coverage.**

1. **The face is Noto Sans JP**, SIL Open Font License 1.1. The licence permits redistribution
   and subsetting, and the subset inherits the same licence. It is recorded in `NOTICE.md` with
   its version and source, per [`content/AGENTS.md`](../../content/AGENTS.md).
2. **The subset is generated, not chosen.** Its codepoint set is the union of:
   - every codepoint in the **published corpus bundle** at the pinned version — `name_kanji`,
     `name_kana`, and any Japanese prose field;
   - every codepoint in the **`ja` message catalogue**;
   - kana, Japanese punctuation, and the Latin/digit range the interface needs.

   Subsetting against *our own renderable content* rather than against a standard character set
   is what makes the check exact. A JIS X 0208 Level 1+2 subset (6,355 kanji) would be the
   conventional choice and would still be a guess: 纁 is not in it, and a corpus of traditional
   colour names is precisely where such characters live.
3. **`verify-font-coverage.mjs` parses the font's `cmap` and asserts coverage over that same
   union.** It runs inside `gate:content`, because a corpus publish is what changes the input.
   Criterion 4a is therefore **gated**, not attested.
4. **While the corpus is empty, the check carries its own fixtures and refuses to report a green
   run as coverage.** It prints the covered-codepoint count beside the authored-corpus-entry
   count, and a decoy codepoint absent from the subset must make it fail — otherwise the check is
   only asserting that nothing is nothing.
5. **The manifest's `typography.families` gain a React Native form.** The CSS stack stays for the
   CSS target; the RN target emits a single resolved family name per script, because that is what
   the platform accepts.
6. **The Latin face is deferred, deliberately.** DESIGN-SYSTEM.md says *"Geist and Geist Mono are
   intended. Licensing and self-hosting to confirm"* — and nobody has confirmed it. F-017 ships
   the **platform** Latin face (`System` / `ui-monospace` equivalents), which is legible,
   free, and correct at every size. Latin has no tofu failure mode, so the asymmetry is
   principled rather than lazy: the script that can fail silently gets the bundled font, and the
   script that cannot, does not.

## Consequences

**Good**

- *"Every kanji in the corpus renders"* becomes a check instead of a hope, and it fails at build
  time rather than on a reviewer's phone.
- **E-017 gets a real guard.** A corpus publish that introduces an uncovered character fails
  `gate:content` and names the entry and the codepoint.
- Typography is identical on iOS and Android. Hiragino Sans and Noto Sans CJK have different
  metrics, so relying on the platform face means the Japanese interface is measurably different
  on the two platforms — for a product whose whole argument is deterministic rendering, that is
  an odd thing to accept.
- The subset is as small as it can be while still being provably sufficient, because it is
  computed from exactly what can be shown.

**Bad**

- **App size.** Noto Sans JP is roughly 5–6 MB per weight unsubsetted. A subset is far smaller,
  but it is not nothing, and it scales with the corpus: a 100,000-entry corpus (NFR-7's target)
  will approach full-coverage size, at which point the subsetting stops buying much.
- **The build gains a font pipeline.** Subsetting needs a tool in CI, and a font asset becomes a
  generated artefact with a regeneration step someone can forget — the same class of hazard as
  the generated token targets, and it needs the same byte-comparison treatment.
- **A corpus publish can now fail the build**, which is the intended behaviour and is still a new
  coupling between content and the app bundle. The remedy is always to regenerate the subset,
  never to relax the check.
- The check is **only as good as the corpus is real.** Until F-012 lands it is running on
  fixtures, and it must keep saying so on every run rather than reporting a hollow green.
- Text a *user* types — a wardrobe item note (R4) — is outside the subset by construction. Those
  surfaces must use the platform face, and that boundary has to be held deliberately.

**Neutral**

- Weight coverage: the design system uses 400, 500 and 600. Whether that ships as three static
  subsets or one variable subset is an implementation choice inside this decision, not a
  separate one.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Use the platform font** (iOS Hiragino Sans, Android Noto Sans CJK) | Zero bytes, zero licensing work, zero build pipeline, and the text renders in the face the user already reads everywhere else on their phone — a genuine argument, not a lazy one. Rejected because it makes NFR-11's coverage clause unverifiable: *"covers every kanji in the corpus"* would be checkable only on a device, on every OS version, forever. E-017 would carry `guard: "none"`, and golden rule 5 says the honest response to that is to file the feature that adds a guard — not to accept the gap. It also gives up cross-platform metric consistency. |
| **Bundle the full Noto Sans JP, unsubsetted** | Simplest possible correctness: no subsetting tool, no regeneration step, no way for a corpus publish to outrun the font, and coverage is trivially total. Rejected on size — 5–6 MB per weight, ~17 MB for three — which is a real cost to impose on every user for glyphs the app will never show. Worth reconsidering if the subsetting pipeline turns out to be more trouble than the megabytes. |
| **Subset to JIS X 0208 Level 1+2** (6,355 kanji) | The conventional choice, stable, and it needs no regeneration when the corpus grows — which is exactly what makes it attractive and also what makes it wrong here. It is a guess about our content rather than a fact about it, and traditional colour names are where the characters outside it live. It would produce a check that passes while the app shows tofu. |
| **Ship the platform face and attest coverage on a device** | Honest, and it is what ADR-0038 exists for. But it converts a build-time fact into a permanent manual obligation repeated on every OS release, for a failure mode that is silent, visual, and lands on the product's core content. Attestation is for things no check in this repository *could* prove; this one can be proved. |

## Revisit when

The generated subset exceeds roughly half the size of the full font — at that point the
subsetting pipeline is buying little and the unsubsetted font is the simpler, more robust
answer — **or** when a surface needs to render user-authored Japanese text, which the subset
cannot cover by construction and which forces a documented split between bundled and platform
faces.
