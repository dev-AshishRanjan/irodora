# Protocols

Procedures that run at defined moments. A protocol is not advice — it is a sequence with a
trigger, and skipping it is a process failure regardless of how the work turned out.

| Protocol | Trigger |
|---|---|
| [initialization](initialization.md) | The start of every session |
| [verification](verification.md) | Before declaring anything done |
| [definition-of-done](definition-of-done.md) | Deciding whether a feature is complete |
| [effect-link](effect-link.md) | A shared contract changed; before closing a feature |
| [clean-state](clean-state.md) | The end of every session; every checkpoint |
| [session-handoff](session-handoff.md) | Work continues elsewhere |
| [observability](observability.md) | Adding a code path, job, or user-facing operation |

## The order they fire in

```
initialization ──→ (work) ──→ effect-link ──→ verification ──→ definition-of-done
                                                                        │
                                                        clean-state ◄───┘
                                                              │
                                                       session-handoff
                                                       (if continuing elsewhere)
```

`observability` is not a phase — it fires whenever a code path is added, inside the work.

## Why effect-link runs before verification

Tracing effects usually reveals dependents that need changing. Verifying first means
verifying an incomplete change, then verifying again — and the second run is the one people
skip.
