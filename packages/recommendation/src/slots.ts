/**
 * The slots an outfit is built from, and what a candidate for one is.
 *
 * ## Three, because three is what the criteria name
 *
 * FR-31 asks for *"ranked trouser and shoe candidates"* given a garment and its slot, so the
 * vocabulary is `top`, `trouser`, `shoe`. Outer layers, bags and accessories are real and are
 * **not** here: the outfit builder (FR-33, F-033) is what composes an arbitrary set of slots,
 * and a union invented now would be a list of values nothing produces and nothing consumes
 * [[a-generated-value-with-no-consumer-satisfies-its-own-test-and-reaches-nothing]].
 *
 * ## A slot is not a size
 *
 * The distinction that matters for colour: `top` and `trouser` are **large areas** and `shoe` is
 * a small one. That is why the pairing rule treats them differently — a chroma a person would
 * not wear across their chest is often exactly right on a shoe — and it is stated here rather
 * than inferred from the slot name at each call site.
 */

/** The slots this engine ranks for. `outfit_item.slot` in the data model. */
export const OUTFIT_SLOTS = ['top', 'trouser', 'shoe'] as const;
export type OutfitSlot = (typeof OUTFIT_SLOTS)[number];

/**
 * How much of an outfit a slot covers, as a proportion.
 *
 * **A convention, not a measurement** (NFR-2), and a coarse one. It exists so the pairing rule
 * can say *"two large areas should not both carry the chroma"* without each call site deciding
 * what large means. The numbers are not tuned and are not content: they are ordinal — top and
 * trouser are comparable, a shoe is much smaller — and only their ORDER is relied on.
 */
export const SLOT_AREA: Readonly<Record<OutfitSlot, number>> = {
  top: 0.4,
  trouser: 0.45,
  shoe: 0.15,
};

/** Whether a slot is a large enough area that its chroma dominates the outfit. */
export const isLargeArea = (slot: OutfitSlot): boolean => SLOT_AREA[slot] > SLOT_AREA.shoe;
