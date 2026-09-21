/**
 * A haptic on a commit and on choosing a swatch, and on nothing else (NFR-8, F-206, ADR-0104).
 *
 * ## The rule is restraint, and the type is how it is kept
 *
 * **A haptic on a scroll is why people turn haptics off.** The whole value of this feature is
 * that it fires on the small number of moments that are *commits* — a garment saved, a reading
 * taken, a theme chosen — and never on a drag, a filter change or a list reaching its end.
 *
 * So this module has **two verbs**, and the count is the guarantee. A module that cannot express
 * *"buzz on scroll"* is one nobody can use to buzz on scroll, which is stronger than a rule saying
 * not to and a reviewer remembering it. There is still no `light()`, no `impact(style)`, no
 * `scroll()` — every one of those is an invitation to fire on something that is neither a commit
 * nor a choice.
 *
 * **It shipped with one** (F-206), and the second is `15`'s doing: the mockup draws a switch
 * labelled *Haptic Feedback on Swatch Selection*, golden rule 14 makes the drawing win, and
 * ADR-0104 records what that costs.
 *
 * ## The platform setting is honoured by staying subordinate to it
 *
 * `expo-haptics` delegates to the OS: iOS respects the system haptics setting, and Android goes
 * through the vibrator without a runtime permission. F-206 added **no preference of its own**,
 * deliberately — *"a second switch beside the platform's is a setting somebody has to keep in sync
 * with one they already set, and the first time the two disagree the app is wrong"* — and `15`
 * draws that switch anyway.
 *
 * ADR-0104 keeps the argument alive by making the app's switch subordinate rather than parallel:
 * **off means this app asks for nothing; on means it asks, and the OS still decides.** There is no
 * state where the app's switch says yes and the phone says no and the app wins, which is the
 * disagreement F-206 was protecting against. The switch gates `select()` only — turning it off is
 * not a request to mute a save.
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

/** Something was committed. Not gated by any preference — see the header and ADR-0104. */
export interface Haptics {
  commit(): void;
  /**
   * A swatch was chosen (ADR-0104).
   *
   * **The second verb, and the docblock above explains what it costs.** F-206 shipped one verb
   * precisely so "buzz on a selection" could not be written; mockup `15` draws a switch labelled
   * *Haptic Feedback on Swatch Selection*, and golden rule 14 makes the drawing win. What keeps
   * the erosion contained is that this is ONE more verb for ONE gesture — there is still no
   * `light()`, no `impact(style)`, no `scroll()` — and that it is gated by a preference, which
   * `commit()` deliberately is not: the switch names selection, and turning it off is not a
   * request to mute a save.
   */
  select(): void;
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
    /* A SELECTION IS NOT A NOTIFICATION. `selectionAsync` is the platform's own
       selection-changed tick — lighter than the success notification a commit fires, which is
       what keeps the two distinguishable by feel rather than only by name. */
    select: () => {
      void import('expo-haptics')
        .then(async (m) => m.selectionAsync())
        .catch(() => {
          /* Swallowed, for the reason the commit's is. */
        });
    },
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
 * The same port with `select()` silenced, when the preference says so (ADR-0104, F-239).
 *
 * ## The gate is here, so no call site can forget it
 *
 * The alternative — `if (settings.hapticOnSelection) haptics.select()` at each swatch — puts the
 * preference in as many places as there are swatches, and a call site added later would honour
 * it only if somebody remembered. A route composes the port ONCE and the screens below it call a
 * verb that is already correct. It is the shape the `noHaptics` default already has: a screen
 * with nothing wired to it is silent without knowing that it is.
 *
 * **`commit()` passes straight through.** The switch `15` draws names selection, and turning it
 * off is not a request to mute a save — the distinction ADR-0104 keeps the port's two verbs for.
 */
export function selectionGated(base: Haptics, hapticOnSelection: boolean): Haptics {
  // Wrapped rather than `{ ...base, select: ... }`: a spread copies whatever else a fake port
  // happens to carry, and this returns exactly the two verbs the interface declares.
  return {
    commit: () => {
      base.commit();
    },
    select: () => {
      if (hapticOnSelection) base.select();
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
  select: () => {
    /* nothing, and that is the whole implementation */
  },
};
