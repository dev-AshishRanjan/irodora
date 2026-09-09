# A mailbox and a target are opposite shapes

**Effect:** [E-106](../../state/effects.json) · **Feature:** F-200 · **Date:** 2026-09-09

F-200 needed a colour held across screens. `lens/handoff.ts` already held a colour across
screens, and its docblock is confident about why it is built the way it is:

> *A mailbox: two functions, one slot, no subscribers, and nothing re-renders when it changes.*

Copying it would have been wrong on **both** axes, and the two are worth separating:

| | mailbox (`handoff`) | target (`F-200`) |
|---|---|---|
| who reads it | one screen | **every** screen |
| what reading does | **consumes** | leaves it |

A mailbox-shaped target vanishes the moment something looks at it, and is invisible on every
screen that did not explicitly ask. Both failures would have looked like "the target keeps
disappearing" and neither would have pointed at the shape.

## The question that separates them

**Is this an offer, or a state?**

An offer is made once, to one recipient, and consuming it is the point — *an offer that survives
being declined is not an offer*. A state is read by anyone, any number of times, and persists
until something deliberately changes it.

`handoff` is the first. A target is the second. They both "hold a colour between screens", which
is the description that makes them look alike and is the least useful thing about either.

## The rule that keeps a context safe here

This app has exactly two contexts, and both keep the same discipline: **screens take props, the
route reads the hook.** A screen that reached for a hook could not be rendered by the conformance
suite, which is where the accessibility guarantees are actually checked — so a context that
screens consumed directly would quietly remove those screens from the only check that matters.

Root chrome is the exception, and it is an exception because it is not a screen.

## And the default that must not exist

`useTarget` throws outside a provider. A null-ish default would make the provider optional in a
way nobody notices is missing — and a screen behaving as though nothing were armed is
indistinguishable from a disarmed target, which is the failure the feature exists against.

## The lesson

**Two things that store the same data can still be opposite shapes.** Before reusing a pattern
because the payload matches, ask who reads it and what reading does. The payload is the least
informative thing about a channel.

[[a-shared-channel-widens-by-type-or-it-widens-by-lie]]
