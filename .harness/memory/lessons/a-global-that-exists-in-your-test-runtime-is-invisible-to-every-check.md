# A global that exists in your test runtime is invisible to every check

**From F-104.** `packages/store` called `crypto.getRandomValues`. Seventeen gates, 68 assertions
in that package alone, a typecheck, and a lint that already banned `window`, `document` and
`process` — all green. The app died on the first screen that generated an id.

## Why nothing could see it

| check | what it did | why it passed |
|---|---|---|
| the package's tests | ran under **Node** | `globalThis.crypto` has been real since Node 18 |
| `tsc` | read `lib.dom` | `crypto` is declared there, so the call type-checked |
| `no-restricted-globals` | banned three globals | it was scoped to `packages/color-*` |
| the conformance suite | rendered every screen | also under Node, so the call succeeded |

Every one of those was working correctly. **The gap is not in any of them; it is between the
runtime the checks run in and the runtime the code ships to.**

## The tell

A global is a claim about the environment, and a test suite can only ever verify that claim
about *its own* environment. `crypto` is real in Node, real in browsers, and absent in Hermes —
so a codebase whose tests run in one of the three and whose product runs in the third has a
blind spot that is exactly the size of the difference between them.

The same applies to `Buffer`, `structuredClone`, `TextEncoder`, `localStorage`, `setImmediate`
and anything else reached by bare name. **Verify what the target actually installs.** For Expo
that is one file — `expo/src/winter/runtime.native.ts` — and reading it took a minute:
`TextDecoder`, `TextDecoderStream`, `TextEncoderStream`, `URL`, `URLSearchParams`,
`DOMException`, and no crypto.

## What the symptom looks like from outside

Perfectly correlated with **which screens do the thing**, not with anything that looks like the
cause. Two buttons closed the app; four worked. That is the shape of an environment gap: the
crash follows a *capability*, not a component, and the two routes that shared it were the only
two that generated randomness.

When a crash correlates with a capability rather than a code path, look for something the
runtime does not have.

## What to do instead

**Take the platform through a port, and make its absence a refusal.** The same shape
`SecureKeyStore` already had in that package: the package declares an interface, the app
supplies the binding, and the default path throws a sentence naming the fix rather than a
`TypeError` naming nothing.

Then **ban the bare global by lint** so the next one cannot be written, scoped to every zone
that ships rather than the one that happened to be strictest. Reading `globalThis.crypto`
defensively is fine — that is a port asking what the platform has. Referencing `crypto` as a
bare global is the assumption.

## Related

- [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]] — the same failure one
  level up: a check that shares an assumption with its subject cannot test it.
- [[a-later-flat-config-object-replaces-a-rule-it-does-not-merge]] — why the new ban needed an
  `ignores` for the engine zone rather than a wider pattern.
- [[a-gate-must-model-what-renders-not-what-is-physically-correct]] — the sibling gap that hid
  the non-scrolling home screen in the same report.
