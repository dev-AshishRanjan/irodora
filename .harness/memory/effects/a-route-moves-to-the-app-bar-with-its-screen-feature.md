# E-164 — A route moves to the app bar with its screen feature

**Link:** `Screen`'s `appBar` and `actionBar` slots → every screen feature F-242–F-263, and the
`chrome.test` ratchet **Guard:** `app-bar.test.tsx`, `action-bar.test.tsx`, `chrome.test.ts`, the
conformance sweep **Severity:** high **Feature:** F-234

---

## Why B changes when A does

`Screen` decides where the chrome sits. The app bar goes above the scroller with the status bar's
inset moved into it; the action bar goes after the scroller, in flow. A screen that drew its own
header inside the scroller, or positioned an action bar over the content, would be F-159's shape
again — the first screenful right, everything after it wrong — and nothing about the screen itself
would show it.

## Why the routes did not move in F-234

An app bar's elements must sit in the tree its screen feature's conformance sweep reads. Moving all
16 pushed routes here would have put the bars in trees no sweep reads yet. So the routes still on the
platform header are a ratchet in `chrome.test`: each entry names the feature that moves it, each
feature deletes its own entry, and a route that joins the list, or an entry whose route has moved,
fails. `profile/measure` has no mockup and waits on OQ-7.

Related: [[turning-off-a-header-turned-off-the-only-thing-insetting-anything]] ·
[[a-tested-module-nobody-wired-up-passes-every-test-it-has]]
