# A privacy claim is true until somebody builds the thing it denies

**E-037** · from `apps/mobile/src/lens/handoff.ts` · guard `gate:a11y`
(`screens.test.tsx`, asserted from both sides)

## What depends on what

The profile screen has said this since F-026:

```
'profile.privacy': 'No camera. Everything stays on this device.'
```

It was **true**. ADR-0010 §2 makes the swatch path the primary one precisely because it is
deterministic, private, and works for somebody who does not want to photograph their face. The
string is that promise, on the screen rather than only in the ADR, and a test asserted it
rendered.

F-027 then built `estimateFromReading`, and the screen grew a `reading` prop. Still true in
practice: nothing in the app could construct a `LensReading`, so the prop was reachable only
from a test.

**F-097 built the producer.** The moment a person can tap "use this colour for my profile" and
land on that screen, the first sentence of that string is false — on exactly the run where the
claim matters most.

## Why nothing would have caught it

This is the part worth remembering. At no point does anything break:

- The key still exists. `i18n.test.ts` checks that every key has a translation, not that the
  right key is shown.
- It still renders. The conformance suite checks contrast, roles and token resolution — a
  sentence's *truth* is not a property it can see.
- The existing test still passes. It asserts the guided path says "No camera", and the guided
  path is unchanged and still says it.
- Nobody edited the string. The thing that changed was somewhere else entirely.

A claim does not become false by being edited. It becomes false when the world it describes
moves, and **the file that moved is not the file that carries the claim**.

## What guards it now

`profile.privacy` is conditional: the guided path keeps it, and the photo path says what is
true of *it* — the frame was looked at and discarded, and nothing left the device. That is the
same claim `NSCameraUsageDescription` makes at the moment permission is requested, which is
where a person first reads it.

The test is asserted **from both sides**, and the second half is the load-bearing one:

- the guided path **contains** "No camera" — the assertion that already existed
- the photo path **does not contain** it, and does contain the sentence that replaces it

A one-sided assertion would have kept passing through exactly the change that made the claim
false.

## What this does not catch

Any other claim in the catalogue whose truth depends on code elsewhere. There are 300-odd
strings and this is one of them; NFR-21's copy lint binds *measurement* language to provenance
and nothing binds anything else. The general check would be a claims register with a citation
per claim — which is roughly what `content/rules/claims.json` is for the phrases it covers, and
it does not cover this one.

## Related

- [[a-tested-module-nobody-wired-up-passes-every-test-it-has]] — the defect F-097 closed; this
  is what closing it broke.
- [[a-decoy-that-is-not-broken-proves-nothing]] — why the negative half of the assertion is the
  half that matters.
- [[a-note-explaining-that-an-artefact-is-absent-is-an-instance-of-it]] — the other way a
  sentence about the system stops matching the system.
