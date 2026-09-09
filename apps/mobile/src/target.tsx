/**
 * The colour being compared against, held for the session (FR-74, F-200).
 *
 * Reported as: *"scan a colour and check its similarity/difference against a target colour."*
 * This is the target half. F-201 is the Lens answering against it, and **nothing here computes
 * a difference** — this stores a colour and makes it visible.
 *
 * ## Why this is a context and the Lens hand-off is not
 *
 * [`lens/handoff.ts`](./lens/handoff.ts) is module state with no subscribers, deliberately —
 * *"a mailbox: two functions, one slot, no subscribers, and nothing re-renders when it
 * changes"*. That is right for a one-shot offer that exactly one screen collects.
 *
 * **A target is the opposite.** It is *visible wherever it is armed*, so every surface has to
 * re-render when it changes. That makes it a context, and this app has exactly one other and
 * says why: `appearance.tsx` is written from a screen several routes down and read at the root,
 * with expo-router owning everything in between. The target is the same shape.
 *
 * **Screens still take props.** The route reads the hook and passes the value down — a screen
 * reaching for the hook itself would throw in the conformance suite, which is the one place the
 * accessibility guarantees are actually checked.
 *
 * ## Session-held, and deliberately not persisted
 *
 * `appearance` persists through a store port. This does not, and the difference is the point: a
 * target is something somebody is doing *now*, and one that survived a restart would be a
 * comparison nobody remembered arming. No store port also means no device dependency and
 * nothing to fake.
 *
 * ## Disarmed deliberately, never silently
 *
 * Navigation does not clear it — that is the failure this exists against, and it is exactly what
 * a mailbox would have done. The only ways out are {@link TargetValue.disarm} and arming a
 * different colour, which replaces rather than queues: a queue would hold a target somebody had
 * moved on from, and the replacement is visible because the bar changes.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Color } from '@irodora/color-core';

/**
 * A colour being compared against.
 *
 * Carries what a swatch carries — the hex, the OKLCh and the `Color` with its provenance — plus
 * a label, and a corpus slug **when it has one**.
 *
 * `slug: string | null` because a generated companion has neither a slug nor a name, and that is
 * not a restriction here: a target is something to compare *against*, not something to store, so
 * a colour whose only provenance is *this engine computed it* is a legitimate one. The same
 * distinction F-199 drew for the wardrobe offer, pointed the other way.
 */
export interface TargetColour {
  readonly hex: string;
  readonly oklch: readonly [number, number, number];
  readonly color: Color;
  /** What to call it. A corpus name, a garment's name, or the hex when there is nothing else. */
  readonly label: string;
  /** The corpus entry it is, or `null` for a colour the engine produced. */
  readonly slug: string | null;
}

export interface TargetValue {
  /** The armed target, or `null`. `null` is the state every session starts in. */
  readonly target: TargetColour | null;
  /** Make this the target. Replaces any previous one. */
  readonly arm: (colour: TargetColour) => void;
  /** Stop comparing. The only way out other than arming a different colour. */
  readonly disarm: () => void;
}

const TargetContext = createContext<TargetValue | undefined>(undefined);

export function TargetProvider({ children }: { readonly children: ReactNode }): React.JSX.Element {
  const [target, setTarget] = useState<TargetColour | null>(null);

  const arm = useCallback((colour: TargetColour) => {
    setTarget(colour);
  }, []);

  const disarm = useCallback(() => {
    setTarget(null);
  }, []);

  const value = useMemo<TargetValue>(() => ({ target, arm, disarm }), [target, arm, disarm]);

  return <TargetContext.Provider value={value}>{children}</TargetContext.Provider>;
}

/**
 * The target, for a **route**.
 *
 * Throws outside a provider rather than returning a null-ish default: a screen silently
 * behaving as though nothing were armed is the failure this feature is written against, and a
 * default would make the provider optional in a way nobody would notice was missing.
 */
export function useTarget(): TargetValue {
  const value = useContext(TargetContext);
  if (value === undefined)
    throw new Error(
      'useTarget: no TargetProvider above this component. The provider is mounted in ' +
        'app/_layout.tsx, inside ThemeProvider — a screen reading this outside one would ' +
        'behave as though nothing were armed, which is indistinguishable from a disarmed ' +
        'target and is the failure F-200 exists against.',
    );
  return value;
}
