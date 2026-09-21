# ADR-0104 — Mockup 15 draws a haptics preference on swatch selection, so the app keeps one and the port gains its second verb

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-21 |
| **Feature** | F-239 |
| **Amends** | `F-206`'s haptics rule in [`apps/mobile/src/haptics.ts`](../../apps/mobile/src/haptics.ts) — the one-verb port and its refusal of an in-app preference. NFR-8 is unchanged. |

---

## Context

F-206 built the haptics port and wrote its restraint into the type:

> **A haptic on a scroll is why people turn haptics off.** […] So this module has **one verb**. A
> module that cannot express *"buzz on scroll"* is one nobody can use to buzz on scroll, which is a
> stronger guarantee than a rule saying not to and a reviewer remembering it. There is no `light()`,
> no `selection()`, no `impact(style)` — every one of those is an invitation to fire on something
> that is not a commit.

and refused a preference of its own:

> **This app adds no preference of its own**, deliberately — a second switch beside the platform's is
> a setting somebody has to keep in sync with one they already set, and the first time the two
> disagree the app is wrong.

Both are good arguments, and **mockup `15` draws the opposite of both**: a switch under *Engine*
labelled *"Haptic Feedback on Swatch Selection"*, drawn on, bound to `store:settings.haptics`
(`15.engine.haptics.switch` in F-220's inventory). It is a preference this app holds, and it names
**selection** — not a commit — as the moment.

Golden rule 14 decides which one yields: the mockups are the specification for everything a person
can see, and *"a departure exists only if R9-MOCKUP-FIDELITY lists it"*. A recorded internal default
that a mockup contradicts is not a departure; it is a default that has been superseded — the same
shape as ADR-0103, where `25`'s drawn shadow superseded ADR-0044's *depth is tint, never a shadow*.

## Decision

1. **The app keeps a haptics preference**, persisted with the other display settings (F-153's
   settings table). `15` draws it on, so on is the default.
2. **The preference is subordinate to the platform's, and that is what keeps F-206's argument
   alive.** Off means this app fires nothing. On means this app *asks* — and iOS's system haptics
   setting and Android's vibrator still decide whether anything happens. The two can therefore never
   disagree in the way F-206 feared: there is no state where the app's switch says yes and the
   person's phone says no and the app wins.
3. **The port gains exactly one more verb: `select()`**, used at swatch selection and nowhere else.
   It is not a general `impact(style)`, and there is still no `light()`, no `scroll()`, no
   `longPress()`. The erosion F-206 named is contained by the same mechanism F-206 used — what the
   type can express.
4. **`commit()` is not gated by the preference.** The switch `15` draws names swatch selection; a
   garment saved, a reading taken and a theme chosen are commits, and turning off the selection
   haptic is not a request to mute them. A switch that silently did more than its label says is the
   defect this decision is most likely to be misread into.

## Consequences

**What is given up.** A port that could not express "buzz on a selection" — the guarantee was
structural and is now a rule plus a reviewer, for one verb. And the clean answer *"we hold no
haptics preference"*, which was easier to defend than the subordinate one written above.

**What is gained.** The product does what its own specification draws, and a person who wants the
feedback on choosing a colour — the most frequent gesture in this app — can have it without turning
haptics off system-wide.

**What is checked.** `select()` fires exactly where a swatch is chosen and only when the preference
is on; `commit()` fires whatever the preference says; the preference round-trips the store and
defaults to on when the key is absent or unreadable. What is **attested, not gated** is unchanged
from F-206: that the OS is consulted needs a device, and this workstation has none.

**What would reverse it.** A mockup revision that drops the switch, or a person deciding the
platform setting is the only one — in which case the preference goes, `select()` goes with it, and
`commit()` is untouched either way.
