/**
 * The tab registry and the bar's own measurements.
 *
 * ## Why this is not in `app/(tabs)/_layout.tsx`, where it was written
 *
 * It is **content**, and content does not live in a route. `scripts/a11y-scope.mjs` already
 * states the rule for the same reason one directory along: *"`apps/mobile/app/` is deliberately
 * absent: a route there sets navigation options and delegates, and `Stack.Screen` cannot render
 * outside a navigator — the CONTENT lives in `src/screens/` precisely so it can be rendered and
 * therefore checked."*
 *
 * The tab list is exactly that: five records a test asserts against, sitting in a file whose
 * first line is `import { Tabs } from 'expo-router'`.
 *
 * ## What that cost, precisely
 *
 * `test/tab-icons.test.tsx` (now `tab-bar.test.tsx`) imported three constants from here. While they
 * lived in the route, it paid for the whole navigator to get them:
 *
 * ```
 * tab-icons.test.tsx → app/(tabs)/_layout.tsx → expo-router
 *   → expo-router/src/layouts/StackClient.tsx
 *   → expo-router/src/fork/native-stack/createNativeStackNavigator.tsx
 *   → expo-glass-effect → GlassView.ios.tsx
 *   → expo-modules-core.requireNativeViewManager   ← throws
 * ```
 *
 * **And it threw on Linux only.** `expo-modules-core` ships two implementations —
 * `NativeViewManagerAdapter.native.tsx`, which works, and `NativeViewManagerAdapter.tsx`, whose
 * whole body is `throw new UnavailabilityError(...)`. jest resolved the working one on Windows
 * and the throwing one on the CI runner, from the same lockfile and the same pnpm layout. Gate 4
 * was red on every push for three runs while `pnpm test` passed here, uncached, under
 * `CI=true`, under `--runInBand` and under `--maxWorkers=2`.
 *
 * The resolver asymmetry is not ours and is recorded as [E-099](../../../.harness/state/effects.json).
 * **This file is the part that is ours:** a test of five constants had no business booting a
 * navigator, and while it did, someone else's platform-resolution bug was ours to hit.
 *
 * An ESLint boundary now refuses an import from `app/` inside `test/`, and
 * `scripts/verify-guards.mjs` watches it fire.
 */

import type { NavIconName } from '@irodora/ui';
import type { MessageKey } from './i18n/index';

/**
 * The five, in bar order. The Lens is third because the centre is where a thumb rests.
 *
 * ## `testID` is written out, and that is not duplication
 *
 * The route assembled it as a template, with the note *"derived from the route name, so it
 * cannot drift from the tab it addresses"*. The derivation was right; the mechanism was the
 * problem. `scripts/generate-e2e-flows.mjs` can only expand a template when the prefix and the
 * name list are in the **same file**, which its own docblock says outright — so moving the
 * registry here made all five ids invisible to it, and it refused `atlas.journey.json` step 3
 * with *"test id 'tab-atlas' is declared by no component"*.
 *
 * That refusal is the safe direction and worth keeping. So the id is a plain literal the
 * scanner reads directly, and **the derivation is asserted rather than performed**:
 * `tab-bar.test.tsx` checks every `testID` against its own name. A test holding the invariant
 * is a stronger guarantee than a template hiding it — the template made drift impossible and
 * also made the id unreadable to the one tool that had to read it.
 */
export const TABS = [
  {
    name: 'index',
    labelKey: 'tab.home',
    icon: 'home',
    activeGlyph: 'filled',
    testID: 'tab-index',
  },
  {
    name: 'atlas',
    labelKey: 'tab.atlas',
    icon: 'atlas',
    activeGlyph: 'outline',
    testID: 'tab-atlas',
  },
  { name: 'lens', labelKey: 'tab.lens', icon: 'lens', activeGlyph: 'outline', testID: 'tab-lens' },
  {
    name: 'wardrobe',
    labelKey: 'tab.wardrobe',
    icon: 'wardrobe',
    activeGlyph: 'outline',
    testID: 'tab-wardrobe',
  },
  {
    name: 'profile',
    labelKey: 'tab.profile',
    icon: 'profile',
    activeGlyph: 'outline',
    testID: 'tab-profile',
  },
] as const satisfies readonly {
  readonly name: string;
  readonly labelKey: MessageKey;
  readonly icon: NavIconName;
  /**
   * The glyph's shape when the tab is active: the governing inventory's (`01`'s `raw.filled`),
   * which draws only Home active, filled. The other four keep the outline `01` gives them until
   * OQ-47 is answered (F-234, ADR-0117). The test holds this to the inventory.
   */
  readonly activeGlyph: 'filled' | 'outline';
  /** The e2e selector. Asserted against `name` by the test; see the note above. */
  readonly testID: string;
}[];

/** The prefix every tab id carries. One place, so the test and the data agree by construction. */
export const TAB_TESTID_PREFIX = 'tab-';
