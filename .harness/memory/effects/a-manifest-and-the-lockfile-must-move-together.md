# A manifest and the lockfile must move together

**E-032** · from `pnpm-workspace.yaml` and every manifest it globs · guard `gate:state`

## What depends on what

`pnpm-workspace.yaml` names the projects. Each project's `package.json` declares dependencies.
`pnpm-lock.yaml` resolves all of them, once, for the whole workspace. CI installs with
`pnpm install --frozen-lockfile`, which refuses if the lockfile does not resolve exactly what
the manifests declare — the same three dependency sections, compared **verbatim**, plus
`overrides`.

So the lockfile is not a cache. It is a shared artefact that **every manifest is an input to**,
and that **every gate is downstream of**: install is step nine of the CI job, and the seventeen
steps after it do not run if it fails.

## Why it broke

F-020 added `@irodora/corpus: workspace:*` to `packages/store/package.json`. Nothing regenerated
the lockfile. Three pushes were red at `Install` with every gate skipped, and the error named one
package and nothing about the cause.

**It was not carelessness, and that is the whole lesson.** `pnpm install` could not run on the
workstation at all — Node 22.16.0 and pnpm 9.3.0 against `engines` demanding 24.19.0 and 11 — so
`packages/store/node_modules/@irodora/corpus` was created by hand as a junction. `progress.md`
records that honestly. The junction made the local tree behave *correctly*: imports resolved,
typecheck passed, tests passed. There was no local command that could disagree with it, because
the one command that would have — `pnpm install` — was the command that could not run.

A dependency edge that exists in three places (the manifest, the lockfile, `node_modules`) can be
true in two of them and still be false where it counts.

## What guards it now

Gate 0, section 7b of `scripts/verify-state.mjs`. It mirrors pnpm's own rule rather than
approximating it, and it runs **before install, on Node built-ins, on a clean clone** — which is
the only position from which it can say *"the lockfile is stale"* to somebody who cannot run
pnpm at all. Workspace projects come from the `packages:` globs rather than a hard-coded list,
and a glob the parser cannot expand fails rather than being skipped.

`scripts/verify-lockfile-proof.mjs` plants seven cases. Five must go red: the F-020 shape, a
changed specifier, a removal, an override drift, and a project with no importer. **Two must stay
green**, and the second is the one that took thought — a workspace project declaring nothing is
written `tests/bench: {}` in the lockfile, and reading that as absent would have made the check
fail on a correct lockfile from its very first run.

## What this does not catch

Whether the resolved *versions* are the ones you wanted. This compares specifiers, which is what
`--frozen-lockfile` compares. A lockfile that resolves `^4.1.10` to a yanked 4.1.10 is a
different question, and `pnpm security:audit` is where it is asked.

A `catalog:` specifier is resolved in the lockfile and no longer matches the manifest text, so
presence is checked and the version is not. The run prints the count when there is one; there are
none today.

## Related

- [[the-cache-key-decides-whether-a-gate-ran-at-all]] — the same shape one level up: a check that
  reports green because it never executed, rather than because it passed.
- [[a-gate-that-errors-is-failing-open]]
