# The page inset is what stops a colour bleeding

**Effect:** [E-065](../../state/effects.json) · `packages/ui/src/layout.tsx` →
`apps/mobile/src/screens/ColourDetail.tsx` · **medium**

## What happened

F-148 needed the colour on the entry page to run edge to edge, and everything below it to stay
on the same left rule as every other screen in the app.

`Screen` owns the page inset. That is deliberate and it is why the app lines up — no screen
chooses its own margin, so no screen can be 4px off. It is also exactly the thing that stops a
child reaching the edge, and there is no way to opt one child out of a parent's padding.

So the inset moved: `Screen padding="xs"`, and the body pads itself through a new `padding` prop
on `Stack` and `Row`.

## Why not the other two ways

**A negative margin** is the reflex, and it needs the `style` escape hatch that these primitives
deliberately do not have. It also writes a number that must stay equal to a token, in a codebase
where the spacing gate exists to make sure no such number is ever written.

**Wrapping the body in a `Surface`** gets padding for free. It also paints elevation — on this
page, a card between the eye and the colour, which is the one thing this page is for.

## The part that can go wrong quietly

A screen that keeps the `Screen` default **and** pads its body insets twice. Nothing fails. Both
numbers are legal tokens, both come from the scale, the spacing gate is satisfied, the tests are
satisfied, and the screen is simply 24px narrower than the one next to it.

There is no gate for this and it is not obvious there should be one yet: `padding` on a flow is
opt-in and set in exactly one place. If a second screen wants it, that is the signal that the
pattern needs a rule rather than a prop.

## The general shape

A layout constraint that holds everything together is also a constraint on the one thing that
needs to break it. When a single surface has to escape, move the constraint down a level rather
than punching a hole in it — the hole is what every subsequent screen will use.

Related: [[design-tokens-are-the-vocabulary]], [[a-primitive-with-no-escape-hatch]]
