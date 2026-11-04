# E-240 — A hand-off in a query string is a contract no type holds

**Link:** `atlas/wear/[slug].tsx` (`with`) and `wear.ts#startWith` → `19`'s Wear
**Guard:** `wear.test` (startWith both ways), `goes-with-states.test` reading both routes' source **Severity:** medium **Feature:** F-252

---

## The shape

- `/atlas/wear/‹anchor›?with=‹row›` opens 07 with the row's colour in the trousers, locked.
- An unknown slug, or the anchor's own, is ignored, and 07 opens as drawn.

## What it does not guard

- expo-router's delivery of the parameter on a device: the person's attestation.
