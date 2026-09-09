# A pin that is not read is worse than no pin

**Effect:** [E-125](../../state/effects.json) · `pnpm-workspace.yaml` →
`pnpm-lock.yaml` · gate 15 · **high**

## What happened

Gate 15 failed with **17 unaccepted HIGH advisories** — 15 in `@xmldom/xmldom`, 2 in `js-yaml`.

Every one named a first-patched version, and every patched version was **published**:

| package | installed | patched | reached through |
|---|---|---|---|
| `@xmldom/xmldom` | 0.8.14 | 0.8.15 | `@expo/plist` |
| `@xmldom/xmldom` | 0.9.11 | 0.9.12 | `plist@3.1.1` |
| `js-yaml` | 3.15.1 | 3.15.2 | tooling |
| `js-yaml` | 4.3.1 | 4.3.2 | tooling |

Four patch bumps, each inside its own minor. Both packages are transitive, and the repository
had nothing holding either above its advisory range, so the lockfile settled on the last
pre-advisory patch of each line and stayed.

## The escape hatch was the wrong tool, and its own ADR says so

ADR-0059 lets a blocking advisory be accepted with a reachability argument, an owner and an
expiry. It was written for `image-size`, and the sentence that defines its scope is:

> *"Every published version is affected. There is no upgrade, and a `pnpm.overrides` entry has
> nothing to point at."*

Here there was one. Writing seventeen reachability arguments would have been using the hatch on
the case it was explicitly not written for — and the gate says so before the ADR does: *"Fix it
by upgrading if a patched version exists."* The two `image-size` acceptances were left untouched
and still expire on 2026-11-21.

## The part that would have gone wrong quietly

The first attempt put `pnpm.overrides` in `package.json`. The install said:

```
[WARN] The "pnpm" field in package.json is no longer read by pnpm.
       The following keys were ignored: "pnpm.overrides".
```

**A pin that is not read is worse than no pin.** It looks like a decision, survives review, and
resolves to whatever it would have resolved to anyway — and if the gate had gone green for some
unrelated reason, the file would have taken the credit. pnpm 10 moved these settings to
`pnpm-workspace.yaml`, where this repository already keeps two.

The lesson is not "read the release notes". It is that the confirmation has to come from the
**resolved state**: the lockfile was read back for the four versions, rather than the override
text being trusted to have done something.

## Range-scoped, because a shorter override would have been wrong

`"@xmldom/xmldom": "^0.9.12"` is what an autofix writes. `@expo/plist` asks for `^0.8` and the
0.8 line has its own patch, so that would move a consumer across a minor to fix something
already fixed where it stands.

## The part that can still go wrong quietly

**Overrides are sticky.** These four exist only until the ecosystem catches up, and gate 15 will
never say so — a pin nobody needs still resolves cleanly. So each entry carries the advisory ids
it closes, which is what a future reader checks them against. That is weaker than the
`advisories.json` mechanism, where an entry that stops matching **fails the build**, and the
asymmetry is worth knowing: the acceptance list prunes itself and the override list does not.

## The general shape

When a gate offers two remedies — fix it, or record why you cannot — the second is not the
cheaper version of the first. Check which case you are actually in before reaching for the one
that needs no upgrade, because an escape hatch used on the wrong case is how it stops being
believed.

Related: [[a-check-that-only-speaks-in-ci-is-a-check-four-features-walk-past]]
