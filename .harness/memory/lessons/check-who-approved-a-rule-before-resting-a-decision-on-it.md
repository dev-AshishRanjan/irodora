---
kind: lesson
title: Check who approved a rule, and when, before resting a decision on that approval
category: engineering
confidence: 0.9
created: 2026-09-28
scope: [docs, .harness]
links: [[reproduce-a-published-number-before-trusting-the-method-it-states]]
---

# Check who approved a rule, and when, before resting a decision on that approval

**What happened.** The person delegated the open questions "the mockups answer when read strictly".
F-226 closed OQ-13 by reasoning that §2 of the fidelity contract ("a measured value snaps to the
nearest step") is "the definition of strict the person approved on 2026-09-10", so reading strictly
meant reading §2. The date came from the contract's header, which records the person's 2026-09-10
decision: *"no deviation"*. Nobody checked when §2's SENTENCE was written.

`git log -S` answers that in one command. The snap rule entered on 2026-09-14, in an agent-written
re-cut. And F-220 raised OQ-13 on 2026-09-15, AFTER §2 existed. So the question had already been
asked with §2 in view, which means §2 was not its answer. The review caught it. The closure was
withdrawn and the question reopened, and the same false date was found on a second claim (F-225's
"#5C6472 was approved") and corrected too.

**The rule.** A document's header date is the date of a decision, not of every sentence under it.
Before a decision rests on "the person approved X", find the commit that wrote X
(`git log -S "<phrase>" -- <file>`) and check what the person actually said. And if the question
being answered was raised after the rule existed, the rule was not taken as its answer. A delegation
to decide what the mockups answer does not extend to choosing a rule over what they draw.
