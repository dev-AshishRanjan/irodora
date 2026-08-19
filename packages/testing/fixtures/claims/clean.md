# Claims lint fixture — the case that must stay GREEN

This file is the negative control for `scripts/verify-claims-proof.mjs`.

**A proof where every case is red cannot distinguish a working gate from one that fails on
everything.** So one case must pass, and this is it: a file that talks about the policy, uses
the honest vocabulary throughout, and quotes a banned construction exactly once — under a valid
inline marker.

## Language this product may use

An estimated value is **estimated**. It carries a confidence and an illumination class, and it
says which of the two it is unsure about. A corpus entry is a **closest reference** ranked by
ΔE00, never an identity — the rendered hex is a modern approximation of a colour a dye once
produced on a fibre under daylight.

A calibrated value may say **measured**, because a reference card was in frame and the
correction is recorded. A declared value was **selected** or **entered** by a person, and
saying "detected" about it would be a lie about where the number came from.

## The marker, used correctly

The line below quotes a banned phrase because this file is explaining the ban. That is what the
inline marker is for, and the marker carries a reason:

> Never describe a capture as "the true colour" of a garment. claims-ok: this fixture documents the ban and must quote one phrase to prove the marker works

## What this fixture proves

1. The lint does **not** fire on honest vocabulary — estimated, closest reference, measured
   under calibration, selected, entered.
2. The lint does **not** fire on a banned phrase that carries a marker with a real reason.
3. Therefore a red result from any mutated copy of this file is caused by the mutation, and by
   nothing else.

Point 3 is the whole reason this file exists. Without a green baseline, every red is
uninterpretable.
