# Commands

Entry points into the working loop. Mirrored as Claude Code slash commands in
[`../../.claude/commands/`](../../.claude/commands/), which are thin shims — the procedure
lives here.

| Command | Does |
|---|---|
| [next-feature](next-feature.md) | Select and claim the next eligible feature |
| [plan](plan.md) | Write the feature plan before touching source |
| [verify](verify.md) | Run the gates in order and capture evidence |
| [effects](effects.md) | Trace and record what a change affects |
| [checkpoint](checkpoint.md) | Leave a clean, recoverable state |
| [handoff](handoff.md) | Write the handoff for the next session |
| [design-review](design-review.md) | Review a design or an implemented surface |
| [color-audit](color-audit.md) | Audit an engine or corpus change |

## The usual sequence

```
next-feature → plan → (implement) → color-audit? → effects → verify → checkpoint
                                                                          │
                                                                       handoff
                                                                (if continuing elsewhere)
```

`design-review` and `color-audit` fire when the work is that shape, not every feature.

## Why effects runs before verify

Tracing effects usually reveals dependents that need changing. Verifying first means
verifying an incomplete change and then verifying again — and the second run is the one
people skip.
