# Plan: F-109 — The preference weights are inspectable and resettable

|                       |                                                          |
| --------------------- | -------------------------------------------------------- |
| **Feature**           | F-109 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements**      | FR-37 — [`docs/PRD.md`](../../docs/PRD.md)                |
| **Service / package** | `mobile` — `apps/mobile`, `@irodora/ui`                   |
| **Author**            | Claude Code (generator)                                   |
| **Date**              | 2026-09-01                                                |
| **Blockers**          | F-046 (done)                                              |

---

## Intent

FR-37 says a person **can see and reset** their preference weights. F-046 built the mechanism
and deliberately did not build the surface: `listPreferences()` returns every pairing with its
counts, `resetPreferences()` removes them. So the data is inspectable and resettable **and
nothing renders it**, which means no person can currently see or reset anything.

This is the fifth feature in a row that computed something nobody can see (F-046, F-048, F-049,
F-110, F-050). It is the one that starts paying that back.

## The second criterion is the whole design

> *The derived weight is shown **beside** the counts it comes from, never instead of them.*

F-046 stored **counts** rather than a float precisely so the number would stay explicable. A
surface showing only `1.19×` would turn an inspectable mechanism back into an opaque one and
undo the storage decision at the last step.

So every row shows **accepted, rejected, and the weight** — and the weight is rendered as the
*result of a formula over the two numbers beside it*, not as an authority in its own right.

`preferenceWeight` is *"linear to saturation, then flat"* and F-046's own doc says the reason is
that **"each of the first eight nets moves it one eighth of the way" is a sentence a person can
check by hand.** The surface should make that checkable: show the net, since the weight is a
pure function of it and two rows with the same net having the same weight would otherwise look
like a bug.

## Colour is never the only channel (golden rule 13)

A preference is naturally drawn as a bar or a tint. **Neither may carry the meaning alone.**
Every row states its numbers as text; any visual treatment is redundant with them. A row that
leans positive and one that leans negative differ in their **words and numbers** first.

## Reset says what it removes, before it removes it

Criterion 3, and `resetPreferences` is a **hard delete** — the repository's only one, because a
tombstone would be a record of what somebody asked to have forgotten.

So the surface asks first, and the confirmation **names the count**: *"Forget all 7 pairings?
This cannot be undone."* A dialog that says "are you sure?" without saying what goes is asking
somebody to confirm a thing they have not been told.

## Approach

**New:** `apps/mobile/src/screens/Preferences.tsx` and `apps/mobile/app/preferences.tsx`, in the
shape `PaletteStudio` already uses — a screen component taking a store, and a thin route.

**Reused:** `Text`, `Surface`, `Button` from `@irodora/ui`; `preferenceWeight` and
`PREFERENCE_SATURATION` from `@irodora/recommendation`; `listPreferences` / `resetPreferences`
from the repository. **No new colour maths and no new formula** — the weight is imported, never
recomputed, so the screen cannot drift from the engine.

**Empty state matters here.** A person who has expressed nothing sees an explanation of what
would appear and why, not a blank list. That is the state most people will see first.

## Files to touch

```
apps/mobile/src/screens/Preferences.tsx   — NEW
apps/mobile/app/preferences.tsx           — NEW, the route
apps/mobile/src/i18n/en.ts                — NEW keys
apps/mobile/src/i18n/ja.ts                — the same keys, or the locale gate fails
apps/mobile/test/screens.test.tsx         — three conformance subjects + criterion tests
```

## Anticipated effects

| Change | Dependents | Guard |
| --- | --- | --- |
| A new screen | the a11y and contrast suites | `gate:a11y`, `gate:contrast` |
| New message keys | both locales | `gate:test` (the catalogue is enumerated TypeScript) |
| A second reader of `preferenceWeight` | `@irodora/recommendation` | `gate:typecheck` |

**A link may be owed on the last row.** `preferenceWeight` had one caller inside the engine;
a screen is a second, with a different need — it renders the number *and its inputs*. Changing
the formula now changes what a person is shown about their own data. Decided at the trace.

## Test plan

- **Criterion 1** — every pairing returned by `listPreferences` appears, with both counts.
  Asserted against a store carrying several pairings, including one with zero rejections and one
  net-negative.
- **Criterion 2, the decoy** — a row's rendered text must contain **both counts**, not only the
  weight. The test fails if the weight is present and a count is not, which is exactly the
  regression that would undo F-046's storage decision.
- **The weight matches the engine** — recomputed in the test with `preferenceWeight` and
  compared, never against a literal. A hard-coded expected value would pass even if the screen
  carried its own copy of the formula.
- **Criterion 3** — reset is reachable; the confirmation names the number of pairings; the store
  is untouched until it is confirmed. **The last clause is the one worth writing:** a reset that
  fires on the first tap would satisfy "reachable" and lose somebody's data.
- **Empty state** renders and explains rather than showing an empty list.
- **Conformance**: three subjects — populated, empty, and mid-confirmation — through the same
  suite every other screen uses, in both themes.
- **Japanese**: every new key exists in both catalogues.

## Verification

Commands from [`gates.json`](../verification/gates.json), run **one at a time**.

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:a11y && pnpm test:contrast
```

`a11y` and `contrast` are this feature's own list and are the point of it. `color-golden` does
**not** apply: no colour maths is added or changed.

## Risks and open questions

- **A family pairing is two family names**, which are corpus vocabulary rather than free text.
  The screen must render them as words a person recognises; if the only available form is a
  slug, that is a finding to record rather than paper over.
- **The confirmation is the only thing between a tap and an irreversible delete**, so its test is
  a correctness test, not a UI nicety.
- No `OQ-*` bears on this.

## Out of scope

- **Editing a single pairing, or deleting one.** FR-37 says see and reset; per-row deletion is a
  different consent story and is not asked for.
- **Explaining how the weight affects a recommendation.** That is F-045's explanation surface.
- **Changing `preferenceWeight`, its constants, or the storage shape.** F-046's decisions stand.
