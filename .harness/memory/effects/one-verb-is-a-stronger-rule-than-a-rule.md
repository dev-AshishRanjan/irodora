# One verb is a stronger rule than a rule

**Effect:** [E-112](../../state/effects.json) · **Feature:** F-206 · **Date:** 2026-09-09

The criterion was *"a commit fires a haptic; a scroll, a drag and a filter change never do"*.

The obvious implementation is the library's own API — `impactAsync(style)`, `selectionAsync()`,
`notificationAsync(type)` — plus a rule in a document saying when to use which. That rule is
correct for exactly as long as everyone remembers it, and the first person who wants a small
buzz on a slider will find `selectionAsync` sitting right there, correctly named for what they
want to do.

**A haptic on a scroll is why people turn haptics off.** Lose that once and the feature is worth
nothing for everybody.

## What was built instead

```ts
export interface Haptics {
  commit(): void;
}
```

One verb, and no way to say anything else. A module that **cannot express** "buzz on scroll" is
one nobody can use to buzz on scroll — and that is a different kind of guarantee from a rule,
because it does not depend on anybody's memory or attention.

A second test refuses any import of `expo-haptics` outside that module, so the verb cannot be
routed around. Same shape as the Lens exit table (F-178): one place calls the thing, and a rule
about *where* is checkable when a rule about *when* is not.

## The other half: fire after the write, not on the press

The garment is in the database at the line the haptic fires. The Lens fires on the branch that
**has** a reading, not on the one that asked the camera for one.

A haptic on the press confirms an **intention**; a haptic after the write confirms an **outcome**.
They are indistinguishable until something fails — which is precisely when a false confirmation
does the most damage.

## And the decoy the tests needed

*"Fires on a commit"* is satisfied by an implementation that fires on **everything**. The
assertion that carries this feature is that rendering and re-rendering fire **none**.

## The lesson

**When a rule is about restraint, look for a shape that cannot express the excess.** A narrow
type is enforcement; a document is a reminder. And the tempting API is usually the one the
library hands you, named exactly for the thing you should not do.

[[a-tested-module-nobody-wired-up-passes-every-test-it-has]]

---

## What happened to it: F-239 made it two (2026-09-21)

Mockup `15` draws a switch labelled *Haptic Feedback on Swatch Selection*. Golden rule 14 makes
the drawing the specification, so the port gained `select()` and the app gained the preference
this note's feature refused — recorded in
[ADR-0104](../../../docs/adr/0104-the-mockup-draws-a-haptics-preference-so-the-port-gains-its-second-verb.md).

**The lesson above survives the change, and is the reason the change was containable.** The
guarantee was never *"one"*; it was *"a number small enough that adding to it is visible"*. Going
from one verb to two took an ADR, a changed assertion in `haptics.test.tsx` (`['commit']` →
`['commit', 'select']`), and a diff a reviewer can see. A module with `impactAsync(style)` on it
would have absorbed the same requirement with no diff at all — which is what "cannot express the
excess" buys, whether or not the count ever moves.

Two things kept the erosion bounded:

- **The new verb names a gesture, not a strength.** `select()` can be called on the one gesture
  `15` draws a switch for. `light()` could be called on anything.
- **The preference gates one verb, at one place.** `selectionGated()` wraps the port where a route
  composes it, so no call site holds the branch and `commit()` passes through untouched — turning
  the switch off is not a request to mute a save.

And the refusal it reversed was narrower than it read. F-206 argued against *"a second switch
beside the platform's"* because the two can disagree. ADR-0104 keeps the app's switch
**subordinate**: off means this app asks for nothing, on means it asks and the OS still decides.
There is no state where the app wins an argument with the phone, which is what the original
objection was actually about.
