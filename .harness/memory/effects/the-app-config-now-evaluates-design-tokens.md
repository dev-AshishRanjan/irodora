# E-060 — The app config now evaluates the design tokens

**Link:** `@irodora/design-tokens` → `apps/mobile/app.config.ts` → the built artefact
**Guard:** `gate:build` **Severity:** medium **Feature:** F-142

---

## What changed

`app.config.ts` imports `nativeColors` and uses it for the adaptive icon's background and for
both splash backgrounds. Before F-142 the config imported only `expo/config` types — it had no
runtime dependency on anything in the workspace.

**So the config is now evaluated code with a build-order dependency.** `expo prebuild`,
`expo config` and every EAS build resolve `@irodora/design-tokens` before they can produce a
config at all. If that package is not built, the app cannot be configured — a failure that
appears at prebuild rather than at typecheck, and reads like an Expo problem.

## Why it was worth taking

The alternative was three hex literals in `app.config.ts`: `#090807` twice and `#FDFCF9` once.
They would have been correct on the day they were typed and would then have been the **only**
colours in the product that the contrast gate never sees — the manifest could move and the
launch screen would keep flashing the old background before the first painted frame.

That flash is the specific thing this prevents. The splash is composited from the theme's
`background`, and the app's first frame paints the same token; if the two disagree the user sees
a change of polarity at launch, which is exactly the sort of defect nobody files because it
lasts 400 ms.

## The narrower thing this does not do

`icon.png`'s ground is still baked into the PNG, because a PNG has to have pixels. It is
generated from the manifest by `generate-brand-assets.mjs`, so it follows a manifest change —
but only when somebody **runs the generator**. `--check` in `lint` is what turns "somebody
remembered" into "the build failed", and that is the whole guarantee: the icon does not track
the manifest continuously, it is *checked* against it continuously.

## What would break this link

Removing `@irodora/design-tokens` from `apps/mobile`'s dependencies while the import stays —
`typecheck` catches that. A build that runs `expo prebuild` before `turbo build` has ordered the
package — `build` catches that, and it is the failure most likely to appear first on CI rather
than here.

## Related

- [[the-icon-is-generated-from-the-mark-not-exported-beside-it]] — the shape half of the same
  feature; this is the colour half.
