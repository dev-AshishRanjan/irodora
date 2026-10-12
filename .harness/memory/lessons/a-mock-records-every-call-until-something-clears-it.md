# A mock records every call until something clears it

**Date:** 2026-10-10 · **Found in:** F-240, increment 9, and its review (B1)

`a11y` died out of memory in `apps/mobile`'s `screens.test`, two increments after F-240's preview
sweep added about 1,000 renders to the file. The sweep was not leaking. A per-test heap probe, with a
forced collection after each test, showed retained memory climbing across the whole file, 254 MB to
2.1 GB, and two heap snapshots named what held it: `jest.fn` records.

- React Native's jest setup mocks `performance.now`, which every render calls about 550 times. Each
  call kept its arguments array and a result object.
- It mocks `AccessibilityInfo`'s listener too, and each record's argument was a bound `setState`,
  so it held a fiber and through it the whole unmounted tree, with React's debug stacks.

Nothing cleared them, because neither jest config set `clearMocks`. A file that renders a little
never notices; a file that renders everything in every theme, language and mode does. The same
retention made `packages/ui`'s conformance file slow enough under turbo's parallel load that its
cleanup hook passed jest's 5 s limit once: a flake that had first been written off as load.

## What to do instead

- **Clear mock records in the config** (`clearMocks: true`). It keeps every implementation; only
  the records go, before each test.
- **Measure retained heap, not peak heap.** Collect after each test (`--expose-gc`, a
  `setupFilesAfterEnv` probe) and read the trend. A climb across tests is a retention; a peak
  inside one test is that test's own work.
- **A probe that renders in one synchronous loop measures pending microtasks too.** Spread the
  renders across tests, or the probe reports promise jobs as a leak.
- **A timeout under load is a finding until it is explained.** "Load" names the condition, not the
  cause.

Related: [[a-package-gate-is-not-the-repository-gate]].

## F-266: the other half, which `clearMocks` did not touch

F-240's review (B1) had blamed the ui conformance file's 5 s cleanup timeout on the same retention,
and `clearMocks` was its fix. **It came back, on the same test, during F-266.** The memory had
gone; the timeout had another cause.

React Native Testing Library queues an async unmount for **every** `render()` and awaits each one in
its `afterEach`, **whether or not the test already unmounted the tree**. The conformance harness
unmounts each subject as soon as it has the JSON, so it looked as if nothing was left to clean up.
But a single test that drew the whole registry in two palettes left hundreds of `act`s for one
hook with a 5 s limit. Under turbo's parallel load, that hook ran past the limit.

- **A test that renders the whole registry has a cleanup hook whose cost grows with the
  registry.** Write it per subject (`it.each`). Each hook then awaits one subject's renders, and a
  failure names the subject.
- **Look for a duplicate before splitting one.** The ui file's `checkAll(SUBJECTS)` test was the
  per-subject check flat-mapped, run again beside the per-subject tests. It is gone.
- **The same shape remains in `apps/mobile/test/screens.test.tsx`:** its whole-registry tests and
  the F-204 evidence sweep. None has timed out; F-332 records the work.
