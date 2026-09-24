# ADR-0108 — The family chips are the six mockup 05 draws, in its order, then Ki 黄, Shiro 白 and Nezumi 鼠 past the drawn edge

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-24 |
| **Closes** | OQ-35 |
| **Amends** | conflict C13 (R9-MOCKUP-FIDELITY §6) and F-224's second acceptance criterion, both of which listed seven chips with Ki between Midori and Murasaki |
| **Feature** | F-224 |
| **Decided by** | the implementing agent, **on the person's explicit delegation** (below) |

---

## Context

Mockup `05` draws the Atlas's colour-family filter as a row of chips: **Ao 青 · Aka 赤 · Midori 緑 ·
Murasaki 紫 · Cha 茶 · Kuro 黒**. The last is cut by the screen's edge, so the row scrolls, and what lies
past the edge is not drawn. F-220's inventory binds exactly those six (`05.filters.family.*`). Conflict
C13 and F-224's criterion list a seventh, **Ki 黄**, which `05` does not draw: the corpus has yellows,
so a yellow chip was added past the edge. That precedent already stands in the contract.

F-224 must put every one of the corpus's 120 entries in exactly one group. Off-white (5 entries) and the
neutral greys (stone, warm-grey, cool-grey, mineral-grey — 15 entries) have no honest home in the
seven: none of them names a white or a grey, so any placement shows a person a white or a grey under a
chip that says black or names a hue.

**The delegation.** Asked OQ-35 on 2026-09-24, the person answered: *"I would say follow the mockups
strictly. Decide yourself. Think reason research before deciding."*

**What the corpus already says.** Its own taxonomy (`content/taxonomy.json`) names its greys with
**鼠**, and says why: *"鼠 is the traditional word for a grey in Japanese colour naming, and this corpus
is built on that vocabulary"* (the `blue-grey` family, 青鼠; likewise 寒色系の鼠, 暖色系の鼠, 石の鼠,
緑鼠, 紫鼠). The Edo-period phrase *shijūhatcha hyakunezumi* (四十八茶百鼠, "forty-eight browns, a hundred
greys") names 茶 and 鼠 as the two great families of the period's dyed colour. `05` draws 茶. The
mockups' own hero colour on `01`, `05` and `20` is 藍鼠, *Ai-nezumi*, a 鼠 colour. And 白 is the
ordinary class word for the whites, the off-white family's 生成り among them.

## Decision

1. **The chips are nine, in this order:** the six `05` draws, exactly as drawn and in the drawn
   order — Ao 青, Aka 赤, Midori 緑, Murasaki 紫, Cha 茶, Kuro 黒 — then, past the drawn edge where the
   row scrolls, **Ki 黄, Shiro 白, Nezumi 鼠**. Each is drawn as `05`'s chips are drawn: romaji and
   kanji, with the dot the others carry.
2. **Ki moves to after Kuro.** C13 and F-224's criterion listed it between Midori and Murasaki, but
   `05` draws Midori and Murasaki side by side, and golden rule 14 does not reorder a drawing. The
   earlier position was a transcription error, not a drawn position.
3. **F-224 states the rule that puts each of the 25 families under one chip**, as content with
   provenance. This record fixes the chip set and its order, not the mapping. It fixes one constraint:
   the off-white family goes under 白, and the neutral greys — stone, warm-grey, cool-grey,
   mineral-grey — go under 鼠, since that is the gap the question was about.

## Consequences

**Good.**
- Every entry has an honest home: no white is labelled black, and no grey is labelled with a hue it
  does not have.
- The drawn row is untouched: the six chips a person sees before scrolling are exactly the six `05`
  draws.
- The two added names are the corpus's own vocabulary and the period's, not new words.

**Bad.**
- **Three chips no mockup draws**, where there was already one (Ki). They sit past the edge the
  mockup cuts at, so nobody can say what a designer would have put there. This is the least-invented
  answer, not an uninvented one.
- Nine chips is a longer scroll than seven. A person who does not scroll never sees 黄, 白 or 鼠. The
  mockup draws that overflow, and it has a cost.
- C13 and F-224's criterion change wording, which a reader comparing them with older records will have
  to trace back to here.

**Neutral.** The Atlas filter gains two values in the store's filter vocabulary; nothing is persisted
per chip.

## Alternatives considered

| Alternative | Good at | Why not |
|---|---|---|
| **Fold whites and greys into the seven by a stated rule** (e.g. greys under Kuro) | No undrawn chip beyond Ki | A white under 黒 is a false label on a product whose claim is naming colour honestly. A rule that states the falsehood does not make it true |
| **Leave whites and greys out of the family filter** | Nothing added | Twenty of 120 entries, one in six, become unreachable by family. The Atlas's filter would fail a person looking for greys, the family the period prized most |
| **One neutral chip, 無彩** ("achromatic") | One chip instead of two | A modern technical term, not the corpus's vocabulary. 無彩色 formally includes black, so it would overlap Kuro, and "exactly one group" would break |
| **灰 instead of 鼠** | The ordinary modern word for grey | The corpus names its greys 鼠 and says why. A chip saying 灰 over families named 鼠 would be two vocabularies for one class |
| **Ki where C13 put it** | Hue order, yellow between green and purple | Reorders what `05` draws |

## Revisit when

- A mockup draws the chip row past `05`'s edge, or draws a white or a grey chip; or
- the corpus gains a class none of the nine names (a family nobody could honestly place); or
- F-267's person-recorded comparison finds the row wrong beside `05`.
