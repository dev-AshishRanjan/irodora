# The currency exponent is not stored beside the price it scaled

**Link:** [E-052](../../state/effects.json) ·
`apps/mobile/src/wardrobe/cost.ts#MINOR_UNIT_DIGITS` → every stored `garment.cost_minor`
**Severity:** high · **Guard:** `test:apps/mobile/test/cost.test.ts`
**Introduced by:** F-051 (cost-per-wear), 2026-09-01

---

## The shape of it

A garment row holds two things about money:

```sql
cost_minor  INTEGER,   -- 4550
currency    TEXT       -- 'GBP'
```

`4550` is £45.50 because GBP has two minor-unit digits. It would be 4550 *yen* — not ¥45.50
— if the code were JPY. **The row does not record which scale was used.** The scale is
supplied twice, from one table: once by `costEntry` on the way in, once by `formatMinor` on
the way out.

While both calls read the same table, every price round-trips exactly. That is the whole
guarantee, and it is a guarantee about a *file*, not about the data.

## What breaks, and why nothing notices

Change one entry — correct an exponent, add a currency that was falling through to the ISO
default of two — and **every price already written for that currency is reinterpreted.**

- A currency moved from the default 2 to 0: yesterday's £45.50 becomes ¥4550 on screen.
- A currency moved from 0 to 2: yesterday's ¥15000 becomes 150.00.

No compiler error. No failed read. No exception. The garment simply reports a different cost
per wear than it did yesterday, in a plausible direction, and the person holding the phone
has no way to tell which figure was the real one.

**This is [[srgb-xyz-is-the-root-of-every-derived-value]] applied to money**: a value derived
at write time that nothing recomputes on read, so a change to the deriving function
invalidates the stored data silently. The colour version of this mistake is guarded by golden
datasets and a content gate. The money version is guarded by one pinned table.

## Why the column is not simply added

The obvious fix is a `minor_unit_digits` column, making each price self-describing. It is the
right answer the day a price crosses a boundary — an import, an export, a sync, a second
device.

None of those exist. There is one local database, one writer, and no path by which a price
arrives from anywhere but the field somebody typed it into. Adding the column now is storage
for a problem that has not been created yet, and F-042 refused exactly that shape twice in
one migration: no digest column on `garment_image`, no `image_path`. When a price first
crosses a boundary, **that** is the feature that adds the column — and this note is what tells
it to.

## Three readers now, at two different scales (F-122)

The table is read at **write** time by `costEntry` and at **read** time by two functions that
are not the same thing:

| | what it returns | `4550` in GBP |
|---|---|---|
| `formatMinor(minor, code)` | **minor** units at the currency's precision | `'4550.00'` |
| `minorToMajor(minor, code)` | the **major**-unit text somebody typed | `'45.50'` |

`formatMinor` is right for a cost-per-wear figure, which is a rate in minor units.
`minorToMajor` is right for seeding an **editable price field**, which `costEntry` then reads
back — so using `formatMinor` there multiplies the price by a hundred on every save.

**Nothing would have caught that by shape.** Both take `(number, code)`, both return a string,
both are "the price at the currency's precision" in English, and **both are identical in JPY**
and every other zero-exponent currency. A fixture built around this product's own currency
rates them the same [[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]].
So `cost.test.ts` asserts they **differ at GBP and agree at JPY** — the agreement is half the
assertion, because it is what makes the disagreement meaningful.

`minorToMajor` slices strings rather than dividing, for the reason `costEntry` concatenates
rather than multiplying. Unlike `costEntry`, that claim was at first **asserted only by its own
comment**: the mutation that replaced it with `(minor / 10 ** digits).toFixed(digits)` was
caught, but through an unrelated guard, and it would have passed on every ordinary price. It is
now pinned by a case at the top of the safe-integer range, where the quotient is not
representable [[a-decoy-that-is-not-broken-proves-nothing]].

## The one number here that an exponent edit cannot move (F-123)

`investmentSignal` divides one price by another: `costMinor / medianMinorPerWear`. **Both
operands are in the same currency's minor units, so the exponent cancels.** Change GBP from 2 to
3 and every stored price is reinterpreted — and the break-even count comes out identical. It is
the only figure in this product that is *invariant* under an edit to this table.

**What is not invariant is the line underneath it.** The screen renders
`medianMinorPerWear` through `formatMinor` as the basis, so an exponent edit moves the rate a
reader sees by a factor of ten while the wear count beside it stays put — two numbers that no
longer agree, on one line, with nothing failing. Narrower than the consequence this note was
written for, and stranger to look at.

### And the exponents only cancel when they are the same exponent

A comparable must be priced in the **candidate's** currency. Dividing GBP minor units by JPY
minor units type-checks, produces a number, and means nothing. There are no exchange rates here
and inventing one would be the estimate FR-46 forbids with a feed attached — so garments in
another currency are **excluded, never converted**.

`investment.test.ts` carries a yen coat priced to drag the median if it were counted. A
single-currency wardrobe rates the filtered and the unfiltered implementation identically, which
is the whole reason the fixture is not one
[[a-fixture-regular-enough-to-read-is-blind-to-a-whole-class-of-defect]].

## What the guard does and does not do

`cost.test.ts` pins **every** non-default entry by value, all twenty-six, plus the default.
An illustrative test over JPY and KWD would have let a change to CLP or IQD through, which is
why it is exhaustive [[a-decoy-that-is-not-broken-proves-nothing]].

What that buys is **visibility, not safety**. A test cannot migrate a price that is already on
somebody's phone. It makes the edit impossible to make quietly, so the migration question gets
asked while there is still somebody there to ask it.

If an exponent here is ever wrong, the correction is a migration decision before it is a code
change. That order is the point of this note.

## How to check it

```bash
node --run test --workspace @irodora/mobile   # or: pnpm test
```

Then read the failure. If it names a currency, the question is not *"is the new exponent
right"* — it probably is — but **"what is already stored at the old one"**.
