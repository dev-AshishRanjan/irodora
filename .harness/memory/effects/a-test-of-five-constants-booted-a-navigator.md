# A test of five constants booted a navigator

**Effect:** [E-099](../../state/effects.json) · `apps/mobile/app/(tabs)/_layout.tsx` →
`src/tabs.ts`, the ESLint boundary, the e2e id scanner · **high**

## What happened

**Gate 4 was red on CI for three consecutive pushes while `pnpm test` passed here** — uncached,
under `CI=true`, under `--runInBand`, and under `--maxWorkers=2`. One suite failed to run:

```
FAIL test/tab-icons.test.tsx
  ● Test suite failed to run
    The method or property expo-modules-core.requireNativeViewManager is not
    available on ios, are you sure you've linked all the native dependencies properly?
```

`tab-icons.test.tsx` wanted three constants — a list of five tabs, a bar height, a tap minimum.
It imported them from `app/(tabs)/_layout.tsx`, and **a route file's first line is
`import { Tabs } from 'expo-router'`**. So getting five records loaded:

```
expo-router → StackClient → createNativeStackNavigator
  → expo-glass-effect → GlassView.ios.tsx
  → expo-modules-core.requireNativeViewManager      ← throws
```

`expo-modules-core` ships **two** implementations: `NativeViewManagerAdapter.native.tsx`, which
works, and `NativeViewManagerAdapter.tsx`, whose entire body is
`throw new UnavailabilityError(...)`. **jest resolved the working one on Windows and the throwing
one on the Linux runner**, from the same lockfile, the same pnpm store layout and the same pinned
versions — checked, not assumed.

## The part worth keeping

**The resolver asymmetry is not ours. The import was.**

`scripts/a11y-scope.mjs` already states the rule, one directory along and for the same reason:

> *"`apps/mobile/app/` is deliberately absent: a route there sets navigation options and
> delegates, and `Stack.Screen` cannot render outside a navigator — the CONTENT lives in
> `src/screens/` precisely so it can be rendered and therefore checked."*

The tab registry was content living in a route. While it stayed there, someone else's
platform-resolution bug was ours to hit — and a dependency two levels inside `expo-router` got a
vote on whether our test suite runs.

An ESLint boundary now refuses an import from `app/` inside `test/`, and a guard in
`verify-guards.mjs` writes a violating fixture and watches it fire. Reading a route as **text** is
still allowed and still used — the same file asserts on `_layout.tsx` with `readFileSync`, which
executes nothing.

## Diagnosing it was most of the work

The job log needs authentication. What was public — the API's job steps, check-run annotations,
and the run list — was enough to bound it: **last green run 44, first red run 45**, same step
every time since, while the Android build workflow succeeded on the same commits. That put it in
one nine-commit push and said the break was in jest rather than in install or build.

Everything cheap was eliminated before anything was changed: turbo cache, `CI=true`, worker
count, `--runInBand`, and a scan of all 488 source files comparing every relative import against
the real on-disk casing — the classic Windows→Linux break, and not this one.

**`verify-guards.mjs` already carried a note about the same class of failure**: *"It passed on
Windows and failed on Linux CI on the first push."* This is the second. A repository that only
ever runs its suite on one OS is running half a suite, and neither incident was found by a check.

## Second order, and the harness caught it

`generate-e2e-flows.mjs` expands a `testID` template only when the prefix and the name list are in
the **same file** — its own docblock says so. Moving the registry split them, and it refused
`atlas.journey.json` step 3: *"test id `tab-atlas` is declared by no component."*

That is the safe direction and the right refusal. So the id became a plain literal the scanner
reads, and the derivation the template used to perform is now an invariant the test asserts —
which is a stronger guarantee than the template, because the template made drift impossible and
also made the id unreadable to the one tool that had to read it.

Related: [[a-check-that-reads-one-of-two-spellings]] ·
[[a-tested-module-nobody-wired-up-passes-every-test-it-has]] ·
[[a-dependency-can-be-wrong-about-the-runtime-it-will-run-in]]
