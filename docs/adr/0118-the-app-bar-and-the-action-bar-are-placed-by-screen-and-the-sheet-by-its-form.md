# ADR-0118 — The app bar and the action bar are placed by `Screen`, and the sheet by its form

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-30 |
| **Feature** | F-234 |
| **Applies** | R9-MOCKUP-FIDELITY §4 E4 (the tab bar under an action bar); E-084 (the status bar's inset) |
| **Supersedes** | the stack's platform header on pushed routes, route by route, as each screen feature moves to `AppBar` |

---

## Context

The mockups draw a header on twenty-one screens and an action bar on fifteen. Before F-234 neither
existed as a component: pushed routes used the stack's platform header (a title in the platform's
type and a back chevron), and no screen drew an action bar. Two questions come with building them,
and neither is about how they look:

- **Where does each sit, relative to the scroller and the device's insets?** F-159 put the status
  bar's inset on the scroller's content, so everything after the first screenful scrolled under the
  status bar; F-167 moved it to an ancestor of the scroller (E-084). A header with a fill must run
  behind the status bar (`18`, `19`, `24`), and an action bar must never cover the end of the
  content.
- **What happens to the tab bar on a screen with an action bar?** No mockup draws both. `16`, `22`
  and `24` draw the OS home indicator where the tab bar would be.

## Decision

### 1. The app bar

1. **`Screen appBar` renders it above the scroller, pinned**, as a sibling before it on the screen's
   ground. It is what the platform header it replaces does on every pushed route today; no mockup
   draws a header that scrolls away.
2. **The status bar's inset moves into the bar.** `Screen` passes `topInset` and the bar pads by it,
   so a fill paints behind the status bar. The ground then carries no top inset of its own. Content
   still cannot reach the status bar: the scroller's frame starts below the bar. A surface never
   passes `topInset`.
3. **A route moves to `AppBar` with its screen feature**, not in F-234, because the bar's elements
   must sit in the tree that feature's conformance sweep reads. `chrome.test` pins the 16 routes still
   on the platform header, each with the feature that moves it, and the list may only shrink.
   `profile/measure` has no mockup and waits on OQ-7.

### 2. The action bar

1. **`Screen actionBar` renders it after the scroller, in normal flow, never absolutely.** The
   content ends above it, so it covers nothing, and it needs no bottom inset: the tab bar owns the
   bottom edge.
2. **It keeps the caller's order.** Every two-action bar draws its primary first except `20`, which
   draws *Save* before *Share*. "Primary first" summarises the drawings, and `20` is a drawing
   (rule 14), so the component sorts nothing and a test holds the inventories to the rule with `20`
   pinned.
3. **The tab bar stays under it** (R9 §4 E4). FR-71 and F-145's first criterion give every route a
   tab that owns it, and F-234's criterion places the action bar *above the tab bar*. Hiding the tab
   bar on pushed screens would change FR-71: a PRD change, not a layout one, and not an agent's to
   make. The reading is named on `F-267` for the person comparing screens.

## Consequences

**Good.**
- One place decides where the chrome sits and how the insets reach it. A screen passes what its
  mockup draws and nothing about the device.
- The end of a scroll is never under an action bar, by construction rather than by padding.
- A fill behind the status bar is the bar's own background, so it cannot drift from the bar.

**Bad.**
- **Two headers can coexist during the transition.** A pushed route keeps the platform header until
  its screen feature moves it; the ratchet names each one and its owner.
- **The tab bar is drawn where three mockups draw the home indicator.** It is the reading FR-71
  forces, stated here and on `F-267`, and attested on a device.
- **The keyboard is not avoided** by the action bar, as nothing in the app avoids it today. A note
  goes to F-256, whose screen has the first text field under an action bar.

## Alternatives rejected

- **The action bar positioned absolutely over the scroller, with content padding under it.** It is
  F-159's shape again: correct for the first screenful, and a padding value that must track the bar's
  height forever.
- **Hiding the tab bar on screens with an action bar.** See 2.3.
- **Moving every route to `AppBar` in F-234.** The app bar's elements would then be in trees that no
  conformance sweep yet reads, which is the shape the ratchet exists to prevent.
