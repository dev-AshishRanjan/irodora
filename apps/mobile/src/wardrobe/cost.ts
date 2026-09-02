/**
 * Cost per wear, and the three ways there is no such number (FR-46, F-051).
 *
 * ## The refusal is the requirement
 *
 * FR-46's own acceptance sentence is *"absent data yields unknown, never an invented
 * estimate"*, and every function here is shaped by it. `cost_minor`, `currency` and
 * `wear_count` have been columns since F-042 and **two of them are nullable**, so the
 * combinations where the division is meaningless are not edge cases — they are the state
 * every garment starts in.
 *
 * Three of them, and each has a different failure if it is papered over:
 *
 * | State | The tempting answer | What it would actually be |
 * |---|---|---|
 * | No cost recorded | `0` | A claim the garment was free |
 * | No currency recorded | the bare ratio | A measurement with no units |
 * | Never worn | `costMinor`, or `Infinity` | A claim the first wear has already happened |
 *
 * The third is the one JavaScript hands you for free: `4550 / 0` is `Infinity`, which is a
 * number, renders as a word, and passes every test that only checks the function returned.
 *
 * ## What this deliberately does not do
 *
 * **It does not round.** `minorPerWear` is left exact and the screen decides how to render
 * it, because rounding here would bake one surface's display choice into a value F-052's
 * investment signal will read next.
 *
 * **It does not judge.** There is no "good value" threshold. Whether £1.20 a wear is worth it
 * is not a question this repository can answer about somebody else's coat.
 *
 * **It does not convert currencies.** Two garments priced in different currencies have two
 * cost-per-wear figures and no common one, and inventing a rate would be the invented estimate
 * the requirement names, with an exchange-rate feed attached.
 */

import type { GarmentEnrichment, StoredGarment } from '@irodora/store';

/**
 * What recording a wear needs from the store, and **nothing else**.
 *
 * Narrower than `WardrobeStore` on purpose: the outfit builder must not be able to create a
 * garment or write an image, and a port is the only place that can be said in a way the
 * compiler enforces. `Repository` and `WardrobeStore` both satisfy it structurally, so the
 * route passes what it already holds and a test passes two functions.
 */
export interface WearStore {
  enrichGarment(id: string, patch: GarmentEnrichment, now: number): void;
  listGarments(): readonly StoredGarment[];
}

/**
 * What the division needs — and nothing else.
 *
 * A `StoredGarment` satisfies it structurally, so callers pass one; the narrow type is what
 * lets a test state a case in three fields instead of building a garment with a colour row
 * attached, and it keeps this module from quietly growing a dependency on the rest of the
 * garment.
 */
export interface CostInputs {
  readonly costMinor: number | null;
  readonly currency: string | null;
  readonly wearCount: number;
}

/** Why there is no cost per wear. Each names the missing half rather than saying "unknown". */
export type CostPerWearUnknown = 'noCost' | 'noCurrency' | 'neverWorn';

/**
 * The answer, or the reason there is not one.
 *
 * A discriminated union rather than `number | null` for the reason `sampleFrame` returns one
 * (F-119): four different absences that all render as nothing are indistinguishable to the
 * person looking at the screen, and *"we do not know what this cost"* and *"you have not worn
 * this yet"* are different sentences with different things to do about them.
 *
 * The known branch carries its inputs back. A caller showing `1.20 per wear` without saying
 * *from £45.50 over 38 wears* is asking to be believed rather than checked, and the numbers
 * are already in hand.
 */
export type CostPerWear =
  | {
      readonly known: true;
      /** Exact. `costMinor / wearCount`, in the same minor units as `costMinor`. */
      readonly minorPerWear: number;
      readonly currency: string;
      readonly costMinor: number;
      readonly wearCount: number;
    }
  | { readonly known: false; readonly reason: CostPerWearUnknown };

/**
 * Cost per wear, in the currency's minor units.
 *
 * **The order of the checks is not arbitrary.** Cost first, then currency, then wears: the
 * reason shown should be the one furthest from an answer, and a garment with neither a price
 * nor a wear is better served by *"no price recorded"* than by *"not worn yet"*, because the
 * price is the half the person can do something about now.
 *
 * `costMinor === 0` is **known, at zero.** A gift, a hand-me-down or something found in a
 * cupboard has a real cost and it is nothing — `if (!costMinor)` would report it as missing
 * data, which is the one bug in here that every other test would still pass.
 */
export function costPerWear(garment: CostInputs): CostPerWear {
  if (garment.costMinor === null) return { known: false, reason: 'noCost' };
  if (garment.currency === null) return { known: false, reason: 'noCurrency' };
  if (garment.wearCount <= 0) return { known: false, reason: 'neverWorn' };

  return {
    known: true,
    minorPerWear: garment.costMinor / garment.wearCount,
    currency: garment.currency,
    costMinor: garment.costMinor,
    wearCount: garment.wearCount,
  };
}

/**
 * One more wear, as a patch.
 *
 * **Exactly one key.** `GarmentEnrichment` reads an explicit `null` as *clear this column*, so
 * a patch built by spreading a garment would erase a brand, a size and a price every time
 * somebody said they wore something — and the write would succeed, because that is what the
 * caller asked for.
 *
 * The count comes in as an argument rather than being read here, which is what keeps the
 * store's side a one-line change if this ever needs to be atomic: `SET wear_count =
 * wear_count + 1` replaces the read-modify-write without touching a call site. On a
 * single-writer device it is safe as it stands, and that is a property worth stating rather
 * than discovering.
 */
export function wearRecorded(garment: Pick<StoredGarment, 'wearCount'>): GarmentEnrichment {
  return { wearCount: garment.wearCount + 1 };
}

/* ------------------------------------------------------------------ money, on the way in */

/**
 * How many digits of minor unit a currency has (ISO 4217, Annex A).
 *
 * **The entries are the exceptions.** Two is the standard's default and the overwhelming
 * majority; what is listed here is every currency whose exponent is not two, because assuming
 * two makes a ¥15,000 coat cost ¥1,500,000 — off by a factor of a hundred, in the currency
 * this product's corpus is about, and it looks entirely correct in a test written in pounds.
 *
 * Source: ISO 4217:2015, Annex A (funds and currencies with a minor unit other than 1/100).
 * Codes with no minor unit at all are exponent 0; the three-decimal set is the Gulf and North
 * African group; `CLF` and `UYW` are indexed units of account quoted to four.
 *
 * **This is not a membership test.** A code this table does not list gets the standard's own
 * default of two — including a code that is not a currency at all, which `costEntry` refuses
 * by shape instead. Claiming to know the full currency list would be a claim we cannot keep
 * current, and being wrong about it is worse than not making it.
 */
const MINOR_UNIT_DIGITS: Readonly<Record<string, number>> = {
  BIF: 0,
  CLP: 0,
  DJF: 0,
  GNF: 0,
  ISK: 0,
  JPY: 0,
  KMF: 0,
  KRW: 0,
  PYG: 0,
  RWF: 0,
  UGX: 0,
  UYI: 0,
  VND: 0,
  VUV: 0,
  XAF: 0,
  XOF: 0,
  XPF: 0,
  BHD: 3,
  IQD: 3,
  JOD: 3,
  KWD: 3,
  LYD: 3,
  OMR: 3,
  TND: 3,
  CLF: 4,
  UYW: 4,
};

/** The ISO 4217 default, stated once so nothing repeats the number. */
const DEFAULT_MINOR_UNIT_DIGITS = 2;

/** Digits of minor unit for a currency code. Exported because the display needs the same answer. */
export function minorUnitDigits(code: string): number {
  return MINOR_UNIT_DIGITS[code] ?? DEFAULT_MINOR_UNIT_DIGITS;
}

/** Why a typed price could not be recorded. */
export type CostEntryProblem = 'noAmount' | 'badAmount' | 'badCurrency' | 'tooPrecise';

/** A typed price, or the reason it was not written. */
export type CostEntry =
  | { readonly ok: true; readonly patch: GarmentEnrichment }
  | { readonly ok: false; readonly problem: CostEntryProblem };

/** Three ASCII letters. The *shape* of a currency code, which is all we claim to check. */
const CURRENCY_CODE = /^[A-Za-z]{3}$/;

/**
 * A decimal amount: digits, optionally a point and more digits. No sign, no separators.
 *
 * **A comma is not accepted, and that is a decision rather than an omission.** It is a decimal
 * point in much of Europe and a thousands separator in both of this app's locales, so `1,500`
 * means two different amounts a factor of a thousand apart with nothing in the string to say
 * which. Refusing it costs a re-type; guessing costs somebody a price that is wrong by 1000×
 * and looks entirely normal.
 */
const DECIMAL_AMOUNT = /^(\d+)(?:\.(\d+))?$/;

/**
 * A typed amount and a typed currency code, as a store patch — or the reason it is not one.
 *
 * ## Both or neither, and that is the point
 *
 * `cost_minor` is an integer of minor units and **the column does not record the exponent**,
 * so a price stored without its currency is a number nobody can read back. The store permits
 * that combination and `costPerWear` has a name for it; this function refuses to *create* it,
 * which is the difference between handling a legacy row and manufacturing one.
 *
 * ## The scale comes from the currency, never from what was typed
 *
 * `150` in JPY is 150 minor units and `150` in GBP is 15000. Taking the exponent from the
 * number of digits somebody happened to type would make `45.5` and `45.50` two different
 * prices, and both of them wrong in yen.
 *
 * More typed digits than the currency has is **refused, not rounded**: silently turning
 * `1500.75` JPY into `1501` is a small invented number, and small invented numbers are what
 * this requirement is about.
 */
export function costEntry(amount: string, code: string): CostEntry {
  const typed = amount.trim();
  if (typed === '') return { ok: false, problem: 'noAmount' };

  const upper = code.trim().toUpperCase();
  if (!CURRENCY_CODE.test(upper)) return { ok: false, problem: 'badCurrency' };

  const parsed = DECIMAL_AMOUNT.exec(typed);
  if (parsed === null) return { ok: false, problem: 'badAmount' };

  const whole = parsed[1] ?? '';
  const fraction = parsed[2] ?? '';
  const digits = minorUnitDigits(upper);
  if (fraction.length > digits) return { ok: false, problem: 'tooPrecise' };

  /*
   * STRING CONCATENATION, NOT MULTIPLICATION. `45.5 * 100` is 4549.999999999999 in binary
   * floating point, and `Math.round` around it would be correct for the cases anybody tests
   * and wrong somewhere nobody looks. Padding the typed fraction to the currency's width and
   * reading the result as an integer is exact for every input this accepts — which is the same
   * reasoning that made the column INTEGER in the first place (F-042: "a REAL price is a
   * rounding error with a currency symbol").
   */
  const minor = Number(whole + fraction.padEnd(digits, '0'));
  if (!Number.isSafeInteger(minor)) return { ok: false, problem: 'badAmount' };

  return { ok: true, patch: { costMinor: minor, currency: upper } };
}

/**
 * Minor units back to a decimal string, for display.
 *
 * Not `Intl.NumberFormat`: it needs a locale and a currency it recognises, it inserts a symbol
 * we deliberately do not claim, and its output differs between Hermes builds — which would
 * make the same garment read differently on two devices for no gain.
 *
 * `minorPerWear` is not an integer — that is the whole point of leaving it exact — so this
 * rounds to the currency's own precision **at the display boundary**, where a rounding is a
 * rendering rather than a stored claim.
 */
export function formatMinor(minor: number, code: string): string {
  const digits = minorUnitDigits(code);
  return minor.toFixed(digits);
}

/**
 * A stored price back into the text somebody typed — `costEntry`'s inverse (F-122).
 *
 * ## Not `formatMinor`, and the difference is a factor of a hundred
 *
 * `formatMinor` renders **minor units** at the currency's precision, which is what a per-wear
 * figure is: `formatMinor(4550, 'GBP')` is `'4550.00'` — four thousand five hundred and fifty
 * pence, shown to two places. Seeding an editable price field with that would offer somebody
 * "45.50" back as "4550.00", and saving it unchanged would multiply the price by a hundred
 * every time the screen was opened. The two functions look interchangeable and are not.
 *
 * ## String slicing, for the reason `costEntry` concatenates
 *
 * `4550 / 100` is exact here but `minor / 10 ** digits` is not exact in general, and a price
 * field is the last place to introduce a binary rounding — `costEntry` went to the trouble of
 * never multiplying, and dividing on the way back would give that up at the other end.
 *
 * ## `''` for a value this could not have produced
 *
 * The column is `INTEGER`, so a non-integer cannot arrive from the store as it stands — which
 * is exactly why the branch is here rather than assumed away. A price field is not the place to
 * render a number nobody can edit back, and an empty field is visible; `NaN.00` is not.
 */
export function minorToMajor(minor: number, code: string): string {
  if (!Number.isSafeInteger(minor)) return '';

  const digits = minorUnitDigits(code);
  const sign = minor < 0 ? '-' : '';
  const absolute = String(Math.abs(minor));
  if (digits === 0) return sign + absolute;

  // Padded to at least one whole digit, so 5 minor units in GBP is `0.05` rather than `.05` —
  // which `costEntry` would then refuse, and the field would be uneditable.
  const padded = absolute.padStart(digits + 1, '0');
  return `${sign}${padded.slice(0, -digits)}.${padded.slice(-digits)}`;
}
