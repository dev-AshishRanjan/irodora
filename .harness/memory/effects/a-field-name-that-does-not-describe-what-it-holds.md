# A field name that does not describe what it holds

**Effect:** [E-096](../../state/effects.json) · `packages/corpus/src/entry.ts` →
`apps/mobile/src/contemporary.ts`, the published corpus digests, `.harness/verification/claims.json` ·
**medium**

## What happened

F-155's own notes said `contemporaryNote_en` was *"defined and never filled — null in every
content file"*. Both halves are wrong, and the second is the interesting one.

**Eight entries carry one**, and they hold curatorial prose about each colour's place in this
corpus:

> *"The corpus ceiling for chroma. It is here so that the Atlas has one colour that a screen
> renders convincingly and a camera estimate does not."*

Some lean the other way — *"offered as the alternative to black in the Indigo palette"* — so the
field is **mixed**, which is worse than either. A reader who trusts the name gets curation; a
reader who trusts the content gets an inconsistent mixture.

## The part worth keeping

**A name is a claim about content, and nothing checks it.** Every other guarantee in this corpus
is enforced: a null needs a stated reason, a derived value cannot be authored, a reviewer must be
a different person from the author. The one thing no gate can check is whether a field holds what
its name says — and that is exactly what a feature written months later will assume.

It cost this feature its premise. The plan was written against "the field is empty", and the field
was neither empty nor about the thing it is named after.

**Renaming it is a corpus version change**, so the values stay and a precisely named field sits
beside them. The finding is recorded in the type's own docstring, where the next reader will be
before they are misled.

## Adding a field changed 120 digests

The moment the parser started filling `contemporaryEquivalents` with `null`, every published
entry's checksum stopped matching — because `serialiseEntry` spreads the parsed entry, and that is
what `entryDigest` hashes.

The load refused all 120 with the right message: *"a published entry is immutable… there is no
benign explanation for immutable content differing from its recorded checksum: treat this as a
SEV1."*

**The immutability guarantee working, and worth understanding rather than routing around.** The
fix is that an absent field is *omitted* rather than serialised as null, which makes the addition
byte-neutral: an entry nobody has written an equivalent for hashes exactly as it did before the
field existed, and one that carries an equivalent hashes differently — because its content
genuinely differs.

That treatment is right here and would be **wrong** for the other nullable editorial fields: those
are nulls a person had to justify in `unknowns`, so the null *is* the content and dropping it
would hide a stated gap.

## And the thing the feature could not have

FR-72 asks for equivalents *"for a traditional entry"*. **All 120 entries are
`japanese-inspired`**; none is `historical` and none carries an era — deliberately, because F-011's
rule is that our own curation cannot be classified historical.

So the feature's subject does not exist yet, and the reading it was built under is stated rather
than assumed: **the contemporary reference set is FR-22's own curated palettes**, the only thing
here that is both contemporary and editorially signed off. An external set — Pantone, RAL, a
retailer's range — is licensed and absent, and inventing one would be the unsourced claim ADR-0005
exists to prevent.

Related: [[a-mechanism-nobody-used-is-a-mechanism-nobody-measured]] ·
[[a-check-must-report-its-scope-not-only-its-verdict]]
