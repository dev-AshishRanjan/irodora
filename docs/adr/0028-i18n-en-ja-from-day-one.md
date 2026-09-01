# ADR-0028 — English and Japanese ship together, from the first release

## Status

**Accepted — amended by
[ADR-0056](0056-the-message-catalogue-is-enumerated-typescript-not-a-runtime-i18n-framework.md).**

The substance stands: both languages from the first release, **no fallback**, no retrofit.
That no-fallback rule is what selects the mechanism in ADR-0056, and it is the reason a runtime
i18n framework was rejected there.

Three clauses below describe a system
[ADR-0051](0051-irodora-is-a-local-first-mobile-app-with-no-server-tier.md) retired, and
ADR-0056 replaces them:

| Clause | Now |
|---|---|
| §2 — server responses carry message keys, never prose | **Retired.** There are no responses. |
| §5 — `Accept-Language` negotiation | The **device locale**, via `expo-localization`. | <!-- retired-ok: A migration table mapping the retired mechanism to the current one. The left column has to name it. -->
| §6 — locale is part of the cache key | **Moot.** There is no cache tier. |

Read those three as history. Everything else here is current.

## Date

2026-08-13

## Context

The product is built on Japanese colour culture. Every corpus entry has a kanji name, a
kana reading and a romanisation. The Atlas is, in large part, a Japanese-language reference
work.

Shipping it English-only and "adding Japanese later" fails on three levels:

**Credibility.** A Japanese colour product that cannot render Japanese properly is not
taken seriously by exactly the audience whose endorsement matters most.

**Correctness.** Japanese typography is not English typography with different glyphs. Line
breaking follows different rules (kinsoku shori). Font fallback for kanji is a real
problem. Text expands and contracts differently. Ruby annotation for readings is genuinely
useful here and has no English equivalent. These constraints must shape the design, and
retrofitting them means redesigning.

**Cost.** Retrofitting i18n means finding every hard-coded string across every surface —
open-ended work with no clean completion signal. Building with it costs a message key per
string.

## Decision

**English and Japanese from R1. No hard-coded user-facing string, anywhere.**

1. **An enumerated message catalogue**, not a lookup with fallbacks. Every key is declared;
   a completeness check fails the build on a missing translation in either locale. A
   missing key is a build error, not a rendered key name in production.
2. **Server responses carry message keys, never prose**
   (`api-contract.md` §4, retired with the API — the rule now applies at the storage and
   render boundaries instead). Explanation objects use
   `detail: 'explain.lightness.strong'`, and the client renders it. A server that returns a
   sentence has made the locale decision on the client's behalf, wrongly.
3. **Corpus names are structured**, not translated: `name_kanji`, `name_kana`,
   `name_romaji`, `name_en`. 藍鼠 is not "translated" into English — the English name is a
   separate, editorially-decided field, and the romanisation is a third thing again.
4. **Japanese typography is a design requirement**, not a font swap: correct kinsoku line
   breaking, verified fallback for the kanji in the corpus, ruby annotation available for
   readings, and layouts that survive text-length differences in both directions.
5. **`Accept-Language` and an explicit user preference**, with the preference winning. <!-- retired-ok: The locale resolution order as originally decided; the table above in this same ADR maps it to the device locale. -->
6. **Locale is part of the cache key** for catalog responses.
7. **Numbers and dates are localised**; colour values are not — `#263B3C` and `L 22 C 0.03
   H 195°` are the same in every locale, and localising them would be actively harmful.

**Two locales, not a framework for fifty.** The infrastructure supports more, but shipping
two properly beats shipping five badly — and Japanese is the one that exercises every hard
case (non-Latin script, different line breaking, different text metrics), so adding a
third later is comparatively easy.

## Consequences

**Good.** Credible to the audience that matters most. Japanese typography constraints shape
the design from the start rather than breaking it later. The enumerated catalogue means a
missing translation is impossible to ship. Message keys in API responses keep presentation
where it belongs.

**Bad.** Every user-facing string needs a key and two translations, which slows copy
iteration. Japanese translation requires a competent Japanese speaker for every release —
this is a standing commitment, not a one-time task (related: OQ-5). Some copy that reads
well in English does not translate naturally, so both versions occasionally need rewriting
together. Design must accommodate the longer of two text lengths in every component.

**Neutral.** Message keys make copy slightly less immediate to read in source. The
completeness check makes that trade worth it.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **English first, Japanese later** | Faster to R1 and one less translation dependency. Retrofitting i18n is open-ended work, Japanese typography constraints would break existing designs, and the product would launch without credibility with its most important audience |
| **Japanese first** | Strongest cultural signal. Smaller initial market, and the team's primary working language is English — copy quality would suffer where it is most read |
| **Machine translation with human review** | Cheaper, faster. Colour names and cultural context are exactly where machine translation fails, and the errors are invisible to a reviewer who does not read Japanese |
| **Locale-fallback catalogue** (render English when Japanese is missing) | More forgiving, never a build failure. Produces a half-translated interface in production, which is worse than either language alone and gives no signal that anything is wrong |

## Revisit when

- A third locale is justified by demand — the infrastructure already supports it, and
  Japanese has already forced the hard cases.
