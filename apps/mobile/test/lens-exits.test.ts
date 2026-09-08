/**
 * Every way out of the Lens closes the panel behind it.
 *
 * ## Why this is not a screen test, and the reason is already written down
 *
 * `lens-capture.test.ts` records it: **a `Sheet` renders the same tree whether it is open or
 * shut.** gorhom mounts its content either way and visibility lives in animation state on the UI
 * thread, so `queryByText` finds the title, the scrim and the children in both cases. A screen
 * test would pass against the broken version and the fixed one identically.
 *
 * So the guarantee is asserted where it is decidable: the exit dismissed, it navigated, and it
 * did those two things **in that order**.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LENS_EXITS, lensExits, type LensExitPorts } from '../src/lens/exits';
import { takeReading } from '../src/lens/handoff';
import type { LensReading } from '../src/lens/reading';

const reading = (): LensReading => ({
  rgb: [0.78, 0.62, 0.5],
  space: 'srgb',
  usableSamples: 1400,
  variance: 0.004,
  illumination: 'daylight',
  quality: 'good',
  confidence: 0.7,
  instruction: '',
});

/** A recorder that keeps the ORDER, because the order is the half that is easy to get wrong. */
function ports(): { readonly p: LensExitPorts; readonly log: string[] } {
  const log: string[] = [];
  return {
    log,
    p: {
      dismiss: () => log.push('dismiss'),
      navigate: (href) => log.push(`navigate:${href}`),
    },
  };
}

describe('every exit closes the panel before it leaves (F-178)', () => {
  it('the profile hand-off dismisses, then navigates', () => {
    const { p, log } = ports();
    lensExits(p).useForProfile(reading());
    expect(log).toEqual(['dismiss', 'navigate:/profile']);
  });

  it('the wardrobe hand-off dismisses, then navigates', () => {
    const { p, log } = ports();
    lensExits(p).useForWardrobe(reading());
    expect(log).toEqual(['dismiss', 'navigate:/wardrobe/add']);
  });

  it('the contemporary colours dismiss, then navigate, carrying the slug', () => {
    const { p, log } = ports();
    lensExits(p).openContemporary('ai-nezumi');
    expect(log).toEqual(['dismiss', 'navigate:/atlas/nearby/ai-nezumi']);
  });

  it('the corpus entry dismisses, then navigates, carrying the slug', () => {
    const { p, log } = ports();
    lensExits(p).openColour('ai-nezumi');
    expect(log).toEqual(['dismiss', 'navigate:/atlas/ai-nezumi']);
  });

  /**
   * THE ORDER IS NOT INCIDENTAL.
   *
   * Dismissing *after* navigating leaves the sheet over the new screen for at least a frame —
   * a smaller version of the same defect, and one that would present as a flicker nobody could
   * reproduce. Asserting `expect.arrayContaining` would pass on both.
   */
  it('never navigates first', () => {
    for (const run of [
      (h: ReturnType<typeof lensExits>) => {
        h.useForProfile(reading());
      },
      (h: ReturnType<typeof lensExits>) => {
        h.useForWardrobe(reading());
      },
      (h: ReturnType<typeof lensExits>) => {
        h.openContemporary('x');
      },
      (h: ReturnType<typeof lensExits>) => {
        h.openColour('x');
      },
    ]) {
      const { p, log } = ports();
      run(lensExits(p));
      expect(log[0]).toBe('dismiss');
    }
  });
});

describe('the reading survives the dismissal', () => {
  it('is offered before anything closes, addressed to the profile', () => {
    const { p } = ports();
    const taken = reading();
    lensExits(p).useForProfile(taken);
    expect(takeReading('profile')).toEqual(taken);
  });

  it('and to the wardrobe, which is E-042 — an unaddressed offer is eaten on the way', () => {
    const { p } = ports();
    const taken = reading();
    lensExits(p).useForWardrobe(taken);
    // The profile slot must be empty: an offer addressed to the wardrobe that profile setup
    // could consume is the defect the addressing exists to prevent.
    expect(takeReading('profile')).toBeNull();
    expect(takeReading('wardrobe')).toEqual(taken);
  });
});

/**
 * THE RULE THAT KEEPS IT TRUE, and it is the half that survives the next feature.
 *
 * The four handlers can be corrected once. What stops a **fifth** door being cut beside the
 * table rather than in it is that `CameraLens` may not navigate at all — every exit goes
 * through `exits.ts`, where dismissal is not something an entry can forget because it is not
 * something an entry does.
 */
describe('the Lens has no way out except the table', () => {
  // `__dirname`, not `import.meta.url`: jest-expo transforms to CommonJS, where the latter is
  // null. The convention this package already uses — see `cvd-mode.test.ts`.
  const source = readFileSync(join(__dirname, '..', 'src', 'lens', 'CameraLens.tsx'), 'utf8');

  /** Comments are source to a regex, and this file's docblock quotes the thing it forbids. */
  const code = source.replace(/\/\*[\s\S]*?\*\//gu, ' ').replace(/(^|[^:'"`\\])\/\/[^\n]*/gu, '$1');

  it('does not navigate outside the exit table', () => {
    const calls = [...code.matchAll(/router\s*\.\s*(push|replace|navigate)\s*\(/gu)];
    // ONE is expected: the `navigate` port handed to `lensExits`. More than one means a door
    // was cut beside the table.
    expect(calls).toHaveLength(1);
  });

  it('and the one call it makes is the port, not a destination', () => {
    // The port forwards whatever href the table produced. A literal path here would be an exit
    // that skipped the factory and therefore skipped the dismissal.
    expect(code).not.toMatch(/router\s*\.\s*push\s*\(\s*['"`]\//u);
  });

  /** A DECOY: the check must actually reject the shape it exists to reject. */
  it('DECOY — the same check refuses a file that pushes a literal path', () => {
    const bad = "const go = () => { router.push('/atlas/nearby/x'); };";
    expect(bad).toMatch(/router\s*\.\s*push\s*\(\s*['"`]\//u);
  });

  it('every exit in the table is a real route', () => {
    // Not a route-existence check — `verify-route-targets` owns that, and owns it better
    // because it reads the route tree. This asserts the table produces ABSOLUTE paths, which is
    // the shape that gate can resolve at all.
    expect(LENS_EXITS.profile()).toMatch(/^\//u);
    expect(LENS_EXITS.wardrobe()).toMatch(/^\//u);
    expect(LENS_EXITS.contemporary('x')).toMatch(/^\//u);
    expect(LENS_EXITS.colour('x')).toMatch(/^\//u);
  });
});
