---
name: db-migration
description: Write a migration that can be rolled back, does not race on a multi-container start, and does not silently drop tenant isolation.
---

# db-migration

**Shim.** The canonical skill is [`.harness/skills/db-migration/SKILL.md`](../../../.harness/skills/db-migration/SKILL.md).

Read it and follow it. This file exists only so Claude Code can discover the skill; it holds
no content of its own, deliberately - a restatement is a copy that will diverge
([ADR-0029](../../../docs/adr/0029-harness-agnostic-core-thin-adapter.md)).
