---
kind: lesson
title: A proof must call the function the way the gate does, or it proves a different function
created: 2026-10-14
feature: F-340
severity: high
scope: [scripts]
links: [[a-decoy-that-is-not-broken-proves-nothing]], [[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]], [[saying-not-run-here-is-necessary-and-it-is-not-sufficient]]
---

# A proof must call the function the way the gate does, or it proves a different function

Gate 16 calls `brandResources(entries.keys(), dump)`. `entries` is a `Map`, so `entries.keys()` is a
**one-shot iterator**: the first read gets everything, and the second gets nothing.

F-231's review added a second read. `brandResources` spread the input for its name scan, and then
built `new Set(entryNames)` to check that each file the table names is in the APK. That had been
`entries.has(path)` inside the gate; the adaptive-icon XML is skipped by a type test beside it. In
the gate, that set was empty, so every file the resource table named was refused, and every
shortened release APK reported "no launcher icon or splash logo". A debug-named APK still passed, because only the first read was
needed to find its files.

The proof case written for that same fix passed an **array**. An array can be read any number of
times, so the case was green while the gate was broken. The case and the gate called the same
function, but with different kinds of value, and only the gate's kind had the defect.

## The rule

**When a proof exercises a function, it passes what the gate passes: the same kind of value, not
only the same contents.** That means an iterator where the gate hands an iterator, a `Map` where it
hands a `Map`, and a `Buffer` where it hands a `Buffer`. It is not enough for the contents to match,
because the defect can live in how the value behaves.

- **Look at the call site, not the parameter name.** The parameter was called `entryNames`, which
  reads like a list. Its only caller in the gate passed `.keys()`.
- **A function that takes "any iterable" and reads it twice has a defect waiting for the first
  caller that passes a generator or `.keys()`.** Read the input into an array once, at the top.
- **The SDK-free half of a proof matters most.** It is the only half that runs on most machines, so
  it has to model the gate's call exactly. The aapt2-built half did catch this, but only in a lane
  run by hand. Locally it ran only once `ANDROID_HOME` pointed at the real `Sdk` directory.

## How it was found

The person reported the Android lane red at its artefact proof. The proof was reproduced on a
workstation whose Android SDK had always been there: `ANDROID_HOME` named its parent, so the
sessions before had recorded the SDK half as "not run here" — a recurrence of
[[saying-not-run-here-is-necessary-and-it-is-not-sufficient]], whose F-340 addendum has the
details. Once the proof ran, `parseResourceDump` and `brandResources` were called by hand with an
array of the APK's entry names and routed all seven rasters. `checkApk` routed none. The only difference left was the kind of value passed.
