# Onboarding

For a human or an agent arriving for the first time. Reading order, and why each step
matters.

---

## 1. What this is (10 minutes)

| Read | For |
|---|---|
| [`../../README.md`](../../README.md) | The one-page picture |
| [`../../AGENTS.md`](../../AGENTS.md) | **How work is done here.** Binding |
| [`../../docs/PRD.md`](../../docs/PRD.md) §1–3 | The product and the problem |

## 2. How it is built (20 minutes)

| Read | For |
|---|---|
| [`../../docs/architecture/ARCHITECTURE.md`](../../docs/architecture/ARCHITECTURE.md) | The system |
| [`../../docs/architecture/color-engine.md`](../../docs/architecture/color-engine.md) | **The product itself.** Everything else is an interface to it |
| [`../../docs/adr/README.md`](../../docs/adr/README.md) | What was decided and why |

**Read these four ADRs before touching anything:**

- [0001](../../docs/adr/0001-monorepo-modular-monolith-with-extraction-triggers.md) — why one repo, three deployables
- [0002](../../docs/adr/0002-deterministic-core-tiered-capability-policy.md) — what "deterministic" permits and forbids
- [0005](../../docs/adr/0005-measurement-provenance-is-a-type.md) — why a colour cannot exist without its provenance
- [0031](../../docs/adr/0031-measurement-claims-policy.md) — what we are allowed to claim

## 3. Get it running (15 minutes)

the [README](../../README.md). There are no local services to start — no database, no cache, no object store — so the whole of setup is `pnpm install` and an Expo dev client.

```bash
corepack enable
cp .env.example .env
docker compose up -d
node scripts/verify-state.mjs
```

## 4. Do the work (ongoing)

| Read | When |
|---|---|
| [`workflow.md`](workflow.md) | Before your first feature |
| [`session-lifecycle.md`](session-lifecycle.md) | Before your first session |
| [`../rules/`](../rules/) | Whatever you are about to touch |
| [`../skills/`](../skills/) | Whatever you are about to do |

---

## Five things this codebase does differently

Each surprises people, and each has a reason worth understanding before you argue with it.

**1. Colour values carry provenance in their type.** You cannot construct a colour without
saying how it came to exist. This is not ceremony — it makes it structurally impossible to
display an estimate as if it were a measurement
([ADR-0005](../../docs/adr/0005-measurement-provenance-is-a-type.md)).

**2. The colour engine has no dependencies and no platform APIs.** No `node:*`, no DOM, no
`process`. It must produce byte-identical results in Node, the browser and React Native.
That is NFR-3, and it is the one guarantee that cannot bend
([ADR-0004](../../docs/adr/0004-own-the-colour-engine-culori-as-test-oracle.md)).

**3. Golden datasets are claims about physical reality.** Changing one requires an ADR. If
a test fails after you change the engine, the default assumption is that you broke the
engine — not that the expected value needs adjusting.

**4. Recommendation weights live in `content/`, not in code.** Changing a weight is a
content publish, not a deployment
([ADR-0011](../../docs/adr/0011-recommendation-rules-are-versioned-content.md)).

**5. Accessibility is a build gate.** A contrast regression fails the build. Colour is
never the only channel, anywhere
([ADR-0021](../../docs/adr/0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md)).

---

## Two things that will get a change rejected

**Overstating accuracy.** In the UI, in a comment, or in your own report of what you
verified. If you did not run the gate, say so
([ADR-0031](../../docs/adr/0031-measurement-claims-policy.md)).

**Leaving a known break unrecorded.** If your change breaks something you are not fixing
now, it goes in `effects.json` and the feature list. Silence about a known break is the
most expensive thing anyone can do here
([effect-link](../protocols/effect-link.md)).

---

## Your first task

Run `node scripts/verify-state.mjs`. It should pass. Then read the output of
[`/next-feature`](../commands/next-feature.md) and the plan for whatever it names.

If gate 0 does not pass on a fresh clone, that is a bug in the harness and it takes
priority over whatever you were going to do.
