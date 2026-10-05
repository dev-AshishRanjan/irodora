# E-166 — A portalled sheet reads its own inset

**Link:** `Sheet`'s `form`, its handle copy and its bottom-inset read → the Lens (F-243, F-244), the
docked target view (F-245) and `verify-viewport` **Guard:** `sheet.test.tsx`,
`verify-viewport --prove` **Severity:** medium **Feature:** F-234

---

## Why B changes when A does

`form` is required, so every caller says which sheet it draws: the Lens passes `floating` (03), and
F-245 will pass `docked` with OQ-16's side inset, which the type demands. A caller that changes form
changes every number the sheet draws.

The floating sheet stands 29.5 dp off the frame, or the device's bottom inset where that is larger.
It is portalled, so it renders outside every `Screen` and nothing above it can pass the inset down:
it reads the context itself, the way `Screen` does. That made `overlay.tsx` an inset owner in
`verify-viewport`, and the gate's new stale-owner rule — an owner that reads no inset is reported —
found on its first run that the tab layout had stopped reading one in increment 4.

The handle's name and hint are the caller's. gorhom's own are English in every locale, and they
reached the Lens until F-234 (ADR-0056).

## The harness detail that cost an hour

The sheet is portalled, and while two renders are mounted the portal holds both: a second render in
one test finds the first sheet before its own. `sheet.test` opens one sheet per test.

Related: [[turning-off-a-header-turned-off-the-only-thing-insetting-anything]]
