# E-198 — A dependency can animate a colour on your behalf

**Link:** `heroui-native`'s animation hooks → our `Switch`, every HeroUI wrapper in `@irodora/ui`
**Guard:** `motion-dependencies.test` (the audited version pinned; the Switch's worklets read
after a layout; the old configuration as decoy) · `verify-motion` (a colour only in a config that
disables itself) **Severity:** high **Feature:** F-266

---

## Why B changes when A does

`verify-motion` reads our source. What a library's own worklets return it cannot see — and an
animated style takes precedence over a static one, so a library colour paints over our token even
when it is constant. F-266's probe found HeroUI 1.0.8's Switch thumb interpolating its
`backgroundColor` and springing its `start` (a layout property), because `state: 'disabled'` on the
root does not reach the thumb.

## What was done

`state: 'disable-all'` on the root, and our painted `track` and `thumb` tokens as the worklets'
own values: the Switch jumps, and paints our tokens, which the colour-vision preview then reaches.
Everything else HeroUI animates for us animates no colour (the audit is in the test's header).

## What an upgrade owes

The test pins the version. An upgrade fails it until someone re-reads the animation hooks the
header lists, re-runs the Switch reading, and moves the pin.
