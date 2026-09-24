# An action's default is a dependency the tag does not pin

**E-144** · from `.github/actions/setup-android-build/action.yml` · guard `gate:artifact`,
indirectly, on a GitHub runner only

## What depends on what

`android-build.yml` (the internal lane) and `release.yml` (the lane that publishes) both call
`./.github/actions/setup-android-build`. One definition serves both on purpose, so they cannot
build against different toolchains (F-085). The cost is that a fault there breaks both at
once.

## What broke

The action calls `android-actions/setup-android@v3` and, until F-291, set none of its inputs.
v3 declares:

```yaml
packages:
  description: 'Additional packages to install'
  default: 'tools platform-tools'
```

and runs `sdkmanager <pkg>` for each space-separated entry. `tools` is the legacy *Android SDK
Tools* package, which `cmdline-tools` replaced years ago. **Google stopped serving it around
2026-09-15** (upstream #537). The first dispatch after that died in setup, and so would any release:

```
/usr/local/lib/android/sdk/cmdline-tools/16.0/bin/sdkmanager tools
Warning: Failed to find package 'tools'
```

No commit on our side changed. The last green internal build was 2026-09-09 and the first red
one 2026-09-24. Nobody dispatched the lane in between, so the date in the log is when we
**noticed**, not when it broke.

## Why the version tag did not protect us

`@v3` pins the action's **code**. Its default input is a **name of something on Google's
repository**, which is outside any tag's reach. Upstream fixed the default in `v4.0.2` (#538),
and **the v3 tag, v3.2.2, does not have that change**. So a pinned major version can go red
without changing, and a floating one can still miss the fix.

## The fix

```yaml
- uses: android-actions/setup-android@v3
  with:
    packages: platform-tools
```

`platform-tools` stays because the action has always installed it and put it on `PATH`. `tools`
goes because nothing here reads it: every SDK path used is `build-tools/*/{apksigner,aapt2}` or
`platforms/*/android.jar`, and those are pinned in the next step with `sdkmanager --install`.

This does not rely on the upstream fix either. The list is ours now.

## How to check

- For any third-party action, read its `action.yml` **defaults** as well as its code. A default
  that names an external resource (a package, a distribution, a URL, a version like "latest") is a
  dependency. Set it explicitly.
- The guard is the lane itself: a setup failure turns it red before gate 16 runs. That happens only
  on a GitHub runner. There is no JDK on this workstation, so `sdkmanager` cannot run here.
- **Nothing local checks that the input stays named.** Deleting the `with:` block passes every
  gate on a workstation. F-293 is that check, and it also covers `cmdline-tools-version`, which is
  still the action's default (`12266719`, fetched from dl.google.com on any runner without it
  preinstalled). That is the same kind of dependency, left unnamed for now.

## Not done here

Moving `setup-android`, or any of the other `node20`-era actions (`checkout`, `setup-node`,
`setup-java`, `upload-artifact`, `setup-gradle`, `pnpm/action-setup`), to a newer major. That is a
deliberate bump across all of them, not part of a one-input fix.

Related: [[a-red-gate-at-step-nine-hides-every-gate-after-it]] ·
[[a-gate-that-reads-the-filesystem-answers-differently-before-install]]
