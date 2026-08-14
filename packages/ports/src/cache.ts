/**
 * The cache port.
 *
 * Valkey in every profile today, but the interface is what the application depends on, so
 * swapping it is a deployment decision rather than a refactor (ADR-0001, NFR-18).
 *
 * The contract is deliberately small. A cache with a rich interface becomes a database with
 * eviction, and then losing it stops being survivable — which is the one property a cache
 * has to keep.
 */

/** Time-to-live in seconds. There is no "cache forever": an entry nobody expires is a leak with good manners. */
export type TtlSeconds = number;

export interface CachePort {
  /** `undefined` for a miss. A miss is not an error — it is the normal case on a cold start. */
  get(key: string): Promise<string | undefined>;

  set(key: string, value: string, ttlSeconds: TtlSeconds): Promise<void>;

  delete(key: string): Promise<void>;

  /**
   * Set only if absent. Returns whether this caller won.
   *
   * This is the primitive behind idempotency keys and rate limits, and it is the reason the
   * port cannot be `get` + `set`: doing it in two calls is a race that shows up as a
   * duplicate wardrobe item on a flaky mobile network.
   */
  setIfAbsent(key: string, value: string, ttlSeconds: TtlSeconds): Promise<boolean>;

  /** Liveness of the backing store, for `/readyz`. Must not throw — it answers a question. */
  ping(): Promise<boolean>;
}
