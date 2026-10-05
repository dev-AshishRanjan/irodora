# E-165 — The tab bar is ours, and must keep React Navigation's contract

**Link:** `apps/mobile/src/tabBar.tsx` ↔ the navigator's `tabPress`/`tabLongPress` contract, the
route's `tabBar`, and the e2e ids **Guard:** `apps/mobile/test/tab-bar.test.tsx`,
`generate-e2e-flows --check`, `chrome.test.ts` **Severity:** high **Feature:** F-234

---

## Why B changes when A does

Handing `tabBar` our own component takes React Navigation's bar out of the loop, and with it the
two things that bar did that nobody sees: it emits `tabPress` before navigating, and it does not
navigate when a listener prevents the press or the tab is already active. A screen that scrolls to
its top on a second press listens for exactly that event. The adapter does both, as the library's
documented custom bar does, and the tests drive it with plain objects so a regression shows without
a navigator.

The e2e ids moved with the bar: they were `tabBarButtonTestID` options on the route and are now the
drawn tabs' `testID`, read from the registry. `generate-e2e-flows --check` resolves `tab-atlas`
against the literal in `src/tabs.ts`.

## Why it lives in `src/`

A test that imports a route file boots `expo-router` and, on Linux, a throwing native view manager
(E-099). The adapter takes the navigator through a structural type and imports nothing from
`expo-router` at runtime.

Related: [[a-test-of-five-constants-booted-a-navigator]]
