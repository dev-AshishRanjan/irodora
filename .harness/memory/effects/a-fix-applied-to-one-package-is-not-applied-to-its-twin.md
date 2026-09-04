# A fix applied to one package is not applied to its twin

**Effect:** [E-070](../../state/effects.json) · `apps/mobile/jest.setup.js` →
`apps/mobile/src/screens/Lens.tsx` · **high**

## What happened

F-157 removed a `react-native-gesture-handler` mock from `packages/ui/jest.setup.js`, pinned the
stack to 2.32.0, and wrote down why: *a mock that stubs behaviour is a test decision; one that
stubs existence is a test that has stopped describing the product.*

**`apps/mobile/jest.setup.js` had the same mock. It was not touched.**

By F-158 its docblock asserted two things the feature that fixed the other file had disproved —
that the tree resolves gesture-handler 3.2.1, and that downgrading breaks `expo-router`. Both
false, and stated with the confidence of something that was once checked.

## The half that was not visible

Stale comments are the obvious failure. The real one was what the mock **did**:

```js
const actual = jest.requireActual('react-native-gesture-handler/jestSetup.js');
return { ...actual, GestureHandlerRootView: 'GestureHandlerRootView', ... };
```

`jestSetup.js` is a **setup script**, not the module. Spreading it produced almost nothing. Every
export beyond the three names listed by hand was `undefined`, in every mobile test, for two
releases.

Nothing noticed because nothing reached that far. Then a bottom sheet did:

```
TypeError: Cannot read properties of undefined (reading 'UNDETERMINED')
```

`State.UNDETERMINED` — not a name anyone would have predicted, from a package nobody was thinking
about, in a feature about something else.

## The general shape

**A correction applied to one of two copies leaves the other one authoritative-looking and
wrong.** Nothing in either file mentioned the other. The two harnesses were copies of each other;
the fix was not.

What made this one findable was a feature that happened to need the real dependency — **luck of
scheduling, not a check**. There is still nothing that would find the next one.

If a third harness ever appears, that is the moment the shared parts should stop being copied.

## The rule that held

The fix here was the same as F-157's: **remove it, do not correct it.** A corrected mock is still
a mock supplying a surface it does not have. On 2.32.0 the real module loads, so 672 mobile tests
now render what a device renders.

Related: [[a-mock-that-supplies-a-missing-export-hides-that-it-is-missing]],
[[the-first-animated-portal-breaks-two-harness-assumptions-at-once]]
