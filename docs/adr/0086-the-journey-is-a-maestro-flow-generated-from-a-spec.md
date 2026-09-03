# ADR-0086 — The journey is a Maestro flow generated from a spec, not a hand-written one

## Status

**Accepted** — F-091.

## Date

2026-09-03

## Context

Gate 7 (`e2e`) has been `pending` since it was written. `scripts/e2e-scope.mjs` refuses to
report coverage when **no package declares a `test:e2e` task**, and none does, so the gate has
no subject. Fifteen features have listed `e2e` in their verification and reported it *not run*.

Two things have to be decided before that can change, and only one of them is the obvious one.

**Which tool.** Every end-to-end option for an Expo app drives a real build on a real device.

**How the journey is written.** This is the one that matters here, because of where the work is
being done: **the journey cannot be run on the maintenance workstation.** There is no JDK and no
AVD; criteria 2–4 of F-091 are `attested` under
[ADR-0038](0038-every-acceptance-criterion-names-its-check.md) for exactly that reason.

A journey that nothing runs is a file nothing checks. Its selectors name strings the app renders,
routes the app declares and corpus slugs the app ships — and every one of those can be renamed,
moved or unpublished with **every gate staying green**, because the only thing that would have
noticed is the run that never happens. That is the failing-open shape this repository keeps
finding, and it would be a poor joke to introduce a fresh instance of it in the feature whose
whole purpose is to close one.

## Decision

**Maestro**, and **the flow is generated from a spec rather than hand-written.**

### Maestro

- **It is not an npm dependency.** The CLI is installed out of band, so nothing enters
  `pnpm-lock.yaml`, no transitive tree arrives with it, and **E-032** is untouched. Adding a
  dependency to the app package to test the app package is a cost this avoids entirely.
- **It is black-box.** No instrumentation build, no second build variant, no change to the
  native project. The app under test is the app that ships.
- **Its flows are data.** This is the property the second half of the decision depends on:
  there is no static check for arbitrary JavaScript, and there is one for YAML built from a
  vocabulary we define.

### The flow is generated

A journey is authored as `apps/mobile/e2e/journeys/*.journey.json`, naming **message keys**,
**corpus slugs** and **routes** — never literal strings. `scripts/generate-e2e-flows.mjs`
resolves each against the app's own sources and writes the Maestro YAML, which is committed;
`--check` fails when the committed flow no longer matches what the sources produce.

That makes three classes of rot fail **on a machine with no device, at the moment the change is
made**:

| what changes | what breaks today | what breaks after this |
|---|---|---|
| a message key is renamed | the app and its tests | …and the journey, in `lint` |
| a corpus entry is unpublished | the bundle digest | …and any journey that opened it |
| a route file is renamed | the app | …and any journey that navigated to it |

It is the same pattern as the five `generate-*.mjs --check` pairs that already guard the design
tokens, the font subset, the corpus bundle, the rules bundle and the taxonomy vocabulary.

### `test:e2e` refuses rather than passes

After the flow check, `scripts/e2e-run.mjs` looks for **the Maestro CLI on `PATH`** and **exits
non-zero saying it is absent**. A task that exits 0 having run no journey is precisely what
`e2e-scope.mjs` exists to prevent. Gate 7 therefore stays `pending` with `ciStep: false` until a
CI run can execute it — that is F-091's criterion 4, and it is attested.

**It does not check for a device**, and an earlier draft of this paragraph said it did. With
Maestro installed and nothing attached, the refusal banner never prints and Maestro's own
non-zero exit is what stops the task. That is still fail-closed, so the behaviour is right and
the sentence was wrong — the sort of overstatement golden rule 11 is about, which does not stop
applying to an ADR. A device probe would mean shelling out to `adb` or `xcrun` and knowing which
platform is being targeted; Maestro already answers the question, better, at the point of use.

## Consequences

**Good** — the journey is checkable before it is runnable, which is the only useful property it
can have on a workstation that cannot run it. The selectors are the app's own strings by
construction rather than by transcription, so the flow cannot drift from the catalogue silently.
No dependency is added. And when a device does appear, nothing about the flow needs revisiting:
the generated YAML is ordinary Maestro.

**Bad** — **a step vocabulary is a thing to maintain.** Launch, tap, assert-visible, type and
back cover the Atlas journey; a future journey will want something the generator does not emit,
and each addition is a small piece of work. The alternative — a raw-YAML passthrough for
"just this one step" — is refused, because it reopens the hole for the one step nobody checks.
**A generated artefact is committed**, so a regeneration shows up in review as a diff of a file
nobody edited, which is a paper cut the other five generators already impose.

**Neutral** — **the check proves the selectors exist, not that the flow drives the app.** A
valid flow can still be a wrong flow. That gap is F-091's criterion 2 and it is named as
attested rather than papered over; `e2e-scope.mjs` says so in its report, so a green `covered`
line cannot be read as *this journey passed*.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Detox** | The most established option for React Native, and gray-box synchronisation genuinely removes a class of flake that black-box waiting has to handle with retries. It arrives as an npm dependency with a native instrumentation build, so the app under test stops being the app that ships, and the journey becomes arbitrary JavaScript — which cannot be checked statically against the catalogue at all. On a workstation that cannot run the journey, "cannot be checked" is the whole cost. |
| **Appium** | Genuinely cross-platform and driver-based, and the WebDriver protocol is a real standard. It is the heaviest of the three to stand up — a server, a driver per platform, and a capability matrix — for a single journey that currently cannot run. |
| **A hand-written Maestro flow** | Simpler by every immediate measure: one YAML file, no generator, no spec vocabulary, and it reads as what it is. It is also a file full of string literals copied out of a catalogue, with **nothing** that notices when the catalogue moves — on a machine where nothing runs it, that is a file that is wrong the first time somebody renames a key, and stays wrong silently. |
| **Add `testID` attributes and select on those** | Stable selectors that survive copy changes, which is the usual advice. It would put test-only attributes into every screen the journeys touch, and it selects on something **no person can perceive** — where accessible names are already required by gate 8 and are what a screen reader announces. A journey that needs a `testID` to find a control is describing a control a person could not find either. |
| **Declare `test:e2e` as a placeholder and write the journey with F-039's device work** | Satisfies criterion 1 in one line. It leaves gate 7 with a subject that asserts nothing, which is a gate failing open wearing the costume of a gate that passes. |

## Revisit when

**A device or emulator becomes available.** The first real run is where a valid-but-wrong flow
is found, and what it teaches belongs in a successor rather than in this file's confidence.

**The step vocabulary stops fitting.** If a journey needs something the generator cannot emit and
the emitter is growing awkward, that is the signal to reconsider generation — not to add a
passthrough.
