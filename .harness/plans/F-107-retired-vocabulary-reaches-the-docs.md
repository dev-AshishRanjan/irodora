# Plan: F-107 — The retired-vocabulary check reaches the architecture docs

|                       |                                                              |
| --------------------- | ------------------------------------------------------------ |
| **Feature**           | F-107 — [`feature_list.json`](../state/feature_list.json)     |
| **Requirements**      | NFR-20 — [`docs/PRD.md`](../../docs/PRD.md)                   |
| **Service / package** | `root` — the harness gate                                     |
| **Author**            | Claude Code (generator)                                       |
| **Date**              | 2026-09-01                                                    |
| **Blockers**          | none                                                          |

---

## Intent

Gate 0's retired-surface check builds its subject list from feature `acceptance` entries,
`attested[].criterion` entries and PRD requirement rows — **and nothing else**.
`docs/architecture/` and `docs/adr/` are entirely outside its corpus.

The evidence that this matters is that **it missed its own vocabulary**:
`docs/architecture/security/privacy-design.md` §4 contained *"per-tenant data key"*, and
`\bper-tenant\b` is literally one of the seven declared terms. Gate 0 was green over it for
months.

## Measured first, because the design depends on the volume

| zone | files | findings |
| --- | --- | --- |
| `docs/architecture` | 5 | **13** |
| `docs/adr`, all | 80 | **91** |
| `docs/adr`, excluding superseded/retired | 67 | **31** |

**91 would have been the wrong answer.** The bulk sits in ADR-0025 (15), ADR-0012 (12),
ADR-0018 (6), ADR-0017 (4) — every one of them **superseded**, and superseded ADRs describe the
retired world *because that is what they are for*. Flagging them would be wrong, and marking 91
lines `retired-ok:` would turn the marker into wallpaper.

### So status is the filter, and it is principled rather than convenient

An ADR whose Status is **Superseded**, **Retired** or **Rejected** is a historical record and is
skipped. An **Accepted** ADR describing a retired surface as current is exactly the defect.

That leaves **31**, each needing a one-line judgement — corrected, or marked with a reason. The
status parse must handle both spellings in the corpus: `**Superseded by [ADR-0051]...**` and a
bare `Accepted` on the following line.

## The third criterion is the one that matters

> *A term for the retired server tier — worker, API process, TLS, cloud sync — is in the
> vocabulary, planted and watched firing.*

**Widening the corpus without widening the vocabulary would find "per-tenant" and still miss
"the worker".** Terms to add, each citing ADR-0051:

| term | pattern | why it is careful |
| --- | --- | --- |
| the worker process | `\bthe worker\b`, `\bworker process\b` | not bare `worker`, which appears in "worklet" and in VisionCamera prose |
| the API process | `\bAPI process\b` | **not** bare `\bthe API\b` — "the API" legitimately means a library surface throughout |
| transport security | `\bTLS 1\.\d\b`, `\bHSTS\b`, `\bcertificate pinning\b` | not bare `TLS`, which appears in sentences *denying* transport security |
| cloud sync | `\bcloud sync\b`, `\bsynced wardrobe\b` | narrow on purpose; `synced` alone is too common |
| a key management service | `\bKMS\b` | unambiguous |

Every one of these was measured against the corpus before being written down, which is how the
bare-`the API` and bare-`TLS` traps were found rather than shipped.

## What gets corrected rather than marked

From this feature's own filing notes, the substantive rot:

- **`.harness/rules/security/security.md`** — *"Decoding happens only in the worker … never in
  the API process"*, *"the worker runs non-root, read-only filesystem, no network egress"*,
  per-tenant rate limits, and a CSP/HSTS line. **This is the worst instance in the repository**,
  because a security rule that describes a worker process gives a reader instructions they
  cannot follow — and F-042's criterion 4 was written *from* that rule, so the rot propagated
  into the scope file where the check does look, in vocabulary it did not know.
- **ADR-0026 §4 and §7** — uploads gated on cloud sync, and a server that decrypts synced
  images.

**`.harness/rules/` is corrected but NOT added to the scan.** Criterion 1 names
`docs/architecture` and `docs/adr`, and the definition of done says *"acceptance criteria met
exactly — no more, no less"*. Fixing a file without a guard that would catch its regression is
a real gap and it is **filed**, not silently widened into. The 11 findings measured there are
the evidence for that follow-up.

## The marker is for naming a retired thing in order to deny it

`.harness/rules/security/privacy.md:114` is the model: *"it used to be that our server could
decrypt synced wardrobe images. **There is no server.**"* That sentence is correct **because**
it names the retired thing. It takes the marker with a reason; it does not get rewritten.

## Files to touch

```
scripts/verify-state.mjs                        — the corpus, the ADR status filter
.harness/verification/retired-surface.json      — five new terms
docs/architecture/**.md                         — 13 findings, triaged
docs/adr/**.md (accepted only)                  — 31 findings, triaged
.harness/rules/security/security.md             — the substantive rewrite
docs/adr/0026-privacy-on-device-by-default.md   — §4 and §7
```

## Anticipated effects

| Change | Dependents | Guard |
| --- | --- | --- |
| The scan's corpus widens | every doc in two trees | `gate:state` |
| New vocabulary | the same, plus future writing | `gate:state` |
| A security rule is rewritten | anything planned from it | none — see below |

**A link is likely owed on the security rule.** F-042's criterion 4 was written *from*
`security.md`, so that file is a source that feeds scope files. Rewriting it is a shared-contract
change in the sense the effect-link protocol means. Decided at the trace, not asserted here.

## Test plan

- **Criterion 1 — watched failing on a real instance.** The `--prove` path plants a retired term
  in an architecture doc and asserts gate 0 goes red naming the file and line. The instance is
  real, not invented: `per-tenant` in `privacy-design.md` is the one that was missed.
- **Criterion 3 — planted and watched firing.** Each new term is planted in turn and the verdict
  must follow, naming that term. A term that never fires is a term that does not work.
- **The superseded filter is watched both ways.** A retired term in a *superseded* ADR must
  **not** fire, and the same term in an *accepted* ADR must. Without the negative case the filter
  could be skipping everything.
- **The marker still works** in the new zones, with a reason required.
- **Gate 0 is green at the end** with every finding either corrected or marked.

## Verification

```
node scripts/verify-state.mjs
node scripts/verify-state.mjs --prove   (if that path exists for this section)
```

This feature's verification list is `state` alone. `format:check` also runs because markdown is
formatted. Not applicable: every gate that reads code — this changes prose and one checker.

## Risks and open questions

- **A term too broad turns the gate into noise and gets it disabled.** That is why bare `the API`
  and bare `TLS` were rejected *after measuring*, rather than reasoned about.
- **Triaging 44 findings by judgement is the bulk of the work**, and the failure mode is marking
  something that should have been corrected. The rule applied: mark only when the sentence is
  *about* the retired thing; correct when it describes it as current.
- No `OQ-*` bears on this.

## Out of scope

- **Adding `.harness/rules` to the scan** — filed instead, per criterion 1's wording.
- **Superseded ADRs**, which are history and stay as written.
- **Rewriting `security.md` beyond the retired-surface findings.** Its threat-model content that
  still applies is not reopened.
