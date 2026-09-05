# Plan: F-167 — The safe area is a boundary, not padding on the content

| | |
|---|---|
| **Feature** | F-167 — [`feature_list.json`](../state/feature_list.json) |
| **Requirements** | NFR-9, FR-71 |
| **Service / package** | `packages/ui` · `apps/mobile` |
| **Author** | Claude Code (generator) |
| **Date** | 2026-09-05 |

---

## Intent

Reported twice now: *"the battery and all native data is coming as a patch over our UI"*, and
*"our app should start after app header, and not take its space"*.

Done, to a person holding the phone: they scroll any screen and the content **stops** at the
status bar instead of sliding under the clock.

## Approach

**F-159 fixed the wrong half, and it looked right at rest — which is why it was accepted.** It
added the inset to the token padding:

```ts
paddingTop: nativeSpacing[padding] + insets.top   // on contentContainerStyle
```

`contentContainerStyle` pads the **content inside the scroller**. The first screenful sits in the
right place and every pixel after it travels under the notch.

**The inset is a layout boundary, so it belongs on an ancestor of the scroller.** A `ScrollView`
clips to its own frame; if the frame starts below the hardware, content cannot reach it. That is
the whole change, and it separates two things F-159 had merged:

| | what it is | where it goes |
|---|---|---|
| `insets.top/left/right` | the hardware | a wrapper `View` **around** the scroller |
| `nativeSpacing[padding]` | the product's rhythm | `contentContainerStyle`, as before |

**Not `paddingTop` on the ScrollView's own `style`.** That is the tempting one-line version and
it is React Native's documented trap — padding on a `ScrollView` style does not behave as a
viewport inset, which is why every guide says to use `contentContainerStyle` and why the bug
exists in the first place.

**Not `SafeAreaView`.** It calls `useSafeAreaInsets` internally, which **throws** without a
provider — and `Screen` is rendered by the conformance suite, by three dozen screen tests and by
the a11y gate, none of which is an app. The existing `SafeAreaInsetsContext` read with a
zero fallback stays exactly as it is; only where its value is applied changes.

**The background still paints behind the status bar.** The wrapper carries
`backgroundColor: colors.background` and extends to the edge, so the notch area is the app's
ground rather than a band of platform colour. Content stopping and background continuing are two
different questions and the report is only about the first.

**Reused:** `SafeAreaInsetsContext`, `nativeSpacing`, `useTheme` — nothing new is imported.

**Increments:**

1. The split in `Screen`, both branches. Tests updated.
2. The structural assertion, which is the part worth having.
3. `contentInsetAdjustmentBehavior="never"`, so iOS does not add a second inset of its own.

## Files to touch

```
packages/ui/src/layout.tsx      — the wrapper, and the split between hardware and rhythm
packages/ui/test/layout.test.tsx — the structural assertion
```

## Anticipated effects

- **Every screen's tree gains one `View`** ⇒ the conformance registry, `a11y-scope.mjs`, and any
  test asserting on tree shape. Guard: `pnpm test` in both packages; the a11y gate walks roles
  rather than depth, so a transparent container should be invisible to it — asserted by running
  it rather than assumed.
- **`scripts/verify-viewport.mjs`** owns the rule that insets are read in one place. Guard: the
  file does not change owner, so the gate should stay green; if it inspects *how* they are
  applied, it will say so.
- **The visible top spacing must not change.** `insets.top` (wrapper) + `nativeSpacing[padding]`
  (content) is the same total F-159 produced. Guard: a test that adds them and compares.

## Test plan

- **Structural, and it is the assertion F-159 needed:** with a non-zero inset in context, the
  scroller's `contentContainerStyle` carries the token padding and **not** the inset, and an
  ancestor of the scroller carries the inset. That is the exact property that was wrong, stated
  so it cannot regress quietly.
- **Sum:** total top space is unchanged from the current behaviour, so this is a fix and not a
  redesign.
- **Zero insets:** a device with no notch (and every test without a provider) lays out exactly as
  before — the fallback is a real value, not a stand-in.
- **Negative + decoy:** a `Screen` that simply dropped the inset would pass "content padding
  carries no inset". The decoy is the ancestor assertion, which requires it to be somewhere.

## Verification

```
node scripts/verify-state.mjs
pnpm verify:ci
```

## Risks and open questions

- **This cannot be seen here.** jest has no viewport: `react-test-renderer` has no scrolling and
  no status bar, so "content stops at the boundary" is a structural claim in the test and a
  device claim in the attestation. That is the same limit F-159 hit, and the reason its defect
  survived — so the assertion is written against the *structure* that causes the behaviour rather
  than against the behaviour.
- **The bottom is still the tab bar's.** Adding it here would count it twice. Unchanged, and
  restated in the code so the next reader does not "fix" it.

## Out of scope

- The tab bar's own inset (F-159, working).
- Landscape. The horizontal insets move to the wrapper with the vertical one, which is the
  correct place for them, but no screen has been laid out for landscape and this does not start.
