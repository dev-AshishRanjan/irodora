# A capability is read off the build, not off the code that asks for it

**Date:** 2026-10-13 · **Found in:** F-237's planning (recorded as F-336)

## What happened

The device driver opens the database and runs `PRAGMA key` before anything else. Its comments
explain at length why the order matters, and it reports `encryptsAtRest: true`. F-041, F-042 and
F-241 all reasoned about "the SQLCipher database".

The library was never SQLCipher. expo-sqlite links SQLCipher only when its config plugin is given
`useSQLCipher: true`, and `app.config.ts` never passed it. Plain SQLite ignores a pragma it does not
know, so `PRAGMA key` and `PRAGMA rekey` succeeded and did nothing. Every test stayed green:

- the CI driver honestly reports `encryptsAtRest: false`;
- the device driver's `true` was a literal;
- nothing anywhere asked the library what it was.

## The rule

1. **A claim that a capability exists is read from the thing that provides it.** For a native
   library, that is the build configuration and a runtime query (`PRAGMA cipher_version`), never
   the code that uses the capability. Code that asks for encryption proves only that it asked.
2. **A flag that reports a capability is computed, never written as a literal.** A literal `true`
   is an assertion with no test behind it, and it outlives every change underneath it.
3. **A silently ignored instruction is the most dangerous failure there is.** If a dependency
   accepts what it does not understand, find out in the build, not in a person's stolen phone.

## How to apply

Whenever a feature relies on a native or optional capability (encryption, a codec, a sensor, a
background mode), find the switch that turns it on in the dependency's own build files. Then make
the app refuse to start, by name, when a runtime probe says it is missing.

Links: [[an-exception-a-check-allows-needs-an-owner-and-still-counts]] · [[a-check-must-report-its-scope-not-only-its-verdict]]
