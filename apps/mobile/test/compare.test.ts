/**
 * The metric set, asserted on its properties rather than on its arithmetic.
 *
 * ## Why almost nothing here recomputes a number
 *
 * Calling `deltaE00` in the test on the same two Labs `compare` called it on would assert that
 * a function returns what it returns. Every metric already has a golden dataset behind it in
 * its own package; what is unproven until here is that **this module wires the right inputs to
 * the right function** — which is a question about plumbing, and plumbing is checked by
 * properties: symmetry where the metric is symmetric, asymmetry where it is not, zero where a
 * colour is compared with itself, and the sign of a delta pointing the way round it should.
 *
 * One value IS pinned, to a fixed number, and the reason is E-003: a change to `deltaE00`
 * should be visible on a surface as well as in the golden set.
 */

import { allEntries, entryBySlug } from '../src/corpus';
import { compare, COMPARED_DEFICIENCIES, COMPARED_SEVERITY } from '../src/compare';

const entries = allEntries();
const A = entryBySlug('usu-gami')!;
const B = entryBySlug('soko-zumi')!;

describe('the two entries this suite is built on exist', () => {
  it('finds them in the pinned corpus', () => {
    expect(A).not.toBeNull();
    expect(B).not.toBeNull();
    expect(entries.length).toBeGreaterThan(2);
  });
});

describe('a colour compared with itself', () => {
  const same = compare(A, A);

  it('has no difference at all', () => {
    expect(same.deltaE00).toBe(0);
  });

  it('has every axis delta at zero, including the hue arc', () => {
    for (const d of [same.lch.l, same.lch.c, same.lch.h]) expect(d.delta).toBe(0);
    expect(same.deltaEok).toBe(0);
  });

  it('separates from itself by nothing, under every deficiency', () => {
    for (const s of same.separation) {
      expect(s.deltaE00).toBe(0);
      expect(s.lightnessDifference).toBe(0);
      expect(s.score).toBe(0);
    }
  });

  it('has a WCAG ratio of exactly 1:1', () => {
    expect(same.contrast.wcagRatio).toBeCloseTo(1, 10);
  });
});

describe('what is symmetric, and what deliberately is not', () => {
  const ab = compare(A, B);
  const ba = compare(B, A);

  it('ΔE00 is symmetric', () => {
    expect(ab.deltaE00).toBeCloseTo(ba.deltaE00, 12);
  });

  it('the WCAG ratio is symmetric, which is a property of the formula', () => {
    expect(ab.contrast.wcagRatio).toBeCloseTo(ba.contrast.wcagRatio, 12);
  });

  /*
   * APCA is asymmetric ON PURPOSE — dark text on light is not the same perceptual problem as
   * its inverse. Asserting that swapping the arguments swaps the two readings is what proves
   * the module reports both directions rather than one twice.
   */
  it('APCA is not symmetric, and swapping the pair swaps the two readings', () => {
    expect(ab.contrast.apcaBOnA).toBeCloseTo(ba.contrast.apcaAOnB, 12);
    expect(ab.contrast.apcaAOnB).toBeCloseTo(ba.contrast.apcaBOnA, 12);
  });

  it('DECOY — the two APCA readings are genuinely different numbers for this pair', () => {
    // Without this, "both directions are reported" would pass for a module that returned the
    // same value twice [[a-decoy-that-is-not-broken-proves-nothing]].
    expect(ab.contrast.apcaBOnA).not.toBeCloseTo(ab.contrast.apcaAOnB, 1);
  });

  it('every axis delta reverses sign when the pair reverses', () => {
    expect(ab.lch.l.delta).toBeCloseTo(-ba.lch.l.delta, 12);
    expect(ab.lch.c.delta).toBeCloseTo(-ba.lch.c.delta, 12);
    expect(ab.lch.h.delta).toBeCloseTo(-ba.lch.h.delta, 12);
  });
});

describe('the deltas are about the values the bundle published', () => {
  const m = compare(A, B);

  it('carries each entry’s own stored coordinate on both sides of the delta', () => {
    // 08 prints the record’s CIELAB LCh (ADR-0155 D1); compare() keeps no other axis set (review, M4).
    expect([m.lch.l.a, m.lch.c.a, m.lch.h.a]).toEqual(A.derived.lch);
    expect([m.lch.l.b, m.lch.c.b, m.lch.h.b]).toEqual(B.derived.lch);
  });

  it('is a difference, not a coincidence — b minus a on every linear axis', () => {
    for (const d of [m.lch.l, m.lch.c]) expect(d.delta).toBeCloseTo(d.b - d.a, 12);
  });
});

/**
 * The one place subtracting two stored numbers is WRONG.
 *
 * Hue is an angle. A pair straddling 0° is where naive subtraction gives an answer that is off
 * by 360 and looks plausible, so the property is asserted on a pair chosen for that.
 */
/** The shortest signed arc from one angle to another, in (−180, 180]. */
const hueDeltaOf = (from: number, to: number): number => {
  const d = ((((to - from) % 360) + 540) % 360) - 180;
  return d === -180 ? 180 : d;
};

describe('the hue delta is the shortest signed arc', () => {
  it('never exceeds half a turn, for any pair in the corpus', () => {
    for (const x of entries.slice(0, 20))
      for (const y of entries.slice(0, 20)) {
        const { delta } = compare(x, y).lch.h;
        expect(Math.abs(delta)).toBeLessThanOrEqual(180);
      }
  });

  it('crosses zero the short way', () => {
    // A red near 28° and a pink near 10° differ by 18°, not by 342°.
    const red = entryBySlug('mi-aka')!;
    const pink = entryBySlug('hana-gasumi')!;
    const { delta } = compare(red, pink).lch.h;
    expect(Math.abs(delta)).toBeLessThan(90);
    expect(delta).toBeCloseTo(hueDeltaOf(red.derived.lch[2], pink.derived.lch[2]), 12);
  });
});

describe('separation reports its decomposition, not only a score', () => {
  const m = compare(A, B);

  it('covers every deficiency the module declares, in order', () => {
    expect(m.separation.map((s) => s.deficiency)).toEqual([...COMPARED_DEFICIENCIES]);
  });

  it('states the severity it ran at, rather than leaving it to be assumed', () => {
    for (const s of m.separation) expect(s.severity).toBe(COMPARED_SEVERITY);
  });

  it('carries the ΔE00 and the lightness difference the score was built from', () => {
    for (const s of m.separation) {
      expect(s.deltaE00).toBeGreaterThan(0);
      expect(s.lightnessDifference).toBeGreaterThan(0);
      expect(s.score).toBeGreaterThan(0);
      expect(s.score).toBeLessThanOrEqual(100);
    }
  });

  /*
   * A near-white against the darkest colour in the corpus separates on LIGHTNESS, which no
   * deficiency touches. If a CVD simulation ever collapsed this pair, the model would be wrong
   * in a way that matters — a lightness difference is the one channel that survives.
   */
  it('keeps a light/dark pair separated under every deficiency', () => {
    for (const s of m.separation) expect(s.score).toBeGreaterThan(50);
  });
});

/**
 * E-003's destination end.
 *
 * `deltaE00` has a golden dataset at its source. This pins one value a SURFACE shows, so a
 * change to the metric is visible here too — and the tolerance is tight enough to catch a
 * change and loose enough to survive float noise across platforms.
 */
describe('a pinned pair, so an engine change shows up on a surface', () => {
  // MEASURED, not predicted. The first draft of this line carried a plausible-looking 76.86
  // that nobody had computed, and the engine returned 89.73 — which is the whole argument for
  // pinning a number here rather than describing the pair in words.
  it('usu-gami to soko-zumi is 89.73 ΔE00 in CIELAB (D65)', () => {
    expect(compare(A, B).deltaE00).toBeCloseTo(89.73, 2);
  });
});

/**
 * The severity is an argument now, not a constant (F-156).
 *
 * `machadoMatrix` interpolates continuously between the eleven tabulated steps, and the
 * engine's own docblock says twice that this is *"the one a severity slider is for"*. There was
 * no slider, so the whole range existed and one point of it was reachable. These assert that
 * the argument reaches the engine — which is the plumbing question this file is for.
 */
describe('the severity the simulation runs at', () => {
  it('defaults to the strongest tabulated step, which is what the screen opens on', () => {
    expect(COMPARED_SEVERITY).toBe(1);
    expect(compare(A, B).separation).toEqual(compare(A, B, COMPARED_SEVERITY).separation);
  });

  it('is carried into every deficiency’s detail, not only into the first', () => {
    // The detail records the severity it was computed at. A wrapper that passed the argument
    // to one call and the default to the others would look right in a spot check.
    for (const s of compare(A, B, 0.4).separation) expect(s.severity).toBeCloseTo(0.4, 10);
  });

  it('changes the answer, so the control is not decorative', () => {
    /*
     * DECOY-SHAPED, deliberately. A screen wired to a `compare()` that ignored its third
     * argument would render a moving slider and unmoving numbers, which looks like a working
     * feature until somebody checks a value.
     *
     * Asserted on a PAIR that a simulation actually affects: `usu-gami` and `soko-zumi`
     * separate on lightness, which no deficiency touches, so their score is stable by design.
     */
    const near = entries.find(
      (e) => compare(A, e, 1).separation[0]!.score !== compare(A, e, 0).separation[0]!.score,
    );
    expect(near).toBeDefined();
  });

  it('at zero is no simulation at all', () => {
    // Machado at severity 0 is the identity matrix, so every deficiency must agree with every
    // other — and with the unsimulated difference. If they do not, the interpolation is wrong
    // at its own endpoint.
    const zero = compare(A, B, 0).separation;
    const scores = new Set(zero.map((s) => s.score.toFixed(6)));
    expect(scores.size).toBe(1);
    for (const s of zero) expect(s.deltaE00).toBeCloseTo(compare(A, B).deltaE00, 6);
  });

  it('runs one simulation per deficiency, whatever the severity', () => {
    expect(compare(A, B, 0.35).separation).toHaveLength(COMPARED_DEFICIENCIES.length);
  });
});

/*
 * WHAT 08 READS (F-249, ADR-0155): the weighted terms, ΔEok, the record's CIELAB LCh and the pair's
 * warm–cool relation. Each is the engine's, read once here; `compare-readout.test` holds what is
 * printed from them over every pair.
 */
describe('what 08 reads beside ΔE00', () => {
  const entries = allEntries();

  it('the weighted terms’ total is the same double as ΔE00, for every ordered pair', () => {
    for (const a of entries)
      for (const b of entries) {
        if (a === b) continue;
        const m = compare(a, b);
        expect(Object.is(m.terms.deltaE00, m.deltaE00)).toBe(true);
      }
  }, 120_000);

  it('ΔEok is symmetric and positive between two different colours', () => {
    const [a, b, c] = entries;
    for (const [x, y] of [
      [a!, b!],
      [b!, c!],
      [a!, c!],
    ] as const) {
      expect(compare(x, y).deltaEok).toBeGreaterThan(0);
      expect(compare(x, y).deltaEok).toBe(compare(y, x).deltaEok);
    }
    // DECOY: a colour against itself is no distance at all.
    expect(compare(a!, a!).deltaEok).toBe(0);
  });

  it('the LCh axes are B less A on the record’s own CIELCh, the hue the shortest arc', () => {
    const [a, b] = entries;
    const m = compare(a!, b!);
    expect(m.lch.l).toStrictEqual({
      a: a!.derived.lch[0],
      b: b!.derived.lch[0],
      delta: b!.derived.lch[0] - a!.derived.lch[0],
    });
    expect(m.lch.c.delta).toBe(b!.derived.lch[1] - a!.derived.lch[1]);
    for (const x of entries)
      for (const y of entries) expect(Math.abs(compare(x, y).lch.h.delta)).toBeLessThanOrEqual(180);
  }, 120_000);

  it('the warm–cool relation is the pair’s, whichever way round it is read', () => {
    const [a, b] = entries;
    expect(compare(a!, b!).temperature).toStrictEqual(compare(b!, a!).temperature);
    expect(compare(a!, b!).temperature.pairs).toBe(1);
  });
});
