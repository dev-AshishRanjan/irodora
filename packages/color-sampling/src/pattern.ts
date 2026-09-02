/**
 * Many pixels to **several** colours, with the share of the area each occupies (FR-19, F-064).
 *
 * `statistics.ts` answers *"what colour is this region"*. A striped shirt has no answer to that
 * question — the mean of navy and cream is a mud nobody is wearing — so this answers *"what
 * colours is it made of, and how much of each"*.
 *
 * ## Median cut, and why not k-means
 *
 * k-means needs seeding, and a seed needs a random source. **This engine deliberately does not
 * have one** — F-077 made randomness a port, and a port is a platform API, which NFR-3 forbids
 * here. Median cut needs no seed at all: it sorts, it splits at a median, and it produces the
 * same buckets for the same pixels in Node, in a browser and in Hermes.
 *
 * It is **not the best quantiser available**, and ADR-0081 says so. k-means++ and octree
 * quantisation give better results, and both need either a random source or substantially more
 * code than a pattern extractor is worth. What median cut is, is deterministic and honest about
 * its splits.
 *
 * ## Median cut alone CANNOT answer this requirement, and finding that out changed the design
 *
 * Median cut splits a bucket at its median **position**, so the two halves come out with equal
 * populations *by construction*. Its bucket sizes are therefore an artefact of the splitting
 * rule and not a fact about the image: the first working version reported a 75/25 stripe as
 * **50/50**, and it would have reported every two-colour pattern that way. FR-19 asks for
 * *"area proportions"*, so that is not a rounding error — it is the requirement, unmet.
 *
 * So median cut is used for what it is good at — **choosing representative colours without a
 * seed** — and the proportions come from a second pass that assigns every pixel to its nearest
 * representative in OKLab. The palette is the cut's; the histogram is the image's.
 *
 * ## The split is perceptual; the colour is the engine's mean
 *
 * Buckets are divided in **OKLab**, which is what OKLab is for — a Euclidean distance there is
 * roughly a perceptual one. The representative colour of a bucket is then `aggregate`'s, which
 * averages **in linear light**: not the OKLab centroid, because that would be a second
 * averaging rule in a repository that has exactly one
 * [[averaging-non-linear-srgb-reads-too-dark]].
 *
 * **ΔE00 appears nowhere in this file.** It is not a metric and cannot be used as a clustering
 * distance without ranking subtly and silently wrong
 * [[deltae00-is-not-a-metric-and-cannot-be-indexed]]. The tests use it to compare an answer to a
 * constructed truth, which is a comparison of two values and not an index.
 *
 * ## Rejected pixels are counted, never quietly dropped
 *
 * `partition` discards clipped, shadowed and transparent samples. A proportion computed over a
 * shrinking denominator with no mention of it is a number that means something other than what
 * it says, so both counts come back with the answer.
 *
 * ## The background rule is switched off here, and that is the sharpest decision in this file
 *
 * `partition` also rejects a pixel sitting more than `backgroundLuminanceDistance` from the
 * region's **own median luminance** — "something else in frame rather than part of the sample".
 * That is exactly right when the question is *"what colour is this region"*, and **exactly
 * wrong** when the question is *"what colours is it made of"*: in a navy-and-cream stripe the
 * median is navy, and the cream is the furthest thing from it. The first run of this file's
 * tests rejected all four hundred cream pixels and reported a striped shirt as plain navy.
 *
 * In a pattern, far from the median is a description of **the pattern**, not of a mistake. So
 * the distance is disabled and the other three rules — specular, shadow, alpha — are kept,
 * because those are about a pixel being *unusable* rather than about it being *different*.
 */

import { srgbToXyz, xyzToOklab } from '@irodora/color-spaces';
import { DEFAULT_THRESHOLDS, partition, type RejectionThresholds, type Sample } from './reject.js';
import { aggregate } from './statistics.js';

/** One colour the pattern is made of. */
export interface PatternColour {
  /** The bucket's mean, in linear light, encoded — `aggregate`'s answer for its members. */
  readonly colour: Sample;
  /** Share of the **usable** pixels, in [0,1]. The denominator is stated on the extraction. */
  readonly proportion: number;
  /** How many pixels. Carried so a caller can see a proportion is 3 pixels rather than 3%. */
  readonly count: number;
}

export interface PatternExtraction {
  /** Ranked by area, descending. First is primary, second secondary, the rest accents. */
  readonly colours: readonly PatternColour[];
  /** Pixels that survived rejection — the denominator every proportion is over. */
  readonly usable: number;
  /** Pixels `partition` refused. Reported, because it changes what a proportion means. */
  readonly rejected: number;
}

/**
 * How many colours to look for by default.
 *
 * Four covers the patterns FR-19 names — stripes and checks are two or three, a colour block is
 * two to four — and asking for more than a garment has costs nothing: the extractor returns the
 * distinct colours it found, not `k` of them padded out with duplicates.
 */
export const PATTERN_COLOURS = 4;

/**
 * The accuracy target (ADR-0081), exported because a claim without its threshold is not a claim.
 *
 * **Derived, not picked.** The pattern corpus is *constructed*, so its ground truth carries no
 * measurement error at all: a correct quantiser must recover the colours of a two-colour stripe
 * essentially exactly. The number is therefore tight — 1.0 ΔE00 is below the ~2.3 at which a
 * difference is generally held to be noticeable, which is the point: this is not a perceptual
 * tolerance, it is a "did the arithmetic work" tolerance.
 */
export const PATTERN_TARGET_DELTA_E = 1;

/** Proportions must land within one percentage point of the constructed share. */
export const PATTERN_TARGET_PROPORTION = 0.01;

/** A pixel in OKLab, with its original sample kept so the bucket can average the real thing. */
interface Point {
  readonly sample: Sample;
  readonly lab: readonly [number, number, number];
}

/**
 * Extract the colours a pattern is made of.
 *
 * `k` is an upper bound, not a promise: a uniform image returns one colour whatever is asked
 * for, because splitting a bucket whose extent is zero would produce two identical answers and
 * a proportion split arbitrarily between them.
 */
/**
 * The rejection rules a pattern is judged by.
 *
 * Every threshold is `DEFAULT_THRESHOLDS`' except the background distance, which is disabled —
 * see the header. Derived from the defaults rather than restated, so a change to the specular
 * or shadow cut reaches this path too; only the one rule that does not apply is overridden.
 */
export const PATTERN_THRESHOLDS: RejectionThresholds = {
  ...DEFAULT_THRESHOLDS,
  backgroundLuminanceDistance: Number.POSITIVE_INFINITY,
};

export function extractPattern(
  samples: readonly Sample[],
  k: number = PATTERN_COLOURS,
): PatternExtraction {
  const { kept, rejected } = partition(samples, PATTERN_THRESHOLDS);
  if (kept.length === 0) return { colours: [], usable: 0, rejected: rejected.length };

  const points: Point[] = kept.map((sample) => ({
    sample,
    lab: xyzToOklab(srgbToXyz([sample.r, sample.g, sample.b])),
  }));

  /*
   * TWO PASSES, AND THE SECOND ONE IS WHY THE PROPORTIONS MEAN ANYTHING.
   *
   * The cut chooses where the colours are; the assignment counts how much of the image is
   * nearest to each. Without the second pass every bucket has the same population and a 75/25
   * stripe reports 50/50 — see the header.
   */
  const seeds = medianCut(points, Math.max(1, Math.floor(k))).map(centroid);
  const clusters: Point[][] = seeds.map(() => []);
  for (const point of points) (clusters[nearest(point, seeds)] ?? []).push(point);

  const colours = clusters
    .filter((cluster) => cluster.length > 0)
    .map((cluster): PatternColour => {
      // THE ENGINE'S MEAN, in linear light. Not the OKLab centroid the assignment used.
      const { trimmedMean } = aggregate(cluster.map((p) => p.sample));
      return {
        colour: trimmedMean,
        proportion: cluster.length / kept.length,
        count: cluster.length,
      };
    })
    /*
     * Descending by area, and the tie-break is TOTAL. `sort` is stable, so two buckets of equal
     * size would otherwise come back in the order median cut happened to produce them — which
     * depends on the order the pixels arrived in, and a pattern extractor whose answer depends
     * on scan order is not deterministic in any useful sense.
     */
    .sort((a, b) => b.count - a.count || compareSample(a.colour, b.colour));

  return { colours, usable: kept.length, rejected: rejected.length };
}

/** A bucket's centre in OKLab. A seed for the assignment, never a reported colour. */
function centroid(bucket: readonly Point[]): readonly [number, number, number] {
  let l = 0;
  let a = 0;
  let b = 0;
  for (const point of bucket) {
    l += point.lab[0];
    a += point.lab[1];
    b += point.lab[2];
  }
  const n = Math.max(1, bucket.length);
  return [l / n, a / n, b / n];
}

/**
 * The index of the nearest seed, by squared Euclidean distance in OKLab.
 *
 * Squared, because a square root is monotonic and this only ever compares. **Not \u0394E00**: it is
 * not a metric, and using it to assign a pixel to a cluster is the indexing mistake
 * [[deltae00-is-not-a-metric-and-cannot-be-indexed]] names. Ties go to the lower index, which is
 * stable because the seed order is the cut's and the cut is deterministic.
 */
function nearest(point: Point, seeds: readonly (readonly [number, number, number])[]): number {
  let best = 0;
  let bestDistance = Infinity;
  for (let i = 0; i < seeds.length; i += 1) {
    const seed = seeds[i] ?? [0, 0, 0];
    const dl = point.lab[0] - seed[0];
    const da = point.lab[1] - seed[1];
    const db = point.lab[2] - seed[2];
    const distance = dl * dl + da * da + db * db;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = i;
    }
  }
  return best;
}

/** A total order on colours, for the tie-break. Channel by channel; no perceptual claim. */
function compareSample(a: Sample, b: Sample): number {
  return a.r - b.r || a.g - b.g || a.b - b.b;
}

/**
 * Median cut in OKLab.
 *
 * Repeatedly take the bucket with the **largest extent on any axis**, sort it on that axis, and
 * split at the median. Stop when there are `k` buckets or when no bucket can be split.
 *
 * ## Comparing extents across L, a and b is a decision
 *
 * The axes do not have the same range: `L` spans [0,1] while `a` and `b` reach roughly ±0.4 for
 * real surface colours. Comparing raw extents therefore biases the first splits toward
 * lightness — which is **the right bias for fabric**, where the strongest visual division in a
 * stripe is usually light against dark, and is stated here rather than left to look accidental.
 *
 * ## Why a bucket with zero extent is never split
 *
 * A uniform bucket splits into two identical colours whose proportions are an artefact of where
 * the median landed. Returning one colour with the whole share is the honest answer, and it is
 * why `k` is an upper bound.
 */
function medianCut(points: readonly Point[], k: number): readonly (readonly Point[])[] {
  let buckets: (readonly Point[])[] = [points];

  while (buckets.length < k) {
    let bestIndex = -1;
    let bestExtent = 0;
    let bestAxis = 0;

    for (let i = 0; i < buckets.length; i += 1) {
      const bucket = buckets[i] ?? [];
      if (bucket.length < 2) continue;
      const { axis, extent } = widestAxis(bucket);
      if (extent > bestExtent) {
        bestExtent = extent;
        bestIndex = i;
        bestAxis = axis;
      }
    }

    // Nothing left with any spread: every remaining bucket is one colour.
    if (bestIndex < 0 || bestExtent <= 0) break;

    const bucket = [...(buckets[bestIndex] ?? [])].sort(
      (p, q) =>
        (p.lab[bestAxis] ?? 0) - (q.lab[bestAxis] ?? 0) || compareSample(p.sample, q.sample),
    );
    const mid = Math.floor(bucket.length / 2);
    buckets = [
      ...buckets.slice(0, bestIndex),
      bucket.slice(0, mid),
      bucket.slice(mid),
      ...buckets.slice(bestIndex + 1),
    ];
  }

  return buckets.filter((bucket) => bucket.length > 0);
}

/** The axis a bucket is most spread along, and by how much. */
function widestAxis(bucket: readonly Point[]): { readonly axis: number; readonly extent: number } {
  const low = [Infinity, Infinity, Infinity];
  const high = [-Infinity, -Infinity, -Infinity];

  for (const point of bucket)
    for (let axis = 0; axis < 3; axis += 1) {
      const value = point.lab[axis] ?? 0;
      if (value < (low[axis] ?? Infinity)) low[axis] = value;
      if (value > (high[axis] ?? -Infinity)) high[axis] = value;
    }

  let axis = 0;
  let extent = 0;
  for (let i = 0; i < 3; i += 1) {
    const span = (high[i] ?? 0) - (low[i] ?? 0);
    if (span > extent) {
      extent = span;
      axis = i;
    }
  }
  return { axis, extent };
}
