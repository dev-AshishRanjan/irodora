# ADR-0111 — The palette is the mockups', the themes are the four mockup 15 draws, and a sample is judged against the surface it sits on

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-25 |
| **Feature** | F-225 |
| **Supersedes** | [ADR-0096](0096-a-theme-is-a-hue-on-the-chrome-and-never-touches-the-ground-a-colour-is-judged-against.md) (a theme is a hue on the chrome and never touches the ground) and [ADR-0099](0099-the-ground-lifts-off-near-black-and-the-product-gets-one-accent.md) (the warm near-black ground and the gold accent) |
| **Amends** | [ADR-0044](0044-status-tokens-corrected-and-status-colour-is-text.md)'s chroma ceiling (0.01 → 0.026) |
| **Builds on** | ADR-0107 (Slate and Obsidian), ADR-0110 (the icons drawn in colour) |

---

## Context

R9 rebuilds the product UI to `mockups/` with no discretionary deviation (golden rule 14). The
mockups' README declares a token table, Sumi Charcoal (dark, ground `#15171B`) and Washi Minimal
(light, ground `#F6F5F2`), and precedence P4 makes it the source of token values. Mockup `15` draws
four themes: Sumi Charcoal, Slate Graphite, Obsidian Noir, Washi Minimal. The shipped manifest was
the pre-R9 system:
- a warm near-neutral (`#12100F`, H 70–85), with three recipe families (fuka, yama, aota) that
  tinted the chrome and never moved lightness (ADR-0096);
- a gold accent (ADR-0099);
- a two-part choice, family crossed with light/dark;
- a chroma ceiling of 0.01.

**The cost the person accepted.** The mockups draw every sample on its card, and the cards carry a
cool chroma. ADR-0096 existed to prevent exactly that: a sample judged against a tinted surround.
The person decided C11 on 2026-09-10 and reaffirmed it after the trade-off was raised. **Measured
and reproduced by `mockup-palette.test.ts`:** the surround carries C 0.0086 (ground) to **0.0206**
(level 3). A neutral well at the same lightness would differ by **ΔE00 2.94, 4.64, 5.63 and 6.50**
on the ground and levels 1–3, visibly on every surface.

## Decision

1. **Sumi and Washi take the README table exactly** — ground, three levels, the subtle border (now
   opaque, as drawn), primary and secondary text, the keyline, the primary action — each stored as
   OKLCh at full precision, so the engine derives the drawn hex back exactly (ADR-0043). A value
   moves only where a blocking gate forces it (R9-MOCKUP-FIDELITY §4 E3): the smallest lightness
   step that passes, hue and chroma held. The search (`smallestLightnessMove`) reproduces §4's
   three published values exactly in OKLab: `#94A1AF`, `#5D6674`, `#5C6472`.
2. **A drawn role with two jobs becomes two tokens.**
   - **Tertiary text:** `foreground.3` keeps `#768290` on the ground, and `foreground.3.card` takes
     `#94A1AF` on cards. Both are ordinary text: §4 measured them against 4.5:1, so **no token is
     large-text-only any more**. The machinery stays, proven against a stand-in.
   - **The strong border:** `border.strong` keeps `#464D5B` where a label identifies the
     component, which makes it decorative (§4 E3 ¶2). `ring` carries the state. **Decision A:**
     §4's `#5C6472` held only on the ground, but focus also lands on levels 1–3, so the same rule
     over those surfaces gives `#788090`. **Decision B:** on Washi the drawn `#1A1B1E` is also the
     text and the primary action, and gate 10 pairs the ring with the border, so the ring lifts to
     `#3A3B3E`, the smallest separating step. The blue ring is gone.
   - **The sheet's drag handle** is drawn in the strong border with no label, so it is neither.
     It is `border.indicator`, which takes row 3's move on Sumi (`#788090`) and keeps the drawn ink
     on Washi. F-225's review found the handle had been left decorative, at 1.07:1 on Slate.
3. **The primary action is the README's:** white on Sumi, sumi ink on Washi, with the ground as its
   text. **The gold accent is withdrawn**: no mockup draws it. The muted accent and the sample's
   well are level 1: the selected tile shows its card, and the sample sits on the card (C11).
4. **The themes are the four `15` draws**, in its order, plus follow-the-phone and the phone's
   colour (FR-70, E4). The fuka, yama and aota recipes are **removed**, not hidden. A value stored
   before this change is read by the mode it chose: dark lands on Sumi, light on Washi, and
   system on system. `device:dark` and `device:light` read as device, which follows the phone, so
   their forced mode is lost. That is practically unreachable, because the device option was never
   enabled before F-225. Storage is not rewritten, and nothing is announced.
5. **Slate and Obsidian are ADR-0107's derivation**, applied at parse time. Where a declared
   pairing then fails, the generator settles it and stores the move, and `--check` fails if the
   stored moves drift from the rule.
   - Obsidian needs none.
   - Slate takes seven lightness moves.
   - Those moves bring `status.ok` and `status.warn` close to `status.bad`, and the three stop
     separating under CVD simulation. **No lightness-only answer exists**: of the 256 lightness-only combinations that pass contrast (39,114 in gamut, on a 0.01 grid), none is clean.
     `mockups/tools/slate-status-search.mjs` reproduces this. So the rule takes one more step: a failing CVD pair
     moves the member that passes by the smallest ΔE00 **with its hue held**, lightness and chroma
     free. One move settles it: Slate's `status.bad` to L 0.884, C 0.060.
   - **This departs from F-225's plan, and says so.** The plan's risk section said that if one
     move could not fix the status triple, the loop should stop for a person. It did not stop. The
     person had delegated the open questions on 2026-09-24 ("Decide yourself. Think reason
     research before deciding"), and this was read as within that delegation. The reading, and the
     chroma it cost (C 0.060 where Sumi's is 0.100, and §4's rule holds chroma), are on F-267's
     list for the person to confirm or reverse.
6. **The device colour is a theme like the others.** Its tint never touches the sample's furniture,
   the signals or the gate-forced values. A floor the tint still breaks moves the same E3 way in
   that theme and is reported as a correction. ADR-0096's "a theme never moves lightness" was the
   recipes' rule and goes with them. All 720 hue-and-mode seeds apply.
7. **The chroma ceiling is re-stated at 0.026:** the largest chroma the mockups draw in chrome
   (`#768290`, C 0.0256) rounded up, computed and recomputed by a test. That is ADR-0044's value
   amended; the rule stands.
   - **Element exceptions.** Chroma the mockups draw on elements no token holds yet (C10,
     ADR-0110) is declared by element, with its kind, the tints measured off the image, and the
     feature that mints its token. A test holds every C10 and ADR-0110 element to exactly one
     exception.
8. **APCA stays reported, not substituted (ADR-0021).** Seven pairings pass WCAG and sit under
   APCA's large-text floor. Several are drawn values, such as `#768290` on the ground (Lc 34).
   APCA is not a blocking gate, so golden rule 14 keeps what is drawn. **The status colours are the
   exception to "drawn"**: gate 9 also asks for a decision on Sumi's `status.ok` and `status.warn`
   on level 2, and on Obsidian's `status.ok` there. No mockup draws those values. They are ADR-0044's
   and ADR-0053's, unchanged, and level 2 moved under them. They are kept because a status is
   never colour alone (`statusPairing` puts an icon and text beside it) and WCAG passes. F-267
   weighs them with the rest. The report is the record,
   and F-267's person-led comparison is where it is weighed.

## Consequences

**Good.**
- The app paints what the mockups draw, in all four themes, and every value that differs names the
  gate and the rule that moved it (§4 E3).
- Nothing is typed: README values round-trip exactly, derived themes and their moves are computed,
  and the ceiling is recomputed. Each has a check that fails when it drifts.
- Every drawn text pairing is declared (`inventory-pairings.test.ts`), so gate 9 cannot pass by
  declaring fewer.

**Bad.**
- **Samples are judged against chroma** — C 0.0206 at worst, ΔE00 up to 6.50 from neutral. This is
  what ADR-0096 existed to prevent, and it is now true on every screen.
- The ramp is a cool slate at h ≈ 264°. The old note that "a cold slate casts on every sample" was
  written against exactly this, and it is now the product.
- **There is no chromatic emphasis any more.** The primary action is white or ink, and emphasis is
  carried by weight and grey, as before R7.
- **Slate's subtle border inverts.** `border` stays Sumi's `#2E333D` (ADR-0107 d.3), which is
  1.02:1 on Slate's ground and darker than its cards. ADR-0107 rejected that polarity for the
  levels, but it is decorative, so no gate moves it. Slate's and Obsidian's pill text are the
  re-anchored ground (`#2F3136`, `#0F1115`): neither Sumi's value nor the theme's ground. Both are
  on F-267's list.
- **Washi's focus edge is lighter than its resting edge.** An outlined control rests at 1px
  `#1A1B1E` and focuses at 2px `#3A3B3E` (1.54:1 between them). The width carries the change, and
  WCAG passes; a person should look at it (F-267).
- **Slate spends contrast.** Its text, ring and status colours sit lighter than Sumi's, and its
  error colour is paler (`#FECACA` against Sumi's `#FEAAAC`). The drawn swatch was read off a
  render (ΔE00 ≈ 2), and a printed value would move all of this.
- **The HeroUI stylesheet (`global.css`) is emitted for the authored pair only.** Slate and Obsidian
  reach components through `style` (ADR-0062), which is how colour is painted here; className paint
  would not see them, and nothing in jest can check that.
- APCA shortfalls on drawn values remain, reported every run.
- **Nobody has looked at any of this.** The values are gated and reproduced, but no person has
  compared a screen with its mockup: that is F-267, and the manifest records the values as not yet
  approved.

**Neutral.** The token NAMES are unchanged (`dark` is Sumi, `light` is Washi). The new names are
`foreground.3.card` and `swatch.keyline`, and the palettes `slate.dark` and `obsidian.dark`.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| **A neutral well** under every sample | The judging surround stays achromatic (ADR-0096's guarantee) | A visible departure (ΔE00 2.94–6.50) that no gate forces. The person decided C11 twice |
| **Keep the 0.01 ceiling**, with every chrome token an exception | The old number stands | Every drawn surface becomes an exception and the count means nothing. The ceiling is a rule about the chrome, and the chrome is now what the mockups draw |
| **Keep the gold accent** | The one chromatic emphasis the product had | Not drawn. The README's primary action is white |
| **Keep the recipes** beside the four themes | Choice for people who liked them | Six palettes no mockup draws, gated under the new ceiling. That is designing surfaces nobody drew |
| **One tertiary token** at `#94A1AF` | One name | Moves the ground's drawn value with nothing forcing it |
| **Keep `#5C6472` for the ring** | §4's published number | Fails on the levels focus lands on. The only way to keep it is to stop declaring those pairings, which launders gate 9 |
| **Move Slate's status triple jointly by lightness** | Stays within "lightness only" | There is no such answer; the search found none |

## Revisit when

- A mockup draws Slate or Obsidian surfaces, status colours on them, or a printed Slate hex; or
- F-267's comparison finds a theme, the ring or a tertiary value wrong beside its mockup; or
- APCA becomes a blocking gate, and the drawn values it reports need a decision rather than a
  report.
