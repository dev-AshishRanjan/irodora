# ADR-0118 — The app bar and the action bar are placed by `Screen`, and the sheet by its form

| | |
|---|---|
| **Status** | Accepted |
| **Date** | 2026-09-30 |
| **Feature** | F-234 |
| **Applies** | R9-MOCKUP-FIDELITY §4 E4 (the tab bar under an action bar); E-084 (the status bar's inset) |
| **Supersedes** | the stack’s platform header on pushed routes, route by route, as each screen feature moves to `AppBar`; the sheet’s drawn title, scrim and gorhom’s handle copy (F-158, F-177) |

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
4. **A back control is named by where it goes** — *Back to Atlas* — not by the drawn word alone,
   which is the destination and the Atlas tab's name too; "back" lives in a decorative glyph (F-234's
   review). The name must contain the drawn word (WCAG 2.5.3), and `Button` refuses one that does not.

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
   make. It holds on a tab root too: `17` and `23`, the Profile tab's own screen, draw an action bar
   and no tab bar, and there the tab bar is the only way to the other four tabs. The reading is named
   on `F-260` and `F-267` for the person comparing screens.

### 3. The sheet

1. **`form` is required**, because no board draws a sheet to default from, and the two the screens
   draw differ in every number (`SHEET_FORMS`, recomputed by `sheet.test`):
   - **floating (`03`)**: gorhom's `detached` sheet, 28.5 dp in from each side, on `background` with a
     dp of `border` round it and `lg` on every corner, its content 9 dp in;
   - **docked (`04`)**: on `surface.1`, no edge, `lg` at the top, its content 12.5 dp in. Its side inset
     is OQ-16's, so the type requires the caller to pass it (F-245). It reaches the frame's bottom
     edge, so its last content and its footer end the device's bottom inset higher, above the home
     indicator (F-234's review).
2. **The floating sheet's gap under it is `max(29.5, bottom inset)`**: `03` draws 29.5 dp, and the
   home indicator is laid into that gap where it fits — the reading the tab bar makes (ADR-0117).
   Portalled, the sheet sits outside every `Screen`, so it reads the inset itself, the way `Screen`
   does; `verify-viewport` lists `overlay.tsx` as an owner for that read. The same change gave the
   gate a stale-owner rule, which found that the tab layout no longer reads an inset (the navigator
   hands `insets` to the adapter since F-234) and took it off the list.
3. **No title and no scrim are drawn**, because `03` and `04` draw neither. The title is still the
   sheet's accessible name, carried by its content container. The dismiss layer stays, transparent,
   a button named by `closeLabel`, so a tap outside and a screen reader still close the sheet.
4. **The handle is the drawn bar, named in the caller's words.** 40 × 4 dp in `border.indicator`, at
   each form's drawn offset. gorhom's own handle announces *"Bottom sheet handle"* and an English hint
   in every locale, and HeroUI keeps them; that copy reached the Lens (ADR-0056). The handle is now
   drawn by the sheet — an `adjustable` view named by the caller's `handleLabel` and `handleHint` —
   and gorhom wraps it in its drag region as it wrapped its own. An adjustable control must adjust:
   its `increment` action opens the sheet to its larger detent and `decrement` returns it, so a
   screen-reader user can do what a drag does. Closing stays the dismiss layer's (F-234's review).
5. **A footer is pinned** (gorhom's `BottomSheetFooter`) on the sheet's ground, and the content is
   padded by its measured height, so its end is never under the footer. It is where `03`'s actions sit.

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
- **Nothing shows that a tap outside a sheet closes it**, because nothing dims the frame. It is what
  `03` and `04` draw; the drag handle and the screen reader's named dismiss layer remain.
- **The handle's drag region is its drawn box**, about 9 dp tall on `03`. gorhom drags by the box it
  wraps, and padding that box to the tap target would push the content about 27 dp lower than `03`
  draws.
  The whole sheet body drags too, so the sheet is not hard to move; the handle's own target goes to
  F-305 with the other controls drawn smaller than the target.
- **An untitled sheet's name depends on the platform reading its container's label.** VoiceOver and
  TalkBack announcing it is owed as an attestation on a device.

## Alternatives rejected

- **The action bar positioned absolutely over the scroller, with content padding under it.** It is
  F-159's shape again: correct for the first screenful, and a padding value that must track the bar's
  height forever.
- **Hiding the tab bar on screens with an action bar.** See 2.3.
- **Moving every route to `AppBar` in F-234.** The app bar's elements would then be in trees that no
  conformance sweep yet reads, which is the shape the ratchet exists to prevent.
