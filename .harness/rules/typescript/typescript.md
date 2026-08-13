# TypeScript Rules

Config: [`tsconfig.base.json`](../../../tsconfig.base.json) ·
[`eslint.config.mjs`](../../../eslint.config.mjs).

---

## Strictness is not negotiable

`strict` · `noUncheckedIndexedAccess` · `exactOptionalPropertyTypes` ·
`noImplicitOverride` · `noImplicitReturns` · `noPropertyAccessFromIndexSignature` ·
`useUnknownInCatchVariables`.

**No `any`.** Not in application code, not in tests. Use `unknown` and narrow.

**No unchecked cast.** `as` is a claim you are making to the compiler that it cannot check.
Parse instead:

```ts
// No — a lie the compiler will believe.
const color = JSON.parse(raw) as Color;

// Yes — a claim that is checked.
const color = colorSchema.parse(JSON.parse(raw));
```

**`@ts-expect-error` needs a reason and a tracked follow-up.** `@ts-ignore` is never
acceptable — it does not fail when the error goes away, so it outlives its cause silently.

---

## Make illegal states unrepresentable

This is the most valuable thing the type system does here, and the reason `Color` is shaped
the way it is.

```ts
// No — every consumer must remember to check, and one will not.
interface Result { value?: Color; error?: string; }

// Yes — the check is structural.
type Result =
  | { ok: true;  value: Color }
  | { ok: false; error: MeasurementError };
```

Use branded types for values that must not be confused:

```ts
type Hex = string & { readonly __brand: 'Hex' };
type Slug = string & { readonly __brand: 'Slug' };
```

`Color` requires `Provenance` because an unclassified colour must be impossible to
construct, not merely discouraged
([ADR-0005](../../../docs/adr/0005-measurement-provenance-is-a-type.md)).

---

## Schemas are the source of truth

Zod schemas in `@irodora/contracts` generate runtime validation, TypeScript types, and the
OpenAPI document. **One definition, three uses**, so they cannot drift
([ADR-0012](../../../docs/adr/0012-backend-fastify-zod-openapi.md)).

```ts
export const colorInputSchema = z.object({ /* … */ });
export type ColorInput = z.infer<typeof colorInputSchema>;
```

Never hand-write a type that duplicates a schema. It will diverge, and the divergence will
be invisible until it matters.

---

## Async

- **`await` every promise, or `void` it deliberately.** `no-floating-promises` is an error.
- **`void` is not a rejection handler.** `void somePromise()` discards the rejection; if
  the operation can fail meaningfully, handle it.
- No `async` in an array callback expecting sync (`.filter`, `.map` into a boolean).
- Cancellation: pass an `AbortSignal` for anything that can outlive its caller.

---

## Modules

- ESM only. `verbatimModuleSyntax` is on — use `import type` for type-only imports.
- Import package entry points, never internal paths. Lint-enforced.
- No default exports except where a framework requires one.
- No circular imports. Lint-enforced.

---

## Naming

| Kind | Convention |
|---|---|
| Type, interface, class | `PascalCase` |
| Function, variable | `camelCase` |
| Constant | `SCREAMING_SNAKE` — only for genuine constants |
| File | `kebab-case.ts` |
| Boolean | `is` / `has` / `can` / `should` prefix |

**Say what you mean in the colour domain.** `chroma` is not `saturation`. `lightness` is
not `brightness`. `estimated` is not `measured`. A misnamed variable propagates into a
misnamed field, then into UI copy, then into a claim we cannot support.

---

## Immutability

`readonly` by default on interface fields and arrays. Prefer returning a new value to
mutating an argument.

In engine hot paths, mutation of a locally-allocated buffer is fine and often necessary —
but it never escapes the function.

---

## Comments and TODOs

Explain **why**. `// TODO` requires a tracked feature id, or it does not go in.
