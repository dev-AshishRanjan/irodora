/**
 * The hit area: how a control drawn at the size a mockup draws still reaches the platform's tap
 * target (F-232, ADR-0114).
 *
 * R9-MOCKUP-FIDELITY §4 E3 is explicit: tap targets meet 44 dp (iOS) and 48 dp (Android) THROUGH
 * THE HIT AREA, not the drawn size, so the chip stays the size the mockup draws. A control sets its
 * drawn size in `style` and passes `hitArea(width, height)` as its `hitSlop`. The conformance rule
 * adds the two back together (`tap-target`), because a hit area declared where the rule does not
 * read is how F-239's switch came to be drawn at 68 × 44.
 *
 * The slop is split evenly on each side, so the target stays centred on what is drawn, and it is
 * never negative: a control already drawn at the target needs none.
 */

import { Platform, type Insets } from 'react-native';
import { nativeTapTarget, nativeTapTargetAndroid } from '@irodora/design-tokens';

/** The tap target, in dp, on the platform named: Material's 48 on Android and Apple's 44 elsewhere. */
export function platformTapTarget(os: string = Platform.OS): number {
  return os === 'android' ? nativeTapTargetAndroid : nativeTapTarget;
}

/** The `hitSlop` that grows a control drawn `width` × `height` dp to the platform's target. */
export function hitArea(width: number, height: number, os: string = Platform.OS): Insets {
  const target = platformTapTarget(os);
  const x = Math.max(0, (target - width) / 2);
  const y = Math.max(0, (target - height) / 2);
  return { top: y, bottom: y, left: x, right: x };
}
