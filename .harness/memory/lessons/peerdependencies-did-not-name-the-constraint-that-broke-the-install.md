---
kind: lesson
title: peerDependencies did not name the constraint that broke the install — read dependencies, then run it
category: convention
confidence: 0.9
created: 2026-08-20
scope: [root, apps/mobile, packages/ui]
links: [[an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour]], [[a-gate-that-errors-is-failing-open]], [[prose-in-a-state-file-rots-and-no-schema-can-see-it]]
---

# `peerDependencies` did not name the constraint that broke the install

**A package's `peerDependencies` is what it asks you to supply, not the full set of versions it
is compatible with.** Its `dependencies` can pin a whole toolchain generation that nothing in
the peer list mentions — and the failure arrives as an internal `TypeError`, not as a version
warning.

## Where it came from

Choosing the React Native test stack for the `a11y` gate (ADR-0055). `jest-expo@57.0.4` lists
these peers:

```
expo · react-native · react-server-dom-webpack · @react-native/jest-preset ^0.86.2
```

**`jest` is not among them.** So installing `jest@30` alongside it looks entirely reasonable,
and pnpm raises nothing that points at the real problem. The run dies with:

```
TypeError: this._moduleMocker.clearMocksOnScope is not a function
    at Runtime.resetModules (jest-runtime@30.4.2/build/index.js:3784:28)
```

— zero tests executed. The answer was in `dependencies`, not `peerDependencies`:
`@jest/globals@^29`, `jest-snapshot@^29`, `babel-jest@^29`, `jest-environment-jsdom@^29`.
`jest-expo@57` is a **Jest 29** package. pnpm's strict resolution then had `jest-runtime@30`
calling into `jest-mock@29`, which is exactly what that `TypeError` is.

A second mismatch in the same install was invisible for a different reason:
`@testing-library/react-native@14` peers on **`test-renderer@^1`**, while `jest-expo@57` ships
**`react-test-renderer@19.2.3`**. Those are two different packages with confusingly similar
names, so "RNTL 14 is the latest, jest-expo 57 is the latest, therefore they go together" is
wrong in a way no version number reveals.

## What actually settled it

Running it. Two spike assertions — resolve `getByRole('button', { name })`, and read back
`props.style` — took a few minutes and produced facts that no amount of reading the docs had
produced. The aligned set is `jest@29.7.0 · jest-expo@57.0.4 · RNTL@13.3.3 ·
react-test-renderer@19.2.3`, and it is pinned as a **unit**, because it is one.

## What to do about it

1. **Before adopting a toolchain package, read `dependencies`, not only `peerDependencies`.**
   `npm view <pkg> dependencies --json` is one command and it is where the generation lock hides.
2. **Treat "both are latest" as no evidence of compatibility**, especially where a package was
   renamed across a major (`react-test-renderer` → `test-renderer`).
3. **Spike before the ADR, not after.** A decision recorded from published contracts is weaker
   than one recorded from a run, and it should say which of the two it is — including for the
   alternative you did *not* execute.
4. **Pin the whole set together and say why.** Bumping one member of an aligned quartet is how
   the next person rediscovers this.

## The general shape

The same as [[an-oracle-that-normalises-its-input-will-silently-adapt-a-mislabelled-colour]]:
the metadata described a contract, the contract was not the behaviour, and the only thing that
distinguished them was executing it at the inputs that fail rather than at the inputs you chose.
