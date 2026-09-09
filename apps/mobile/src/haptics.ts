/**
 * A haptic on a commit, and on nothing else (NFR-8, F-206).
 *
 * ## The rule is restraint, and the type is how it is kept
 *
 * **A haptic on a scroll is why people turn haptics off.** The whole value of this feature is
 * that it fires on the small number of moments that are *commits* — a garment saved, a reading
 * taken, a theme chosen — and never on a drag, a filter change or a list reaching its end.
 *
 * So this module has **one verb**. A module that cannot express *"buzz on scroll"* is one nobody
 * can use to buzz on scroll, which is a stronger guarantee than a rule saying not to and a
 * reviewer remembering it. There is no `light()`, no `selection()`, no `impact(style)` — every
 * one of those is an invitation to fire on something that is not a commit.
 *
 * ## The platform setting is honoured by not asking
 *
 * `expo-haptics` delegates to the OS: iOS respects the system haptics setting, and Android goes
 * through the vibrator without a runtime permission. **This app adds no preference of its own**,
 * deliberately — a second switch beside the platform's is a setting somebody has to keep in sync
 * with one they already set, and the first time the two disagree the app is wrong.
 *
 * That delegation is a property of the library and the OS. It is **attested**, not gated: this
 * workstation has no device, and a test asserting "the platform was consulted" would be
 * asserting that a function was called.
 *
 * ## A port, for the reason every device seam here is one
 *
 * `expo-haptics` reaches native code, so a screen importing it could not be rendered by jest —
 * which is where the accessibility guarantees are checked. The route supplies the real one; the
 * suite supplies a fake that counts.
 *
 * ## What it costs
 *
 * `expo-haptics@57.0.2`: **34 KB of JavaScript**, plus 31 KB of Android and 8 KB of iOS native
 * source that compile into the binary rather than the bundle. Peer range `expo: *`, checked by
 * `verify-peer-deps`. Stated because F-206's criterion 3 asks for it, and because a dependency
 * whose cost nobody wrote down is one nobody can weigh later.
 */

/**
 * Something was committed.
 *
 * The **only** verb. See the header: a second one is how the rule erodes, and the erosion is
 * always reasonable at the time.
 */
export interface Haptics {
  commit(): void;
}

/**
 * The real one.
 *
 * `void`-returning and non-throwing: a haptic that failed is not a reason for a save to fail,
 * and a caller that had to handle it would put a `try` around a commit for the sake of a buzz.
 * The import is dynamic so this module can be loaded — and its type checked — where the native
 * module does not exist.
 */
export function deviceHaptics(): Haptics {
  return {
    commit: () => {
      void import('expo-haptics')
        .then(async (m) => m.notificationAsync(m.NotificationFeedbackType.Success))
        .catch(() => {
          /*
           * SWALLOWED, DELIBERATELY. The device has no haptic engine, or the module is missing
           * from this build. Neither is something a person saving a garment needs to be told,
           * and neither is a reason for the save to report a problem.
           */
        });
    },
  };
}

/**
 * One that does nothing.
 *
 * Not a test double — the DEFAULT for every screen. A screen with no haptics port is a screen
 * that does not buzz, which is the correct behaviour for a screen nobody has wired one to, and
 * it means no call site needs a null check around a commit.
 */
export const noHaptics: Haptics = {
  commit: () => {
    /* nothing, and that is the whole implementation */
  },
};
