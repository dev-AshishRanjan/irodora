/**
 * Every way out of the Lens, as data — so that none of them can forget to close the panel.
 *
 * ## The defect this exists for
 *
 * Reported first, and the plainest in the list: *"When I click on any buttons in bottomsheet on
 * lens page, it redirects to another page, but the bottom sheet is still open as fullscreen."*
 *
 * The sheet is open exactly when `capture.held !== null`. Four controls inside it navigated —
 * profile, wardrobe, the contemporary colours, the corpus entry — and **not one of them cleared
 * the capture**. The panel is portalled, so it stayed mounted over whatever the router pushed.
 *
 * ## Why this is a module and not four corrected lines
 *
 * Correcting the four call sites would have worked today and would not have survived the fifth.
 * The defect is not that somebody forgot a line — it is that **there was nowhere the rule could
 * live**. Every exit was an independent handler that happened to navigate, and the thing they
 * all had to remember was invisible because it was in four places at once.
 *
 * So an exit is a row in {@link LENS_EXITS} and the factory below wraps every row. Adding a door
 * means adding a row, and a row cannot forget to close the panel because closing it is not
 * something a row does. `lens-exits.test.ts` refuses a `router.push` anywhere in `CameraLens`,
 * which is what stops a fifth door being cut beside the table rather than in it.
 *
 * ## The order is load-bearing
 *
 * `dismiss()` before `navigate()`. Dismissing afterwards leaves the sheet over the new screen
 * for at least a frame, which is a smaller version of the same defect and would look like a
 * flicker nobody could reproduce. The test asserts the order, not just that both happened.
 *
 * ## The reading is handed over before anything closes
 *
 * `offerReading` runs first for the two exits that carry one. The reading is already an argument
 * by then, so dismissing cannot lose it — but the sequence is written down because "close, then
 * hand over what the closed thing was holding" is the shape of the bug this would otherwise
 * become.
 */

import { offerReading } from './handoff';
import type { LensReading } from './reading';

/**
 * The ports an exit needs, and nothing else.
 *
 * `navigate` is a function rather than expo-router itself, for the reason every screen here
 * takes its destinations as props: a module that imported the router could not be exercised
 * without mounting one, and the test would then be testing the router.
 */
export interface LensExitPorts {
  /** Clear the held capture. The panel is open exactly while there is one. */
  readonly dismiss: () => void;
  /** Go somewhere. The caller supplies `router.push`. */
  readonly navigate: (href: string) => void;
}

/**
 * The doors, keyed by name.
 *
 * Each is the href it leads to. `verify-route-targets` resolves every one of these against the
 * route tree, so a renamed route fails the build here rather than as a dead button somebody
 * finds in a fortnight.
 */
export const LENS_EXITS = {
  /** FR-27's hand-off: the reading becomes a starting point for the personal profile. */
  profile: () => '/profile',
  /** F-125's: the reading becomes a garment's colour. */
  wardrobe: () => '/wardrobe/add',
  /** F-155's: what a person could actually buy in the nearest published colour. */
  contemporary: (slug: string) => `/atlas/nearby/${slug}`,
  /** The corpus entry itself. */
  colour: (slug: string) => `/atlas/${slug}`,
} as const satisfies Record<string, (...args: never[]) => string>;

export type LensExit = keyof typeof LENS_EXITS;

/*
 * THE DESTINATION IS WRITTEN OUT AT EACH CALL, AND THAT IS DELIBERATE.
 *
 * The first draft routed both through a `CARRIES_READING` map — two entries, and it broke a
 * check immediately. `lens.test.ts` scans shipped source for `offerReading(…, 'wardrobe')`
 * and takes the SECOND ARGUMENT, because `handoff.ts` declares the destination list and
 * defines the function, so a looser match counts that file as a producer for both addresses and
 * then passes forever. Behind a reference, the scan saw no producer for either.
 *
 * The check is right and the indirection was worth nothing: two entries, one use each. An
 * abstraction that hides the thing a gate reads has to earn more than that
 * [[a-gate-must-model-what-renders-not-what-is-physically-correct]].
 */
export interface LensExitHandlers {
  readonly useForProfile: (reading: LensReading) => void;
  readonly useForWardrobe: (reading: LensReading) => void;
  readonly openContemporary: (slug: string) => void;
  readonly openColour: (slug: string) => void;
}

/**
 * The four handlers, each of which closes the panel before it leaves.
 *
 * Built from the table rather than written out, so the guarantee is structural: there is exactly
 * one place that calls `navigate`, and it is preceded by `dismiss` unconditionally.
 */
export function lensExits(ports: LensExitPorts): LensExitHandlers {
  /** Leave. The only call to `navigate` in this module, and it is not reachable without this. */
  const leave = (href: string): void => {
    ports.dismiss();
    ports.navigate(href);
  };

  return {
    useForProfile: (reading) => {
      // The offer first, while the reading is still in hand. See the header.
      offerReading(reading, 'profile');
      leave(LENS_EXITS.profile());
    },
    useForWardrobe: (reading) => {
      /*
       * ADDRESSED, and that is the whole of E-042: an unaddressed offer would be eaten by
       * profile setup if the person passed through it on the way, and neither screen could tell
       * that from nobody having scanned.
       */
      offerReading(reading, 'wardrobe');
      leave(LENS_EXITS.wardrobe());
    },
    openContemporary: (slug) => {
      leave(LENS_EXITS.contemporary(slug));
    },
    openColour: (slug) => {
      leave(LENS_EXITS.colour(slug));
    },
  };
}
