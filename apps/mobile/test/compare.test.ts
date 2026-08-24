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
    for (const d of [same.lab.l, same.lab.a, same.lab.b, same.oklch.l, same.oklch.c, same.oklch.h])
      expect(d.delta).toBe(0);
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
    expect(ab.lab.l.delta).toBeCloseTo(-ba.lab.l.delta, 12);
    expect(ab.oklch.l.delta).toBeCloseTo(-ba.oklch.l.delta, 12);
    expect(ab.oklch.h.delta).toBeCloseTo(-ba.oklch.h.delta, 12);
  });
});

describe('the deltas are about the values the bundle published', () => {
  const m = compare(A, B);

  it('carries each entry’s own stored coordinate on both sides of the delta', () => {
    expect([m.lab.l.a, m.lab.a.a, m.lab.b.a]).toEqual(A.derived.lab);
    expect([m.lab.l.b, m.lab.a.b, m.lab.b.b]).toEqual(B.derived.lab);
    expect([m.oklch.l.a, m.oklch.c.a, m.oklch.h.a]).toEqual(A.derived.oklch);
    expect([m.oklch.l.b, m.oklch.c.b, m.oklch.h.b]).toEqual(B.derived.oklch);
  });

  it('is a difference, not a coincidence — b minus a on every linear axis', () => {
    for (const d of [m.lab.l, m.lab.a, m.lab.b, m.oklch.l, m.oklch.c])
      expect(d.delta).toBeCloseTo(d.b - d.a, 12);
  });
});

/**
 * The one place subtracting two stored numbers is WRONG.
 *
 * Hue is an angle. A pair straddling 0° is where naive subtraction gives an answer that is off
 * by 360 and looks plausible, so the property is asserted on a pair chosen for that.
 */
describe('the hue delta is the shortest signed arc', () => {
  it('never exceeds half a turn, for any pair in the corpus', () => {
    for (const x of entries.slice(0, 20))
      for (const y of entries.slice(0, 20)) {
        const { delta } = compare(x, y).oklch.h;
        expect(Math.abs(delta)).toBeLessThanOrEqual(180);
      }
  });

  it('crosses zero the short way', () => {
    // A red near 28° and a pink near 10° differ by 18°, not by 342°.
    const red = entryBySlug('mi-aka')!;
    const pink = entryBySlug('hana-gasumi')!;
    const { delta } = compare(red, pink).oklch.h;
    expect(Math.abs(delta)).toBeLessThan(90);
    expect(Math.abs(red.derived.oklch[2] - pink.derived.oklch[2])).toBeLessThan(90);
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
