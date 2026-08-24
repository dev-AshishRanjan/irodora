# ADR-0066 — The app verifies the corpus with `@noble/hashes`, and ships the bundle as generated text

## Status

Accepted

## Date

2026-08-24

## Context

F-018 is the first surface to read a published corpus version. Two things stand between
`content/versions/2026.08.1.json` and a rendered swatch, and neither had been decided.

### 1. There is no synchronous SHA-256 on the device

[`load.ts`](../../packages/corpus/src/load.ts) offers exactly one way into a `VersionBundle`
from text, and it takes the expected root digest as an argument:

```ts
loadPublishedVersion(bundleText, expectedRootDigest, digestOf: DigestFn): VersionBundle
```

`DigestFn` is **synchronous**. There is no warn mode and no `{ verify: false }`, deliberately —
*"an option to skip verification is a verification nobody performs on the day it matters."*

`scripts/` passes `node:crypto`. The app cannot: `packages/color-*` and `packages/corpus` may
not import `node:*` (NFR-3), and React Native has no `crypto` module. The Expo option,
`expo-crypto`, offers `digestStringAsync` and no synchronous string digest at all.

Making the load path async would work and would cost the guarantee: verification moves behind
a promise resolved during or after the first render, and *"verified at load"* becomes *"verified
shortly after we started drawing"*. The threat model asks for the former.

### 2. The bundle has to reach the app, as text

`content/` sits outside `apps/mobile/`, so Metro does not see it without a watch folder. And
the function takes **text**, not a parsed object.

Importing the JSON and calling `JSON.stringify` on it would verify correctly — the digest is
taken over a canonical form rather than over file bytes, so a re-serialisation still hashes to
the same value. It would also mean re-serialising 450 KB on every cold start to reconstruct a
string we could have shipped, and it puts one more transformation between the file that was
published and the artefact that is checked.

## Decision

### `@noble/hashes` supplies the digest, and `assertSha256` decides whether to trust it

**`@noble/hashes@2.3.0`, MIT, zero runtime dependencies, synchronous, pure JS.** The app wraps
it once:

```ts
const sha256 = (text: string) => bytesToHex(nobleSha256(utf8ToBytes(text)));
```

Three things make this the right shape rather than merely a working one:

1. **Not hand-written.** A checksum is a tamper control. When one is needed, the answer is a
   reviewed implementation, not a fresh one — and SHA-256 has enough edge cases (length
   padding, the 55/56-byte block boundary, UTF-8 versus UTF-16 encoding) that "it matches on the
   inputs I tried" is not evidence.
2. **Not trusted on arrival either.** `assertSha256` already exists as the acceptance seam and
   runs the candidate against published FIPS vectors **before it is used anywhere**. The fourth
   vector is `藍鼠`, which catches a hasher that encodes UTF-16 — the failure most likely to
   survive an ASCII-only test and then break on precisely this corpus. All four pass.
3. **It is the same primitive the publish used.** `assertSha256` is called by the generator, by
   gate 11 and now by the app, so a disagreement between what was published and what the device
   verifies would be caught at the vector, not at the corpus.

`expo-crypto` remains available and unused. If a future feature needs a digest it may
legitimately be async — a file export, say — that is the moment to reconsider, not this one.

### The bundle ships as a generated module carrying its text and the ledger's digest

```
content/versions/2026.08.1.json  ─┐
content/versions/index.json      ─┴─→ scripts/generate-corpus-bundle.mjs
                                          ↓
              apps/mobile/src/corpus/generated/bundle.ts   ← generated, --check in gate 11
```

The module exports the bundle **as a string** and the expected root digest **from the ledger**,
as two separate constants. That separation is the mechanism, not a formality: a bundle carrying
its own expected digest verifies itself, which is why the ledger holds the expected value in
the first place ([ADR-0046](0046-published-corpus-is-an-immutable-generated-bundle.md)).

This is the shape every other generated output in this repository already has — written by a
script, never hand-edited, and verified current by `--check` inside the gate that owns it, like
`generate-design-tokens` and `generate-font-subset`. The version is **pinned by generation**
rather than resolved at runtime, so which corpus the app holds is a fact in a committed file.

## Consequences

**Good.** Verification happens before the first render, synchronously, with no promise and no
option to skip it. The primitive is audited *and* checked against published vectors by code
that runs in the build, so neither the dependency nor our wrapper is taken on faith. The app's
corpus version is visible in a diff. And a publish that forgets to regenerate fails `gate:content`
rather than leaving the device on a stale version that looks fine.

**Bad, and worth saying plainly.**

- **A crypto dependency in the app, and the first one.** It is small, audited and MIT, and it is
  still a supply-chain edge that did not exist yesterday. `pnpm security:audit` covers it;
  `NOTICE.md` records it.
- **450 KB of JS string in the bundle, plus a `JSON.parse` and 125 digests on the startup
  path.** That is the price of ADR-0051's no-network guarantee and of verifying at load rather
  than trusting. It is a measurable cost and is not measured yet — if it is visible on a cold
  start it is a work item (F-057's territory), never a reason to defer the check.
- **The generated module duplicates the bundle in the repository**, so `content/versions/` and
  `apps/mobile/src/corpus/generated/` both hold it. The `--check` is what keeps them one thing;
  without it this would be two files with a convention between them.
- **A generated 450 KB TypeScript file is unpleasant to review.** It is excluded from
  formatting for the same reason other generated output is, and nothing about it should ever be
  read as authored.

**Neutral.** No change to `@irodora/corpus`. The `DigestFn` seam was designed for exactly this
and needed no adjustment, which is the strongest evidence that F-011 drew the boundary in the
right place.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **`expo-crypto` with an async load** | The obvious platform answer. Rejected because the only API is `digestStringAsync`, and moving verification behind a promise means the first frame can be drawn from an unverified bundle. The guarantee is *at load*, and an async load has no single moment that is "load" |
| **Write our own SHA-256** | Perhaps 60 lines of a well-specified algorithm, and no dependency. Rejected: a tamper control should not be the place we save a dependency, and padding and encoding bugs pass casual tests. `assertSha256` would catch a wrong one — which is an argument for having the seam, not for filling it ourselves |
| **`react-native-quick-crypto`** | Native, fast, and a synchronous API. Rejected as far heavier than the need: a native module, a rebuild, and a much larger surface than one hash of one string at startup |
| **Skip verification on device; trust the build** | The bundle is inside the signed app, so an attacker who can alter it can alter the code. True, and rejected anyway: FR-25 and the threat model both say *verified at load*, and the check also catches the non-adversarial case — a bad merge, a partial write, a stale generated module — which is the one that actually happens |
| **Import the JSON and `JSON.stringify` it back** | No generator, no duplication. Rejected for the startup cost of re-serialising 450 KB to check a hash, and because `content/` is outside the app and would need a Metro watch folder — making the pinned version an artefact of resolver configuration rather than a committed fact |
| **Metro watch folder over `content/`** | Avoids duplication. Same objection, plus it puts a repository-root path into the app's build config, which does not survive the app being built anywhere other than this monorepo |
| **Ship the bundle as an app asset and read it with `expo-file-system`** | Keeps it out of the JS bundle. Rejected: the read is async, which reopens the first problem, and an asset is easier to swap than a JS module without either being detectable |

## Revisit when

- **Startup time is measured on a device** (F-057, F-063's rig). If the parse-and-verify pass is
  visible on a cold start, the answer is to move it off the first frame with the check intact —
  never to drop the check.
- **A second corpus version ships.** The generator pins one label; holding two, or migrating
  between them, is a different design and this ADR does not cover it.
- **Anything else in the app needs a hash.** If the second use is naturally async, whether
  `expo-crypto` should serve both is worth reopening.
- **`@noble/hashes` changes its export shape.** The subpath is `@noble/hashes/sha2.js`,
  extension included, and v2 moved `sha256` out of `sha256.js` into `sha2.js` — a detail worth
  remembering at the next major.
