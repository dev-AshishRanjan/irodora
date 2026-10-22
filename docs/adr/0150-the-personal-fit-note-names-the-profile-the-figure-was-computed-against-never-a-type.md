# ADR-0150: The personal-fit note names the profile the figure was computed against, never a type

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-10-22 |
| **Feature** | F-248 (binds F-257) |
| **Closes** | OQ-32 |
| **Applies** | R9 §4 E2, §6 C12; [ADR-0102](0102-a-seasonal-label-is-a-lossy-summary-read-off-the-ranges.md); F-223 c3; E-101; golden rules 11 and 14; NFR-22 |
| **Decided on** | The delegation of 2026-10-05 (R9 §11): *"For all OQ, when needed decide for yourself. Think, reason and research before deciding. Be professional and enterprise grade."* |

## Context

`07` prints *"94% Match (Cool-Muted profile)"* beside its personal-fit score, and `13` prints (claims-ok: quotes the drawn construction this line resolves)
*"92% (Cool-Muted Match)"*. R9 §4 E2 already removes *Match*. OQ-32 asks about the note: show the (claims-ok: quotes the drawn construction this line resolves)
seasonal label there, show something else, or show nothing.

F-223 c3 requires the seasonal label always to sit beside the ranges it summarises. ADR-0102 makes the
label a lossy summary read off the ranges, and `scoreColor` never reads it (§6). So a type printed
beside a score says the score derives from the type, which is false.

## Decision

- **D1.** The note stays, as a note: *(your profile)* (ja （あなたのプロフィール）). No seasonal label,
  modifier pair or type is printed beside a fit figure anywhere.
- **D2.** The figure is the outfit's FR-32 `personalFit` component, built from FR-29 per piece. With no
  stored profile there is no figure; the value reads *No profile yet* (E-101).
- **D3.** On `13`, a stored figure whose envelope's profile revision is not the current one reads
  *(an earlier profile)*. F-257 adds the key when it renders it. This needs no snapshot and no
  migration.
- **D4.** The seasonal label stays where ADR-0102 puts it: on `23`, beside its ranges.

## Alternatives, and what each costs

| Alternative | Cost |
|---|---|
| The seasonal label in the note | Contradicts ADR-0102 (never drawn without its ranges) and F-223 c3. Implies the score derives from the label, which `scoreColor` never reads. Absent for most guided profiles (OQ-33). Its rule is unsettled (OQ-34). Cannot be replayed for a saved outfit (ADR-0136) |
| The profile screen's band words (*Cool · Muted*) | Two of the four dimensions the figure reads. Reads as the modifier pair C12 calls a type |
| Nothing | Drops a drawn slot that a true value fits (ADR-0124's rule) |

## Evidence, and its limits

- **It rests on:** ADR-0102 §§5–7; F-223 c3; ADR-0136's replay limit; the drawn copy structure of `07`
  and `13`.
- **The limit:** the note carries less than the drawing. It says whose figure this is, not what the
  profile is like.

## Consequences

- R9 §4 E2's `07 13` row and §6 C12 say so; PRD §10 and R9 §11 close OQ-32.
- F-257 renders `13`'s note by D1 and D3.

## Revisit when

- A person asks to see what the profile is like beside a score, which would be a mockup decision.
