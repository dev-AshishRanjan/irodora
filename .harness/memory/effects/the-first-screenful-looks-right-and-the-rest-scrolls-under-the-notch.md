# The first screenful looks right, and everything after it scrolls under the notch

**Effect:** [E-084](../../state/effects.json) · `packages/ui/src/layout.tsx` → every screen ·
**high**

## What happened

F-159 was reported as *"we are not leaving space above for mobile's top bar"*. It read the safe
area, added it to the token padding, and shipped:

```ts
const inset = { paddingTop: nativeSpacing[padding] + insets.top, … };
…
<ScrollView contentContainerStyle={{ …inset }}>
```

**`contentContainerStyle` pads the content inside the scroller.** The first screenful sits in
exactly the right place — which is why it was accepted, by me and by the person looking at it —
and every pixel after it travels under the status bar. Reported again, from the next build:
*"when we are scrolling the battery and all native data is coming as a patch over our UI"*.

## The part worth keeping

**Two things were merged that are not the same kind of thing.**

| | what it is | what it does |
|---|---|---|
| `nativeSpacing[padding]` | a design value | sets the product's rhythm |
| `insets.top` | the shape of the hardware | says where the app may draw at all |

Adding them produces a number that is correct **once**, at scroll offset zero. A boundary is not
spacing: it has to move the scroller's *frame*, because a `ScrollView` clips to its frame and
content then has nowhere to go. That means an ancestor carries it, and the content container
keeps only the rhythm.

The general form: **when a value is a boundary, applying it as spacing is right at exactly one
position and wrong at every other.** That is the worst kind of wrong, because the one position it
is right at is the one everybody looks at.

## Two near-misses worth writing down

**`paddingTop` on the ScrollView's own `style`** is the tempting one-line version of this fix,
and it is React Native's documented trap — padding there does not act as a viewport inset, which
is the reason every guide sends people to `contentContainerStyle` and therefore, indirectly, the
reason the bug existed.

**`SafeAreaView`** is the idiomatic answer and it cannot be used here. It calls
`useSafeAreaInsets` internally, which **throws** without a provider — and `Screen` is rendered by
the conformance suite, by three dozen screen tests and by the a11y gate, none of which is an app.
The existing `SafeAreaInsetsContext` read with a zero fallback stays; only where its value is
applied changed. (Zero insets is not a stand-in: it is what a phone with no notch reports.)

## Why no test caught it, and what the new one asserts instead

`react-test-renderer` has no viewport, no scrolling and no status bar. *"Content stops at the
boundary"* is not observable here and never will be — so a test written against the behaviour
cannot exist, and its absence is what let a green suite ship this twice.

What **is** observable is the structure that produces the behaviour: whether the inset is on an
ancestor of the scroller or inside its content. So that is the assertion, and it is the exact
property that was wrong rather than a proxy for it. It was planted against the F-159 shape and
fails two cases.

**When the behaviour is invisible to the harness, assert the structure that causes it** — not
something adjacent that happens to be checkable.

## The same report, one line up: a channel that overflows is not a channel

F-162 put a glyph **and** a word in each tab, arguing NFR-9: shape and word are two channels
where the bar had one plus a colour. Five words at the 10px label step do not fit across a phone
width, and they wrapped to a second line.

The argument was about information; the failure was about space, and space wins. The word moved
to `tabBarAccessibilityLabel`, where it already was, so a screen reader lost nothing — and what
is genuinely lost is a sighted person who does not recognise a glyph, which is the cost of the
decision rather than an argument against it.

Both halves of this report are the same shape as the inset: **a decision that is correct in the
dimension it was reasoned about, and wrong in a dimension nobody measured.**

Related: [[turning-off-a-header-turned-off-the-only-thing-insetting-anything]] ·
[[a-size-chosen-against-one-screen-is-wrong-on-every-other]]
