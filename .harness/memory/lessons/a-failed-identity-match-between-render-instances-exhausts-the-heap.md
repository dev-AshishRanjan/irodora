---
kind: lesson
title: A failed identity match between render instances exhausts jest's heap
category: debugging
confidence: 1.0
created: 2026-10-05
scope: [packages/ui, apps/mobile]
links: []
---

# A failed identity match between render instances exhausts jest's heap

**Encountered in F-234** (`app-bar.test`, 2026-10-01).

```ts
expect(japanese.parent?.parent).toBe(heading); // two react-test-renderer instances
```

When it failed, jest did not report a failed assertion. The worker ran for half a minute, printed
thousands of React deprecation warnings (`isMounted(...)`, `replaceState(...)` — from walking class
components' getters), and died: `FATAL ERROR: … JavaScript heap out of memory`, exit 134.

## Why

On a failed `toBe`, jest serialises both values to print the diff. A test instance is a live fibre
with `parent`, `children` and every component's props, and the serialiser walks all of it, into the
whole render tree and the library objects hanging off it, for both values.

It looks like a crash in the code under test. It is the assertion's failure message.

## What to do

Compare instances as a boolean, so a failure prints `true`/`false`:

```ts
let inside = false;
for (let n = japanese.parent; n !== null; n = n.parent) if (n === heading) inside = true;
expect(inside).toBe(true);
```

The same holds for any `toBe`/`toStrictEqual` whose operands are instances. Assert on what was read
off them (a prop, a style, a list of testIDs), never on the instances themselves.
