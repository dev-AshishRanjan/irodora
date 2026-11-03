---
kind: lesson
title: An app test reads a package’s build, not its source
created: 2026-11-03
feature: F-251
severity: medium
scope: [apps/mobile, packages/ui, packages/design-tokens]
links: [[a-check-that-reimplements-its-subject-agrees-with-it-on-day-one]]
---

# An app test reads a package’s build, not its source

`@irodora/ui` and `@irodora/design-tokens` publish `main: ./dist/index.js`, and jest resolves them
there. Twice in F-251 a test failed on code that was already fixed in source:

- ui's conformance suite reported a pairing `pair-undeclared` after the manifest declared it — it
  read design-tokens' **built** `DECLARED_PAIRINGS`;
- the inventory sweep could not find 16's chosen-chip dot after ChoiceGroup's pills gained ids — the
  app read ui's **built** ChoiceGroup.

The red was honest. The danger is the other way: a test that passes because the build is older than
the source it claims to test.

## What to do

- After a source change in a workspace package an app test reads, **build that package** before
  trusting the app's result: `pnpm --filter @irodora/<name> build`.
- Tier 2's `pnpm turbo run test --force` and `pnpm build` rebuild in order; a scoped jest run does not.
