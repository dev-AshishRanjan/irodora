---
kind: lesson
title: Parse by matching what you want, not by removing what you recognise
category: convention
confidence: 1.0
created: 2026-08-24
scope: [root]
links: [[an-identity-check-a-typo-can-satisfy-is-not-a-check]], [[a-gate-that-errors-is-failing-open]]
---

# Parse by matching what you want, not by removing what you recognise

**A sanitiser that cannot fail turns a typo into a confident wrong answer.**

Gate 16 compares the signer certificate in a built APK against an expected fingerprint. The
expected value is pasted by a person, from a tool that labels it:

```text
SHA256 Fingerprint=DF:6D:BF:AF:…              openssl x509 -fingerprint -sha256
SHA256: DF:6D:BF:AF:…                         keytool -list
Signer #1 certificate SHA-256 digest: df6d…   apksigner verify --print-certs
```

## Two attempts, wrong in the same direction

**Remove what is not hex.** `SHA256 Fingerprint=` is not all letters — the `A`, `256`, `F`
and `e` are hex digits. The filter kept them, produced a 70-character value, and the gate
reported **a certificate mismatch on a correctly signed APK**.

That is not merely a wrong answer, it is a wrong answer that *accuses*: it reads as a
compromised signing key. A day was spent on a parsing bug wearing a security incident's
clothes.

**Remove the label by name.** Better, and still the same shape. It knew openssl's wording
and keytool's, and rejected apksigner's — which is the wording printed in the same job log,
one step above the gate that reads it. Every subtraction-based parser has this property:
it is correct exactly on the inputs its author happened to enumerate.

## What worked

Do not describe what to discard. Describe what the value **is**, and require it:

```js
// 64 hex digits, or 32 colon-separated pairs. Word-anchored, so a longer
// run cannot be quietly truncated to a plausible-looking 64.
const shapes = [/\b(?:[0-9a-fA-F]{2}:){31}[0-9a-fA-F]{2}\b/g, /\b[0-9a-fA-F]{64}\b/g];
```

Labels stop mattering, because they are never hex-shaped. The parser gained inputs it was
never taught (apksigner's, and anything else that prints a fingerprint in a sentence) while
becoming *stricter* — the two properties are not usually available together.

## The two failure directions, both closed

- **Nothing shaped like a fingerprint** → throw. A value the checker cannot understand must
  never become a comparison it can lose.
- **Two that disagree** → throw. `apksigner` prints the certificate digest *and* the public
  key digest; picking one is guessing which question the operator meant to ask.

## The habit

When accepting a human-pasted value, write the regex for **the value**, anchored, and let
everything else fail. If the parser has a list of prefixes it strips, it has a list of tools
it has not met yet.

And when a comparison fails on data you control, suspect the reader before the data —
especially when the failure is the alarming one.
