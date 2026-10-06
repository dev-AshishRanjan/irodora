# Irodora — Brand

> **From R9 the mockups decide where this document and an approved mockup disagree** ([golden rule 14](../../AGENTS.md)). The near-neutral chrome, the single accent and the ban on glow and gradient are superseded where the mockups draw otherwise. The departures and their reasons are in [`R9-MOCKUP-FIDELITY.md`](R9-MOCKUP-FIDELITY.md) §6 (C10, C11); golden rules 11–13 are not affected and still bind.

| | |
|---|---|
| **Status** | Baseline · visual system completed after design approval |
| **Related** | [`DESIGN-BRIEF.md`](DESIGN-BRIEF.md) · [`DESIGN-SYSTEM.md`](DESIGN-SYSTEM.md) · [ADR-0031](../adr/0031-measurement-claims-policy.md) |

---

## 1. The name

**Irodora** — from 彩り (*irodori*), "the arrangement of colours."

Not 色 (*iro*, colour) alone. *Irodori* is colour **arranged** — the deliberate placement
of colours in relation to each other. It is the word used for the colours of a season, the
arrangement of a meal, the composition of a garment. That is precisely what the product
does: it is not about a colour, it is about colours *together*.

**Pronunciation.** ee-roh-DOR-ah. Four syllables, open vowels, no consonant clusters. It
works in English, Japanese and most European languages without adjustment.

**Why a coined word rather than a real one.** 彩り itself is taken many times over, and a
real word carries someone else's meaning. *Irodora* keeps the root — the *iro* is legible
to anyone who knows any Japanese — while being ours.

**Namespace.** `irodora.com` · `.io` · `.app` · `.co` · `.net` · `.org` · `.design` ·
npm `@irodora` · GitHub `irodora`. All secured before the name was chosen.

### Surfaces

| Name | What |
|---|---|
| **Irodora** | The consumer product |
| **Irodora Pro** | The professional workspace |
| **Irodora Studio** | Team and B2B |
| **Irodora API** | The developer platform |

Never "the Irodora app". Never "Irodora AI". Never an acronym.

---

## 2. Positioning

> **A colour intelligence platform for what you wear.**

Not "Japanese fashion AI". Japanese colour culture is the product's distinctive content
foundation, not its ceiling — the positioning has to leave room for general fashion,
professional styling, textiles and design without discarding what makes it distinctive.

**Taglines.**

- Primary: *See colour. Understand colour. Wear colour.*
- Technical: *A colour engine you can check.*
- Accessibility: *Colour, described.*

---

## 3. What the brand is

Six words, in priority order. When two conflict, the earlier one wins.

**Precise.** Numbers where numbers belong. ΔE00 shown, not hidden. Confidence stated. The
product's authority comes from being checkable, not from being confident.

**Honest.** An estimate is called an estimate. We do not round accuracy up
([ADR-0031](../adr/0031-measurement-claims-policy.md)). Where we do not know, we say so —
and say what would help.

**Calm.** Muted, spacious, unhurried. The product is about looking carefully. An interface
that shouts makes that harder, and a colour tool with a loud interface is measuring against
its own noise.

**Editorial.** Considered, sourced, with a point of view. Closer to a well-made reference
book than to a utility.

**Accessible.** Not a mode. Colour is never the only channel, anywhere
([ADR-0021](../adr/0021-accessibility-wcag22-aa-as-a-gate-apca-reported.md)).

**Unisex.** Genuinely, structurally. No gendered defaults, no gendered categories, no
gendered colour assumptions. The product asks what you own and what suits you, never who
you are.

---

## 4. What the brand is not

| Not | Because |
|---|---|
| Cherry blossoms, torii gates, koi, waves, kanji as decoration | Stereotype is not respect. Japanese colour tradition is a rich material system; reducing it to visual shorthand is the opposite of taking it seriously |
| Anime or kawaii aesthetics | A different, unrelated cultural register. Borrowing it would misrepresent what the product is |
| Pink-to-purple gradients, glow, glassmorphism | Generic 2020s SaaS. Also: gradients behind colour swatches actively corrupt colour perception |
| "AI-powered", "magic", "instantly" | Untrue, and the deterministic engine is a better story than the one we would be borrowing |
| Influencer fashion, before-and-after, aspiration | The product does not judge how you look. It tells you what colour something is |
| Body imagery, attractiveness framing | NFR-22. Not a style choice — a product boundary |

**The single hardest discipline:** a colour product must not decorate with colour. Every
colour in the interface competes with the colour being examined. The chrome is quiet so the
subject can be seen — which means the brand shows its confidence by holding back.

---

## 5. Voice

**Direct, specific, unhurried. Never breathless.**

| Instead of | Write |
|---|---|
| "Wow! We found your perfect colour!" | "Closest reference: 藍鼠 Ai-nezumi, ΔE00 2.1" |
| "AI-powered colour matching" | "Deterministic colour matching, reproducible from its inputs" |
| "100% accurate" | "Estimated, 81% confidence, mixed lighting" |
| "Oops! Something went wrong" | "The lighting is mixed, so this reading is less reliable. Move nearer a window." |
| "Your colour season is Deep Autumn!" | "Your profile suits muted, medium-depth colours with moderate warmth." |

**Errors always say what to do next.** "Colour accuracy is reduced in mixed lighting" is a
statement. "Move nearer a single light source and try again" is help.

**Japanese copy is written, not translated.** Native register, correct typography, ruby
where readings help ([ADR-0028](../adr/0028-i18n-en-ja-from-day-one.md)).

---

## 6. Visual direction

The full system is defined after design approval
([`DESIGN-BRIEF.md`](DESIGN-BRIEF.md)). The non-negotiables:

**Colour.** A near-neutral chrome — warm off-white and deep sumi-inspired dark, with one
restrained accent drawn from indigo. Tokens authored in OKLCh
([ADR-0020](../adr/0020-design-tokens-are-oklch-native.md)). **Interface colour never sits
adjacent to a colour under examination** without a neutral separator, because simultaneous
contrast will shift the reading.

**Space.** Generous. 間 (*ma*) — the interval — is a design element, not leftover room. The
product asks people to look carefully; density prevents that.

**Type.** A humanist sans with genuine multilingual coverage, paired with a Japanese face
selected for kanji rendering at small sizes. Numbers are tabular everywhere — colour values
appear in columns, and proportional figures make them impossible to scan.

**Form.** Rectilinear, restrained radii, hairline rules. Swatches are true rectangles with
a defined border, never soft-shadowed cards — a shadow changes the perceived colour of what
it surrounds.

**Motion.** Minimal, and it must never alter a colour mid-transition. No cross-fades
between swatches. `prefers-reduced-motion` fully honoured.

**Imagery.** Fabric, material, dye, texture. Rarely people; never aspirational lifestyle.

---

## 7. The mark

Direction for design: a wordmark-led identity with a geometric mark suggesting *arranged*
colour — relationship, adjacency, interval — rather than a swatch or a droplet. It must
work in one colour, at 16 px, and under protan, deutan and tritan simulation.

**A mark that depends on colour to be recognisable is disqualified from this product.**

### What is drawn

**梅鉢 — a plum-blossom kamon, as mockup `14` draws it** (C4,
[ADR-0122](../adr/0122-the-mark-is-14s-blossom-in-one-ink-everywhere-its-cuts-drawn-as-holes.md)):
five tangent petals over a hub filled to their tangency, the first petal straight up; a ring cut
around a centre disc; a stamen cut along each petal; a seam cut along each notch, from the ring to
the edge. Every cut is a hole, so the surface beneath shows through it.

It reads two ways at once and both are true: a **kamon**, which is where geometric corporate
identity comes from in Japan and has for centuries; and a **blossom arranged around a centre**,
which is adjacency and interval said in the plainest way available. 梅 is a corpus colour family, in
a corpus where most colours are named after plants, so the blossom is the product's own subject
rather than decoration borrowed from Japan.

**The drawing decides the proportions.** Each cut is `14`'s splash reading as a fraction of the
petals' reach, recomputed by a test with F-165's six discs, four petals and six as decoys. The
petals are tangent, so their radius and orbit follow from the reach alone.

**One ink, everywhere — the icon included** (ADR-0122, superseding
[ADR-0093](../adr/0093-the-mark-is-monochrome-in-the-app-and-carries-colour-on-the-icon.md)). The
mark takes one of four neutral foregrounds, by type. The icon takes `14`'s ink: the mark in
`text.secondary` on the dark ground, the same image on iOS and Android (`14`'s tile, its gradient
and corner, is F-231's). Shape, not colour, is what
makes it recognisable, and every ground it is drawn on is a scored colour-vision pair. **The one
exception is `27`'s loading state**, which tints the mark (C10), with words beside it.

**At 16 px it is five lobes.** The cuts are sub-pixel there, and nothing is claimed about them.

### The lockups

The name is set in Gelasio, the mockups' serif, and is Latin in both locales
([ADR-0112](../adr/0112-the-serif-ships-as-gelasio-regular-and-the-mincho-as-noto-serif-jp-because-the-drawings-measure-there.md)).
There are two lockups:

- **`01`'s row**: the mark beside the name, as Home's header draws it.
- **`14`'s stack**: the mark over the name over 彩り・色の知性, as the splash draws it.

`00`'s coral outline and `25`'s IRODORA 彩度 are not used. A lockup is **one figure**
([ADR-0123](../adr/0123-a-lockup-is-one-figure-its-intervals-ratios-of-the-names-em-outside-the-spacing-snap.md)):
the mark's size and every interval are its drawing's, as ratios of the name's em, so it scales as
one with the name when a person enlarges text.

### Before this

**Three earlier marks were set aside.** F-141 drew two offset rectangles. The first F-165 pass drew
彡, the radical that means colour in 彩, as three 45° strokes. Both were rejected for one reason:
they were abstract geometric minimalism, which is what *not relevant* meant. F-165 then drew six
discs at one interval, a blossom of its own, with five corpus colours on the icon. F-230 replaced
it with the blossom `14` draws, in the ink `14` draws it in. The audits are in
[`brand.tsx`](../../packages/ui/src/brand.tsx) rather than repeated here.

The machinery survived all four: the geometry lives in source, every asset is generated from it,
and gate 16 reads the mark back out of the built APK by proportion rather than by hash.

---

## 8. Naming inside the product

| Named | Not named |
|---|---|
| Colour Lens | Scanner, Camera |
| Colour Atlas | Colour Library, Database |
| Palette Studio | Palette Maker |
| Outfit Lab | Outfit Generator |
| Personal Colour Profile | Colour Analysis, Your Season |
| Coverage | Wardrobe Score |
| Capsule | Minimal Wardrobe |

**Lens, Atlas, Studio, Lab** — instruments and reference works. That is the register: tools
for looking carefully, not services that decide for you.
