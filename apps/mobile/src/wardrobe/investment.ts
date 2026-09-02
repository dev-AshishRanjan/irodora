/**
 * The investment signal (FR-52, F-123) — defined by
 * [ADR-0082](../../../../docs/adr/0082-the-investment-signal-is-two-numbers-from-your-own-wardrobe-and-no-verdict.md).
 *
 * > *Two numbers from your own wardrobe, and no verdict.*
 *
 * ## What this refuses to be
 *
 * *"At 30 wears this would be £1.52 each."* **The 30 is invented** — nobody chose it, nothing
 * measured it, and it is the number the whole sentence rests on. FR-46's own words are *"absent
 * data yields unknown, never an invented estimate"*, and a projection whose denominator came
 * from nowhere is that estimate wearing a conditional.
 *
 * It also refuses to be a **verdict**. "Good investment" is advice about somebody's money from a
 * system that knows their wardrobe and nothing about their circumstances, and it is
 * unfalsifiable besides.
 *
 * ## What it is instead
 *
 * Two medians over the person's **own comparable garments**:
 *
 * - `breakEvenWears` — the candidate's price ÷ the median cost-per-wear of those garments
 * - `typicalWears` — the median wear count of the same garments
 *
 * *"56 wears to cost what your coats cost you. Your coats average 35."* Both numbers are theirs,
 * and **neither describes the future**: this restates an established rate against a price and
 * leaves the judgement where it belongs — the same move the naming surface makes when it offers
 * candidates rather than an identification.
 *
 * ## One currency, because there are no exchange rates
 *
 * A comparable must be priced in the **candidate's** currency. Dividing GBP by JPY type-checks
 * and produces a number, and `cost.ts` already refused to invent a rate: doing so here would be
 * the invented estimate with an exchange-rate feed attached (E-052).
 *
 * ## `neverWorn` is not a reason here
 *
 * `costPerWear` already refuses a garment with no wears, so an unworn garment is simply not a
 * comparable. The zero-division trap is handled by code that is already tested for it rather
 * than re-derived — which is the whole reason this composes that function instead of reading
 * `costMinor` and `wearCount` itself.
 */

import { costPerWear, type CostInputs } from './cost';

/**
 * What a comparable has to be — and nothing else.
 *
 * `CostInputs` plus the type, for the reason that type exists at all (F-051): a `StoredGarment`
 * satisfies it structurally, so the screen passes what it already holds, and a test passes four
 * fields instead of building a colour row it never reads.
 */
export interface InvestmentGarment extends CostInputs {
  readonly type: string;
}

/**
 * The fewest comparables that make a median mean anything.
 *
 * A median over one garment **is** that garment, and over two it is a midpoint of two — neither
 * is "your coats". Three is the smallest count for which the middle is a middle. The naming
 * engine's `MINIMUM_CANDIDATES` is the same number for a related reason, and this is deliberately
 * not imported from it: they would move for different causes.
 *
 * ADR-0082 records that this bar is high for a real wardrobe, and that the `tooFew` refusal
 * carries its count so the threshold can be revisited on evidence rather than on opinion.
 */
export const MINIMUM_COMPARABLES = 3;

/** Why there is no signal. */
export type InvestmentUnknown = 'noPrice' | 'noComparable' | 'tooFew';

/**
 * The signal, or the reason there is not one.
 *
 * A discriminated union in the shape `costPerWear` established (F-051): three absences that all
 * render as nothing are indistinguishable to the person looking at the screen, and *"you have
 * not priced this"* and *"you own one other coat"* are different sentences with different things
 * to do about them.
 *
 * The known branch **carries its basis back** — the count, the median rate and the currency —
 * for the reason `CostPerWear` does: a caller showing "56 wears" without saying what it was
 * measured against is asking to be believed rather than checked.
 */
export type InvestmentSignal =
  | {
      readonly known: true;
      /**
       * Exact, and **not rounded here**. The screen rounds, and rounds *up*: 65.4 wears is not
       * reached at 65. Same boundary discipline as `formatMinor` — a rounding is a rendering.
       */
      readonly breakEvenWears: number;
      /** The median wear count of the comparables. Exact for the same reason. */
      readonly typicalWears: number;
      readonly comparableCount: number;
      /** The median cost-per-wear the break-even was computed against, in minor units. */
      readonly medianMinorPerWear: number;
      readonly currency: string;
    }
  | {
      readonly known: false;
      readonly reason: 'tooFew';
      /** How many comparables there are. ADR-0082's "revisit when" is measured on this. */
      readonly have: number;
      readonly need: number;
    }
  | { readonly known: false; readonly reason: 'noPrice' | 'noComparable' };

/** What the signal needs of the thing being considered. It has not been bought. */
export interface InvestmentCandidate {
  /** Free text, exactly as `garment.type` is. */
  readonly type: string;
  readonly costMinor: number | null;
  readonly currency: string | null;
}

/**
 * The same normalisation `findDuplicates` applies to a category.
 *
 * Matched rather than imported: `packages/optimization` does not export it, and a garment typed
 * `'Coat '` is the same kind of thing as one typed `'coat'` in both places. If the two ever
 * disagree, a candidate would be a duplicate of a garment it is not comparable to, which is the
 * kind of inconsistency nothing would report.
 */
const normalise = (type: string): string => type.trim().toLowerCase();

/**
 * The middle value, or the mean of the two middle values.
 *
 * **Median rather than a pooled rate** (total spend ÷ total wears), which one expensive garment
 * dominates, and rather than a mean, which one unworn-but-priced garment drags. At the counts
 * this operates on — three, four, five — robustness is worth more than any other property.
 *
 * Sorts a copy — DEFENSIVELY, and a mutation removing that copy survives the suite. Every
 * current caller passes an array this function built moments earlier (`rates`, `wears`), so an
 * in-place sort would harm nothing today. It is kept because the day somebody passes a stored
 * array the failure is a wardrobe reordering under a reader, which nothing would report.
 */
function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  /*
   * NARROWED, NOT ASSERTED. `no-non-null-assertion` is an error in `src`, and it is the right
   * rule here rather than an obstacle: the only caller checks the length first, so a `!` would
   * have been correct today and silently wrong the day somebody called this with an empty list.
   */
  const upper = sorted[middle];
  if (upper === undefined) throw new Error('median of nothing');
  if (sorted.length % 2 === 1) return upper;

  // Unreachable for an even length, which is at least two — checked rather than assumed, for
  // the same reason as above.
  const lower = sorted[middle - 1];
  if (lower === undefined) throw new Error('median of nothing');
  return (lower + upper) / 2;
}

/**
 * The investment signal for a candidate, against a wardrobe.
 *
 * The order of the checks is the order of the refusals in ADR-0082, and it is not arbitrary: the
 * reason shown should be the one **furthest from an answer**. A candidate with no price cannot
 * be helped by owning more coats, so that is reported first.
 */
export function investmentSignal(
  candidate: InvestmentCandidate,
  wardrobe: readonly InvestmentGarment[],
): InvestmentSignal {
  const { costMinor, currency } = candidate;
  // Both halves, together. A price with no currency is a number nobody can read back, which is
  // the invariant `costEntry` enforces on the way in (E-052).
  if (costMinor === null || currency === null) return { known: false, reason: 'noPrice' };

  const type = normalise(candidate.type);
  const code = currency.trim().toUpperCase();

  const rates: number[] = [];
  const wears: number[] = [];
  for (const garment of wardrobe) {
    if (normalise(garment.type) !== type) continue;
    const rate = costPerWear(garment);
    // Unknown for any of F-051's reasons — no price, no currency, or never worn. Each is a
    // garment that cannot contribute a rate, and none of them is a zero.
    if (!rate.known) continue;
    if (rate.currency.trim().toUpperCase() !== code) continue;
    rates.push(rate.minorPerWear);
    wears.push(rate.wearCount);
  }

  if (rates.length === 0) return { known: false, reason: 'noComparable' };
  if (rates.length < MINIMUM_COMPARABLES)
    return { known: false, reason: 'tooFew', have: rates.length, need: MINIMUM_COMPARABLES };

  const medianMinorPerWear = median(rates);
  /*
   * A median rate of zero is possible and it is not a mistake: three coats that genuinely cost
   * nothing have a rate of nothing, and `costPerWear` reports that as KNOWN at zero rather than
   * as an absence (its own decoy for `if (!costMinor)`). Dividing by it gives Infinity, which is
   * a number that renders as a word — so it is refused as having nothing to compare against.
   */
  if (medianMinorPerWear === 0) return { known: false, reason: 'noComparable' };

  return {
    known: true,
    breakEvenWears: costMinor / medianMinorPerWear,
    typicalWears: median(wears),
    comparableCount: rates.length,
    medianMinorPerWear,
    currency: code,
  };
}
