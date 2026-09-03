---
kind: lesson
title: A generated file must be generated the way the formatter would leave it, or two gates disagree forever
category: engineering
confidence: 1.0
created: 2026-09-03
scope: [scripts, apps/mobile]
links: [[a-note-explaining-that-an-artefact-is-absent-is-an-instance-of-it]], [[a-mutation-harness-that-cannot-start-the-runner-reports-every-mutation-caught]]
---

# `format` rewrites a generated file; `--check` then calls it drifted

`scripts/generate-e2e-flows.mjs` emitted YAML with double-quoted scalars, because
`JSON.stringify` is the obvious way to quote a string and JSON's escaping is valid YAML.

Then `pnpm format` ran. **Prettier formats `.yaml`,** and it writes single quotes:

```yaml
- assertVisible: "Colour Atlas"   # what the generator wrote
- assertVisible: 'Colour Atlas'   # what prettier left
```

Both gates were now correct and permanently opposed. `format:check` demanded the file prettier
would write; `generate-e2e-flows.mjs --check` demanded the file the generator would write; and
running either one to satisfaction broke the other. It is not a flaky failure — it is a stable
loop, which is worse, because the obvious escape is to exempt the file from one of them.

## The rule

**A generated artefact is subject to every gate that reads its extension.** The generator is
the thing that must yield: emit what the formatter would leave, so `format` is a no-op on the
output.

The five older generators in this repository never hit this because they emit `.ts`, and their
output was written to match prettier from the start. The first one to emit a **new file type**
found it immediately.

## Check before writing a generator

1. Does any formatter or linter claim this extension? (`.prettierrc`, the eslint `files` globs.)
2. Run the formatter over the generated output. If it changes a byte, fix the **generator**.
3. Only then wire the `--check`.

## The consolation

Single-quoted YAML turned out to be the right quoting anyway, and not by luck: the selectors
are regular expressions, and in a single-quoted YAML scalar a backslash is a backslash. The
double-quoted form would have needed every escape doubled — a second, quieter bug that the
formatter's opinion happened to prevent.
