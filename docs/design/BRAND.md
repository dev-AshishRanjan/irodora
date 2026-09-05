# Irodora — Brand

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

### What was drawn

**梅鉢 — a plum-blossom kamon.** Five discs around a sixth, at the interval. It reads two ways
at once and both are true: a **kamon**, which is where geometric corporate identity comes from in
Japan and has for centuries; and **five colours arranged around a centre**, which is adjacency and
interval — the direction above, said in the plainest way available.

梅 is a corpus colour family, in a corpus where most colours are named after plants. The blossom
is the product own subject rather than decoration borrowed from Japan.

The geometry is **two numbers**: the orbit, and the interval. Both radii are solved from them, so
the gap between neighbouring petals and the gap between a petal and the eye are equal by
construction. That is F-141 real idea — 間, the interval as the subject of the mark rather than
the space left over by it — kept, and given a figure that reads.

**Inside the app the mark is one colour. The app icon carries five**
([ADR-0093](../adr/0093-the-mark-is-monochrome-in-the-app-and-carries-colour-on-the-icon.md)):
the disqualifying line above is about recognisability rather than about ink, the silhouette is a
rosette however it is filled, and a test asserts exactly that by comparing the five-colour
silhouette against the one-colour one. Every surface inside the app is used to judge a garment
colour; a home screen is not.

**Two earlier attempts were rejected**, and both for one reason: they were abstract geometric
minimalism, which is what *not relevant* meant. F-141 drew two offset rectangles; the first F-165
pass drew 彡, the radical that means colour in 彩, as three 45° strokes. The audits are in
[](../../packages/ui/src/brand.tsx) rather than repeated here.

The machinery survived all three: the geometry lives in source, every asset is generated from it,
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
