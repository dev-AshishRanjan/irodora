# Plan: F-164 — Home is worth the first impression

| | |
|---|---|
| **Feature** | F-164 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | FR-1 |
| **Service / package** | `apps/mobile` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-09-06 |

---

## Intent

*"The Home page is still unprofessional, not organised. It's very unprofessional and unattractive.
Remember it's our first impression for users."*

Reported after F-146 had already rewritten it, which is worth taking at face value rather than
defending.

## The audit, before anything is proposed

`visual-taste` requires this stated specifically. What is wrong with Home as it stands:

1. **It never says what the product is for.** The wordmark reads *Irodora* — a name nobody knows —
   and the only sentence about the product is at the **foot**, in `xs` grey: *"The engine is
   running on this device."* That is developer copy in a footnote slot. Acceptance criterion 1
   asks the screen to state its purpose without a paragraph; it currently does not state it at all.
2. **Three sections, identical in shape.** `Section` title, content; three times. F-146 replaced
   ten identical buttons with three identical blocks — the sameness moved rather than left, and
   criterion 2 asks for rhythm rather than a single column.
3. **The hierarchy contradicts the content.** *Last reading* leads, and on a new install it is an
   **empty state** — two lines of grey and a button. The wardrobe below it is a second empty
   state. **The first impression is two apologies followed by a footnote.**
4. **Boldness is spent twice.** The 140 px samples, and a bare integer at `display.2` — the
   second-largest thing on the page is the number of garments. *A page with three bold moves has
   none.*
5. **No variance.** Wordmark, block, block, block, footnote. Home is an editorial surface and the
   dial is set to "uniform".

## Approach

**Answer the four criteria and nothing else.**

**1 — say what it is.** Under the wordmark, three fragments at `title`, taken from the product's
own brief: *what colour is this · what goes with it · whether it suits you.* Three short lines is
not a paragraph, and it is the register the reference set uses. Under them, one `small` line: it
all happens on the phone. That claim is a genuine differentiator and it is currently buried in the
footer, so the footer goes.

**2 — the lead is whichever block has something to show.** A person with readings leads with their
last reading; a person with none leads with **today's colour**, which is a real Japanese colour at
photographic scale with its name in kanji. Leading with an absence was the mistake; there is
always a colour to lead with, because the corpus is never empty.

That decision is **pure and lives in `home.ts`**, beside the rest of what Home does not decide for
itself — so the rule can be disagreed with rather than being buried in a render.

**3 — remove what was there because it existed.** The `display.2` integer becomes a label beside
the swatches; the empty states lose their second line; the technical footer goes entirely.

**4 — rhythm.** The lead is a full-width sample with its name beneath at `display.2`; the wardrobe
is a quiet horizontal strip; the remaining block is a row. Three different shapes, largest first.

**Reused:** `Screen`, `Section`, `Row`, `Stack`, `Swatch`, `Wordmark`, `Button`, `Text` — no new
component. `homeContent`, `entrySwatch`, `colorOf`. The copy catalogue.

**Increments:**

1. `home.ts` decides the lead. Tested there.
2. The screen, rebuilt against it.
3. Copy, both locales; the dead keys removed.
4. Conformance subjects for both leads.

## Files to touch

```
apps/mobile/src/home.ts              — which block leads
apps/mobile/src/screens/Home.tsx     — the rebuild
apps/mobile/src/i18n/{en,ja}.ts      — the proposition; the footer copy goes
apps/mobile/test/home.test.ts        — the lead rule
apps/mobile/test/home-states.test.tsx — the two leads
apps/mobile/test/screens.test.tsx    — subjects for both
```

## Anticipated effects

- **Copy keys are removed** ⇒ `i18n.test.ts` fails on a key nothing renders, in either direction,
  and gate 11 re-checks the font subset if Japanese changes. Guard: both, and they have caught
  this twice already this week.
- **`display.2` loses a reader on this screen** ⇒ gate 8's token reach, if it was the last one.
  Guard: the check names it; the lead's name is set at `display.2`, so it gains one back.
- **The screen's tree changes shape** ⇒ every Home test and both conformance subjects. Guard:
  `pnpm test`, and the subjects are updated rather than deleted.

## Test plan

- **The lead rule, both ways:** with readings the last reading leads; with none, today does. And
  the decoy — today is never `null`, so a lead always exists, which is the property that lets the
  screen drop the empty hero entirely.
- **The proposition renders**, in both locales, as the thing directly under the wordmark. That is
  criterion 1 and it is checkable.
- **Nothing renders the removed keys**, which `i18n.test.ts` asserts globally.
- **Conformance:** first-run and populated, both themes.

## Verification

```
node scripts/verify-state.mjs
pnpm verify:ci
```

## Risks and open questions

- **This is the fourth surface in a row whose success is a judgement made on a phone.** The
  criteria that matter here — *reads as finished*, *unattractive* — cannot be discharged by any
  gate, and F-146 passed every gate too.
- **The copy is mine.** Three fragments about what the product does is the highest-stakes English
  in the app and nobody has reviewed it. The Japanese is a second risk on top of that, and the
  catalogue already owes a competent-speaker read (F-017).

## Out of scope

- The tab bar, the other screens, and anything about what Home *links to*. Every destination is a
  tab or lives in one (F-145); this is about what the first screen says, not where it goes.
