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
