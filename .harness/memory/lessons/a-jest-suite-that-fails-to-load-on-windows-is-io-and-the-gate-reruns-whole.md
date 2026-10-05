---
kind: lesson
title: A jest suite that fails to load on Windows is I/O, and the gate re-runs whole
category: workaround
confidence: 0.9
created: 2026-10-05
scope: [root, packages/ui, apps/mobile]
links: [a-pipe-hides-the-exit-code-that-decides-the-commit]
---

# A jest suite that fails to load on Windows is I/O, and the gate re-runs whole

**Encountered four times across F-233 and F-234** (2026-09-29 to 2026-10-05, this workstation).

`pnpm test` exited 1 with every assertion that ran passing, because one or two suites never ran:

```
● Test suite failed to run
    UNKNOWN: unknown error, read          (or: jest: failed to read cache file … UNKNOWN)
      at Runtime.readFileBuffer …         (loading heroui-native → react-native-svg)
```

A different suite each time, in `@irodora/ui` or `@irodora/mobile`, always while turbo was running
both packages' jest workers at once. Each passed alone and on the re-run.

A second shape had the same cause: a 5 s `afterEach` timeout in the ui conformance suite, in a run
where the session was also type-checking and linting the app in parallel. Alone, the suite took
15 s and the hook a fraction of a second.

## What it is, and what it is not

It is Windows failing a file read under load: jest's transform cache and `node_modules` read by
many workers at once. It is not a defect in the suite that failed, which is why the name changes
every time. That is also why it must not be explained away per suite.

## What to do

- **Re-run the whole gate, alone.** Not the one suite, and not with anything else running: a gate
  is green when its own command exits 0, and a run where your own parallel commands competed for the
  CPU proves nothing either way.
- **Never accept the red run by counting passes.** "1087 passed, one suite did not load" is a
  failed gate. Record that it happened, and the clean re-run, in the progress entry.
- **Run gates one at a time, and do not start heavy commands while they run.** Draft in a scratch
  directory instead; edits to files a running gate reads make its result about neither tree.

If it ever fails the same suite twice running, it is not this.

Related: [[a-pipe-hides-the-exit-code-that-decides-the-commit]]
