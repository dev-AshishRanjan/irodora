# ADR-0056 — The message catalogue is enumerated TypeScript, and a missing key is a typecheck error

## Status

Accepted

## Date

2026-08-20

## Context

NFR-11 requires English and Japanese from the first release with no hard-coded user-facing
string, verified by *"an enumerated message catalogue with a completeness check"*.
[ADR-0028](0028-i18n-en-ja-from-day-one.md) settled that both languages ship together and,
critically, that **there is no fallback**: an untranslated string must fail the build rather than
silently render in English.

That last requirement is the one that selects the mechanism, and it disqualifies most of the
field. **Fallback is the core behaviour of every mainstream runtime i18n library.** i18next's
`fallbackLng` is on by default; turning it off is configuration, and configuration can be turned
back on by anyone, in a commit nobody reads closely, with no test failing. A guarantee that
depends on a config flag staying false is not a guarantee — it is a reminder.

This repository already has the better pattern twice.
[ADR-0005](0005-measurement-provenance-is-a-type.md) made provenance non-optional by putting it
in the type rather than in a review checklist, and `statusPresentation()` made NFR-9 structural by
refusing to compile without all three channels. The recorded lesson is
[[provenance-in-the-type-is-what-makes-honesty-structural]] — *ask what makes a guarantee
impossible to violate, not what reminds people not to.*

There is a second constraint that is easy to miss: `apps/mobile` requests **no network permission
on either platform**, and `app.config.ts` blocks `android.permission.INTERNET`. A runtime i18n
framework that can lazy-load a locale bundle is carrying a capability the app is built to refuse.

## Decision

**The catalogue is enumerated TypeScript. English is the source of the key set, and Japanese is
typed against it.**

```ts
export const en = { ... } as const;
export type MessageKey = keyof typeof en;
export const ja: Record<MessageKey, string> = { ... };
```

A **missing** key fails `tsc`. An **extra** key fails `tsc`. Neither needs a script, and neither
can be switched off by configuration. No runtime i18n dependency is added.

1. **Locale comes from the device** via `expo-localization`, with an in-session override.
   **Persisting the preference is F-041's**, because storage is, and F-017 says so rather than
   inventing a second store.
2. **A hard-coded user-facing string fails `lint`**, with a guard in `verify-guards.mjs` proving
   the rule fires — a rule nobody has watched fail is configuration that parses.
3. **Every declared key must be referenced at a call site.** An unused key is a string nobody
   removed, and it is also the shape a copy-paste placeholder hides in.
4. **A Japanese value identical to its English value is a failure**, outside a short explicit
   allowlist for strings that are genuinely identical in both (`"OKLCh"`, `"ΔE00"`). This is the
   check that catches the placeholder that type-checks.
5. **Translation review is recorded machine-readably, and is not the same thing as translation
   presence.** Each `ja` entry carries a review status against a roster id
   ([ADR-0047](0047-editorial-identity-is-a-roster-id-not-a-name.md)), and the **unreviewed count
   prints on every run**. *"A missing translation fails the build"* must never quietly become
   *"an unreviewed translation passes silently."*

### ADR-0028 is amended, not superseded

Three of its clauses describe a system that no longer exists
([ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md)):

- §2 — *server responses carry message keys, never prose* — **retired**; there are no responses.
- §5 — *`Accept-Language` negotiation* — becomes the **device locale**. <!-- retired-ok: A migration line naming what the mechanism became. -->
- §6 — *locale is part of the cache key* — **moot**; there is no cache tier.

Its substance — both languages from day one, no fallback, no retrofit — stands and is what this
record implements.

## Consequences

**Good**

- The completeness check is the compiler. It cannot be disabled, cannot drift, and needs no
  bespoke script to maintain.
- **Zero runtime dependency and zero bundle cost**, in an app whose central claim is that it
  works with no network and requests no permission to use one.
- Autocomplete and go-to-definition work on message keys, and renaming one is a refactor rather
  than a search.
- The unreviewed-translation count is visible, so the gap between "translated" and "reviewed"
  cannot be mistaken for closed.

**Bad**

- **We lose ICU.** Plurals, gender and number formatting are ours to handle. English plurals are
  the real cost, and the honest mitigation is to prefer copy that does not inflect
  ("2 colours" over "2 colour(s)", counts rendered separately from nouns) — which is a
  constraint on the writing, not only on the code. `Intl.NumberFormat` and `Intl.DateTimeFormat`
  are available and are used for numbers and dates; this decision is about *messages*.
- No translation-management tooling. There is no XLIFF export, and no translator can work in a
  familiar tool without an exporter someone has to write.
- Every locale is in the bundle. At two languages this is nothing; at twelve it would be a
  reason to revisit.
- Hand-rolling means we own interpolation, and it must be written so a translator cannot
  accidentally break it.

**Neutral**

- Japanese typography — line height, line breaking and font coverage — is a separate decision
  ([ADR-0057](0057-the-japanese-face-is-a-bundled-noto-sans-jp-subset-generated-from-the-corpus.md)) and not affected here.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **i18next / react-i18next** | The ecosystem default, with real plural rules, interpolation, namespaces, lazy loading and mature tooling — and it would save us writing an interpolator. Its core behaviour is **fallback**, which is the exact property ADR-0028 forbids; suppressing it is a config flag, and the guarantee would then be only as strong as that flag. It also adds ~40 kB and a runtime dependency, and its lazy-loading capability is meaningless in an app that cannot open a socket. |
| **Lingui** | The strongest alternative, and the one worth reopening later. Compile-time extraction plus real ICU means we would keep plurals *and* get a build-time completeness check — genuinely both halves. Rejected for now on weight rather than on merit: it adds a macro-based build step and a CLI to a toolchain that is already Turborepo + tsc + two test runners, for two languages and roughly a hundred strings. The moment plural handling starts distorting the copy, this is what to reach for. |
| **FormatJS / react-intl** | Full ICU and the reference implementation of it. Heavier than Lingui for the same benefit, with a runtime message compiler we would be shipping to a device to solve a problem we can solve at build time. |
| **`i18n-js`** | Small and simple, which is the appeal. Fallback again, by default and by design — same disqualification as i18next, with less tooling to show for it. |
| **JSON catalogues plus a completeness script** | The conventional shape, and translator-friendly. Strictly weaker than the type: a script is a thing that must be wired into a gate, kept running, and not skipped, whereas `tsc` is already blocking and already runs. It also loses autocomplete at every call site. |

## Revisit when

A third locale is committed to, **or** the first message needs a plural rule that cannot be
written around without the copy suffering — that is the point where Lingui's compile-time ICU
starts paying for its build step.
