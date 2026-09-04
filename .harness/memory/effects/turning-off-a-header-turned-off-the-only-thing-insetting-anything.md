# Turning off a header turned off the only thing insetting anything

**Effect:** [E-075](../../state/effects.json) · `apps/mobile/app/(tabs)/_layout.tsx` →
`packages/ui/src/layout.tsx` · **high**

## What happened

F-145 set `headerShown: false` on the tab group. The decision was right — a navigation bar above
a tab bar is two headers for one page — and it had a consequence invisible in the diff.

**react-navigation insets a header for you.** The header had been the only thing holding content
off the status bar. With it gone, the app painted under the notch, and:

```
grep -rn "SafeArea|useSafeAreaInsets" apps/mobile packages/ui/src   →   nothing
```

`react-native-safe-area-context` was a *declared dependency*. Its provider was in every rendered
test tree. **Nothing consumed it.**

The reporter named the commit without knowing it: *"we were not having this issue previously."*

## The same shape one layer down, stated out loud

```ts
// The bar is taller than the default … iOS adds its own safe-area inset below this.
height: Platform.OS === 'ios' ? 88 : 68,
```

An explicit `height` is **precisely what stops** react-navigation applying the inset. And Android
with gesture navigation has a bottom inset that `68` knows nothing about. The comment recorded an
assumption in the confident tone of a measurement.

It is derived now, with **no platform branch**: the inset already differs per device, so
branching on the platform is guessing at the thing the API reports.

## The general shape

**A framework default can be load-bearing without appearing anywhere in your source.** Nothing in
this repository said "insets are handled" — because nothing here handled them, and it worked
anyway. Turning off the header was a change to something we never wrote.

You cannot grep for a responsibility nobody has taken. The only durable answer is to **make it
explicit**: one file owns insets, its docblock says why, and a gate fails anyone else who reaches
for them.

## A smaller decision worth keeping

`Screen` reads `SafeAreaInsetsContext`, not `useSafeAreaInsets()`. The hook **throws** without a
provider — right for an app, wrong for a component the conformance suite renders three dozen
times, none of which is an app. Reading the context is the hook minus the throw, and the fallback
is zero insets, which is exactly what a phone with no notch reports. It is a real value, not a
stand-in. The place a missing provider genuinely *is* a defect is the app root, and that renders
one explicitly rather than trusting the router.

Related: [[a-size-chosen-against-one-screen-is-wrong-on-every-other]]
