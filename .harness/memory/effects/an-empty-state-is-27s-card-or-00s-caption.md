# E-187 — An empty state is 27's card or 00's caption

**Link:** `ui/EmptyState#EmptyStateProps` → every call site in `src/screens`, `StateCard`, the
drawn illustration set (R7's three retired)
**Guard:** `typecheck` (the union) · `states.test` (both forms against their inventories) · the
registries in both themes and locales · the declarations test (E-191) **Severity:** high **Feature:** F-236

---

## Why B changes when A does

The props are the F-139 decision as a type. `action` means the fix is elsewhere, and draws 27's card:
the hanger, a heading, a body, the way out. `resolvedHere` means the fix is already on the screen, and
draws 00's small no-results drawing over a caption, with nothing to press. A colour the corpus does
not hold is the caption, because the header's back is the way out already there (ADR-0128 §6).

## What it does not see

A screen that prints a bare sentence for an absence bypasses the type. The declarations test and the
blank-panel and zero rules are the check there (E-191).
