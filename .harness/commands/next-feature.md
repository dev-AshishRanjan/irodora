# Command: next-feature

Select and claim the next feature.

## Procedure

1. **Run [initialization](../protocols/initialization.md)** if it has not run this session.

2. **Check the WIP limit.** If anything is `in_progress` in
   [`feature_list.json`](../state/feature_list.json), **stop and report it.** `wip_limit: 1`
   is enforced by the `state` gate; finish what is claimed.

3. **Select** the lowest-id feature where:
   - `release` is the current release,
   - `status` is `todo`,
   - every id in `blockedBy` has `status: "done"`,
   - `priority` is not `wont`.

4. **Check its open questions.** If the feature depends on an unresolved `OQ-*`, it is
   blocked — an open question closes as an ADR, not as a decision someone makes in passing.

5. **Set `status: "in_progress"`** and update `updated`.

6. **Report:**

```
Claimed:      F-0NN — <title>
Requirements: FR-*, NFR-*
Release:      R<n>
Acceptance:   <the list — this is the contract>
Gates:        <which apply>
Effects:      <existing links whose `from` this will touch>
Next:         write the plan (plan-feature)
```

7. **Validate:** `node scripts/verify-state.mjs`

## If nothing is eligible

Say which release is current, what remains in it, and what is blocking the blocked items. Do
not silently pull from a later release — release order exists because R1 proves the engine
before anything is built on top of it.
