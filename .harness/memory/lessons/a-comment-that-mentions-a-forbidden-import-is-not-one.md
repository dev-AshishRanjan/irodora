# A comment that mentions a forbidden import is not one

**From F-241 (2026-09-21).** Two source scans went red in one increment, and neither had found a
defect.

`screens.test.tsx` asserts that no screen mentions the device database module, because a screen
that imported it could not be rendered by the suite where the accessibility guarantees are
checked. It does that with `source.includes('expo-sqlite')`. A new docblock on `ProfileSetup`
explained *why* the picture is a prop — *"reading it means reaching the repository, which reaches
`expo-sqlite`"* — and the check reported the screen as importing it.

Minutes later, a new assertion written in the same increment scanned `avatar.ts` for `vision` and
`face` to prove nothing reads the photograph. It went red on the module's own docblock, which says
in plain words that it imports neither.

**A text scan cannot tell a mention from a use**, and the mentions that trip it are usually the
comments written to explain the very rule it enforces. So the check punishes the thing it wants:
saying out loud why a module does not import something makes it look like it does.

## What to do instead

- **Scan the import specifiers, not the file.** `[...text.matchAll(/from '([^']+)'|import\('([^']+)'\)/gu)]`
  is four lines and immune to prose. `verify-app-glyphs.mjs` already learned this — it strips
  comments and matches specifiers — and the knowledge had not reached the assertions written
  inline in test files.
- **Keep a decoy on the pattern itself.** `expect(reads.test('@irodora/color-core')).toBe(true)`
  beside the "no matches" assertion, so an empty result means *nothing offends* rather than
  *nothing matches anything*.
- **When you cannot change the check, change the prose — and say why in it.** The `ProfileSetup`
  docblock now describes the database without naming the module, with one line explaining that the
  omission is deliberate. A reader who does not know that will otherwise "helpfully" name it.
- **A scan that a comment can trip is a finding about the scan**, even when rewording is the
  cheaper fix. Record it; it will fire again on somebody who has no idea the rule exists.

Related: [[a-negative-test-needs-a-decoy-not-an-empty-fixture]],
[[parse-by-matching-what-you-want-not-by-removing-what-you-recognise]],
[[a-gate-that-errors-is-failing-open]].
