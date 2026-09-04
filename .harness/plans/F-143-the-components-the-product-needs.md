# Plan: F-143 — The components the product actually needs, behind the `@irodora/ui` boundary

| | |
|---|---|
| **Feature** | F-143 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-8, NFR-9, NFR-24 |
| **Service / package** | `@irodora/ui` · `apps/mobile` · `scripts/` |
| **Author** | Claude Opus 5 (generator) |
| **Date** | 2026-09-03 |

---

## Intent

`heroui-native` ships 40 components and the product uses five. ADR-0062 already made it the
foundation and `emit/heroui.ts` already bridges the tokens — so this is an **adoption** gap, not
a migration: the bridge exists and 35 components have never been carried across it.

To a user: things that should appear over the page do, instead of being a route. To F-145: a
`Tabs` to build an information architecture on.

## What the scope became, and why

The original acceptance list named sixteen components.
[`heroui-wrappers.md`](../rules/frontend/heroui-wrappers.md) disqualifies half of them, and it is
binding:

> **Wrap HeroUI when there is BEHAVIOUR to inherit. Do not wrap it for provenance.**

| dropped | because the rule says so |
|---|---|
| Card, Avatar, Separator, ListGroup | styled boxes — `Surface` and `Stack` already are those, and wrapping adds a dependency edge that buys nothing |
| Alert | HeroUI's is a **banner**; it cannot carry [ADR-0044](../../docs/adr/0044-status-tokens-corrected-and-status-colour-is-text.md)'s three channels inline. `Status` stays ours |
| Skeleton, Spinner, Toast | real behaviour, no consumer yet — *"no wrapper without a consumer"* is in the same rule |
| Switch, Select, Slider, Accordion | real wraps, different problem. **Moved to F-156**, not dropped |

**What is left is one problem four times over:** Sheet, Dialog, Popover and Tabs share a portal,
a scrim, a dismissal and a focus return. That is exactly the "tedious to get right, easy to get
subtly wrong, invisible to a sighted developer with a mouse" the rule is about.

## The finding that changes more than the wrappers do

**Three peer dependencies of `heroui-native` are unsatisfied, and nothing noticed.**

| peer | state | consequence |
|---|---|---|
| `tailwind-merge` | in the store, **hoisted**, undeclared | `helpers/external/utils/cn.js` imports it, and `select`, `slider` and `pressable-feedback` styles all reach it. It resolves **by luck** — some other package hoisted it into `.pnpm/node_modules`. The day that package drops it, HeroUI breaks and nothing in this repository changed |
| `@gorhom/bottom-sheet` | **absent entirely** | `BottomSheet` could never have rendered. A jest probe importing it *passes*, because importing a component reference is not mounting it |
| `expo-blur` | absent, and **stays absent** | the rule forbids the blur path: a blur tints what it surrounds, which is the simultaneous-contrast hazard `swatch.well` exists to prevent |

So the feature does two things: it wraps four components, and it makes the dependency situation
**declared instead of lucky**.

## Approach

**Reused:** `Button.tsx` is the wrapper pattern — `style` not `className`,
`feedbackVariant="scale"`, an explicit `accessibilityRole`, and every state rendering
differently. `Screen`/`Stack`/`Row` from F-140 for the content. `nativeColors.backdrop` for the
scrim, which no component has ever painted.

**New:** `packages/ui/src/overlay.tsx` — four components that **collapse HeroUI's compound API
into one declarative element each**:

```tsx
<Sheet open onOpenChange title="Reading" description="…">…</Sheet>
```

rather than `Root → Trigger → Portal → Overlay → Content → Close → Title → Description`. That is
the wrapper earning its place: a screen cannot forget the `Portal`, cannot omit the `Overlay`,
and cannot put the title outside the element that labels the dialog.

`scripts/verify-peer-deps.mjs` — for every dependency we declare, every peer it requires is
satisfied by a **declared** dependency of the consuming package, not by a hoist. Exemptions are
declared with a reason, in the shape `unreached-tokens.json` uses, so refusing `expo-blur` is a
recorded decision rather than an omission.

**Increments:** the peer gate first (it is what the rest rests on), then the dependency, then
the wrappers, then the registry.

## Files to touch

```
scripts/verify-peer-deps.mjs             — NEW: the gate + --prove
.harness/verification/unsatisfied-peers.json — NEW: declared exemptions
packages/ui/src/overlay.tsx              — NEW: Sheet, Dialog, Popover, Tabs
packages/ui/src/index.ts                 — export them
packages/ui/test/overlay.test.tsx        — NEW
packages/ui/test/conformance.test.tsx    — register them
apps/mobile/package.json                 — @gorhom/bottom-sheet, tailwind-merge declared
package.json                             — the peer gate joins lint
```

## Anticipated effects

| change | dependents | guard |
|---|---|---|
| `backdrop` reached | `unreached-tokens.json` must drop its entry | `a11y` (token reach) — it fails on a stale declaration |
| `@gorhom/bottom-sheet` added | a native module ⇒ `expo prebuild` must re-run before a device build | `build`; recorded as an effect |
| Peer gate added | every package's `package.json` | the gate itself |

## Test plan

- **Composition:** each overlay renders its scrim, its content and its accessible name; a closed
  one renders **nothing** — asserted, because "renders when open" alone passes for a component
  that always renders.
- **Roles and state:** `dialog` role, `aria-modal`-equivalent state, and the tab list's selected
  index read **from the rendered tree**, not from the prop. F-088's distinction.
- **Dismissal:** pressing the scrim calls `onOpenChange(false)`; pressing the content does not.
  The second half is the decoy — a scrim that swallowed every press would pass the first.
- **Peer gate `--prove`:** a peer satisfied only by hoisting is reported; a declared one is not;
  an exemption that matches nothing fails.

## Verification

```
node scripts/verify-state.mjs
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
pnpm test:a11y && pnpm test:contrast
node scripts/verify-peer-deps.mjs --prove
```

## Risks and open questions

**`@gorhom/bottom-sheet` is a native module.** It cannot be exercised in jest beyond mounting,
and the gesture behaviour that is the entire reason to use it needs a device. The wrapper's
*composition* is testable here; its *feel* is not, and that is attested rather than claimed.

**Adding it also means the next device build needs a fresh `prebuild`.** Worth stating because
the symptom of forgetting is a crash at mount that reads like a code error.

## Out of scope

The form controls (F-156). Toast, Skeleton and Spinner — real wraps with no consumer yet, and
the rule is explicit that a wrapper without one ships nothing. The tab **bar** as navigation:
this delivers the component, F-145 builds the architecture on it.
