# Plan: F-217 — Seventeen blocking advisories with published patches

| | |
|---|---|
| **Feature** | F-217 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-14 |
| **Service** | `root` |
| **Author** | Claude Opus 5 · **Date** 2026-09-09 |

---

## What is failing, and it is one shape twice

17 unaccepted HIGH advisories: **15 in `@xmldom/xmldom`, 2 in `js-yaml`**. Every one of them
names a first-patched version, and every patched version is **published**:

| package | installed | first patched | reached through |
|---|---|---|---|
| `@xmldom/xmldom` | **0.8.14** | 0.8.15 | `@expo/plist` |
| `@xmldom/xmldom` | **0.9.11** | 0.9.12 | `plist@3.1.1` |
| `js-yaml` | **3.15.1** | 3.15.2 | tooling |
| `js-yaml` | **4.3.1** | 4.3.2 | tooling |

Checked against the registry, not read off the advisory text:

```
0.8.x: … 0.8.13 0.8.14 0.8.15      3.x: … 3.15.1 3.15.2
0.9.x: … 0.9.10 0.9.11 0.9.12      4.x: … 4.3.1  4.3.2
```

Four patch bumps, each inside its own minor. This is the cheapest upgrade a dependency tree can
be asked for.

## The acceptance path is the wrong tool here, and that matters

ADR-0059 allows a blocking advisory to be accepted with a reachability argument, an owner and an
expiry. It was written for `image-size`, and its own words are the test:

> *"Every published version is affected. There is no upgrade, and a `pnpm.overrides` entry has
> nothing to point at."*

Here there is an upgrade. Writing seventeen reachability arguments would be using the escape
hatch on the exact case it was explicitly not written for — and the gate's own message says so
first: *"Fix it by upgrading if a patched version exists."*

**The two `image-size` acceptances are untouched.** They are still the case ADR-0059 describes,
and they still expire on 2026-11-21.

## Root cause

The repository has **no `pnpm.overrides` at all**, and both packages are transitive. Nothing
holds either above its advisory range, so the lockfile settled on the last pre-advisory patch of
each line and stayed there.

## The fix

Range-scoped overrides, so each line moves within its own minor and `@expo/plist` is not dragged
from the 0.8 API it declares onto 0.9:

```json
"pnpm": {
  "overrides": {
    "@xmldom/xmldom@^0.8.0": "^0.8.15",
    "@xmldom/xmldom@^0.9.0": "^0.9.12",
    "js-yaml@^3.0.0": "^3.15.2",
    "js-yaml@^4.0.0": "^4.3.2"
  }
}
```

A bare `"@xmldom/xmldom": "^0.9.12"` would be shorter and wrong: it forces a major-ish jump on a
consumer that asked for `^0.8`, to fix advisories that have a 0.8 patch of their own.

## Test plan

- **The lockfile resolves to the patched versions**, read back from `pnpm-lock.yaml` rather than
  assumed from the override text.
- **Gate 15 passes**, and the count of accepted entries is still **2** — the fix must not have
  quietly widened the acceptance list.
- **`build` and `test`**, because `xmldom` is on the Expo config path and `js-yaml` is used by
  tooling this repository runs. A patch bump is low risk and not no risk.
- The other three `pnpm security` legs, which were already green, stay green.

## Verification

`state · typecheck · lint · format:check · test · build`, plus `pnpm security` end to end.

## Risks

- **An override is a claim about compatibility.** Patch bumps within a minor are the safest form
  of it, and the run below is what turns the claim into evidence.
- **Overrides are sticky.** They stay after the ecosystem catches up, silently pinning versions
  nobody revisits. Each entry therefore carries a comment naming what it closes, so a future
  reader can tell whether it is still load-bearing.

## Out of scope

The moderate advisories, which are reported and do not block — that threshold is ADR-0059's
decision and is not being revisited here.
