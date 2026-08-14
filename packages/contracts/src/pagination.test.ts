import { describe, expect, it } from 'vitest';

import {
  PAGE_LIMIT_DEFAULT,
  PAGE_LIMIT_MAX,
  pageParamsSchema,
  pageSchema,
  paginatedSchema,
} from './pagination.js';
import { slugSchema } from './primitives.js';

describe('page parameters', () => {
  it('defaults the limit rather than returning everything', () => {
    const parsed = pageParamsSchema.parse({});

    expect(parsed.limit).toBe(PAGE_LIMIT_DEFAULT);
    expect(parsed.cursor).toBeUndefined();
  });

  it('refuses a limit above the ceiling', () => {
    // "Never return an unbounded collection" is only true if a number enforces it. A client
    // asking for 10,000 rows gets an error, not a slow success.
    expect(pageParamsSchema.safeParse({ limit: PAGE_LIMIT_MAX + 1 }).success).toBe(false);
  });

  it('refuses a fractional limit', () => {
    expect(pageParamsSchema.safeParse({ limit: 12.5 }).success).toBe(false);
  });

  it('has no offset to reach for', () => {
    const parsed = pageParamsSchema.parse({ offset: 100, limit: 10 });

    // Offset pagination skips and duplicates rows when the underlying set changes
    // mid-scroll — which is what the catalog does while an editor is publishing. An unknown
    // key is stripped rather than honoured, so a client that sends one gets page 1, not
    // silently wrong data.
    expect(parsed).toStrictEqual({ limit: 10 });
  });
});

describe('the page envelope', () => {
  it('distinguishes exhausted from not-computed', () => {
    // `null` rather than absent. An absent nextCursor would be indistinguishable from a
    // server that forgot to set it, and a client cannot tell "no more rows" from "bug".
    expect(pageSchema.safeParse({ nextCursor: null, hasMore: false }).success).toBe(true);
    expect(pageSchema.safeParse({ hasMore: false }).success).toBe(false);
  });

  it('wraps any item schema and validates the items', () => {
    const page = paginatedSchema(slugSchema);

    expect(
      page.safeParse({
        data: ['seiji-nezumi', 'ai-iro'],
        page: { nextCursor: 'eyJrIjoi', hasMore: true },
      }).success,
    ).toBe(true);

    // The wrapper is not a passthrough — a bad item fails the page.
    expect(
      page.safeParse({
        data: ['Seiji Nezumi'],
        page: { nextCursor: null, hasMore: false },
      }).success,
    ).toBe(false);
  });
});
