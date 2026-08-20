---
kind: effect
title: The message key set is a contract with every render site, and the compiler is the guard
category: contract
confidence: 0.95
created: 2026-08-20
scope: [apps/mobile]
links: [[provenance-in-the-type-is-what-makes-honesty-structural]], [[a-corpus-publish-can-outrun-the-font-that-renders-it]]
---

# E-016 — the message key set is a contract with every render site

**`apps/mobile/src/i18n/en.ts` → `ja.ts` · every screen · the i18n test · `gate:typecheck`**

English is the source of `MessageKey`, and Japanese is `Record<MessageKey, string>`. Adding a
key breaks `ja` at compile time; removing one breaks every call site. Both are the *intended*
behaviour — that is the completeness mechanism, not a side effect of it (ADR-0056).

## Why the guard is the compiler and not a script

ADR-0028 forbids fallback: an untranslated string must fail the build rather than render in
English. Every mainstream runtime i18n library does the opposite by default — `fallbackLng` is
on, and turning it off is configuration. A guarantee that depends on a config flag staying
false is a reminder.

A completeness *script* would be stronger than a flag and still weaker than a type: a script
is a thing that must be wired into a gate, kept running and not skipped. `tsc` is already
blocking and already runs. This is the same move as `Provenance` on `Color`
([[provenance-in-the-type-is-what-makes-honesty-structural]]) — ask what makes a guarantee
impossible to violate, not what reminds people not to.

## What the type cannot see, and therefore what the test is for

**A copy-paste satisfies the type perfectly.** `Record<MessageKey, string>` accepts any string,
so pasting the English text into `ja.ts` type-checks. That is the realistic failure — not a
missing key, which the compiler catches, but a *present* key that was never translated.

So the runtime test does only the things the type cannot:

- no `ja` value equal to its English, outside a short explicit list that is itself asserted to
  be genuinely identical (a stale exemption silently covers a future copy-paste at that key);
- **Japanese script present** in every prose value — stronger than `!==`, which accepts a value
  someone edited into a near-copy;
- every declared key referenced at a call site, because an unused key is where a placeholder
  hides: nothing renders it, so nobody reads it.

And the assertion deliberately **not** written: `expect(Object.keys(en)).toEqual(Object.keys(ja))`
cannot fail, because the type makes the key sets equal by construction.

## Translated is not reviewed

Review status is recorded per entry against a roster id (ADR-0047) and the unreviewed count
prints on every run. OQ-5 — the engagement model for a Japanese editorial reviewer — is open,
and F-017 carries the corresponding attested criterion.

*"A missing translation fails the build"* must never quietly become *"an unreviewed translation
passes silently."*

## The neighbour

A new Japanese string can introduce a codepoint the bundled font lacks. That is
[[a-corpus-publish-can-outrun-the-font-that-renders-it]] (E-017), and `ja.ts` is a trigger for
both links.
