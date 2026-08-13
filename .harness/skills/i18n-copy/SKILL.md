---
name: i18n-copy
description: Write user-facing copy that works in English and Japanese, says only what the product can support, and renders correctly in both.
---

# Skill: i18n-copy

[ADR-0028](../../../docs/adr/0028-i18n-en-ja-from-day-one.md) ·
[`BRAND.md` §5](../../../docs/design/BRAND.md#5-voice) ·
[`measurement-claims`](../measurement-claims/SKILL.md).

## Every string is a key

```tsx
// No.
<p>Estimated colour</p>

// Yes.
<p>{t('lens.result.estimated')}</p>
```

The catalogue is **enumerated**: a missing translation fails the build rather than rendering
a key name in production.

**Server responses carry message keys, never prose.** A server that returns a sentence has
made the locale decision on the client's behalf, wrongly.

## Voice

**Direct, specific, unhurried. Never breathless.**

| Instead of | Write |
|---|---|
| "Wow! We found your perfect colour!" | "Closest reference: 藍鼠 Ai-nezumi, ΔE00 2.1" |
| "AI-powered colour matching" | "Deterministic colour matching, reproducible from its inputs" |
| "100% accurate" | "Estimated, 81% confidence, mixed lighting" |
| "Oops! Something went wrong" | "The lighting is mixed, so this reading is less reliable. Move nearer a window." |
| "Your colour season is Deep Autumn!" | "Your profile suits muted, medium-depth colours with moderate warmth." |

**Errors always say what to do next.** "Colour accuracy is reduced in mixed lighting" is a
statement. "Move nearer a single light source and try again" is help. The second sentence is
the one that determines whether the user succeeds.

## Claims

Every string passes the claims lint. No "exact", "100%", "perfect match", "AI-powered", or
"measures" for an estimated source ([ADR-0031](../../../docs/adr/0031-measurement-claims-policy.md)).

## Japanese

**Written, not translated.** Native register, not a rendering of the English sentence.

- **Colour names are structured, not translated.** `name_kanji`, `name_kana`, `name_romaji`
  and `name_en` are four separate fields. 藍鼠 is not "translated" into English; the English
  name is an editorial decision.
- **Ruby annotation** where a reading genuinely helps. Not decoratively.
- **Kinsoku line breaking** — certain characters may not begin or end a line.
- **A separate line-height scale.** Japanese needs more leading than Latin at the same size.
- **Font fallback verified** for every kanji in the corpus. A tofu box in a colour name is
  a broken product for the audience that matters most.

## Length

Japanese is often shorter than English; sometimes considerably longer. **Design and test at
both.**

A layout that fits one and breaks the other is not internationalised — it is localised to
whichever one was checked.

## Never localise a colour value

`#263B3C` and `L 22 C 0.03 H 195°` are the same everywhere. Localising a decimal separator
inside a colour coordinate would be actively harmful — the value stops being copy-pasteable
into any other tool.

## Adding a string

1. Key with a clear namespace: `lens.result.confidence.low`.
2. English.
3. **Japanese, written by a competent speaker** — not machine-translated.
4. Check both lengths in the layout.
5. Run the claims lint.
6. Confirm the completeness check passes.

## Never

A hard-coded user-facing string · a machine-translated Japanese string shipped without
review · a sentence assembled from fragments (grammar differs; the fragments will not
compose) · prose in an API response · a claim the product cannot support.
