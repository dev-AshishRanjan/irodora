/**
 * Cursor pagination.
 *
 * Offset pagination skips and duplicates rows when the underlying set changes mid-scroll,
 * which is exactly what the catalog does while an editor is publishing. So there is no
 * offset here to reach for.
 *
 * A cursor encodes a **sort order**, not just a position. Changing the sort must invalidate
 * the cursor rather than silently reinterpreting it against a different ordering — which is
 * why the cursor is opaque and branded rather than a plain string a caller might construct.
 */

import { z } from 'zod';

/** Opaque and signed. The client's only correct operation on it is to send it back. */
export const cursorSchema = z.string().min(1).max(2048).brand<'Cursor'>();

/** Hard ceiling. "Never return an unbounded collection" needs a number, or it is a preference. */
export const PAGE_LIMIT_MAX = 100;
export const PAGE_LIMIT_DEFAULT = 50;

export const pageParamsSchema = z.object({
  limit: z.int().min(1).max(PAGE_LIMIT_MAX).default(PAGE_LIMIT_DEFAULT),
  cursor: cursorSchema.optional(),
});

export const pageSchema = z.object({
  /** `null` when the collection is exhausted — absent would be indistinguishable from "not computed". */
  nextCursor: cursorSchema.nullable(),
  hasMore: z.boolean(),
});

/**
 * A function rather than a type, so the item schema keeps its runtime validation as well as
 * its type. This is also why `@irodora/contracts` needs no hand-written generic wrapper
 * type: the shape is inferred from the call.
 */
export function paginatedSchema<TItem extends z.ZodType>(item: TItem) {
  return z.object({
    data: z.array(item),
    page: pageSchema,
  });
}

export type Cursor = z.infer<typeof cursorSchema>;
export type PageParams = z.infer<typeof pageParamsSchema>;
export type Page = z.infer<typeof pageSchema>;
export type Paginated<TItem extends z.ZodType> = z.infer<ReturnType<typeof paginatedSchema<TItem>>>;
