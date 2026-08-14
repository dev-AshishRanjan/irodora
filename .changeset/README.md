# Changesets

Release tooling for the publishable `@irodora/*` packages. Apps are ignored — they deploy,
they do not publish.

```bash
pnpm changeset          # describe a change and pick the bump
pnpm changeset status   # what would be released, and at what version
pnpm changeset version  # apply the bumps and write CHANGELOGs
```

## The one setting that is not a default

```jsonc
"fixed": [["@irodora/color-*", "@irodora/cvd-engine"]]
```

**The colour engine packages version together.** They are not independent libraries that
happen to live in one repository — they are one engine split across modules, and every
result the product produces carries an `engine` version in its reproducibility envelope
(FR-10). If `color-spaces` were 1.4.0 while `color-difference` was 1.1.2, "engine 1.4.0" in
a stored envelope would not identify the code that produced the answer, and replaying it
would be guesswork.

`cvd-engine` is in the group despite its name not matching the glob: it consumes the same
conversions and contributes to the same separation scores.

Everything else versions independently. `contracts`, `design-tokens` and `corpus` change for
their own reasons, and tying them to the engine would produce a stream of empty major bumps.

## What is deliberately absent

**No publish automation.** Changesets is configured; nothing releases. There is no registry
target and no release workflow yet, and a pipeline that can publish before anyone has decided
what publishing means is a pipeline that will publish by accident.
