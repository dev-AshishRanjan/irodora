# ADR-0091 — A deliberate capture is FR-15's precision pick, and that is not the ceiling raise ADR-0087 refused

## Status

**Accepted** — F-160.

## Date

2026-09-05

## Context

Until now the Lens read every frame it was given and read all of them the same way:

```ts
const MODE = 'live' as const;
```

So `MODE_CEILING.precision` — FR-15's mode, `1` — **had never been reached by the app at all**,
and every colour the product had ever shown a person was capped at `live`'s `0.7`.

F-160 gives the Lens a shutter. That raises a question the old code could not ask: when
somebody aims the crosshair and presses a control, which mode is that?

`MODE_CEILING`'s own note answers it, and it was written long before there was a shutter:

> `live` is a continuous readout under a moving crosshair: **the person has not chosen a region
> and the camera has not settled**, so it cannot be as trustworthy as a deliberate capture even
> when the pixels happen to be good.

Both of those clauses are false of a frame taken because somebody aimed and pressed. And the
PRD's J2 journey already names this exact interaction: *"Open Lens → **precision-pick** the
fabric → colour"*.

**The reason this needs a decision rather than a commit message is
[ADR-0087](0087-a-calibrated-reading-does-not-get-a-higher-confidence-until-it-is-measured.md).**
That ADR refused to raise the confidence ceiling for calibrated mode, on the ground that
*"'this reading went through a correction' is not an observation about the reading's accuracy;
it is an observation about which code path ran"*. A shutter press is also a code path. If the
two cases are the same, this change is the thing golden rule 11 exists to stop.

## Decision

**A capture taken through the shutter is read as `precision`. A frame sampled for the live
readout is read as `live`.** The mapping is one function, `modeFor` in
`apps/mobile/src/lens/capture.ts`, and the demand travels with the sample from the frame thread
so a reading is read under the mode it was *sampled for* rather than whatever the mode had
become while it was in flight.

**Nothing else changes.** `read()` computes the same statistics over the same region with the
same rejection rules; the reading's confidence is still

```ts
Math.min(MODE_CEILING[mode], cappedConfidence(space, illumination, quality))
```

so the capture space, the illumination assessment and the quality assessment all still bound it.
A capture in an unstated colour space is still capped at `0.6`. A blurred capture in mixed light
still reports what the engine thinks of it.

## Why this is not what ADR-0087 refused

ADR-0087's principle is that **confidence is a bounded quality signal from stated inputs, each
of which is a thing that was observed.** It refused to *add* a bonus for a code path.

This does not add anything. `MODE_CEILING` is a set of **penalties** — ceilings that lower a
reading below what its own measurements would justify — and each one is documented with the
interaction that earns it. Live's penalty is documented as being for an unchosen region and an
unsettled camera. Applying that penalty to a frame where the person chose the region and waited
for it would not be caution; it would be a stated reason applied to a case it does not describe.

The distinction, put as plainly as it can be:

- **ADR-0087's rejected change:** *this correction ran, therefore the number is more accurate.*
  An accuracy claim, unmeasured.
- **This change:** *the reason we discount a live pick does not apply here, so we do not
  discount it.* No accuracy claim at all — the number is still whatever the observed inputs say.

Two more things keep this honest, and they are the ones to check if this is ever revisited:

1. **A capture is not automatically confident.** `precision`'s ceiling of `1` means *this
   interaction imposes no ceiling*, not *this reading is certain*. Reaching `1.0` requires a
   stated colour space, an excellent illumination assessment and an excellent quality
   assessment, all of which are measurements of the frame.
2. **Freezing a live reading does not upgrade it.** The shutter always asks the camera for a new
   frame, even in live mode, precisely so that "held" and "captured" cannot come apart. A held
   live reading with a precision ceiling would be exactly the code-path fallacy.

## Consequences

**Good** — FR-15's mode is reachable for the first time, and the number the product shows for a
deliberate reading is no longer discounted for an interaction that did not happen. The mapping
is one exported function with a test, rather than a constant buried in the viewfinder.

**Bad** — **the same garment now reads differently depending on how it was looked at**, and
somebody sweeping in live mode and then capturing will see the confidence figure rise. That is
correct and it will still look like the number moving for no visible reason. The sheet says
which conditions produced it; it does not yet say which mode did, and that is a real gap this
ADR does not close.

**Neutral** — the ceiling is still a **convention, not a measurement** (NFR-2), exactly as the
other three are. F-063's controlled session is what would replace any of them with a number, and
nothing here makes that harder: `modeFor` is the one place a future mapping would change.

## Alternatives considered

| Alternative | Why not |
|---|---|
| **Keep every reading on `live`** | Safest-looking, and the safety is an illusion: it would leave the product permanently understating a reading somebody took deliberately, and leave FR-15 unimplemented while `feature_list.json` says otherwise. Understating is a smaller sin than overstating, but a ceiling applied for a documented reason that does not hold is not caution — it is a number nobody can explain. |
| **Invent a fifth mode between them** | Tempting, because a single hand-held frame really is not a tripod. Rejected because the number would be invented today and defended forever — ADR-0087's own objection to deriving a confidence curve before F-063 measures one. There are four modes because FR-13, FR-14 and FR-15 name them; a fifth would be ours. |
| **Average several frames before calling it precision** | The strongest version of the objection, and the likely successor. It is genuinely more robust than one frame. It also needs cross-frame aggregation, which changes what crosses the bridge and makes `assessQuality`'s spatial measures meaningless on a concatenated region — real work, and F-135's territory rather than F-160's. |
| **Say nothing and change `MODE`** | What a commit could have done. The confidence figure is the one number in this product that tells a person how much to trust a colour, and moving it silently is the failure mode golden rule 11 describes. |
