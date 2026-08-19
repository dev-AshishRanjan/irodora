# Plan: F-025 — Claims copy lint

| | |
|---|---|
| **Feature** | F-025 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-21 — [`docs/PRD.md`](../../docs/PRD.md) |
| **Service / package** | `root` — `scripts/verify-claims.mjs`, run by gate 2 (`lint`) |
| **Author** | Claude Opus 5 |
| **Date** | 2026-08-19 |

---

## Intent

[ADR-0031](../../docs/adr/0031-measurement-claims-policy.md) says no user-facing claim about
colour accuracy may exist without a published measurement behind it, and that it is **enforced
by a copy lint, not by review**. Today it is enforced by review, which the governance document
itself says does not survive a launch week.

Golden rule 11 — *never overstate accuracy* — is one of three product-specific rules, and it is
the only one with no gate behind it. This builds that gate.

Done means: a banned construction anywhere in this repository fails `pnpm lint`, and the ways
of getting an exemption are few, explicit, and each carries a reason a reviewer can check.

## The problem this has, and it is the whole design

**The banned phrases must appear in this repository.** ADR-0031 lists them. So does
[`measurement-claims.md`](../governance/measurement-claims.md), the `measurement-claims` skill,
`color-science.md`, and the lint itself. A naive scan flags 18 files and most of them are the
policy, not a violation of it.

A blanket path exemption for "docs that discuss the policy" would then be the whole gate: every
real claim in `docs/` would sit inside the exemption. So exemptions are split by **kind**, and
the kinds are not interchangeable:

| Kind | What it covers | What it must carry |
|---|---|---|
| `policy-source` | Files that DEFINE the ban and must quote it | An explicit path, and a reason naming the policy |
| `negated` | A line that forbids the phrase or records its absence — `no isExactMatch`, `never say "exact colour"` | An inline `claims-ok:` marker with a reason, on that line |
| `measured` | An actual accuracy claim, with a measurement behind it | A link to the row in the device-lab results (NFR-2) |

There are **zero** `measured` exemptions today, because there are no measurements yet. That is
the correct state and the lint reports it, so an empty allowlist cannot be mistaken for a
thorough one.

## Approach

**Reused:** the shape of `verify-content.mjs` and `verify-contrast.mjs` — a zero-dependency
Node script, run by `pnpm lint`, that fails if it cannot find its inputs. And the shape of
`verify-content-proof.mjs` for the mutation proof.

**New:**

```
scripts/verify-claims.mjs          the lint
scripts/verify-claims-proof.mjs    the mutation proof — acceptance criterion 4
.harness/verification/claims.json  the banned constructions, the allowlist, and the
                                   provenance language table — DATA, not code
packages/testing/fixtures/claims/  one clean fixture, N violating fixtures
```

The patterns live in `claims.json` rather than in the script for the same reason recommendation
weights are content: the list will grow, and growing it should not be a code change.

**Increments:**

1. `claims.json` — banned constructions, provenance language table, allowlist with the three
   kinds. Nothing reads it yet.
2. `verify-claims.mjs` — scans, reports, exits non-zero. Not yet wired to `lint`.
3. Fixtures + `verify-claims-proof.mjs`. **The proof runs before activation**, because a gate
   nobody has watched fail is configuration that parses.
4. Fix the real findings the lint reports (see below), then wire it into `pnpm lint` and CI, and
   flip the gate active.

## The real findings, from a scan done before writing the lint

Sixteen of eighteen files are `policy-source` or historical record. Two are not:

- **`packages/corpus/src/derive.ts`** (3 occurrences) — "the true colour" meaning the
  colorimetric XYZ as against the gamut-clipped hex. Technically precise and internal, but
  "true" is doing no work that **"specified"** does not do better, and it is the exact word the
  policy bans. **Rename, do not exempt.** The governance is explicit that an identifier is as
  much a violation as a button label, because a name propagates into a field, then a response,
  then copy.
- **`packages/color-naming/src/name.ts`** — "no `isExactMatch`", a line recording the
  deliberate *absence* of the thing. That is `negated`, and gets an inline marker.

`docs/design/*` and `docs/PRD.md` need reading case by case in increment 4; each is either
`policy-source`, `negated`, or a real defect to fix.

## Files to touch

```
.harness/verification/claims.json      NEW — the patterns and the allowlist
scripts/verify-claims.mjs              NEW — the lint
scripts/verify-claims-proof.mjs        NEW — the mutation proof
packages/testing/fixtures/claims/*     NEW — clean + violating fixtures
package.json                           lint script gains verify-claims
.github/workflows/ci.yml               mirrors it (gate 0 checks this)
.harness/verification/gates.json       lint description; F-025 activation
packages/corpus/src/derive.ts          rename "true colour" -> "specified colour"
packages/color-naming/src/name.ts      inline claims-ok marker
```

## Anticipated effects

**No engine behaviour changes.** `derive.ts` is a comment and a field-adjacent rename; if any
exported identifier changes, `typecheck` catches every caller. The golden datasets are
untouched, so no claim about physical reality moves.

The one real effect: **`lint` gains a way to fail that has nothing to do with types.** A
contributor adding honest-sounding marketing copy will now be stopped by a gate rather than a
reviewer. That is the point, and it is also the risk — if the patterns are too broad the gate
becomes something people route around. Hence the three exemption kinds, each requiring a
stated reason rather than a bare path.

Guard: `verify-claims-proof.mjs`. Every banned construction must be watched to fail, and **one
case must stay green** — a file that legitimately quotes the policy — because a proof where
everything is red cannot distinguish a working gate from one that fails on everything.

## Test plan

- **Unit:** none. The script is the check; its fixtures are its tests.
- **Fixture corpus:** one clean file that must stay green, and one violating file per banned
  construction plus one per exemption kind used wrongly (a `negated` marker with no reason, a
  `measured` entry with no link).
- **Mutation proof:** `verify-claims-proof.mjs` plants each banned construction into the CLEAN
  fixture and asserts the lint goes red **and names the right phrase and file**, with the
  baseline asserted green before and after each case.
- **Negative control:** the clean fixture, unmutated, must exit 0 — including the line that
  quotes a banned phrase under a valid `claims-ok:` marker.

## Gates

`state` · `lint`

`lint` is the subject. `state` because gates.json, the CI mirror and the feature record must
stay consistent — gate 0 checks all three.

## What this deliberately does NOT do

**Acceptance criterion 2 — "permissible language is bound to `Provenance.source`" — cannot be
fully statically checked, and pretending otherwise would be worse than saying so.** Deciding
whether the word "measured" sits near an `estimated` value needs the render tree, which does not
exist until F-017/F-039.

What ships instead: the provenance language table lives in `claims.json` as data, and the lint
enforces the half that is decidable today — **the globally banned constructions, everywhere,
including identifiers.** The source-conditional half activates with the message catalogue, and
the lint prints on every run that it is not yet checking it. Same precedent as gate 9, which
prints that it does not scan rendered surfaces.
